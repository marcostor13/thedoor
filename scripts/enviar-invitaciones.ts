#!/usr/bin/env bun
/**
 * Envío en lote de la invitación a la noche en cartel.
 *
 *   bun scripts/enviar-invitaciones.ts                     ensayo: qué haría
 *   bun scripts/enviar-invitaciones.ts --prueba a@b.com    una sola, a esa dirección
 *   bun scripts/enviar-invitaciones.ts --enviar            el envío de verdad
 *
 * Manda EXACTAMENTE el mismo correo que recibe quien se apunta en la landing:
 * no reimplementa la plantilla, usa `MailService`. Así el asunto, el remitente,
 * el reply-to y la cabecera de baja son los mismos, y cualquier cambio futuro
 * en la plantilla llega aquí solo.
 *
 * Tres cosas gobiernan el diseño, y las tres vienen de que esto escribe en la
 * bandeja de gente real y no se puede deshacer:
 *
 *   1. No envía salvo que se lo pidas. Sin `--enviar` es un ensayo.
 *   2. Es reanudable. Cada envío correcto se anota, y una segunda pasada salta
 *      lo ya enviado. Si el script muere en el número 40, se retoma en el 41
 *      en lugar de escribir dos veces a los primeros 40.
 *   3. Se niega a funcionar si no hay noche en cartel. Pasada la fecha,
 *      `renderSignupEmail` cambia sola a la confirmación genérica, y un lote
 *      de 72 correos con el mensaje equivocado no tiene vuelta atrás.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// @ts-expect-error — helper en .mjs sin tipos, compartido con los otros scripts.
import { loadEnv, log, fail } from './lib/env.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')

loadEnv()

// Después de loadEnv: MailService lee el entorno al construirse.
const { MailService } = await import('../apps/api/src/mail/mail.service')
const { nightOnBill } = await import('../apps/api/src/mail/templates/event')

/** Resend admite 2 peticiones por segundo; 600 ms deja margen de sobra. */
const PAUSA_MS = 600

interface Registro {
  name?: string
  email?: string
  reference?: string
  kind?: string
}

interface Destinatario {
  email: string
  name: string
  reference?: string
}

function parseArgs(argv: string[]): {
  enviar: boolean
  verificar: boolean
  prueba?: string
  nombrePrueba: string
  fichero: string
} {
  const enviar = argv.includes('--enviar')
  const verificar = argv.includes('--verificar')
  const iPrueba = argv.indexOf('--prueba')
  const prueba = iPrueba === -1 ? undefined : argv[iPrueba + 1]
  const iNombre = argv.indexOf('--nombre')
  const iFichero = argv.indexOf('--fichero')
  const fichero = iFichero === -1 ? 'thedoorpr.signups.json' : argv[iFichero + 1]

  if (iPrueba !== -1 && !prueba) fail('--prueba necesita una dirección de correo.')

  return {
    enviar,
    verificar,
    prueba,
    // Un nombre que nadie pueda confundir con una personalización rota.
    nombrePrueba: iNombre === -1 ? 'Nombre De Prueba' : argv[iNombre + 1],
    fichero,
  }
}

/**
 * Comprueba, sin enviar nada, que cada correo lleva el nombre de SU
 * destinatario y no el de otro.
 *
 * Renderiza los 72 con la misma función que usa `MailService` y mira que el
 * nombre aparezca en el hueco que le corresponde, tanto en el HTML como en la
 * versión de texto plano. Es la diferencia entre creerse que la
 * personalización funciona y saberlo.
 */
async function verificarNombres(destinatarios: Destinatario[]): Promise<void> {
  const { renderSignupEmail } = await import('../apps/api/src/mail/templates/signup-email')
  const { escapeHtml } = await import('../apps/api/src/mail/templates/html')

  const fallos: string[] = []

  for (const d of destinatarios) {
    const esperado = d.name.trim().replace(/\s+/g, ' ')
    const correo = renderSignupEmail({
      kind: 'guest',
      name: d.name,
      email: d.email,
      reference: d.reference,
      duplicate: true,
      siteUrl: process.env.SITE_URL ?? 'https://thedoorpr.com',
    })

    // El hueco del nombre, tal cual lo pinta la plantilla.
    if (!correo.html.includes(`>${escapeHtml(esperado)}<`)) {
      fallos.push(`${d.email}: el HTML no lleva «${esperado}» en el hueco del nombre`)
    }
    if (!correo.text.includes(esperado.toUpperCase())) {
      fallos.push(`${d.email}: el texto plano no lleva «${esperado.toUpperCase()}»`)
    }
  }

  log(`\nComprobados ${destinatarios.length} correos, uno por destinatario.`)
  if (fallos.length === 0) {
    log('✓ Cada uno lleva su propio nombre, en el HTML y en el texto plano.')
  } else {
    log(`✗ ${fallos.length} problema(s):`)
    for (const f of fallos.slice(0, 20)) log(`   ${f}`)
  }

  log('\nMuestra de cómo saldrá el nombre en cada correo:')
  for (const d of destinatarios.slice(0, 8)) {
    log(`   ${d.email.padEnd(34)} → ${d.name.trim().replace(/\s+/g, ' ').toUpperCase()}`)
  }
  if (destinatarios.length > 8) log(`   …y ${destinatarios.length - 8} más`)

  if (fallos.length) process.exit(1)
}

/** Los registros del volcado, ya deduplicados y sin direcciones imposibles. */
function leerDestinatarios(ruta: string): Destinatario[] {
  if (!existsSync(ruta)) fail(`No encuentro ${ruta}.`)

  let crudo: unknown
  try {
    crudo = JSON.parse(readFileSync(ruta, 'utf8'))
  } catch (error) {
    fail(`${ruta} no es JSON válido: ${String(error).slice(0, 120)}`)
  }

  const filas: Registro[] = Array.isArray(crudo)
    ? (crudo as Registro[])
    : ((crudo as { signups?: Registro[] }).signups ?? [])

  const vistos = new Set<string>()
  const salida: Destinatario[] = []
  let descartados = 0

  for (const fila of filas) {
    const email = String(fila.email ?? '').trim().toLowerCase()
    const name = String(fila.name ?? '').trim()

    // Una dirección que no lo parece no se manda: Resend la aceptaría igual y
    // el rebote cuenta contra la reputación del dominio.
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) || !name) {
      descartados++
      continue
    }
    if (vistos.has(email)) continue

    vistos.add(email)
    salida.push({ email, name, reference: fila.reference?.trim() || undefined })
  }

  if (descartados) log(`  ${descartados} registro(s) descartado(s) por email o nombre inservible.`)
  return salida
}

/** Direcciones a las que ya se les envió, de una pasada anterior. */
function yaEnviados(ruta: string): Set<string> {
  if (!existsSync(ruta)) return new Set()

  const hechos = new Set<string>()
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    if (!linea.trim()) continue
    try {
      const fila = JSON.parse(linea) as { email?: string; ok?: boolean }
      // Solo cuentan los correctos: un fallo se reintenta en la siguiente pasada.
      if (fila.ok && fila.email) hechos.add(fila.email)
    } catch {
      // Una línea corrupta no puede impedir reanudar el resto.
    }
  }
  return hechos
}

const espera = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function main(): Promise<void> {
  const { enviar, verificar, prueba, nombrePrueba, fichero } = parseArgs(process.argv.slice(2))

  const evento = nightOnBill()
  if (!evento) {
    fail(
      'No hay noche en cartel: `renderSignupEmail` mandaría la confirmación genérica, ' +
        'no la invitación. Añade la noche en apps/api/src/mail/templates/event.ts.',
    )
    return
  }

  const mail = new MailService()
  if (!mail.enabled) {
    fail('Correo desactivado: faltan RESEND_API_KEY o MAIL_FROM en el entorno.')
    return
  }

  log(`Noche en cartel: ${evento.venue} — ${evento.date}, ${evento.time}`)
  log(`Remitente:       ${process.env.MAIL_FROM}`)

  // --- Prueba: una sola dirección, la que se pida ---------------------------
  if (prueba) {
    // El nombre va aparte del JSON a propósito: esto prueba el transporte, no
    // la personalización. Para eso está --verificar, que sí recorre la lista.
    log(`\nEnviando UNA prueba a ${prueba}, a nombre de «${nombrePrueba}»…`)
    const ok = await mail.sendSignupConfirmation(prueba, {
      name: nombrePrueba,
      kind: 'guest',
      reference: 'The Door PR',
      duplicate: true,
    })
    log(ok ? '✓ Enviada.' : '✗ No se ha podido enviar; mira el log de arriba.')
    return
  }

  // --- Lote ------------------------------------------------------------------
  const rutaJson = resolve(raiz, fichero)
  const rutaLog = `${rutaJson.replace(/\.json$/, '')}.enviados.jsonl`

  log(`\nLeyendo ${rutaJson}`)
  const destinatarios = leerDestinatarios(rutaJson)
  const hechos = yaEnviados(rutaLog)
  const pendientes = destinatarios.filter((d) => !hechos.has(d.email))

  log(`  ${destinatarios.length} destinatario(s) únicos`)
  if (hechos.size) log(`  ${hechos.size} ya enviados en una pasada anterior — se saltan`)
  log(`  ${pendientes.length} por enviar`)

  if (verificar) {
    await verificarNombres(destinatarios)
    return
  }

  if (!enviar) {
    log('\n— ENSAYO. No se ha enviado nada. —')
    log('Primeros cinco a los que escribiría:')
    for (const d of pendientes.slice(0, 5)) log(`   ${d.name} <${d.email}>`)
    if (pendientes.length > 5) log(`   …y ${pendientes.length - 5} más`)
    log(`\nPara enviar de verdad:  bun scripts/enviar-invitaciones.ts --enviar`)
    log(`Antes, una prueba:      bun scripts/enviar-invitaciones.ts --prueba tu@correo.com`)
    return
  }

  if (pendientes.length === 0) {
    log('\nNo queda nadie por enviar.')
    return
  }

  const segundos = Math.ceil((pendientes.length * PAUSA_MS) / 1000)
  log(`\nEnviando ${pendientes.length} correo(s), uno cada ${PAUSA_MS} ms (~${segundos}s)…\n`)

  let enviados = 0
  let fallidos = 0

  for (const [i, destinatario] of pendientes.entries()) {
    const ok = await mail.sendSignupConfirmation(destinatario.email, {
      name: destinatario.name,
      kind: 'guest',
      reference: destinatario.reference,
      // Estaban en la lista desde antes: si algún día esto cayera en la
      // plantilla genérica, «ya estabas dentro» es lo cierto.
      duplicate: true,
    })

    // Se anota ANTES de seguir: si el proceso muere aquí, la próxima pasada
    // sabe que este ya está hecho.
    appendFileSync(
      rutaLog,
      JSON.stringify({ email: destinatario.email, ok, at: new Date().toISOString() }) + '\n',
    )

    if (ok) enviados++
    else fallidos++

    const n = String(i + 1).padStart(3)
    log(`${n}/${pendientes.length}  ${ok ? '✓' : '✗'}  ${destinatario.email}`)

    if (i < pendientes.length - 1) await espera(PAUSA_MS)
  }

  log(`\nEnviados: ${enviados}   Fallidos: ${fallidos}`)
  log(`Registro: ${rutaLog}`)
  if (fallidos) log('Vuelve a lanzar el script con --enviar y reintentará solo los fallidos.')
}

await main()
