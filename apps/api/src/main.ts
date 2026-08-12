import 'reflect-metadata'
import { setServers } from 'node:dns'
import { ValidationPipe, Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module'

// Algunos resolvers DNS (redes corporativas, ciertas VPN) fallan la consulta
// SRV que necesita `mongodb+srv://` aunque el resto de DNS funcione. Apuntar
// el resolver de Node a servidores públicos antes de conectar evita ese fallo
// sin depender de la configuración de red del host.
const dnsServers = process.env.NODE_DNS_SERVERS
if (dnsServers) {
  setServers(
    dnsServers
      .split(',')
      .map((server) => server.trim())
      .filter(Boolean),
  )
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())

  // Lista blanca explícita de orígenes. Sin CORS_ORIGINS definido solo se
  // permite el desarrollo local: un despliegue mal configurado falla de forma
  // visible en lugar de quedar abierto a cualquier origen.
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:4321')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.setGlobalPrefix('', { exclude: ['health'] })

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port, '0.0.0.0')

  Logger.log(`API escuchando en el puerto ${port}`, 'Bootstrap')
  Logger.log(`Orígenes CORS permitidos: ${origins.join(', ')}`, 'Bootstrap')
}

void bootstrap()
