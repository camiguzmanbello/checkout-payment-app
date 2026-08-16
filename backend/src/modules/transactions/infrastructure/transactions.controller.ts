import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateTransactionUseCase } from '../application/create-transaction.usecase';
import { PayTransactionUseCase } from '../application/pay-transaction.usecase';
import { CreateTransactionDto, PayTransactionDto } from './dto';
import {
  TRANSACTION_REPOSITORY,
  TransactionRepositoryPort,
} from '../domain/transaction.repository.port';
import { Inject } from '@nestjs/common';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly payTransaction: PayTransactionUseCase,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
  ) {}

  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    const result = await this.createTransaction.execute(dto);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
    return result.value;
  }

  @Post(':id/pay')
  async pay(@Param('id') id: string, @Body() dto: PayTransactionDto) {
    const result = await this.payTransaction.execute({
      transactionId: id,
      customerEmail: dto.customerEmail,
      card: {
        number: dto.cardNumber,
        cvc: dto.cvc,
        expMonth: dto.expMonth,
        expYear: dto.expYear,
        cardHolder: dto.cardHolder,
      },
    });
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
    return result.value;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }
}
