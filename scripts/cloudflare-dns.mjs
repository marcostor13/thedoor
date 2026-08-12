#!/usr/bin/env node
/**
 * Crea (o actualiza) los registros DNS A del frontend y del backend en
 * Cloudflare, apuntando a la IP del servidor de Coolify.
 *
 * Es idempotente: si el registro ya existe con el valor correcto no hace nada,
 * y si existe con otro valor lo actualiza.
 *
 *   node scripts/cloudflare-dns.mjs            # aplica los cambios
 *   node scripts/cloudflare-dns.mjs --dry-run  # solo muestra qué haría
 *
 * Variables necesarias: CLOUDFLARE_API_TOKEN, SERVER_IP, FRONTEND_DOMAIN,
 * BACKEND_DOMAIN. Opcional: CLOUDFLARE_ZONE_NAME (si no, se deduce del
 * dominio raíz de FRONTEND_DOMAIN).
 *
 * ⚠️  Sin verificar contra la API real: api.cloudflare.com está bloqueado por
 * la política de egress de la sesión en la que se escribió este script.
 */

import { loadEnv, requireEnv, log, fail } from './lib/env.mjs'

const API = 'https://api.cloudflare.com/client/v4'

loadEnv()

const dryRun = process.argv.includes('--dry-run')

const token = requireEnv('CLOUDFLARE_API_TOKEN')
const serverIp = requireEnv('SERVER_IP')
const frontendDomain = requireEnv('FRONTEND_DOMAIN')
const backendDomain = requireEnv('BACKEND_DOMAIN')

// El dominio raíz son las dos últimas etiquetas. Vale para
// `marcostorresalarcon.com`, pero no para sufijos de dos niveles tipo
// `com.pe`: en ese caso hay que fijar CLOUDFLARE_ZONE_NAME a mano.
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
  const existing = await cf(
    `/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(name)}`,
  )

  const payload = {
    type: 'A',
    name,
    content: serverIp,
    ttl: 1, // 1 = automático
    // Proxy desactivado: Coolify emite y renueva los certificados vía
    // Let's Encrypt con un desafío HTTP, que el proxy naranja rompería.
    // Se puede activar después, con el certificado ya emitido.
    proxied: false,
  }

  if (existing.length === 0) {
    if (dryRun) return log(`[dry-run] crearía  A ${name} → ${serverIp}`)
    await cf(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return log(`creado      A ${name} → ${serverIp}`)
  }

  const record = existing[0]

  if (record.content === serverIp) {
    return log(`sin cambios A ${name} → ${serverIp}`)
  }

  if (dryRun) {
    return log(`[dry-run] actualizaría A ${name}: ${record.content} → ${serverIp}`)
  }

  await cf(`/zones/${zoneId}/dns_records/${record.id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  log(`actualizado A ${name}: ${record.content} → ${serverIp}`)
}

const zoneId = await resolveZoneId()
log(`Zona "${zoneName}" resuelta (${zoneId})`)

for (const domain of [frontendDomain, backendDomain]) {
  await upsertRecord(zoneId, domain)
}

log('DNS al día.')
