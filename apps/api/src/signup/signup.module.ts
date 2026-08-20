import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { SignupController } from './signup.controller'
import { SignupService } from './signup.service'
import { Signup, SignupSchema } from './signup.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: Signup.name, schema: SignupSchema }])],
  controllers: [SignupController],
  providers: [SignupService],
  exports: [SignupService],
})
export class SignupModule {}
