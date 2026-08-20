import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type SignupDocument = HydratedDocument<Signup>

/** Los dos públicos de la casa: quien tiene sala y quien quiere entrar. */
export const SIGNUP_KINDS = ['venue', 'guest'] as const
export type SignupKind = (typeof SIGNUP_KINDS)[number]

export const SIGNUP_STATUSES = ['pending', 'approved', 'rejected'] as const
export type SignupStatus = (typeof SIGNUP_STATUSES)[number]

@Schema({ timestamps: true, collection: 'signups' })
export class Signup {
  // El tipo de un alias de unión no se puede inferir por reflexión: hay que
  // declararlo a mano en el @Prop.
  @Prop({ type: String, required: true, enum: SIGNUP_KINDS, index: true })
  kind!: SignupKind

  @Prop({ required: true, trim: true, maxlength: 120 })
  name!: string

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 180 })
  email!: string

  @Prop({ trim: true, maxlength: 40 })
  phone?: string

  /** Handle de Instagram normalizado a `@usuario`. */
  @Prop({ trim: true, maxlength: 120 })
  instagram?: string

  /** Nombre del local (kind `venue`) o referencia/Instagram (kind `guest`). */
  @Prop({ trim: true, maxlength: 160 })
  reference?: string

  @Prop({ trim: true, maxlength: 80 })
  city?: string

  @Prop({ type: String, required: true, enum: SIGNUP_STATUSES, default: 'pending', index: true })
  status!: SignupStatus
}

export const SignupSchema = SchemaFactory.createForClass(Signup)

// Una persona, una solicitud: el índice único es lo que convierte un segundo
// envío en «ya estás en la lista» en vez de en un duplicado silencioso.
SignupSchema.index({ email: 1 }, { unique: true })

// La bandeja de solicitudes se lee siempre por fecha descendente.
SignupSchema.index({ createdAt: -1 })
