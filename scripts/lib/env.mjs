import { readFileSync, existsSync } from 'node:fs'
import { setServers } from 'node:dns'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(here, '../..')

/**
 * Carga el `.env` de la raíz del repositorio en process.env.
 *
 * Las variables que ya existan en el entorno tienen prioridad, para que en CI
 * manden los secretos del runner y no un archivo que se haya colado.
 */
export function loadEnv() {
  const envPath = resolve(rootDir, '.env')
  if (!existsSync(envPath)) return

  for (const rawLine of readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separator = line.indexOf('=')
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()

    // Se quitan las comillas envolventes si las hay.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) process.env[key] = value
  }

  applyDnsServers()
}

/**
 * Algunos resolvers DNS (redes corporativas, ciertas VPN) fallan consultas
 * SRV o de hosts externos aunque el resto de la red funcione. Si `.env` trae
 * `NODE_DNS_SERVERS`, se apunta el resolver de Node a esos servidores antes
 * de que los scripts hagan ninguna petición.
 */
function applyDnsServers() {
  const dnsServers = process.env.NODE_DNS_SERVERS
  if (!dnsServers) return

  setServers(
    dnsServers
      .split(',')
      .map((server) => server.trim())
      .filter(Boolean),
  )
}

export function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    fail(`Falta la variable ${name}. Defínela en .env o en el entorno.`)
  }
  return value
}

export function log(message) {
  console.log(message)
}

export function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}
