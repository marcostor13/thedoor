import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { CreateSignupDto } from './dto/create-signup.dto'
import { SignupFormClient } from './signup-form.client'
import { MailService } from '../mail/mail.service'

export interface SignupResult {
  registered: true
  /** Ese correo ya estaba en la lista: no se ha creado nada nuevo. */
  duplicate: boolean
}

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name)

  constructor(
    private readonly form: SignupFormClient,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateSignupDto): Promise<SignupResult> {
    // Trampa para bots activada: se responde como en el caso correcto, para no
    // darle al bot ninguna señal de que ha sido detectado. Nada sale de aquí.
    if (dto.company) {
      this.logger.warn('Registro descartado: honeypot relleno')
      return { registered: true, duplicate: false }
    }

    // Un local sin nombre no es una solicitud que se pueda trabajar.
    if (dto.kind === 'venue' && !dto.reference?.trim()) {
      throw new BadRequestException('Indica el nombre del local.')
    }

    // Este `await` sí se espera, al contrario que el del correo: es la única
    // escritura que hay. Si lanza, el controlador devuelve error y la persona
    // lo reintenta — que es mucho mejor que decirle que está apuntada cuando
    // su nombre no ha llegado a ninguna parte.
    const { created } = await this.form.submit(
      {
        nombre: dto.name,
        email: dto.email,
        whatsapp: dto.phone,
        instagram: normalizeInstagram(dto.instagram),
      },
      dto.pageUrl,
    )

    const duplicate = !created

    // Sin `await`: quien acaba de registrarse no tiene por qué esperar a que
    // Resend conteste para ver su confirmación en pantalla.
    //
    // El `.catch` no es decorativo aunque MailService prometa no lanzar: una
    // promesa suelta que se rechaza es un unhandled rejection, y eso tumba el
    // proceso entero. El alta ya está escrita; que se pierda el saludo es un
    // problema mucho menor que caerse por ello.
    void this.mailService
      .sendSignupConfirmation(dto.email, {
        name: dto.name,
        kind: dto.kind,
        reference: dto.reference,
        duplicate,
      })
      .catch((error: unknown) => {
        this.logger.error(`Confirmación no enviada a ${dto.email}: ${String(error)}`)
      })

    return { registered: true, duplicate }
  }
}

/**
 * Instagram, tal como lo escribe la gente, a `@usuario`.
 *
 * Nadie lo pone igual: unos escriben el arroba, otros no, y quien lo copia
 * del navegador pega la URL entera con su `?igsh=…` detrás. Guardarlo crudo
 * deja una lista donde el mismo perfil aparece de cuatro formas y no se puede
 * ni ordenar ni buscar.
 *
 * Lo que no encaje como handle se guarda limpio pero tal cual: esto es un
 * campo opcional de un formulario público, y perder un alta porque alguien
 * escribió raro su Instagram sería un mal negocio.
 */
export function normalizeInstagram(value?: string): string | undefined {
  const raw = value?.trim()
  if (!raw) return undefined

  const handle = raw
    // URL pegada del navegador, con o sin protocolo y con o sin www.
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^instagram\.com\//i, '')
    // Lo que Instagram cuelga detrás al compartir.
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .replace(/^@+/, '')
    .trim()

  if (!handle) return undefined

  // Handle válido de Instagram: letras, números, punto y guion bajo, ≤ 30.
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `@${handle.toLowerCase()}` : raw
}
