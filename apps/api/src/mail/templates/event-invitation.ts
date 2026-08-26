/**
 * Invitación a la noche que hay en cartel.
 *
 * Es lo que recibe quien se apunta desde la landing de invitación mientras
 * `eventOnBill()` devuelva algo: no un «te avisaremos», sino el pase a esa
 * fecha concreta con su hora, su dresscode y su flyer.
 *
 * Se construye a mano, con tablas y estilos en línea, por lo mismo que el resto
 * de plantillas: un cliente de correo no es un navegador. No hay flexbox, ni
 * grid, ni hojas externas, ni custom properties, y Outlook sigue maquetando con
 * el motor de Word. Las reglas que explican por qué está escrito así:
 *
 *   · Todo el estilo va en línea. Gmail descarta gran parte del <style>.
 *   · La maqueta son tablas `role="presentation"` anidadas, no divs.
 *   · Nada esencial depende de una imagen. La mayoría de clientes las bloquea
 *     la primera vez, así que el wordmark es TEXTO y los datos de la noche
 *     —fecha, hora, sitio— están escritos, no dentro del flyer.
 *   · Fondo negro de lado a lado y `color-scheme: dark`, para que el modo
 *     oscuro de Gmail o de Outlook no intente reinvertir la paleta.
 */
import { BRAND, FONT, CARD_WIDTH } from './branding'
import type { EventDetails } from './event'
import { escapeHtml, type RenderedEmail } from './html'

export interface EventInvitationData {
  /** Nombre tal cual lo escribió la persona. Se escapa antes de pintarlo. */
  name: string
  /** Base pública del sitio, sin barra final. De aquí cuelga el flyer. */
  siteUrl: string
  event: EventDetails
}

/** Ancho útil dentro del margen lateral de la tarjeta. */
const CONTENT_WIDTH = CARD_WIDTH - 44 * 2

/** Nombre del invitado, limpio de espacios de más antes de ir en mayúsculas. */
function guestName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Wordmark en texto plano estilizado: THE ◆ DOOR ◆ PR.
 *
 * Es el logo que se ve siempre, también con las imágenes bloqueadas, que es
 * como la mayoría de la gente abre un correo la primera vez. Los rombos son el
 * carácter ◆ teñido de rojo, no imágenes.
 */
function wordmark(): string {
  const dot = `<span style="color:${BRAND.accent};font-size:9px;vertical-align:middle;">&#9670;</span>`
  return `<span style="font-family:${FONT.display};font-size:20px;line-height:1;letter-spacing:6px;text-transform:uppercase;color:${BRAND.fg};white-space:nowrap;">THE&nbsp;${dot}&nbsp;DOOR&nbsp;${dot}&nbsp;PR</span>`
}

/** Filete fino: la misma regla que separa secciones en el sitio. */
function rule(color: string = BRAND.border): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${color};">&nbsp;</td></tr></table>`
}

/**
 * Una línea de los datos de la noche: etiqueta en rojo a la izquierda, dato en
 * crema a la derecha.
 *
 * En pantalla estrecha las dos celdas se apilan con la media query `.stack`:
 * a 320px, una etiqueta de 108px y una dirección larga en la misma fila dejan
 * la dirección partida en cuatro renglones.
 */
function detailRow(label: string, value: string, last = false): string {
  return `
  <tr>
    <td style="padding:0 0 ${last ? '0' : '14px'} 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="stack" width="108" valign="top" style="width:108px;padding-top:3px;font-family:${FONT.mono};font-size:10px;line-height:1.4;letter-spacing:3px;text-transform:uppercase;color:${BRAND.accent};">${label}</td>
          <td class="stack" valign="top" style="font-family:${FONT.body};font-size:15px;line-height:1.5;color:${BRAND.fg};">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`
}

export function renderEventInvitation(data: EventInvitationData): RenderedEmail {
  const site = data.siteUrl.replace(/\/+$/, '')
  const doorSrc = `${site}/email/door.png`
  const event = data.event
  const flyerSrc = `${site}${event.flyer.path}`
  const name = guestName(data.name)

  // El flyer se pinta al ancho útil de la tarjeta; el alto va calculado a su
  // proporción real para que Outlook —que ignora `height:auto`— no lo deforme.
  const flyerHeight = Math.round((event.flyer.height / event.flyer.width) * CONTENT_WIDTH)

  const subject = `YOU ARE IN — ${event.venue}, ${event.date}`
  const preheader = `${event.date} · ${event.time} · ${event.location}. Dresscode ${event.dresscode.toLowerCase()}.`

  const html = `<!doctype html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(subject)}</title>
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
    .hero { font-size:30px !important; letter-spacing:0.3px !important; }
    .guest { font-size:15px !important; letter-spacing:3px !important; }
    .mark { width:190px !important; height:auto !important; }
    .flyer { width:100% !important; height:auto !important; }
    /* Etiqueta encima del dato: en 320px no caben en la misma fila. */
    .stack { display:block !important; width:100% !important; padding-top:0 !important; }
  }
</style>
</head>
<body id="body" style="margin:0;padding:0;background-color:${BRAND.bg};">

<!-- Resumen que se lee en la bandeja, junto al asunto. No se pinta. -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.bg};opacity:0;">${escapeHtml(preheader)}&#8203;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};">
<tr><td align="center" style="padding:0;">

  <!--[if mso]><table role="presentation" width="${CARD_WIDTH}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" class="card" width="${CARD_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${CARD_WIDTH}px;max-width:${CARD_WIDTH}px;background-color:${BRAND.bg};">

    <!-- La puerta, grande y centrada sobre el negro. Sin atributo height a
         propósito: con él, un cliente que bloquea imágenes reserva el hueco
         entero con un icono roto en medio. Sin él, el hueco colapsa y el correo
         empieza directamente por el wordmark. El width sí se queda: es lo que
         necesita Outlook para escalar la imagen a su proporción. -->
    <tr>
      <td align="center" style="padding:56px 24px 12px 24px;font-size:0;line-height:0;">
        <img class="mark" src="${doorSrc}" width="240" alt=""
             style="display:block;width:240px;height:auto;max-width:100%;border:0;outline:none;text-decoration:none;">
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:12px 24px 0 24px;">${wordmark()}</td>
    </tr>
    <tr>
      <td align="center" style="padding:12px 24px 44px 24px;font-family:${FONT.mono};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.fgMuted};">PR House &mdash; Lima</td>
    </tr>

    <tr><td class="pad" style="padding:0 44px;">${rule()}</td></tr>

    <!-- El titular y a quién va dirigido -->
    <tr>
      <td class="pad" align="center" style="padding:46px 44px 0 44px;">
        <!-- Misma tipografía que el titular de la pantalla de confirmación de
             la landing («Ya estabas en la lista.»), que es un <h1> con
             --fs-2xl: Italiana en 400, interlineado 1.02 y el espaciado normal
             de la marca —0.01em, no el tracking ancho de las etiquetas—.
             El tamaño del sitio es un clamp que depende del ancho de ventana y
             en correo no hay clamp ni vw: se copian los dos valores que el
             sitio da de hecho, 38.5px en escritorio y ~30px en móvil, este
             último en la media query. El espaciado va en px por lo mismo,
             calculado sobre cada tamaño. -->
        <div class="hero" style="font-family:${FONT.display};font-size:38px;font-weight:400;line-height:1.02;letter-spacing:0.38px;text-transform:uppercase;color:${BRAND.fg};">You are in!</div>
        <div class="guest" style="font-family:${FONT.mono};font-size:16px;line-height:1.4;letter-spacing:5px;text-transform:uppercase;color:${BRAND.fg};padding-top:22px;">${escapeHtml(name)}</div>
      </td>
    </tr>

    <tr><td class="pad" align="center" style="padding:26px 44px 0 44px;"><table role="presentation" width="56" cellpadding="0" cellspacing="0" border="0" style="width:56px;"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.accent};">&nbsp;</td></tr></table></td></tr>

    <!-- El cuerpo de la invitación -->
    <tr>
      <td class="pad" align="center" style="padding:26px 44px 0 44px;font-family:${FONT.body};font-size:16px;line-height:1.7;color:${BRAND.fgMuted};">
        ${event.body.map((line) => `<div style="padding-bottom:12px;">${escapeHtml(line)}</div>`).join('\n        ')}
      </td>
    </tr>

    <!-- La noche, en datos -->
    <tr><td class="pad" style="padding:34px 44px 0 44px;">${rule()}</td></tr>
    <tr>
      <td class="pad" style="padding:28px 44px 0 44px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${detailRow('Fecha', escapeHtml(event.date))}
          ${detailRow('Hora', escapeHtml(event.time))}
          ${detailRow('Dresscode', escapeHtml(event.dresscode))}
          ${detailRow(
            'Location',
            `<a href="${event.mapsUrl}" style="color:${BRAND.fg};text-decoration:none;">&#128205;&nbsp;${escapeHtml(event.location)}<br><span style="color:${BRAND.fgMuted};">${escapeHtml(event.address)}</span></a>`,
            true,
          )}
        </table>
      </td>
    </tr>
    <tr><td class="pad" style="padding:28px 44px 0 44px;">${rule()}</td></tr>

    <!-- Cómo llegar. Con VML para que Outlook pinte el rectángulo rojo entero
         y no solo el texto. -->
    <tr>
      <td class="pad" align="center" style="padding:30px 44px 0 44px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${event.mapsUrl}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="0%" strokecolor="${BRAND.accent}" fillcolor="${BRAND.accent}">
          <w:anchorlock/>
          <center style="color:${BRAND.ink};font-family:Consolas,'Courier New',monospace;font-size:12px;letter-spacing:3px;">C&Oacute;MO LLEGAR</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${event.mapsUrl}" style="display:inline-block;padding:15px 34px;background-color:${BRAND.accent};color:${BRAND.ink};font-family:${FONT.mono};font-size:12px;font-weight:500;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border:1px solid ${BRAND.accent};">C&oacute;mo llegar &rarr;</a>
        <!--<![endif]-->
      </td>
    </tr>

    <!-- El flyer. Aquí sí va con height: es una imagen de contenido, y si no
         carga preferimos que el hueco conserve su sitio con el alt dentro. -->
    <tr>
      <td class="pad" align="center" style="padding:40px 44px 0 44px;font-size:0;line-height:0;">
        <img class="flyer" src="${flyerSrc}" width="${CONTENT_WIDTH}" height="${flyerHeight}" alt="${escapeHtml(event.flyer.alt)}"
             style="display:block;width:${CONTENT_WIDTH}px;height:auto;max-width:100%;border:1px solid ${BRAND.border};outline:none;text-decoration:none;font-family:${FONT.body};font-size:13px;line-height:1.5;color:${BRAND.fgMuted};">
      </td>
    </tr>

    <tr><td class="pad" style="padding:40px 44px 0 44px;">${rule()}</td></tr>

    <!-- Pie -->
    <tr>
      <td class="pad" style="padding:22px 44px 48px 44px;">
        <div style="font-family:${FONT.mono};font-size:10px;line-height:1.9;letter-spacing:1px;text-transform:uppercase;color:${BRAND.fgMuted};">
          The Door PR &mdash; Lima, Per&uacute;<br>
          Tu nombre est&aacute; en la puerta. La lista no se vende.<br>
          &iquest;No puedes llegar? Responde a este mismo correo.
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
    'YOU ARE IN!',
    '',
    name.toUpperCase(),
    '',
    ...event.body,
    '',
    `Fecha — ${event.date}`,
    `Hora — ${event.time}`,
    `Dresscode — ${event.dresscode}`,
    `Location — ${event.location}, ${event.address}`,
    '',
    `Cómo llegar: ${event.mapsUrl}`,
    '',
    '—',
    'The Door PR — Lima, Perú',
    'Tu nombre está en la puerta. La lista no se vende.',
    '¿No puedes llegar? Responde a este mismo correo.',
  ].join('\n')

  return { subject, html, text }
}
