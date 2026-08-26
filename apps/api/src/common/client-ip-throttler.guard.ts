import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

/**
 * `ThrottlerGuard` que cuenta por visitante y no por proxy.
 *
 * En producción la API vive detrás de Cloudflare y de Traefik, así que la IP
 * del socket —lo que mira el guard de serie— es siempre la del último proxy.
 * Con eso, un límite «3 altas por IP cada 10 minutos» deja de ser por persona y
 * pasa a ser un cupo global: las tres primeras altas del rato consumen el turno
 * de todo el mundo y el resto se lleva un 429 que no se ha ganado.
 *
 * Se prefiere `cf-connecting-ip`, que Cloudflare escribe siempre y borra de las
 * peticiones entrantes, y sólo si falta se recurre al primer elemento de
 * `x-forwarded-for` —el cliente; lo que viene detrás lo añade cada salto—.
 *
 * Las dos cabeceras son falsificables por quien alcance el contenedor sin pasar
 * por el borde. Para un limitador de un formulario público es un riesgo menor
 * que el de compartir cubo entre todos los visitantes, pero es la razón por la
 * que esto limita altas y no protege nada más.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    return resolveClientIp(req) ?? super.getTracker(req)
  }
}

/** IP real del visitante según las cabeceras del borde, si vienen. */
export function resolveClientIp(req: Record<string, unknown>): string | undefined {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>

  const cloudflare = firstValue(headers['cf-connecting-ip'])
  if (cloudflare) return cloudflare

  // `x-forwarded-for: cliente, proxy1, proxy2` — el cliente es el primero.
  const forwarded = firstValue(headers['x-forwarded-for'])
  return firstValue(forwarded?.split(',')[0])
}

function firstValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim() || undefined
}
