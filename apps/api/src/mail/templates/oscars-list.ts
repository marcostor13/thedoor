/**
 * Confirmación de la landing cuando la noche en cartel es Oscar's List.
 *
 * Es otra plantilla y no una variante de `event-invitation.ts` porque el tono
 * es otro: aquí no se da un pase con el nombre en mayúsculas a la puerta, se
 * saluda por el nombre y se dice dónde y a qué hora. El flyer va al final,
 * como recordatorio, no como cabecera — la dirección y la hora están escritas
 * encima de él, en texto.
 *
 * Se construye a mano, con tablas y estilos en línea, por lo mismo que el
 * resto de plantillas: un cliente de correo no es un navegador. No hay
 * flexbox, ni grid, ni hojas externas, ni custom properties, y Outlook sigue
 * maquetando con el motor de Word. Las reglas que explican por qué está
 * escrito así:
 *
 *   · Todo el estilo va en línea. Gmail descarta gran parte del <style>.
 *   · La maqueta son tablas `role="presentation"` anidadas, no divs.
 *   · Nada esencial depende de una imagen. La mayoría de clientes las bloquea
 *     la primera vez, así que el wordmark es TEXTO y los datos de la noche
 *     —fecha, hora, dirección— están escritos, no solo dentro del flyer.
 *   · Fondo negro de lado a lado y `color-scheme: dark`, para que el modo
 *     oscuro de Gmail o de Outlook no intente reinvertir la paleta.
 */
import { BRAND, FONT, CARD_WIDTH } from './branding'
import type { EventDetails } from './event'
import { escapeHtml, type RenderedEmail } from './html'

export interface OscarsListData {
  /** Nombre tal cual lo escribió la persona. Se escapa antes de pintarlo. */
  name: string
  /** Base pública del sitio, sin barra final. De aquí cuelga el flyer. */
  siteUrl: string
  event: EventDetails
}

/** Ancho útil dentro del margen lateral de la tarjeta. */
const CONTENT_WIDTH = CARD_WIDTH - 44 * 2

/** El nombre de quien se registró, limpio de espacios de más. */
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
function rule(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.border};">&nbsp;</td></tr></table>`
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

export function renderOscarsList(data: OscarsListData): RenderedEmail {
  const site = data.siteUrl.replace(/\/+$/, '')
  const doorSrc = `${site}/email/door.png`
  const event = data.event
  const flyerSrc = `${site}${event.flyer.path}`
  const name = guestName(data.name)

  // El flyer se pinta al ancho útil de la tarjeta; el alto va calculado a su
  // proporción real para que Outlook —que ignora `height:auto`— no lo deforme.
  const flyerHeight = Math.round((event.flyer.height / event.flyer.width) * CONTENT_WIDTH)

  const subject = `Estás en Oscar’s List — ${event.date}`
  const preheader = `${event.date} · ${event.time} · ${event.address}. Dress code: ${event.dresscode.toLowerCase()}.`

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
    .kicker { font-size:22px !important; letter-spacing:0.22px !important; }
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

    <!-- El titular. Misma tipografía que el de la invitación: Italiana en 400,
         interlineado 1.02 y el espaciado normal de la marca. El tamaño del
         sitio es un clamp y en correo no hay clamp ni vw, así que van los dos
         valores que el sitio da de hecho —38px y ~30px—, el segundo en la
         media query.

         Debajo, la respuesta: «You are in», con la misma tipografía y el mismo
         rojo que el «Or are you out?» de la portada —Italiana en cursiva, caja
         alta, acento de marca—. Ahí es una pregunta abierta; aquí ya está
         contestada, y por eso hereda su letra y no la mono de las etiquetas. -->
    <tr>
      <td class="pad" align="center" style="padding:46px 44px 0 44px;">
        <div class="hero" style="font-family:${FONT.display};font-size:38px;font-weight:400;line-height:1.02;letter-spacing:0.38px;text-transform:uppercase;color:${BRAND.fg};">Oscar&rsquo;s List</div>
        <div class="kicker" style="font-family:${FONT.display};font-size:28px;font-weight:400;font-style:italic;line-height:1.05;letter-spacing:0.28px;text-transform:uppercase;color:${BRAND.accent};padding-top:14px;">You are in</div>
      </td>
    </tr>

    <tr><td class="pad" align="center" style="padding:26px 44px 0 44px;"><table role="presentation" width="56" cellpadding="0" cellspacing="0" border="0" style="width:56px;"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.accent};">&nbsp;</td></tr></table></td></tr>

    <!-- El saludo. El nombre va en su propio <span> y en crema: es el único
         dato del correo que cambia de una persona a otra, y así se ve de un
         vistazo —al revisar un envío en lote— que cada correo lleva el suyo. -->
    <tr>
      <td class="pad" align="center" style="padding:30px 44px 0 44px;font-family:${FONT.body};font-size:17px;line-height:1.6;color:${BRAND.fgMuted};">
        Hola <span style="color:${BRAND.fg};font-weight:600;">${escapeHtml(name)}</span>
      </td>
    </tr>

    <!-- El cuerpo del mensaje -->
    <tr>
      <td class="pad" align="center" style="padding:18px 44px 0 44px;font-family:${FONT.body};font-size:16px;line-height:1.7;color:${BRAND.fgMuted};">
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
          ${detailRow('Dress code', escapeHtml(event.dresscode))}
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
          Invitaci&oacute;n personal y no transferible.<br>
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
    'OSCAR’S LIST — YOU ARE IN',
    '',
    // El saludo va en mayúsculas por lo mismo que los titulares de la marca, y
    // deja el nombre completo en el texto plano: es lo que comprueba
    // `enviar-invitaciones.ts --verificar` antes de un envío en lote.
    `HOLA ${name.toUpperCase()}`,
    '',
    ...event.body,
    '',
    `Fecha — ${event.date}`,
    `Hora — ${event.time}`,
    `Dress code — ${event.dresscode}`,
    `Location — ${event.location}, ${event.address}`,
    '',
    `Cómo llegar: ${event.mapsUrl}`,
    '',
    '—',
    'The Door PR — Lima, Perú',
    'Invitación personal y no transferible.',
    '¿No puedes llegar? Responde a este mismo correo.',
  ].join('\n')

  return { subject, html, text }
}
