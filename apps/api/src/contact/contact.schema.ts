import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type ContactDocument = HydratedDocument<Contact>

@Schema({ timestamps: true, collection: 'contacts' })
export class Contact {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name!: string

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 180 })
  email!: string

  @Prop({ required: true, trim: true, maxlength: 4000 })
  message!: string

  /** Opcionales del formulario de la portada. */
  @Prop({ trim: true, maxlength: 40 })
  phone?: string

  @Prop({ trim: true, maxlength: 200 })
  instagram?: string

  /** Qué formulario lo envió: el de locales o el de la guest list. */
  @Prop({ enum: ['venue', 'guest'] })
  kind?: 'venue' | 'guest'

  @Prop({ default: false })
  handled!: boolean
}

export const ContactSchema = SchemaFactory.createForClass(Contact)

// Los mensajes se consultan siempre por fecha descendente en el panel.
ContactSchema.index({ createdAt: -1 })
