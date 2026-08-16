import { createHash } from 'node:crypto';
import { CardData, PaymentGatewayPort } from '../payment-gateway.port';

const BASE_URL = 'https://gateway.test/v1';
const PUBLIC_KEY = 'pub_test_key';
const PRIVATE_KEY = 'prv_test_key';
const INTEGRITY_SECRET = 'test_integrity_secret';

const card: CardData = {
  number: '4242424242424242',
  cvc: '123',
  expMonth: '12',
  expYear: '29',
  cardHolder: 'Maria Camila Guzman',
};

const charge = {
  amountInCents: 1320000,
  reference: 'TXN-1',
  cardToken: 'tok_123',
  customerEmail: 'buyer@example.com',
};

const jsonOk = (data: unknown) => ({ ok: true, status: 200, json: async () => data });
const jsonFail = (status: number, data: unknown) => ({
  ok: false,
  status,
  json: async () => data,
});

const acceptanceResponse = jsonOk({
  data: { presigned_acceptance: { acceptance_token: 'acc_token' } },
});

const transactionResponse = (status: string, id = 'gw-1') =>
  jsonOk({ data: { id, status } });

describe('PaymentGatewayHttpAdapter', () => {
  // The polling budget is read once when the module loads, so each budget needs
  // its own instance: a generous one for the happy paths and an impatient one
  // for the timeout. Anything tight here turns flaky as soon as the machine is
  // busy running the other suites.
  let adapter: PaymentGatewayPort;
  let impatientAdapter: PaymentGatewayPort;
  let fetchMock: jest.Mock;

  const loadAdapter = async (pollTimeoutMs: string) => {
    process.env.PAYMENT_GATEWAY_SANDBOX_URL = BASE_URL;
    process.env.PAYMENT_GATEWAY_PUBLIC_KEY = PUBLIC_KEY;
    process.env.PAYMENT_GATEWAY_PRIVATE_KEY = PRIVATE_KEY;
    process.env.PAYMENT_GATEWAY_INTEGRITY_SECRET = INTEGRITY_SECRET;
    process.env.PAYMENT_GATEWAY_POLL_INTERVAL_MS = '1';
    process.env.PAYMENT_GATEWAY_POLL_TIMEOUT_MS = pollTimeoutMs;

    jest.resetModules();
    const module = await import('./payment-gateway-http.adapter');
    return new module.PaymentGatewayHttpAdapter();
  };

  beforeAll(async () => {
    adapter = await loadAdapter('5000');
    impatientAdapter = await loadAdapter('5');
  });

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  describe('tokenizeCard', () => {
    it('returns the token id issued by the gateway', async () => {
      fetchMock.mockResolvedValueOnce(jsonOk({ data: { id: 'tok_abc' } }));

      const token = await adapter.tokenizeCard(card);

      expect(token).toBe('tok_abc');
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tokens/cards`);
      expect(options.headers.Authorization).toBe(`Bearer ${PUBLIC_KEY}`);
      expect(JSON.parse(options.body)).toEqual({
        number: card.number,
        cvc: card.cvc,
        exp_month: card.expMonth,
        exp_year: card.expYear,
        card_holder: card.cardHolder,
      });
    });

    it('throws when the gateway rejects the card data', async () => {
      fetchMock.mockResolvedValueOnce(jsonFail(422, {}));

      await expect(adapter.tokenizeCard(card)).rejects.toThrow(
        'Gateway tokenize failed: 422',
      );
    });
  });

  describe('createTransaction', () => {
    it('signs the request with SHA256 of reference, amount, currency and secret', async () => {
      fetchMock
        .mockResolvedValueOnce(acceptanceResponse)
        .mockResolvedValueOnce(transactionResponse('APPROVED'));

      await adapter.createTransaction(charge);

      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      const expected = createHash('sha256')
        .update(`TXN-11320000COP${INTEGRITY_SECRET}`)
        .digest('hex');

      expect(body.signature).toBe(expected);
      expect(body.acceptance_token).toBe('acc_token');
      expect(body.currency).toBe('COP');
      expect(body.amount_in_cents).toBe(1320000);
      expect(body.payment_method).toEqual({
        type: 'CARD',
        installments: 1,
        token: 'tok_123',
      });
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
        `Bearer ${PRIVATE_KEY}`,
      );
    });

    it('forwards the requested number of installments', async () => {
      fetchMock
        .mockResolvedValueOnce(acceptanceResponse)
        .mockResolvedValueOnce(transactionResponse('APPROVED'));

      await adapter.createTransaction({ ...charge, installments: 6 });

      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body.payment_method.installments).toBe(6);
    });

    it('returns ERROR with the raw body when the gateway rejects the request', async () => {
      const errorBody = {
        error: { type: 'INPUT_VALIDATION_ERROR', messages: { signature: ['missing'] } },
      };
      fetchMock
        .mockResolvedValueOnce(acceptanceResponse)
        .mockResolvedValueOnce(jsonFail(422, errorBody));

      const result = await adapter.createTransaction(charge);

      expect(result).toEqual({
        gatewayTransactionId: '',
        status: 'ERROR',
        raw: errorBody,
      });
    });

    it('does not poll when the charge is already final', async () => {
      fetchMock
        .mockResolvedValueOnce(acceptanceResponse)
        .mockResolvedValueOnce(transactionResponse('APPROVED'));

      const result = await adapter.createTransaction(charge);

      expect(result.status).toBe('APPROVED');
      expect(result.gatewayTransactionId).toBe('gw-1');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('polling a PENDING charge', () => {
    it('polls until the gateway approves it', async () => {
      fetchMock
        .mockResolvedValueOnce(acceptanceResponse)
        .mockResolvedValueOnce(transactionResponse('PENDING'))
        .mockResolvedValueOnce(transactionResponse('PENDING'))
        .mockResolvedValueOnce(transactionResponse('APPROVED'));

      const result = await adapter.createTransaction(charge);

      expect(result.status).toBe('APPROVED');
      expect(result.gatewayTransactionId).toBe('gw-1');
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock.mock.calls[3][0]).toBe(`${BASE_URL}/transactions/gw-1`);
    });

    it('polls until the gateway declines it', async () => {
      fetchMock
        .mockResolvedValueOnce(acceptanceResponse)
        .mockResolvedValueOnce(transactionResponse('PENDING'))
        .mockResolvedValueOnce(transactionResponse('DECLINED'));

      const result = await adapter.createTransaction(charge);

      expect(result.status).toBe('DECLINED');
    });

    it('reports VOIDED as ERROR because it is not a successful charge', async () => {
      fetchMock
        .mockResolvedValueOnce(acceptanceResponse)
        .mockResolvedValueOnce(transactionResponse('PENDING'))
        .mockResolvedValueOnce(transactionResponse('VOIDED'));

      const result = await adapter.createTransaction(charge);

      expect(result.status).toBe('ERROR');
      expect(result.gatewayTransactionId).toBe('gw-1');
    });

    it('retries a failed poll instead of giving up on the charge', async () => {
      fetchMock
        .mockResolvedValueOnce(acceptanceResponse)
        .mockResolvedValueOnce(transactionResponse('PENDING'))
        .mockResolvedValueOnce(jsonFail(503, {}))
        .mockResolvedValueOnce(transactionResponse('APPROVED'));

      const result = await adapter.createTransaction(charge);

      expect(result.status).toBe('APPROVED');
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('gives up as ERROR when the budget expires but keeps the transaction id', async () => {
      fetchMock
        .mockResolvedValueOnce(acceptanceResponse)
        .mockResolvedValueOnce(transactionResponse('PENDING'))
        .mockResolvedValue(transactionResponse('PENDING'));

      const result = await impatientAdapter.createTransaction(charge);

      expect(result.status).toBe('ERROR');
      // Without this id the charge could never be reconciled afterwards.
      expect(result.gatewayTransactionId).toBe('gw-1');
    });
  });
});
