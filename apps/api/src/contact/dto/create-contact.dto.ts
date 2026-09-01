import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

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
   * Teléfono de contacto. Opcional: el formulario de la portada lo pide para
   * poder seguir la conversación por WhatsApp, pero no bloquea el envío.
   */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string

  /** Instagram, opcional. Se acepta como venga: «@ana», «ana» o la URL. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagram?: string

  /**
   * De cuál de las dos puertas de la portada viene el mensaje: un local que
   * se ofrece o alguien que pide entrar en la lista.
   */
  @IsOptional()
  @IsIn(['venue', 'guest'])
  kind?: 'venue' | 'guest'

  /**
   * Trampa para bots. El formulario lo mantiene oculto, así que una persona
   * nunca lo rellena; si llega con contenido, el envío se descarta.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string
}
