import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

// Liveness probe for the host (Render's Health Check Path). It deliberately
// does not touch the database: the host polls it every few seconds, and a
// query on each poll would keep a scale-to-zero Postgres awake for nothing.
// A database that is down already fails the boot in PrismaService.
@ApiExcludeController()
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
