#!/usr/bin/env node
/**
 * Utilidad de despliegue contra la API de Coolify.
 *
 *   node scripts/deploy.mjs --list              lista proyectos, servidores y
 *                                               aplicaciones con sus UUID
 *   node scripts/deploy.mjs --deploy <uuid…>    dispara el despliegue de las
 *                                               aplicaciones indicadas
 *   node scripts/deploy.mjs --deploy-all        despliega las UUID de
 *                                               COOLIFY_WEB_UUID y
 *                                               COOLIFY_API_UUID
 *
 * Variables necesarias: COOLIFY_URL, COOLIFY_TOKEN.
 *
 * Nota deliberada sobre el alcance: este script NO crea las aplicaciones. El
 * endpoint de creación de Coolify cambia de forma entre versiones menores, y
 * un script que falle a medias dejaría recursos a medio crear. Las dos
 * aplicaciones se crean una sola vez desde la interfaz —el procedimiento está
 * en docs/deployment.md— y a partir de ahí este script cubre lo repetitivo,
 * que es desplegar.
 *
 * ⚠️  Sin verificar contra una instancia real: el host de Coolify está
 * bloqueado por la política de egress de la sesión en la que se escribió.
 */

import { loadEnv, requireEnv, log, fail } from './lib/env.mjs'

loadEnv()

const baseUrl = requireEnv('COOLIFY_URL').replace(/\/+$/, '')
const token = requireEnv('COOLIFY_TOKEN')

async function coolify(path, options = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  })

  const text = await response.text()

  if (!response.ok) {
    fail(`Coolify ${options.method ?? 'GET'} ${path} → ${response.status}: ${text.slice(0, 400)}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
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

  log('\nCopia los UUID que necesites a .env (COOLIFY_PROJECT_UUID, COOLIFY_SERVER_UUID, …).')
}

async function deploy(uuids) {
  if (uuids.length === 0) {
    fail('No se indicó ninguna UUID. Usa --deploy <uuid> o define COOLIFY_WEB_UUID y COOLIFY_API_UUID.')
  }

  for (const uuid of uuids) {
    const result = await coolify(`/deploy?uuid=${encodeURIComponent(uuid)}`)
    const id = result?.deployments?.[0]?.deployment_uuid ?? 'en cola'
    log(`→ despliegue lanzado para ${uuid} (${id})`)
  }
}

const args = process.argv.slice(2)

if (args.includes('--list')) {
  await list()
} else if (args.includes('--deploy-all')) {
  await deploy(
    [process.env.COOLIFY_WEB_UUID, process.env.COOLIFY_API_UUID].filter(Boolean),
  )
} else if (args.includes('--deploy')) {
  await deploy(args.slice(args.indexOf('--deploy') + 1).filter((a) => !a.startsWith('--')))
} else {
  log('Uso: node scripts/deploy.mjs [--list | --deploy <uuid…> | --deploy-all]')
  process.exit(1)
}
