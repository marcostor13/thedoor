import { Controller, Get } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Sonda de estado que consulta Coolify. Informa del estado de la conexión a
   * Mongo pero responde 200 igualmente: una base de datos caída no debe
   * provocar que el orquestador recicle el contenedor en bucle.
   */
  @Get()
  check(): { status: string; database: string; uptime: number } {
    // 1 = connected, según los readyState de Mongoose.
    const connected = this.connection.readyState === 1

    return {
      status: 'ok',
      database: connected ? 'up' : 'down',
      uptime: Math.round(process.uptime()),
    }
  }
}
