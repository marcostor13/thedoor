#!/usr/bin/env node
/**
 * Utilidad de despliegue contra la API de Coolify.
 *
 *   bun scripts/deploy.mjs --list                 proyectos, servidores y
 *                                                  aplicaciones con sus UUID
 *   bun scripts/deploy.mjs --check                 comprueba credenciales y
 *                                                  que las UUID existen
 *   bun scripts/deploy.mjs --deploy --target web   despliega el frontend
 *   bun scripts/deploy.mjs --deploy --target api   despliega el backend
 *   bun scripts/deploy.mjs --deploy --target all   despliega los dos
 *   bun scripts/deploy.mjs --deploy <uuid…>        despliega UUID sueltas
 *
 * Opciones:
 *   --no-wait          lanza y sale, sin esperar al resultado
 *   --timeout <seg>    espera máxima por despliegue (por defecto 900)
 *
 * Variables necesarias: COOLIFY_URL, COOLIFY_TOKEN y la UUID de cada objetivo
 * (COOLIFY_WEB_UUID, COOLIFY_API_UUID).
 *
 * Nota deliberada sobre el alcance: este script NO crea las aplicaciones. El
 * endpoint de creación de Coolify cambia de forma entre versiones menores, y
 * un script que falle a medias dejaría recursos a medio crear. Las dos
 * aplicaciones se crean una sola vez desde la interfaz —el procedimiento está
 * en docs/deployment.md— y a partir de ahí este script cubre lo repetitivo.
 */

import { loadEnv, requireEnv, log, fail } from './lib/env.mjs'

loadEnv()

const baseUrl = requireEnv('COOLIFY_URL').replace(/\/+$/, '')
const token = requireEnv('COOLIFY_TOKEN')

/** Las dos aplicaciones del monorepo y de qué variable sale su UUID. */
const TARGETS = {
  web: { label: 'frontend (Astro)', envName: 'COOLIFY_WEB_UUID' },
  api: { label: 'backend (NestJS)', envName: 'COOLIFY_API_UUID' },
}

/**
 * Estados terminales de un despliegue de Coolify. Se comparan en minúsculas y
 * cualquier estado que no esté en ninguna lista se trata como «todavía en
 * marcha»: es preferible seguir esperando que dar por bueno un despliegue que
 * no lo está.
 */
const FINISHED_OK = new Set(['finished', 'success', 'succeeded'])
const FINISHED_BAD = new Set(['failed', 'error', 'cancelled', 'cancelled-by-user', 'canceled'])

const POLL_INTERVAL_MS = 10_000

async function coolify(path, options = {}) {
  let response
  try {
    response = await fetch(`${baseUrl}/api/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    })
  } catch (error) {
    fail(
      `No se pudo contactar con Coolify en ${baseUrl}: ${error.message}\n` +
        '  Revisa COOLIFY_URL y que el host sea accesible desde aquí.',
    )
  }

  const text = await response.text()

  if (response.status === 401 || response.status === 403) {
    fail(
      `Coolify rechazó las credenciales (${response.status}) en ${path}.\n` +
        '  El COOLIFY_TOKEN no es válido o ha caducado. Genera uno nuevo en\n' +
        '  Coolify → Keys & Tokens → API tokens (con permiso de escritura sobre\n' +
        '  el equipo) y actualízalo en .env y en los secretos de GitHub Actions.',
    )
  }

  if (!response.ok) {
    fail(`Coolify ${options.method ?? 'GET'} ${path} → ${response.status}: ${text.slice(0, 400)}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Convierte los nombres de objetivo en {key, label, uuid}, o falla diciendo qué falta. */
function resolveTargets(names) {
  const keys = names.includes('all') ? Object.keys(TARGETS) : names

  return keys.map((key) => {
    const target = TARGETS[key]
    if (!target) {
      fail(`Objetivo desconocido "${key}". Usa: ${Object.keys(TARGETS).join(', ')} o all.`)
    }

    const uuid = process.env[target.envName]
    if (!uuid) {
      fail(
        `Falta ${target.envName} — la UUID de la aplicación del ${target.label} en Coolify.\n` +
          '  Sácala con:  bun scripts/deploy.mjs --list\n' +
          '  y guárdala en .env y como secreto del repositorio en GitHub.',
      )
    }

    return { key, label: target.label, uuid }
  })
}

async function list() {
  for (const [label, path] of [
    ['PROYECTOS', '/projects'],
    ['SERVIDORES', '/servers'],
    ['APLICACIONES', '/applications'],
  ]) {
    const items = await coolify(path)
    log(`\n── ${label} ──`)

    if (!Array.isArray(items) || items.length === 0) {
      log('  (ninguno)')
      continue
    }

    for (const item of items) {
      log(`  ${item.uuid}  ${item.name ?? item.description ?? ''}`)
    }
  }

  log('\nCopia las UUID de las aplicaciones a COOLIFY_WEB_UUID y COOLIFY_API_UUID.')
}

/**
 * Comprobación previa al despliegue: credenciales válidas y UUID que existen
 * de verdad. Se ejecuta en CI antes de tocar producción, para que un token
 * caducado falle en dos segundos y no a mitad de un despliegue.
 */
async function check(targets) {
  const applications = await coolify('/applications')

  if (!Array.isArray(applications)) {
    fail('La respuesta de /applications no es una lista. ¿Versión de Coolify incompatible?')
  }

  log(`✓ credenciales válidas — ${applications.length} aplicación(es) visibles`)

  let missing = false

  for (const target of targets) {
    const app = applications.find((item) => item.uuid === target.uuid)

    if (app) {
      log(`✓ ${target.key.padEnd(3)} ${target.uuid}  ${app.name ?? ''}`)
    } else {
      console.error(
        `✗ ${target.key.padEnd(3)} ${target.uuid}  no existe o no es visible con este token`,
      )
      missing = true
    }
  }

  if (missing) {
    fail('Alguna UUID no corresponde a una aplicación de este equipo. Revísalas con --list.')
  }
}

/** Lanza el despliegue y devuelve la UUID del despliegue, si Coolify la da. */
async function trigger(target) {
  // POST, no GET: Coolify cambió el método de este endpoint y la versión
  // antigua responde 405 con ese aviso exacto.
  const result = await coolify(`/deploy?uuid=${encodeURIComponent(target.uuid)}`, {
    method: 'POST',
  })
  const deployment = result?.deployments?.[0]
  const deploymentUuid = deployment?.deployment_uuid ?? null

  log(`→ ${target.key}: despliegue lanzado${deploymentUuid ? ` (${deploymentUuid})` : ''}`)

  return deploymentUuid
}

/** Espera a que un despliegue termine. Devuelve el estado final. */
async function waitFor(deploymentUuid, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastStatus = null

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

    const deployment = await coolify(`/deployments/${encodeURIComponent(deploymentUuid)}`)
    const status = String(deployment?.status ?? '').toLowerCase()

    if (status && status !== lastStatus) {
      log(`   ${deploymentUuid}: ${status}`)
      lastStatus = status
    }

    if (FINISHED_OK.has(status)) return { ok: true, status }
    if (FINISHED_BAD.has(status)) return { ok: false, status }
  }

  return { ok: false, status: lastStatus ?? 'sin respuesta', timedOut: true }
}

async function deploy(targets, { wait, timeoutMs }) {
  if (targets.length === 0) {
    fail('No se indicó ningún objetivo. Usa --target web|api|all o --deploy <uuid>.')
  }

  // Se lanzan todos primero y se espera después: las dos aplicaciones son
  // independientes y no tiene sentido serializarlas.
  const launched = []
  for (const target of targets) {
    launched.push({ target, deploymentUuid: await trigger(target) })
  }

  if (!wait) {
    log('\nLanzados sin esperar (--no-wait). Sigue el progreso en Coolify.')
    return
  }

  const pending = launched.filter((item) => item.deploymentUuid)

  if (pending.length !== launched.length) {
    log(
      '\n⚠ Coolify no devolvió identificador de despliegue para alguno de los objetivos,\n' +
        '  así que ese no se puede seguir desde aquí. Compruébalo en el panel.',
    )
  }

  log('\nEsperando a que terminen…')

  const results = await Promise.all(
    pending.map(async ({ target, deploymentUuid }) => ({
      target,
      ...(await waitFor(deploymentUuid, timeoutMs)),
    })),
  )

  const failed = results.filter((result) => !result.ok)

  for (const result of results) {
    const mark = result.ok ? '✓' : '✗'
    const suffix = result.timedOut ? ' (se agotó la espera)' : ''
    log(`${mark} ${result.target.key}: ${result.status}${suffix}`)
  }

  if (failed.length > 0) {
    fail(
      `Falló el despliegue de: ${failed.map((item) => item.target.key).join(', ')}.\n` +
        `  Mira los registros en ${baseUrl} para saber por qué.`,
    )
  }

  log('\n✓ Despliegue completado.')
}

// --- Interfaz de línea de comandos -----------------------------------------

const args = process.argv.slice(2)

function optionValue(name, fallback) {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1]
}

/** Objetivos pedidos con --target, admitiendo lista separada por comas. */
function requestedTargets() {
  const raw = optionValue('--target', null)
  if (!raw) return []
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

const wait = !args.includes('--no-wait') && process.env.DEPLOY_WAIT !== 'false'
const timeoutMs = Number(optionValue('--timeout', 900)) * 1000

if (args.includes('--list')) {
  await list()
} else if (args.includes('--check')) {
  const names = requestedTargets()
  await check(resolveTargets(names.length > 0 ? names : ['all']))
} else if (args.includes('--deploy-all')) {
  // Alias histórico de --deploy --target all.
  await deploy(resolveTargets(['all']), { wait, timeoutMs })
} else if (args.includes('--deploy')) {
  const names = requestedTargets()

  if (names.length > 0) {
    await deploy(resolveTargets(names), { wait, timeoutMs })
  } else {
    // Forma cruda: UUID sueltas detrás de --deploy.
    const uuids = args.slice(args.indexOf('--deploy') + 1).filter((arg) => !arg.startsWith('--'))
    await deploy(
      uuids.map((uuid) => ({ key: uuid.slice(0, 8), label: 'aplicación', uuid })),
      { wait, timeoutMs },
    )
  }
} else {
  log('Uso: bun scripts/deploy.mjs [--list | --check | --deploy --target web|api|all]')
  log('     Opciones: --no-wait, --timeout <segundos>')
  process.exit(1)
}
