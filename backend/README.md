# Backend — Checkout API

Layered structure (hexagonal / ports & adapters):

```
src/
  common/                -> Prisma service, Result type (ROP)
  modules/
    products/
      domain/            -> entity + repository port
      application/       -> use cases
      infrastructure/    -> controller + Prisma repository (adapter)
    customers/           -> simplified (direct CRUD)
    deliveries/          -> simplified (direct CRUD)
    transactions/        -> the core checkout module
    payment-gateway/     -> port + HTTP adapter towards the payment provider
```

Every `*.spec.ts` sits next to the file it covers. The dependency rule is that
`domain/` knows nothing about the outside, `application/` depends only on ports,
and `infrastructure/` is the only layer allowed to touch HTTP, Prisma or Nest
decorators for transport concerns.

Write use cases return a `Result<T, E>` (`src/common/result.ts`) instead of
throwing on the expected failure path; the controller is what turns a failure
into an HTTP status.

## How to run

```bash
npm install
cp .env.example .env    # fill in DATABASE_URL and the payment provider keys
docker compose up -d    # local Postgres on port 5433 (see note below)
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

The API then listens on `http://localhost:3000`.

### Database

`docker-compose.yml` starts a Postgres 17 container named `checkout-db`, published
on **port 5433** so it does not collide with a Postgres instance already installed
on the default 5432. The matching connection string is:

```
DATABASE_URL="postgresql://checkout:checkout_local_dev@localhost:5433/checkout_db?schema=public"
```

Those credentials are local-development throwaways defined in `docker-compose.yml`.
If you prefer your own Postgres instance, skip `docker compose up` and point
`DATABASE_URL` wherever you like — nothing else in the project depends on the port.

Useful commands:

```bash
docker compose ps        # container status
docker compose logs -f db
docker compose down      # stop (keeps data in the checkout-pgdata volume)
docker compose down -v   # stop and wipe the database
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `PORT` | API port (default 3000) |
| `FRONTEND_ORIGIN` | Comma-separated list of origins allowed by CORS |
| `PAYMENT_GATEWAY_SANDBOX_URL` | Payment provider sandbox base URL |
| `PAYMENT_GATEWAY_PUBLIC_KEY` | Public key — card tokenization |
| `PAYMENT_GATEWAY_PRIVATE_KEY` | Private key — transaction creation |
| `PAYMENT_GATEWAY_INTEGRITY_SECRET` | Integrity secret — signs every transaction |
| `PAYMENT_GATEWAY_POLL_INTERVAL_MS` | Optional, default 1500 — delay between status polls |
| `PAYMENT_GATEWAY_POLL_TIMEOUT_MS` | Optional, default 20000 — how long to wait for a PENDING charge |

`.env` is never committed. `@prisma/client` loads it automatically at startup, so
the whole file is available through `process.env` without an extra config module.

## API documentation (Swagger)

With the server running, open: `http://localhost:3000/api-docs`

There you can see every endpoint and try it straight from the browser ("Try it out"
button on each one). Once the backend is deployed, the same path is public at
`https://your-domain/api-docs` — that is the link that goes in the root README as
the "Swagger URL".

## Endpoints

- `GET /products` — lists products with stock
- `GET /products/:id`
- `POST /customers` — creates a customer
- `POST /deliveries` — creates delivery details
- `POST /transactions` — creates a PENDING transaction (checks stock, computes fees)
- `POST /transactions/:id/pay` — tokenizes the card, charges it, waits for the
  final status and decrements stock on approval (see below)
- `GET /transactions/:id` — reads the current status

## Payment flow

`POST /transactions/:id/pay` runs four steps against the provider:

1. **Tokenize the card** — `POST /tokens/cards` with the *public* key. The card
   number, CVC and expiry only travel through memory towards this call; they are
   never logged nor persisted.
2. **Get the acceptance token** — `GET /merchants/:public_key`, the terms the
   buyer accepts.
3. **Create the charge** — `POST /transactions` with the *private* key, including
   the integrity signature: `SHA256(reference + amount_in_cents + currency +
   integrity_secret)`. Without it the provider answers `422`.
4. **Poll for the outcome** — card charges come back `PENDING` and finalize a few
   seconds later, so the adapter polls `GET /transactions/:id` every
   `PAYMENT_GATEWAY_POLL_INTERVAL_MS` until the status is final or
   `PAYMENT_GATEWAY_POLL_TIMEOUT_MS` runs out. A failed poll is retried: the
   charge already exists on the provider side, so a transient error must not be
   mistaken for a lost payment.

Because of step 4 the endpoint answers in seconds rather than milliseconds.

### Transaction statuses

| Status | Meaning |
| --- | --- |
| `PENDING` | Created locally, not charged yet |
| `APPROVED` | Charged. This is the only status that decrements stock |
| `DECLINED` | The provider rejected the card |
| `ERROR` | The charge could not be completed, or it was still PENDING when the polling budget expired. The provider transaction id is stored anyway so the charge can be reconciled |

## Security

- **Card data** never reaches a log, the database or a response body. It only
  travels through memory towards the tokenization call.
- **Secrets** live in `.env`, which is gitignored. `.env.example` carries
  placeholders only.
- **Input validation** happens twice: `class-validator` on the DTOs (type, length
  and pattern) and `maxLength`/regex on the frontend inputs. The global
  `ValidationPipe` runs with `whitelist` and `forbidNonWhitelisted`, so unknown
  fields are stripped and rejected instead of silently accepted.
- **Rate limiting**: 20 requests per 60 seconds per IP, applied globally.
- **Headers and CORS**: Helmet for secure headers, and CORS restricted to the
  origins in `FRONTEND_ORIGIN` — never `*` alongside credentials.
- **Errors**: the global exception filter logs the full detail server-side and
  returns a generic message, so stack traces and internals never leak.

## Tests

```bash
npm run test        # run the suite
npm run test:cov    # run with coverage
```

102 tests across 20 suites. No test reaches the network or the database: the
gateway is exercised with `fetch` mocked and the repositories with the Prisma
client mocked, so the suite is deterministic and can run in CI without any
credentials.

| Metric | Coverage |
| --- | --- |
| Statements | 100% |
| Lines | 100% |
| Functions | 100% |
| Branches | 95.55% |

The only uncovered branches are the `??` fallbacks for `PORT` and
`FRONTEND_ORIGIN` in `main.ts`: importing that file pulls in `@prisma/client`,
which loads `.env` and repopulates both variables, so the default path cannot be
reached from a test.

Worth knowing if you touch the suite: the adapter spec loads the module twice to
get two different polling budgets — the timeout is read once, when the module
loads — and `main.spec.ts` waits for `listen()` to be called instead of sleeping
a fixed amount, because a fixed sleep turns flaky as soon as the suites run in
parallel.

## Still pending

- [ ] Answer `POST /transactions/:id/pay` with `202` and let the frontend poll
      `GET /transactions/:id`, instead of holding the HTTP request open while the
      provider finalizes the charge
- [ ] Handle network errors towards the payment provider (timeouts, retries)
- [ ] Reconcile charges that are still PENDING when the polling budget runs out
      (they are stored as ERROR but may finalize later on the provider side)
