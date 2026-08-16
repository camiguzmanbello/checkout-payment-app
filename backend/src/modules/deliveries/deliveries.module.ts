import { Body, Controller, Get, Injectable, Module, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../common/prisma.service';

export class CreateDeliveryDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  // Los nombres reales de municipios traen puntos, guiones y apóstrofes
  // ("Bogotá D.C.", "Villa d'Leyva"), así que la regla es "sin dígitos" y no
  // "solo letras". Los dígitos siguen fuera: son la señal de basura pegada.
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-zA-ZÀ-ÿ\s.'-]+$/, {
    message: 'city no admite dígitos ni símbolos',
  })
  city: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-zA-ZÀ-ÿ\s.'-]+$/, {
    message: 'region no admite dígitos ni símbolos',
  })
  region: string;

  @IsString()
  @Matches(/^\+?\d{7,15}$/, { message: 'phone debe tener entre 7 y 15 dígitos' })
  phone: string;
}

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDeliveryDto) {
    return this.prisma.delivery.create({ data });
  }

  findById(id: string) {
    return this.prisma.delivery.findUnique({ where: { id } });
  }
}

@ApiTags('deliveries')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly service: DeliveriesService) {}

  @Post()
  create(@Body() dto: CreateDeliveryDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
}

@Module({
  controllers: [DeliveriesController],
  providers: [DeliveriesService, PrismaService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
