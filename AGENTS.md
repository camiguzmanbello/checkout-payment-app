# Instrucciones para el agente de código

Este repo es la solución de una prueba técnica de checkout de pagos. Sigue estas
reglas SIEMPRE, sin excepción, en cualquier tarea que hagas aquí.

## Reglas no negociables

1. **Nunca uses la palabra de la pasarela de pago** (la marca cuyo nombre empieza
   con "W...") en nombres de archivos, carpetas, variables, commits, README, ni
   comentarios. Refiérete a ella como "la pasarela" o "el proveedor de pagos" en
   toda la documentación. Las URLs de su API y las API keys sí van en `.env`
   (nunca commiteado) porque son necesarias técnicamente.
2. No inventes funcionalidad fuera del alcance: 5 pantallas (producto → tarjeta/
   entrega → resumen → estado final → producto actualizado), 4 entidades
   (product, customer, delivery, transaction).
3. Arquitectura backend: hexagonal / ports & adapters. Cada módulo mantiene
   `domain/` (entidades + puertos), `application/` (use cases), `infrastructure/`
   (controllers + adapters). No metas lógica de negocio en los controllers.
4. Los use cases de escritura (crear transacción, pagar) deben devolver
   `Result<T, E>` (`src/common/result.ts`) en vez de lanzar excepciones para el
   camino esperado de fallo — solo lanza excepciones HTTP en la capa de
   `infrastructure` al traducir el `Result` a respuesta.
5. Todo input de usuario se valida en dos capas: `class-validator` en los DTOs
   del backend (tipo + longitud + patrón) y `maxLength`/regex en los inputs del
   frontend. Si agregas un campo nuevo, agrégalo en ambas capas.
6. Nunca loguees ni persistas el número de tarjeta completo, CVC, ni fecha de
   expiración en ningún lado (logs, base de datos, localStorage). Solo pasan por
   memoria hacia la llamada a la pasarela.
7. Tests con Jest, meta real >80% de cobertura en front y back. Antes de dar por
   terminada una tarea, corre `npm run test:cov` en la carpeta correspondiente y
   confirma el porcentaje.
8. Cada feature va en su propio commit (no mezclar features no relacionadas en
   un commit). Usa mensajes tipo `feat: ...`, `fix: ...`, `chore: ...`,
   `docs: ...`, `test: ...`. Si trabajas varias features en una sesión, haz un
   commit por cada una apenas la termines y la pruebes, no al final de todo.
9. Antes de terminar cualquier sesión de trabajo, corre el build
   (`npm run build` en backend, `npm run build` en frontend) y confirma que no
   hay errores de compilación.
10. Actualiza el README correspondiente (`backend/README.md` o
    `frontend/README.md`) si cambias endpoints, variables de entorno, o el modo
    de correr el proyecto.
11. **Idioma**: todos los commit messages van en inglés, formato Conventional
    Commits (`feat: add product listing endpoint`, no `feat: agregar endpoint`).
    Los comentarios de código, nombres de tests (`describe`/`it`) y el
    contenido de los README también van en inglés. Excepción: el texto que ve
    el usuario final en la UI (labels, botones, mensajes de error del
    formulario) se queda en español porque la app es para clientes
    colombianos — no traduzcas eso.
12. **Nunca hagas `git push` sin que la autora lo pida explícitamente en el
    mensaje.** Puedes hacer `git commit` local libremente siguiendo el punto
    anterior, pero el push queda siempre bajo control manual.

## Verificación antes de cada entrega

Antes de decir que una tarea está lista, verifica explícitamente:
- [ ] Buscar el nombre de la pasarela en la raíz del repo no devuelve nada
      fuera de `.env`. Este archivo tampoco puede contener la palabra, así que
      búscala por patrón o metiéndola en una variable al momento de correr el
      comando:

      ```sh
      # Opción A: patrón (primera letra + comodines + últimas letras)
      grep -riE "w[a-z]{2}pi" . --exclude-dir=node_modules --exclude=.env

      # Opción B: variable, escribiendo la marca solo en la terminal
      GATEWAY='<la marca que empieza con "W">'
      grep -ri "$GATEWAY" . --exclude-dir=node_modules --exclude=.env
      ```
- [ ] Los tests pasan y la cobertura supera 80%
- [ ] El build compila sin errores ni warnings de tipos
- [ ] No hay `console.log` con datos de tarjeta
- [ ] El commit está hecho y el mensaje describe la feature correctamente

## Contexto del proyecto

- Backend: Nest.js + Prisma + Postgres, en `backend/`
- Frontend: React + Redux Toolkit + Vite, en `frontend/`
- Ver `backend/README.md` y `frontend/README.md` para detalles de cada uno
- Autora: María Camila Guzmán Bello — ver `LICENSE`
