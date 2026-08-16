import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  CardData,
  ChargeResult,
  PaymentGatewayPort,
} from '../payment-gateway.port';

// Adapter HTTP hacia la pasarela de pagos configurada por variables de entorno.
// Doc de referencia (ver .env para las URLs reales del sandbox del proveedor).
//
// Flujo real:
// 1. Tokenizar la tarjeta con la llave PÚBLICA (POST /tokens/cards)
// 2. Obtener acceptance_token (GET /merchants/:public_key)
// 3. Crear la transacción con la llave PRIVADA (POST /transactions), firmada
//    con la firma de integridad
// 4. Consultar el estado (GET /transactions/:id) hasta que salga de PENDING

const CURRENCY = 'COP';

// Card charges come back PENDING and finalize a few seconds later, so step 4
// polls until the gateway reports a terminal status or we run out of budget.
const POLL_INTERVAL_MS = Number(process.env.PAYMENT_GATEWAY_POLL_INTERVAL_MS ?? 1500);
const POLL_TIMEOUT_MS = Number(process.env.PAYMENT_GATEWAY_POLL_TIMEOUT_MS ?? 20000);

// Statuses the gateway can report. VOIDED and ERROR are terminal but not a
// successful charge, so they collapse into our own ERROR.
type GatewayStatus = 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class PaymentGatewayHttpAdapter implements PaymentGatewayPort {
  private readonly baseUrl =
    process.env.PAYMENT_GATEWAY_SANDBOX_URL ?? '';
  private readonly publicKey = process.env.PAYMENT_GATEWAY_PUBLIC_KEY!;
  private readonly privateKey = process.env.PAYMENT_GATEWAY_PRIVATE_KEY!;
  private readonly integritySecret =
    process.env.PAYMENT_GATEWAY_INTEGRITY_SECRET!;

  async tokenizeCard(card: CardData): Promise<string> {
    const res = await fetch(`${this.baseUrl}/tokens/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.publicKey}`,
      },
      body: JSON.stringify({
        number: card.number,
        cvc: card.cvc,
        exp_month: card.expMonth,
        exp_year: card.expYear,
        card_holder: card.cardHolder,
      }),
    });

    if (!res.ok) {
      throw new Error(`Gateway tokenize failed: ${res.status}`);
    }

    const body = await res.json();
    return body.data.id as string;
  }

  // Integrity signature the gateway requires on every transaction:
  // SHA256 over reference + amount in cents + currency + integrity secret.
  private buildSignature(reference: string, amountInCents: number): string {
    return createHash('sha256')
      .update(`${reference}${amountInCents}${CURRENCY}${this.integritySecret}`)
      .digest('hex');
  }

  private async getAcceptanceToken(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/merchants/${this.publicKey}`);
    const body = await res.json();
    return body.data.presigned_acceptance.acceptance_token as string;
  }

  async createTransaction(params: {
    amountInCents: number;
    reference: string;
    cardToken: string;
    customerEmail: string;
    installments?: number;
  }): Promise<ChargeResult> {
    const acceptanceToken = await this.getAcceptanceToken();

    const res = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.privateKey}`,
      },
      body: JSON.stringify({
        amount_in_cents: params.amountInCents,
        currency: CURRENCY,
        customer_email: params.customerEmail,
        reference: params.reference,
        acceptance_token: acceptanceToken,
        signature: this.buildSignature(params.reference, params.amountInCents),
        payment_method: {
          type: 'CARD',
          installments: params.installments ?? 1,
          token: params.cardToken,
        },
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      return {
        gatewayTransactionId: '',
        status: 'ERROR',
        raw: body,
      };
    }

    const gatewayTransactionId = body.data.id as string;
    const status = body.data.status as GatewayStatus;

    if (status !== 'PENDING') {
      return {
        gatewayTransactionId,
        status: toChargeStatus(status),
        raw: body,
      };
    }

    return this.waitForFinalStatus(gatewayTransactionId, body);
  }

  // Step 4: poll GET /transactions/:id until the charge leaves PENDING or the
  // timeout expires. A failed poll is treated as transient and retried, since
  // the charge itself already exists on the gateway side.
  private async waitForFinalStatus(
    gatewayTransactionId: string,
    createBody: unknown,
  ): Promise<ChargeResult> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let lastBody: unknown = createBody;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      const res = await fetch(
        `${this.baseUrl}/transactions/${gatewayTransactionId}`,
        { headers: { Authorization: `Bearer ${this.privateKey}` } },
      );

      if (!res.ok) {
        continue;
      }

      const body = await res.json();
      lastBody = body;

      const status = body.data.status as GatewayStatus;
      if (status !== 'PENDING') {
        return {
          gatewayTransactionId,
          status: toChargeStatus(status),
          raw: body,
        };
      }
    }

    // Still PENDING when the budget ran out. The charge may finalize later on
    // the gateway side, so this is reported as ERROR but the transaction id is
    // kept: it is the only way to reconcile the real status afterwards.
    return {
      gatewayTransactionId,
      status: 'ERROR',
      raw: lastBody,
    };
  }
}

function toChargeStatus(status: GatewayStatus): ChargeResult['status'] {
  return status === 'APPROVED' || status === 'DECLINED' ? status : 'ERROR';
}
