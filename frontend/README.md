# Frontend — Checkout App

React + Redux Toolkit (Flux), mobile-first, and resilient to a refresh through
localStorage.

## Structure

```
src/
  app/
    store.js              -> Redux setup + localStorage subscription
    localStorage.js       -> persistence (card data is excluded on purpose)
  features/checkout/
    checkoutSlice.js      -> the whole flow state + thunks towards the API
  api/
    client.js             -> fetch wrapper over the backend
    apiBaseUrl.js         -> reads VITE_API_URL, isolated so Jest can stub it
  components/
    ProductPage.jsx       -> screen 1, the catalogue
    CheckoutModal.jsx     -> screen 2, card and delivery details
    SummaryBackdrop.jsx   -> screen 3, the summary
    FinalStatus.jsx       -> screens 4 and 5, the outcome
    SelectField.jsx       -> listbox used instead of a native select
    CardBrandIcon.jsx     -> inline SVG logos for Visa, MasterCard and Amex
  utils/
    cardValidation.js     -> Luhn, brand detection and per-field rules
    colombia.js           -> departments and municipalities for the delivery form
```

Every `*.test.js(x)` sits next to the file it covers.

## How to run

```bash
npm install
cp .env.example .env    # VITE_API_URL pointing at the backend
npm run dev
```

The app then runs on `http://localhost:5173`. The backend must be up on the URL
configured in `.env`, and that origin has to be listed in the backend's
`FRONTEND_ORIGIN` or the browser will block the calls.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend base URL (default `http://localhost:3000`) |

`.env` is never committed. Vite only exposes variables prefixed with `VITE_`.

## The flow

One screen at a time: the modal and the summary are layers over the catalogue,
while the result replaces the view entirely.

1. **Catalogue** — products with price and stock, a badge on the last units and
   on anything sold out. Skeletons while loading and a retry panel on failure.
2. **Card and delivery** — the payment form, described below.
3. **Summary** — the product, the line items in plain Spanish, the total, the
   card being charged and the shipping address.
4. **Result** — approved, declined, or unconfirmed. The last one is not the same
   as a rejection: an `ERROR` can mean the card was charged without a definitive
   answer coming back, so the screen keeps the reference and asks the buyer to
   check their statement.

## Form rules

Nothing malformed can be typed in the first place:

- **The card number comes first.** Name, expiry and CVC stay disabled until the
  number is complete and valid, because until the brand is known there is no way
  to tell how many CVC digits to ask for.
- **Expiry and location are chosen, not typed.** Month, year, department and
  city are lists, so a month like `20` or a misspelled city cannot be entered.
  Months already gone are disabled within the current year, and a department
  only offers its own municipalities.
- **CVC length follows the brand**: four digits for Amex, three otherwise.
- **Errors appear per field**, as soon as it loses focus, and clear as soon as
  the value becomes valid. Submitting an incomplete form marks every pending
  field and moves the focus to the first one.
- Text is sanitized while typing: no letters in numeric fields, no digits in
  names.

The same rules live in the backend DTOs. Validating twice is deliberate: the
frontend is for the person filling the form, the backend is what actually
protects the database.

## Responsive design

Mobile-first, with an `auto-fill` grid that goes from one column on a phone up
to four on a wide screen. The modal is a bottom sheet on a phone and a centred
dialog from 600px up. Fields are 16px so iOS does not zoom in on focus, controls
share a 44px height, and there is support for `prefers-reduced-motion`.

`SelectField` exists because the native dropdown is drawn by the operating
system, out of reach of the stylesheet, and it opened far larger than the rest
of the design. It carries its own keyboard handling and ARIA: arrows to walk the
options, Enter or Space to pick, Escape to close the list, click outside to
dismiss, and `combobox`/`listbox` roles.

## Tests

```bash
npm run test        # run the suite
npm run test:cov    # run with coverage
```

112 tests across 10 suites. Nothing reaches the network: `fetch` is mocked, so
the suite is deterministic and runs in CI without a backend.

| Metric | Coverage |
| --- | --- |
| Statements | 91.84% |
| Lines | 94.49% |
| Functions | 90.16% |
| Branches | 86.06% |

What each suite covers:

| Suite | What it pins down |
| --- | --- |
| `cardValidation.test.js` | Luhn, brands, future-only expiry, CVC per brand, email format, city belonging to its department |
| `colombia.js` (via the above) | The dataset is exercised by the location rules |
| `CheckoutModal.test.jsx` | Per-field errors, progressive unlocking, the brand logo inside the field, the option lists, and closing behaviour |
| `SummaryBackdrop.test.jsx` | Line items named in Spanish, amounts in COP, only the last four card digits, the locked state while paying |
| `FinalStatus.test.jsx` | The three outcomes, including unconfirmed as distinct from declined |
| `ProductPage.test.jsx` | Rendering the catalogue and disabling a sold out product |
| `App.test.jsx` | One screen at a time, and the result replacing the catalogue |
| `checkoutSlice.test.js` | Reducers plus the three thunks, on success and on failure |
| `client.test.js` | Every endpoint, and how backend errors are surfaced |
| `localStorage.test.js`, `store.test.js` | Rehydration, and that card data never reaches disk |

`src/main.jsx` and `src/api/apiBaseUrl.js` are excluded from coverage: the first
only mounts the app, and the second is replaced by a stub because `import.meta`
cannot be parsed by Jest.

## Security note

Card data (`cardData`) lives only in memory (Redux) and is explicitly excluded
from what gets persisted to localStorage. If the buyer refreshes halfway through
the form they get product, customer and delivery back, but have to type the card
again. The summary only ever shows the last four digits.

## Still pending

- [ ] Cover the branches left in `SelectField` (typeahead, edge cases of the
      keyboard navigation)
- [ ] Review the flow with a screen reader; the roles are in place but it has
      not been tried with a real one
- [ ] Show a clearer waiting state while the charge settles, which today can
      keep the request open for several seconds
