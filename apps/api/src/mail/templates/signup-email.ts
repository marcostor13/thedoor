/**
 * Qué correo recibe quien acaba de apuntarse.
 *
 * La decisión vive aquí, fuera del servicio de envío, porque depende del
 * calendario y eso hay que poder probarlo sin esperar a que pase la fecha: el
 * `now` se inyecta.
 */
import { renderSignupConfirmation, type SignupConfirmationData } from './signup-confirmation'
import { renderEventInvitation } from './event-invitation'
import { renderOscarsList } from './oscars-list'
import { eventOnBill, oscarsListOnBill } from './event'
import type { RenderedEmail } from './html'

/**
 * Con una noche en cartel, quien se apunta como invitado recibe el pase a esa
 * fecha en lugar de un «te avisaremos»: es justo lo que ha venido a pedir. Una
 * vez pasada, las funciones `…OnBill()` dejan de devolver evento y vuelve sola
 * la confirmación genérica, sin que nadie tenga que acordarse de desactivarla.
 *
 * Cada noche trae su plantilla: Oscar's List se saluda por el nombre y se
 * despide con la dirección; las de The Door PR dan un pase. Las ventanas no se
 * solapan —cada evento tiene su `startsAt`/`endsAt`—, así que el orden de
 * estas comprobaciones no decide nada; se lee de la más reciente a la más
 * antigua porque es donde se mira primero al cambiar de cartel.
 *
 * Un local nunca entra por la invitación: `reference` es el nombre de su sala y
 * lo que espera es la respuesta a su solicitud, no un pase para la puerta.
 */
export function renderSignupEmail(
  data: SignupConfirmationData,
  now: Date = new Date(),
): RenderedEmail {
  if (data.kind !== 'guest') return renderSignupConfirmation(data)

  const oscars = oscarsListOnBill(now)
  if (oscars) {
    return renderOscarsList({ name: data.name, siteUrl: data.siteUrl, event: oscars })
  }

  const event = eventOnBill(now)
  if (event) {
    return renderEventInvitation({ name: data.name, siteUrl: data.siteUrl, event })
  }

  return renderSignupConfirmation(data)
}
