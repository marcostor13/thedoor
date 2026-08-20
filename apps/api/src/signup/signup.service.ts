import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateSignupDto } from './dto/create-signup.dto'
import { Signup, SignupDocument } from './signup.schema'
import { MailService } from '../mail/mail.service'

export interface SignupResult {
  registered: true
  /** Ese correo ya estaba en la lista: no se ha creado nada nuevo. */
  duplicate: boolean
}

/** Código de error de MongoDB para violación de índice único. */
const DUPLICATE_KEY = 11000

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name)

  constructor(
    @InjectModel(Signup.name)
    private readonly signupModel: Model<SignupDocument>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateSignupDto): Promise<SignupResult> {
    // Trampa para bots activada: se responde como en el caso correcto, para no
    // darle al bot ninguna señal de que ha sido detectado.
    if (dto.company) {
      this.logger.warn('Registro descartado: honeypot relleno')
      return { registered: true, duplicate: false }
    }

    // Un local sin nombre no es una solicitud que se pueda trabajar.
    if (dto.kind === 'venue' && !dto.reference?.trim()) {
      throw new BadRequestException('Indica el nombre del local.')
    }

    let duplicate = false

    try {
      await this.signupModel.create({
        kind: dto.kind,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        instagram: normalizeInstagram(dto.instagram),
        reference: dto.reference,
        city: dto.city,
      })
    } catch (error) {
      // Segundo envío del mismo correo: para quien lo manda no es un error,
      // es la confirmación de que ya estaba dentro.
      if (!isDuplicateKeyError(error)) throw error
      duplicate = true
    }

    // Sin `await`: quien acaba de registrarse no tiene por qué esperar a que
    // un SMTP conteste para ver su confirmación en pantalla.
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

  async findAll(limit = 50): Promise<Signup[]> {
    return this.signupModel
      .find()
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean()
      .exec()
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

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === DUPLICATE_KEY
}
