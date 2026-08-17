# Checkout App

Una tienda con pago real: eliges un producto, ingresas tu tarjeta y tus datos de
entrega, confirmas y el cobro se procesa contra la pasarela de pagos. El stock se
reserva antes de cobrar y se libera si el pago no prospera, así que nunca se
cobra por algo que ya no está.



---

## Enlaces

| Qué | Dónde | Estado |
| --- | --- | --- |
| Aplicación web | https://checkout-payment-app-theta.vercel.app | En producción |
| API | https://checkout-backend-k7ka.onrender.com | En producción |
| Documentación de la API (Swagger) | https://checkout-backend-k7ka.onrender.com/api-docs | En producción |
| Repositorio | https://github.com/camiguzmanbello/checkout-payment-app | Público |

> ℹ️ **La primera petición puede tardar.** El backend corre en el plan gratuito
> de Render, que suspende el servicio cuando pasa un rato sin tráfico. La
> primera petición después de esa inactividad tiene que despertar la instancia,
> así que puede demorar unos segundos extra en responder — el catálogo tarda en
> aparecer o el primer pago se siente lento. Las peticiones siguientes ya van a
> velocidad normal. Es el comportamiento propio del plan gratuito, no un fallo
> de la aplicación.

---

## Cómo se ve

### Landing

El catálogo abre con un carrusel de destacados a pantalla completa y el titular
sobre la imagen; debajo, todos los productos con su stock.

![Landing](docs/screenshots/01-landing.png)

### En el teléfono

Todo está pensado mobile first: el carrusel se desliza con el dedo y el
formulario ocupa la pantalla completa, para que no se confunda con el catálogo
que quedó detrás.

![Landing en móvil](docs/screenshots/02-landing-mobile.png)

### Tarjeta y entrega

Un solo formulario con validación campo por campo: la marca se detecta mientras
escribes, y el mes, el año, el departamento y la ciudad se eligen de una lista
para que no entren datos mal escritos.

![Formulario](docs/screenshots/03-formulario.png)

![Formulario con errores](docs/screenshots/04-formulario-errores.png)

### Resumen

El desglose completo antes de pagar, con la tarjeta dibujada y el monto en el
propio botón.

![Resumen](docs/screenshots/05-resumen.png)

### Resultado

![Pago aprobado](docs/screenshots/06-aprobado.png)

![Pago rechazado](docs/screenshots/07-rechazado.png)

### Modo claro

![Modo claro](docs/screenshots/08-modo-claro.png)

### Documentación de la API

![Swagger](docs/screenshots/09-swagger.png)

---

## El flujo, de principio a fin

1. **Producto** — catálogo con precio y stock.
2. **Tarjeta y entrega** — datos de pago y dirección, validados en el navegador
   y otra vez en el backend.
3. **Resumen** — producto, subtotal, costo de servicio, costo de envío y total.
4. **Estado final** — aprobado, rechazado, agotado o sin confirmar.
5. **Vuelta al catálogo** — con el stock ya actualizado.

### Estados de una transacción

| Estado | Qué significa |
| --- | --- |
| `PENDING` | Creada, todavía sin cobrar |
| `APPROVED` | Cobrada. El stock reservado antes del cobro se queda descontado |
| `DECLINED` | La pasarela rechazó la tarjeta |
| `ERROR` | No se pudo completar, o seguía procesándose cuando venció la espera. Se guarda el id de la pasarela para poder reconciliar |

---

## Cómo correrlo

Necesitas Node 20+, npm y Docker (para la base de datos).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # completa DATABASE_URL y las llaves de la pasarela
docker compose up -d      # Postgres 17 en el puerto 5433
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev         # queda en http://localhost:3000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL apuntando al backend
npm run dev               # queda en http://localhost:5173
```

Detalle en [`backend/README.md`](backend/README.md) y
[`frontend/README.md`](frontend/README.md).

> En producción el seed se corre con `npm run prisma:seed:prod`, no con
> `npm run prisma:seed`: este último usa `ts-node`, que no sobrevive al descarte
> de dependencias de desarrollo. La secuencia completa de despliegue está en
> [`backend/README.md`](backend/README.md#production-build).

### Probar un pago

Con las tarjetas de prueba de la pasarela, cualquier CVC y una fecha futura:

| Número | Resultado |
| --- | --- |
| `4242 4242 4242 4242` | Aprobado |
| `4111 1111 1111 1111` | Rechazado |

---

## Stack

| Capa | Tecnologías |
| --- | --- |
| Frontend | React 18, Redux Toolkit, Vite, Jest + Testing Library |
| Backend | Nest.js, Prisma, PostgreSQL, Jest |
| Infraestructura | Docker Compose para la base de datos local |

### Arquitectura

**Backend — hexagonal (puertos y adaptadores).** Cada módulo separa `domain/`
(entidades y puertos), `application/` (casos de uso) e `infrastructure/`
(controladores y adaptadores). El dominio no conoce nada de afuera, y los casos
de uso de escritura devuelven un `Result<T, E>` en vez de lanzar excepciones: el
controlador es el que traduce el fallo a un estado HTTP.

**Frontend — Flux con Redux Toolkit.** Un único slice sostiene los cinco pasos
del flujo, con thunks hacia la API. El progreso sobrevive a un refresh gracias a
localStorage, del que se excluyen a propósito los datos de tarjeta.

---

## Pruebas

Las dos mitades del proyecto están probadas con Jest: **276 pruebas en total**,
110 en el backend y 166 en el frontend. Ninguna toca la red ni la base de datos
—la pasarela se ejercita con `fetch` simulado y los repositorios con el cliente
de Prisma simulado—, así que la suite es determinista y corre en CI sin una sola
credencial.

```bash
cd backend  && npm run test        # npm run test:cov para el reporte de cobertura
cd frontend && npm run test        # npm run test:cov para el reporte de cobertura
```

### Cobertura

| | Backend | Frontend |
| --- | --- | --- |
| Pruebas | 110, en 20 suites | 166, en 12 suites |
| Sentencias | 100% | 91.46% |
| Líneas | 100% | 93.82% |
| Funciones | 100% | 90.47% |
| Ramas | 95.74% | 87.66% |

### Qué se evalúa en el backend

Cada capa de la arquitectura hexagonal se prueba por separado, con sus vecinos
sustituidos por dobles:

| Capa | Qué se fija |
| --- | --- |
| Casos de uso | Las reglas de negocio: precios y montos calculados al crear la transacción, producto inexistente, stock insuficiente, y todo el recorrido del cobro |
| Adaptador de la pasarela | La firma de integridad, la tokenización, el sondeo de un cobro `PENDING` y qué se guarda cuando la espera se agota |
| Repositorios (Prisma) | El mapeo de fila a entidad, la reserva y liberación de stock, y que una transacción nazca siempre `PENDING` |
| Controladores y DTOs | La traducción de un fallo de dominio a un estado HTTP, y la validación de entrada (UUIDs, cantidades, nombres con tilde) |
| Cableado y arranque | Que cada puerto quede atado a su adaptador, el rate limiting como guard global, Helmet, el CORS restringido y Swagger en `/api-docs` |
| Transversales | Los combinadores del `Result<T, E>`, el filtro de errores que nunca filtra trazas y el ciclo de vida de la conexión a Postgres |

Lo que más se cuidó es el cobro, porque es donde el dinero y el inventario se
pueden desincronizar. Las pruebas de `pay-transaction.usecase` fijan que:

- el stock se **reserva antes** de tocar la pasarela;
- si el producto se agotó mientras tanto, **nunca se llega a la pasarela**, así
  que al comprador no se le cobra nada;
- ante un rechazo, un error de la pasarela, un fallo de tokenización, una caída
  de red o una excepción al guardar el resultado, **el stock se devuelve**;
- se devuelve **exactamente una vez**, nunca dos por el mismo fallo;
- solo un pago aprobado deja el descuento en firme.

Y en `payment-gateway-http.adapter`, que un cobro que queda procesándose se
sondea hasta su estado final, que un sondeo fallido se reintenta en vez de dar
el cobro por perdido, que `VOIDED` no cuenta como éxito, y que si el
presupuesto de espera se agota se guarda igual el id de la pasarela — que es lo
único que después permite reconciliar el cobro.

### Qué se evalúa en el frontend

Cada archivo `*.test.js(x)` vive junto al que cubre:

| Suite | Qué se fija |
| --- | --- |
| `cardValidation.test.js` | Luhn, detección de marca, vigencia solo futura, largo de CVC por marca, formato de correo y que la ciudad pertenezca a su departamento |
| `CheckoutModal.test.jsx` | El error por campo al salir del foco, el desbloqueo progresivo, el logo de la marca dentro del campo, las listas de opciones con teclado y búsqueda sin tildes, y el cierre del formulario |
| `SummaryBackdrop.test.jsx` | El desglose en pesos colombianos, la tarjeta dibujada con marca y últimos cuatro, la vigencia enmascarada y el bloqueo de los botones mientras se cobra |
| `FinalStatus.test.jsx` | Los cuatro desenlaces, incluido distinguir *agotado* y *sin confirmar* de un rechazo |
| `ProductPage.test.jsx` | Las secciones de la landing, qué productos se destacan y el botón deshabilitado cuando no hay stock |
| `FeaturedCarousel.test.jsx` | Avance con flechas, puntos y teclado, autoplay con sus pausas, y el respeto por `prefers-reduced-motion` |
| `App.test.jsx` | Una pantalla a la vez, y el resultado reemplazando al catálogo |
| `checkoutSlice.test.js` | Los reducers y los tres thunks, en éxito y en fallo |
| `client.test.js` | Cada endpoint y cómo se traduce un error del backend a un mensaje legible |
| `localStorage.test.js`, `store.test.js` | La rehidratación, que los datos de tarjeta jamás lleguen a disco, y el modo privado o el almacenamiento corrupto |
| `ThemeToggle.test.jsx` | Seguir la preferencia del sistema, fijar una elección y recordarla |

Hay tres comportamientos delicados que tienen prueba propia porque son fáciles
de romper sin notarlo: que **la tarjeta nunca se persista** (ni siquiera
enmascarada), que un **resumen recargado vuelva al formulario** —porque la
tarjeta ya no está en memoria— avisándole al comprador que no se cobró nada, y
que **un producto agotado no se muestre como un pago sin confirmar**.

### Qué queda fuera, y por qué

- En el backend, las únicas ramas sin cubrir son los valores por defecto de
  `PORT` y `FRONTEND_ORIGIN` en `main.ts`: importar ese archivo arrastra
  `@prisma/client`, que carga el `.env` y vuelve a poblar ambas variables, así
  que el camino del default no se puede alcanzar desde una prueba.
- En el frontend, `src/main.jsx` queda excluido porque solo monta la app, y
  `src/api/apiBaseUrl.js` porque usa `import.meta`, que Jest no puede parsear:
  en las pruebas se reemplaza por un stub.
- **No hay pruebas end to end** contra un navegador real y una base de datos
  real. Todo el flujo está cubierto por partes, pero un recorrido completo
  automatizado sigue siendo el siguiente paso natural de la suite.

El detalle de cada suite está en [`backend/README.md`](backend/README.md#tests)
y [`frontend/README.md`](frontend/README.md#tests).

---

## Seguridad

- Los **datos de tarjeta** no llegan a un log, a la base de datos ni a una
  respuesta: solo pasan por memoria hacia la tokenización. El modelo
  `Transaction` no tiene un solo campo de tarjeta.
- El **número** se muestra enmascarado a sus últimos cuatro dígitos, la
  **vigencia** aparece como `••/••` y el **CVC** no se dibuja en ninguna parte.
- Las **llaves** viven en `.env`, que nunca se commitea.
- La **validación** ocurre dos veces: en el navegador para quien llena el
  formulario, y en el backend, que es lo que de verdad protege la base.
- Además: rate limiting global, cabeceras seguras con Helmet, CORS restringido a
  un origen conocido y un filtro de errores que nunca filtra trazas al cliente.

---

## Autoría

Desarrollado por **María Camila Guzmán Bello** — 2026.
Licencia [MIT](LICENSE).
