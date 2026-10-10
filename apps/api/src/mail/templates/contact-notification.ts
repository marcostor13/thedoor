/**
 * Aviso interno: alguien ha escrito por el formulario de contacto.
 *
 * No se parece a las otras plantillas a propósito. Aquellas las abre un
 * invitado y tienen que parecer The Door PR; esta la abre el equipo, y lo que
 * necesita es leer el mensaje y poder contestar. Sin imágenes, sin webfonts:
 * una ficha.
 *
 * Todo lo que se pinta viene de un formulario público, así que todo pasa por
 * `escapeHtml`.
 */
import { BRAND, FONT, CARD_WIDTH } from './branding'
import { escapeHtml, type RenderedEmail } from './html'

export interface ContactNotificationData {
  name: string
  email: string
  message: string
  phone?: string
  instagram?: string
  /** De cuál de las dos puertas de la portada viene. */
  kind?: 'venue' | 'guest'
}

const KIND_LABEL: Record<NonNullable<ContactNotificationData['kind']>, string> = {
  venue: 'Local',
  guest: 'Guest list',
}

/** Un nombre con saltos de línea no tiene sitio en un asunto. */
function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function renderContactNotification(data: ContactNotificationData): RenderedEmail {
  const kind = data.kind ? KIND_LABEL[data.kind] : undefined
  const subject = `Nuevo mensaje de ${oneLine(data.name)}${kind ? ` (${kind})` : ''} — The Door PR`

  const rows: [string, string][] = [
    ['Nombre', data.name],
    ['Correo', data.email],
    ...(data.phone ? [['WhatsApp', data.phone] as [string, string]] : []),
    ...(data.instagram ? [['Instagram', data.instagram] as [string, string]] : []),
    ...(kind ? [['Viene de', kind] as [string, string]] : []),
  ]

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="${CARD_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${CARD_WIDTH}px;max-width:100%;background-color:${BRAND.card};border:1px solid ${BRAND.border};">
    <tr>
      <td style="padding:32px 36px 0 36px;">
        <div style="font-family:${FONT.mono};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.accent};">&mdash; Formulario de contacto</div>
        <div style="font-family:${FONT.display};font-size:28px;line-height:1.1;letter-spacing:1px;text-transform:uppercase;color:${BRAND.fg};padding-top:12px;">Mensaje nuevo</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 36px 0 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows
            .map(
              ([label, value]) => `<tr>
            <td width="110" valign="top" style="width:110px;padding:0 0 10px 0;font-family:${FONT.mono};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.fgMuted};">${label}</td>
            <td valign="top" style="padding:0 0 10px 0;font-family:${FONT.body};font-size:15px;line-height:1.5;color:${BRAND.fg};">${escapeHtml(value)}</td>
          </tr>`,
            )
            .join('')}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 36px 0 36px;">
        <div style="padding:20px 22px;background-color:${BRAND.elevated};border:1px solid ${BRAND.border};font-family:${FONT.body};font-size:15px;line-height:1.65;color:${BRAND.fg};white-space:pre-wrap;">${escapeHtml(data.message)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 36px 32px 36px;font-family:${FONT.mono};font-size:10px;line-height:1.9;letter-spacing:1px;text-transform:uppercase;color:${BRAND.fgMuted};">
        Responde a este correo y le llega directamente a ${escapeHtml(oneLine(data.name))}.
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`

  const text = [
    'THE DOOR PR — Mensaje nuevo del formulario de contacto',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    data.message,
    '',
    '—',
    `Responde a este correo y le llega directamente a ${oneLine(data.name)}.`,
  ].join('\n')

  return { subject, html, text }
}
