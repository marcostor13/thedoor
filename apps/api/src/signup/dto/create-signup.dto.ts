import { IsEmail, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator'
import { SIGNUP_KINDS, SignupKind } from '../signup.kinds'

export class CreateSignupDto {
  @IsIn(SIGNUP_KINDS)
  kind!: SignupKind

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsEmail()
  @MaxLength(180)
  email!: string

  /**
   * WhatsApp. Obligatorio, y no por gusto: el formulario de la plataforma donde
   * se guardan las altas lo marca como requerido y rechaza con un 400 lo que
   * llegue sin él. Pedirlo aquí convierte ese rechazo en una validación que la
   * persona ve antes de enviar, en lugar de un error después.
   */
  @IsString()
  @MinLength(6)
  @MaxLength(40)
  phone!: string

  /**
   * Instagram, opcional. Se acepta como venga —«@ana», «ana», o la URL
   * completa pegada desde el navegador— porque nadie lo escribe igual, y el
   * servicio lo normaliza antes de guardarlo. El límite es holgado a
   * propósito: 30 es el máximo de un handle, pero una URL con parámetros
   * ocupa mucho más y no queremos rechazar un alta por eso.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagram?: string

  /** Nombre del local si `kind` es `venue`; quién le refiere si es `guest`. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reference?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string

  /**
   * Trampa para bots. El formulario lo mantiene oculto, así que una persona
   * nunca lo rellena; si llega con contenido, el registro se descarta.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string

  /**
   * Desde qué página se apuntó. Viaja tal cual a la plataforma, que lo guarda
   * junto al contacto: es lo que distingue un alta de `/registro` de una que
   * viene del enlace de una anfitriona concreta.
   *
   * `require_tld: false` porque en desarrollo la página es `localhost`.
   */
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(500)
  pageUrl?: string
}
