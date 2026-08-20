/**
 * Correo de confirmación de alta.
 *
 * Se construye a mano, con tablas y estilos en línea, porque un cliente de
 * correo no es un navegador: no hay flexbox, ni grid, ni hojas externas, ni
 * custom properties, y Outlook sigue maquetando con el motor de Word.
 *
 * Reglas que explican por qué está escrito así:
 *   · Todo el estilo va en línea. Gmail descarta gran parte del <style>.
 *   · La maqueta son tablas `role="presentation"` anidadas, no divs.
 *   · Nada esencial depende de una imagen: la mayoría de clientes las bloquea
 *     por defecto, así que el wordmark es TEXTO y la puerta solo adorna.
 *   · El fondo es negro y se declara `color-scheme: dark` para que el modo
 *     oscuro de Gmail o Outlook no intente reinvertir la paleta.
 */
import { BRAND, FONT, CARD_WIDTH } from './branding'

export type SignupKind = 'venue' | 'guest'

export interface SignupConfirmationData {
  /** Nombre tal cual lo escribió la persona. Se escapa antes de pintarlo. */
  name: string
  kind: SignupKind
  /** Anfitriona que invitó (guest) o nombre del local (venue). */
  reference?: string
  /** Ese correo ya estaba en la lista: cambia el titular, no el resto. */
  duplicate?: boolean
  /** Base pública del sitio, sin barra final. De aquí cuelga la imagen. */
  siteUrl: string
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

/**
 * El nombre viene de un formulario público: se escapa siempre antes de
 * interpolarlo, o un `<script>` en el campo «nombre» viajaría dentro del
 * correo hasta la bandeja de quien lo abra.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Solo el nombre de pila: en un saludo, el apellido sobra. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name.trim()
}

/** Qué se le cuenta a cada público. */
function copyFor(data: SignupConfirmationData): {
  subject: string
  eyebrow: string
  title: string
  lede: string
  steps: { num: string; title: string; desc: string }[]
} {
  const hi = escapeHtml(firstName(data.name))

  if (data.kind === 'venue') {
    const venue = data.reference ? escapeHtml(data.reference) : 'tu sala'
    return {
      subject: 'Hemos recibido tu solicitud — The Door PR',
      eyebrow: 'Solicitud recibida',
      title: data.duplicate ? 'Ya te teníamos.' : 'Te hemos leído.',
      lede: `${hi}, tenemos anotada la solicitud de <strong style="color:${BRAND.fg};font-weight:600;">${venue}</strong>. La lee una persona, no un filtro automático.`,
      steps: [
        { num: '01', title: 'Te leemos', desc: 'Una persona mira qué sala tienes y qué noches quieres llenar.' },
        { num: '02', title: 'Te llamamos', desc: 'Contestamos en menos de 48 horas, con nombre y apellido.' },
        { num: '03', title: 'Programamos', desc: 'Si encajamos, tu calendario deja de tener noches muertas.' },
      ],
    }
  }

  return {
    subject: data.duplicate ? 'Ya estabas en la lista — The Door PR' : 'Estás en la lista — The Door PR',
    eyebrow: 'Estás dentro',
    title: data.duplicate ? 'Ya estabas dentro.' : 'Estás en la lista.',
    lede: data.duplicate
      ? `${hi}, ese correo ya estaba apuntado, así que no hemos duplicado nada. Sigues en la lista.`
      : `${hi}, te hemos apuntado. Cuando abramos la próxima puerta, la invitación llega a este mismo correo.`,
    steps: [
      { num: '01', title: 'Te apuntamos', desc: 'Hecho. Tu nombre ya está en la lista.' },
      { num: '02', title: 'Te escribimos', desc: 'Te llega la invitación con el sitio y la hora.' },
      { num: '03', title: 'Entras', desc: 'Das tu nombre en la puerta. Sin cola, sin cover.' },
    ],
  }
}

/**
 * Wordmark en texto plano estilizado: THE ◆ DOOR ◆ PR.
 *
 * Es el logo que siempre se ve, también con las imágenes bloqueadas, que es
 * como la mayoría de la gente abre un correo la primera vez. Los rombos son
 * el carácter ◆ teñido de rojo, no imágenes.
 */
function wordmark(): string {
  const dot = `<span style="color:${BRAND.accent};font-size:9px;vertical-align:middle;">&#9670;</span>`
  return `<span style="font-family:${FONT.display};font-size:22px;line-height:1;letter-spacing:6px;text-transform:uppercase;color:${BRAND.fg};white-space:nowrap;">THE&nbsp;${dot}&nbsp;DOOR&nbsp;${dot}&nbsp;PR</span>`
}

/** Filete fino: la misma regla que separa secciones en el sitio. */
function rule(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.border};">&nbsp;</td></tr></table>`
}

function stepRow(step: { num: string; title: string; desc: string }, last: boolean): string {
  return `
  <tr>
    <td style="padding:0 0 ${last ? '0' : '18px'} 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="46" valign="top" style="width:46px;padding-top:2px;font-family:${FONT.mono};font-size:12px;line-height:1.2;color:${BRAND.accent};">${step.num}&nbsp;/</td>
          <td valign="top">
            <div style="font-family:${FONT.display};font-size:17px;line-height:1.2;letter-spacing:1px;text-transform:uppercase;color:${BRAND.fg};">${step.title}</div>
            <div style="font-family:${FONT.body};font-size:14px;line-height:1.6;color:${BRAND.fgMuted};padding-top:3px;">${step.desc}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

export function renderSignupConfirmation(data: SignupConfirmationData): RenderedEmail {
  const copy = copyFor(data)
  const site = data.siteUrl.replace(/\/+$/, '')
  const doorSrc = `${site}/email/door.png`

  // Solo el invitado tiene anfitriona; para un local, `reference` es el
  // nombre de la sala y ya se ha usado en el cuerpo.
  const host = data.kind === 'guest' && data.reference ? escapeHtml(data.reference) : undefined

  const preheader = data.kind === 'venue'
    ? 'Tenemos tu solicitud. Te contestamos en menos de 48 horas.'
    : 'Tu nombre ya está en la lista. La invitación llega a este correo.'

  const html = `<!doctype html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(copy.subject)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  /* Solo lo que no se puede poner en línea: webfonts, media queries y los
     parches de cliente. Todo lo demás va inline, atributo a atributo. */
  @import url('https://fonts.googleapis.com/css2?family=Italiana&family=Archivo:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap');
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background-color:${BRAND.bg}; }
  a { color:${BRAND.accentSoft}; }
  /* Los clientes de iOS y Gmail autoenlazan direcciones y fechas y les meten
     su propio azul: se les devuelve el color de la marca. */
  a[x-apple-data-detectors], .unstyle-auto-detected-links a, u + #body a {
    color:inherit !important; text-decoration:none !important; font-size:inherit !important;
  }
  @media only screen and (max-width:620px) {
    .card { width:100% !important; }
    .pad { padding-left:24px !important; padding-right:24px !important; }
    .title { font-size:34px !important; }
    .door { width:200px !important; height:auto !important; }
  }
</style>
</head>
<body id="body" style="margin:0;padding:0;background-color:${BRAND.bg};">

<!-- Resumen que se lee en la bandeja, junto al asunto. No se pinta. -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.bg};opacity:0;">${escapeHtml(preheader)}&#8203;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};">
<tr><td align="center" style="padding:32px 12px;">

  <!--[if mso]><table role="presentation" width="${CARD_WIDTH}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" class="card" width="${CARD_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${CARD_WIDTH}px;max-width:${CARD_WIDTH}px;background-color:${BRAND.card};border:1px solid ${BRAND.border};">

    <!-- Puerta: el único adorno que depende de una imagen. Si no carga, el
         correo sigue entero — debajo va el wordmark en texto.
         Sin atributo height a propósito: con él, un cliente que bloquea
         imágenes —que es como se abre un correo la primera vez— reserva 312px
         de vacío con un icono roto en medio. Sin él, el hueco colapsa y el
         correo empieza directamente por el wordmark. El width sí se queda: es
         lo que necesita Outlook para escalar la imagen a su proporción. -->
    <tr>
      <td align="center" style="padding:40px 24px 8px 24px;background-color:${BRAND.bg};font-size:0;line-height:0;">
        <img class="door" src="${doorSrc}" width="240" alt=""
             style="display:block;width:240px;height:auto;max-width:100%;border:0;outline:none;text-decoration:none;">
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:8px 24px 4px 24px;background-color:${BRAND.bg};">${wordmark()}</td>
    </tr>
    <tr>
      <td align="center" style="padding:10px 24px 36px 24px;background-color:${BRAND.bg};font-family:${FONT.mono};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.fgMuted};">PR House &mdash; Lima</td>
    </tr>

    <tr><td class="pad" style="padding:0 44px;">${rule()}</td></tr>

    <!-- Titular -->
    <tr>
      <td class="pad" style="padding:36px 44px 0 44px;">
        <div style="font-family:${FONT.mono};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.accent};">&mdash; ${escapeHtml(copy.eyebrow)}</div>
        <div class="title" style="font-family:${FONT.display};font-size:40px;line-height:1.05;letter-spacing:1px;text-transform:uppercase;color:${BRAND.fg};padding-top:14px;">${escapeHtml(copy.title)}</div>
        ${host ? `<div style="font-family:${FONT.mono};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.fgMuted};padding-top:14px;">Te invita ${host}</div>` : ''}
        <div style="font-family:${FONT.body};font-size:16px;line-height:1.65;color:${BRAND.fgMuted};padding-top:18px;">${copy.lede}</div>
      </td>
    </tr>

    <!-- Qué pasa ahora -->
    <tr>
      <td class="pad" style="padding:34px 44px 0 44px;">
        <div style="font-family:${FONT.mono};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.fgMuted};padding-bottom:16px;">&mdash; Qué pasa ahora</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.elevated};border:1px solid ${BRAND.border};">
          <tr><td style="padding:22px 22px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${copy.steps.map((step, i) => stepRow(step, i === copy.steps.length - 1)).join('')}
            </table>
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- Botón. Con VML para que Outlook pinte el rectángulo rojo entero y no
         solo el texto. -->
    <tr>
      <td class="pad" align="center" style="padding:32px 44px 4px 44px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${site}" style="height:46px;v-text-anchor:middle;width:260px;" arcsize="0%" strokecolor="${BRAND.accent}" fillcolor="${BRAND.accent}">
          <w:anchorlock/>
          <center style="color:${BRAND.ink};font-family:Consolas,'Courier New',monospace;font-size:12px;letter-spacing:3px;">MIRA QU&Eacute; HACEMOS</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${site}" style="display:inline-block;padding:15px 34px;background-color:${BRAND.accent};color:${BRAND.ink};font-family:${FONT.mono};font-size:12px;font-weight:500;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border:1px solid ${BRAND.accent};">Mira qu&eacute; hacemos &rarr;</a>
        <!--<![endif]-->
      </td>
    </tr>

    <tr><td class="pad" style="padding:36px 44px 0 44px;">${rule()}</td></tr>

    <!-- Pie -->
    <tr>
      <td class="pad" style="padding:22px 44px 40px 44px;">
        <div style="font-family:${FONT.mono};font-size:10px;line-height:1.9;letter-spacing:1px;text-transform:uppercase;color:${BRAND.fgMuted};">
          The Door PR &mdash; Lima, Per&uacute;<br>
          La lista es por referencia y nunca se vende.<br>
          &iquest;Algo que contarnos? Responde a este mismo correo.
        </div>
      </td>
    </tr>

  </table>
  <!--[if mso]></td></tr></table><![endif]-->

</td></tr>
</table>
</body>
</html>`

  // Alternativa en texto plano. No es un trámite: hay clientes y filtros que
  // solo miran esta parte, y un correo sin ella puntúa peor como spam.
  const text = [
    'THE DOOR PR — Lima',
    '',
    copy.title.toUpperCase(),
    '',
    stripTags(copy.lede),
    ...(host ? ['', `Te invita ${data.reference}`] : []),
    '',
    'QUÉ PASA AHORA',
    ...copy.steps.map((step) => `${step.num} / ${step.title} — ${step.desc}`),
    '',
    site,
    '',
    '—',
    'The Door PR — Lima, Perú',
    'La lista es por referencia y nunca se vende.',
    '¿Algo que contarnos? Responde a este mismo correo.',
  ].join('\n')

  return { subject: copy.subject, html, text }
}

/** El cuerpo lleva un `<strong>` y entidades: la versión en texto no. */
function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
