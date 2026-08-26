/**
 * Lo que comparten todas las plantillas de correo.
 *
 * Vive aparte porque el escapado no es un detalle de una plantilla concreta:
 * cada texto que venga de un formulario público tiene que pasar por aquí antes
 * de entrar en el HTML, y tenerlo en un solo sitio es lo que hace que se note
 * cuando alguien se lo salta.
 */

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

/** El cuerpo lleva `<strong>` y entidades: la versión en texto plano no. */
export function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
