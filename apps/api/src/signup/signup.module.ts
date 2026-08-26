import { Module } from '@nestjs/common'
import { SignupController } from './signup.controller'
import { SignupService } from './signup.service'
import { SignupFormClient } from './signup-form.client'

// Sin Mongo: las altas se guardan en el formulario público de la plataforma,
// no en una colección propia.
@Module({
  controllers: [SignupController],
  providers: [SignupService, SignupFormClient],
  exports: [SignupService],
})
export class SignupModule {}
