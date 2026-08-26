/**
 * Qué correo recibe quien acaba de apuntarse.
 *
 * La decisión vive aquí, fuera del servicio de envío, porque depende del
 * calendario y eso hay que poder probarlo sin esperar a que pase la fecha: el
 * `now` se inyecta.
 */
import { renderSignupConfirmation, type SignupConfirmationData } from './signup-confirmation'
import { renderEventInvitation } from './event-invitation'
import { eventOnBill } from './event'
import type { RenderedEmail } from './html'

/**
 * Con una noche en cartel, quien se apunta como invitado recibe el pase a esa
 * fecha en lugar de un «te avisaremos»: es justo lo que ha venido a pedir. Una
 * vez pasada, `eventOnBill()` deja de devolver evento y vuelve sola la
 * confirmación genérica, sin que nadie tenga que acordarse de desactivarla.
 *
 * Un local nunca entra por la invitación: `reference` es el nombre de su sala y
 * lo que espera es la respuesta a su solicitud, no un pase para la puerta.
 */
export function renderSignupEmail(
  data: SignupConfirmationData,
  now: Date = new Date(),
): RenderedEmail {
  const event = data.kind === 'guest' ? eventOnBill(now) : undefined

  return event
    ? renderEventInvitation({ name: data.name, siteUrl: data.siteUrl, event })
    : renderSignupConfirmation(data)
}
