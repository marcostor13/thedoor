import { describe, it, expect } from 'bun:test'
import { resolveClientIp } from './client-ip-throttler.guard'

describe('resolveClientIp', () => {
  it('prefiere la cabecera de Cloudflare, que el borde reescribe siempre', () => {
    const ip = resolveClientIp({
      headers: { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.4' },
    })

    expect(ip).toBe('203.0.113.7')
  })

  it('sin Cloudflare, se queda con el cliente de x-forwarded-for', () => {
    const ip = resolveClientIp({
      headers: { 'x-forwarded-for': '203.0.113.7, 172.16.0.1, 10.0.0.5' },
    })

    expect(ip).toBe('203.0.113.7')
  })

  it('devuelve undefined sin cabeceras, para que el guard caiga a la IP del socket', () => {
    expect(resolveClientIp({ headers: {} })).toBeUndefined()
    expect(resolveClientIp({})).toBeUndefined()
  })

  it('ignora cabeceras vacías o en blanco en lugar de agrupar bajo una clave falsa', () => {
    expect(resolveClientIp({ headers: { 'cf-connecting-ip': '   ' } })).toBeUndefined()
    expect(
      resolveClientIp({ headers: { 'cf-connecting-ip': '', 'x-forwarded-for': '203.0.113.7' } }),
    ).toBe('203.0.113.7')
  })
})
