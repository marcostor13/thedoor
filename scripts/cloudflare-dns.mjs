#!/usr/bin/env node
/**
 * Crea (o actualiza) los registros DNS del frontend y del backend en
 * Cloudflare, apuntando al Cloudflare Tunnel por el que Coolify publica sus
 * aplicaciones.
 *
 * Por qué un CNAME al túnel y no un registro A:
 *   el servidor de Coolify no está expuesto por IP pública — se anuncia en
 *   Cloudflare a través de `cloudflared`. Todos los hostnames que ya sirve
 *   (incluido el propio panel) son CNAME a `<tunnel>.cfargotunnel.com` con el
 *   proxy activado, que además es obligatorio: ese dominio solo resuelve desde
 *   el borde de Cloudflare. El TLS termina ahí, así que tampoco hace falta el
 *   desafío HTTP de Let's Encrypt contra el origen.
 *
 * Si algún día se publica directamente contra una IP, define `SERVER_IP` y
 * el script vuelve al modelo de registros A.
 *
 *   bun scripts/cloudflare-dns.mjs            # aplica los cambios
 *   bun scripts/cloudflare-dns.mjs --dry-run  # solo muestra qué haría
 *
 * Variables necesarias: CLOUDFLARE_API_TOKEN, FRONTEND_DOMAIN, BACKEND_DOMAIN
 * y una de CLOUDFLARE_TUNNEL_ID o SERVER_IP.
 * Opcional: CLOUDFLARE_ZONE_NAME (si no, se deduce del dominio raíz).
 */

import { loadEnv, requireEnv, log, fail } from './lib/env.mjs'

const API = 'https://api.cloudflare.com/client/v4'

loadEnv()

const dryRun = process.argv.includes('--dry-run')

const token = requireEnv('CLOUDFLARE_API_TOKEN')
const frontendDomain = requireEnv('FRONTEND_DOMAIN')
const backendDomain = requireEnv('BACKEND_DOMAIN')

const tunnelId = process.env.CLOUDFLARE_TUNNEL_ID?.trim()
const serverIp = process.env.SERVER_IP?.trim()

if (!tunnelId && !serverIp) {
  fail(
    'Define CLOUDFLARE_TUNNEL_ID (modelo actual, por Cloudflare Tunnel) o\n' +
      '  SERVER_IP (si publicas contra la IP pública del servidor).',
  )
}

/**
 * Con túnel: CNAME proxied. Con IP: registro A sin proxy, para que Coolify
 * pueda resolver el desafío HTTP de Let's Encrypt contra el origen.
 */
const target = tunnelId
  ? { type: 'CNAME', content: `${tunnelId}.cfargotunnel.com`, proxied: true }
  : { type: 'A', content: serverIp, proxied: false }

// El dominio raíz son las dos últimas etiquetas. Vale para `thedoorpr.com`,
// pero no para sufijos de dos niveles tipo `com.pe`: en ese caso hay que fijar
// CLOUDFLARE_ZONE_NAME a mano.
const zoneName =
  process.env.CLOUDFLARE_ZONE_NAME ?? frontendDomain.split('.').slice(-2).join('.')

async function cf(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body.success === false) {
    const detail = body.errors?.map((e) => `${e.code}: ${e.message}`).join('; ')
    fail(`Cloudflare ${options.method ?? 'GET'} ${path} → ${response.status}${detail ? ` (${detail})` : ''}`)
  }

  return body.result
}

async function resolveZoneId() {
  const zones = await cf(`/zones?name=${encodeURIComponent(zoneName)}`)
  if (!zones?.length) {
    fail(`No se encontró la zona "${zoneName}". Revisa CLOUDFLARE_ZONE_NAME y los permisos del token.`)
  }
  return zones[0].id
}

async function upsertRecord(zoneId, name) {
  // Se buscan por nombre sin filtrar por tipo: al cambiar de modelo (A ↔ CNAME)
  // hay que ver el registro viejo aunque sea de otro tipo, o Cloudflare
  // rechazaría el nuevo por conflicto.
  const existing = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`)
  const conflicting = existing.filter((record) => record.type === 'A' || record.type === 'CNAME')

  const payload = {
    type: target.type,
    name,
    content: target.content,
    proxied: target.proxied,
    ttl: 1, // 1 = automático
    comment: 'Coolify',
  }

  const label = `${target.type} ${name} → ${target.content}`

  if (conflicting.length === 0) {
    if (dryRun) return log(`[dry-run] crearía  ${label}`)
    await cf(`/zones/${zoneId}/dns_records`, { method: 'POST', body: JSON.stringify(payload) })
    return log(`creado      ${label}`)
  }

  const [record, ...duplicates] = conflicting

  // Un nombre con varios registros A/CNAME a la vez es una configuración rota:
  // se avisa en lugar de elegir uno en silencio.
  if (duplicates.length > 0) {
    log(`⚠ ${name} tiene ${conflicting.length} registros A/CNAME. Revísalo a mano en Cloudflare.`)
  }

  if (record.type === target.type && record.content === target.content && record.proxied === target.proxied) {
    return log(`sin cambios ${label}`)
  }

  if (dryRun) {
    return log(`[dry-run] actualizaría ${name}: ${record.type} ${record.content} → ${target.type} ${target.content}`)
  }

  await cf(`/zones/${zoneId}/dns_records/${record.id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  log(`actualizado ${name}: ${record.type} ${record.content} → ${target.type} ${target.content}`)
}

const zoneId = await resolveZoneId()
log(`Zona "${zoneName}" resuelta (${zoneId})`)
log(`Destino: ${target.type} → ${target.content} (proxy ${target.proxied ? 'activado' : 'desactivado'})\n`)

for (const domain of [frontendDomain, backendDomain]) {
  await upsertRecord(zoneId, domain)
}

log('\nDNS al día.')
