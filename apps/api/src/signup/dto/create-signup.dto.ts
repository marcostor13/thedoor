import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { SIGNUP_KINDS, SignupKind } from '../signup.schema'

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

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string

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
}
