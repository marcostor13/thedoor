import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { MailModule } from './mail/mail.module'
import { HealthModule } from './health/health.module'
import { ContactModule } from './contact/contact.module'
import { SignupModule } from './signup/signup.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),

    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGO_URI
        if (!uri) {
          throw new Error(
            'Falta MONGO_URI. Defínela en el entorno antes de arrancar la API.',
          )
        }
        return { uri }
      },
    }),

    // Límite global de peticiones. Los endpoints públicos de escritura
    // aprietan más este límite con su propio @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    MailModule,
    HealthModule,
    ContactModule,
    SignupModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
