import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsEmail()
  @MaxLength(180)
  email!: string

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string

  /**
   * Trampa para bots. El formulario lo mantiene oculto, así que una persona
   * nunca lo rellena; si llega con contenido, el envío se descarta.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string
}
