import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { fail, ok } from '../../../common/result';

describe('TransactionsController', () => {
  const mockCreateTransaction = { execute: jest.fn() };
  const mockPayTransaction = { execute: jest.fn() };
  const mockTransactionRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    updateResult: jest.fn(),
  };

  const controller = new TransactionsController(
    mockCreateTransaction as any,
    mockPayTransaction as any,
    mockTransactionRepo as any,
  );

  const createDto = {
    productId: 'p1',
    quantity: 1,
    customerId: 'c1',
    deliveryId: 'd1',
  };

  const payDto = {
    cardNumber: '4242424242424242',
    cvc: '123',
    expMonth: '12',
    expYear: '29',
    cardHolder: 'Maria Camila Guzman',
    customerEmail: 'buyer@example.com',
  };

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('returns the transaction created by the use case', async () => {
      mockCreateTransaction.execute.mockResolvedValue(ok({ id: 't1' }));

      await expect(controller.create(createDto)).resolves.toEqual({ id: 't1' });
    });

    it('translates a domain failure into 400', async () => {
      mockCreateTransaction.execute.mockResolvedValue(fail('INSUFFICIENT_STOCK'));

      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.create(createDto)).rejects.toThrow(
        'INSUFFICIENT_STOCK',
      );
    });
  });

  describe('pay', () => {
    it('maps the flat DTO onto the card the use case expects', async () => {
      mockPayTransaction.execute.mockResolvedValue(ok({ id: 't1' }));

      await controller.pay('t1', payDto);

      expect(mockPayTransaction.execute).toHaveBeenCalledWith({
        transactionId: 't1',
        customerEmail: 'buyer@example.com',
        card: {
          number: '4242424242424242',
          cvc: '123',
          expMonth: '12',
          expYear: '29',
          cardHolder: 'Maria Camila Guzman',
        },
      });
    });

    it('returns the updated transaction', async () => {
      mockPayTransaction.execute.mockResolvedValue(
        ok({ id: 't1', status: 'APPROVED' }),
      );

      await expect(controller.pay('t1', payDto)).resolves.toEqual({
        id: 't1',
        status: 'APPROVED',
      });
    });

    it('translates a missing transaction into 400', async () => {
      mockPayTransaction.execute.mockResolvedValue(fail('TRANSACTION_NOT_FOUND'));

      await expect(controller.pay('missing', payDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('returns the stored transaction', async () => {
      mockTransactionRepo.findById.mockResolvedValue({ id: 't1' });

      await expect(controller.findOne('t1')).resolves.toEqual({ id: 't1' });
    });

    it('throws 404 when the transaction does not exist', async () => {
      mockTransactionRepo.findById.mockResolvedValue(null);

      await expect(controller.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
