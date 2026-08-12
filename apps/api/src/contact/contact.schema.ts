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

  @Prop({ default: false })
  handled!: boolean
}

export const ContactSchema = SchemaFactory.createForClass(Contact)

// Los mensajes se consultan siempre por fecha descendente en el panel.
ContactSchema.index({ createdAt: -1 })
