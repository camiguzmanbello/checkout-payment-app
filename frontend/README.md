# Frontend — Checkout App

React + Redux Toolkit (Flux), mobile-first, and resilient to a refresh through
localStorage.

## Structure

```
public/
  favicon.svg           -> app icon: a shopping bag holding a card
  products/*.jpg        -> one photo per catalogue product
  products/CREDITS.md   -> source and licence of every photo
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
    ProductPage.jsx       -> screen 1, the landing page
    FeaturedCarousel.jsx  -> scroll-snap carousel of featured products
    SiteFooter.jsx        -> closing section and authorship
    CheckoutModal.jsx     -> screen 2, card and delivery details
    SummaryBackdrop.jsx   -> screen 3, the summary
    FinalStatus.jsx       -> screens 4 and 5, the outcome
    SelectField.jsx       -> listbox used instead of a native select
    CardBrandIcon.jsx     -> inline SVG logos for Visa, MasterCard and Amex,
                             reused on the card drawn in the summary
    ThemeToggle.jsx       -> light/dark switch
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

1. **Landing** — the carousel of featured products running full bleed with the
   headline over it, then the full catalogue, then a closing section. Products
   carry a badge on the last units and on anything sold out. Skeletons while
   loading and a retry panel on failure.
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
- **Length follows the brand**: the number is 16 digits for Visa and
  MasterCard and 15 for American Express, which is also grouped 4-6-5 the way
  it is printed. The CVC is four digits for Amex and three otherwise.
- **Errors appear per field**, as soon as it loses focus, and clear as soon as
  the value becomes valid. Submitting an incomplete form marks every pending
  field and moves the focus to the first one.
- Text is sanitized while typing: no letters in numeric fields, no digits in
  names.

The same rules live in the backend DTOs. Validating twice is deliberate: the
frontend is for the person filling the form, the backend is what actually
protects the database.

## Light and dark

Both themes come from the same set of custom properties, so a component never
knows which one is active. The lime accent is the brand and stays put in both;
what changes is the canvas. The one pair that flips is the solid one used by the
primary button and the solid badges: dark background with lime text on light,
the other way round on dark, because lime on near-white cannot be read.

The theme follows the system preference on its own. The toggle in the corner
only takes over once someone presses it, and that choice is remembered in
localStorage. A small inline script in `index.html` applies the saved choice
before the first paint, so entering in dark mode does not flash white.

The card brand chip keeps a light background in both themes on purpose: the
Visa and Amex logos are dark and would disappear against a dark surface.

Autofill needs its own handling: the browser paints those fields with a fixed
blue of its own that ignores the theme entirely. The background cannot be set
directly, so it is covered with a large inset shadow in the surface colour, with
the text colour forced through `-webkit-text-fill-color`.

## Product images

Each product carries a real photo in `public/products`, matching what it is: the
headphones show headphones, the mesh chair shows a mesh chair. They come from
Wikimedia Commons under free licences and are downloaded into the repository, so
the catalogue does not depend on an external host that can rate-limit or vanish.
Around 950KB for the nine of them at 900px wide.

Attribution lives in `public/products/CREDITS.md`: five are CC0 or public domain,
the rest are CC BY or CC BY-SA and do require credit. The seed keeps the URLs in
sync and refreshes them on products that already exist.

## The showcase

The page opens with the carousel, full bleed, and the headline sitting over the
photo. The headline used to be a band of its own, which left half the width
empty on a wide screen; over the image there is no empty half to leave.

Featured products are the four most expensive ones still in stock: an explicit
rule, so no `featured` flag is needed in the database.

Three things worth knowing if you touch it:

- The showcase lives **outside** the centred container, so going full bleed
  needs no `100vw` trick — the usual one brings a horizontal scrollbar along
  whenever there is a vertical one. Its inner text still lines up with the
  1120px container, so the headline and the product name share a left edge.
- The overlay holding the headline has `pointer-events: none`. Without it, it
  covers the whole carousel and swallows the clicks meant for the arrows, the
  dots and the buy button.
- The photo drops to 68% opacity over a near-black slide, instead of darkening
  the veil further: a heavier veil buries the lower half of the picture, while
  lowering the opacity dims it evenly and lets the headline win.

The carousel itself is a scroll container with `scroll-snap-type: x mandatory`,
not a stack of transforms. On a phone it is swiped with a finger like any native
scroll, and the arrows and dots only move that same scroll, which is why there
is no carousel library here. The active dot follows whatever the scroll does, so
swiping and pressing stay in sync.

It advances on its own every six seconds, pausing while the pointer or the
keyboard focus is on it, and never advancing at all under
`prefers-reduced-motion`.

The lime accent under the headline is an inline SVG marker stroke with uneven
edges, sitting behind the letters and crossing their lower half. Over the photo
and in dark mode it drops to 55%, because light text over full-strength lime
stops being legible.

## Responsive design

Scrollbars are themed rather than left to the system, which ignores the theme
and grates in dark mode: `scrollbar-color` covers Firefox and the
`::-webkit-scrollbar` pseudo-elements cover the rest, both reading the same
tokens.

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

147 tests across 12 suites. Nothing reaches the network: `fetch` is mocked, so
the suite is deterministic and runs in CI without a backend.

| Metric | Coverage |
| --- | --- |
| Statements | 91.03% |
| Lines | 93.43% |
| Functions | 89.5% |
| Branches | 86.93% |

What each suite covers:

| Suite | What it pins down |
| --- | --- |
| `cardValidation.test.js` | Luhn, brands, future-only expiry, CVC per brand, email format, city belonging to its department |
| `colombia.js` (via the above) | The dataset is exercised by the location rules |
| `CheckoutModal.test.jsx` | Per-field errors, progressive unlocking, the brand logo inside the field, the option lists, and closing behaviour |
| `SummaryBackdrop.test.jsx` | Line items named in Spanish, amounts in COP, the drawn card showing brand and last four only, the locked state while paying |
| `FinalStatus.test.jsx` | The three outcomes, including unconfirmed as distinct from declined |
| `ProductPage.test.jsx` | The landing sections, which products get featured, and disabling a sold out one |
| `FeaturedCarousel.test.jsx` | Moving with arrows, dots and keys, autoplay and its pauses |
| `App.test.jsx` | One screen at a time, and the result replacing the catalogue |
| `checkoutSlice.test.js` | Reducers plus the three thunks, on success and on failure |
| `client.test.js` | Every endpoint, and how backend errors are surfaced |
| `localStorage.test.js`, `store.test.js` | Rehydration, and that card data never reaches disk |
| `ThemeToggle.test.jsx` | Following the system theme, pinning a choice, and surviving storage being unavailable |

`src/main.jsx` and `src/api/apiBaseUrl.js` are excluded from coverage: the first
only mounts the app, and the second is replaced by a stub because `import.meta`
cannot be parsed by Jest.

## Security note

Card data (`cardData`) lives only in memory (Redux) and is explicitly excluded
from what gets persisted to localStorage. If the buyer refreshes halfway through
the form they get product, customer and delivery back, but have to type the card
again. Nothing about the card reaches the database either: the `Transaction`
model holds amounts, status and relations, and no card field at all.

The card drawn on the summary shows the brand, the holder and the last four
digits. The expiry is masked as `••/••` on purpose: on its own it charges
nothing, but alongside a number obtained elsewhere it is what completes a
card-not-present purchase, and that screen stays visible while the charge
settles. The CVC is drawn nowhere, exactly as on a real card.

## Still pending

- [ ] Cover the branches left in `SelectField` (typeahead, edge cases of the
      keyboard navigation)
- [ ] Review the flow with a screen reader; the roles are in place but it has
      not been tried with a real one
- [ ] Show a clearer waiting state while the charge settles, which today can
      keep the request open for several seconds
