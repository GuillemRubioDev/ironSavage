# Indicaciones para agentes

- Usa mensajes de commit convencionales (conventional commits).
- Todo el código del storefront escrito por personas es propiedad del equipo y se puede personalizar.
- En las actualizaciones de la plantilla, conserva la intención del código propio salvo que rompa una regla explícita de la plantilla; si hay conflictos irresolubles, avísalos.
- Los archivos de Next.js en `src/app/` deben ser mínimos; la lógica va en la feature a la que pertenece.
- Importa otra feature por sus módulos de primer nivel, nunca por sus carpetas internas `components/` o `routes/`.
- Las operaciones GraphQL y las traducciones van junto a la feature que las usa.
- Añade una nota de actualización (o una exención explícita) en cada pull request que afecte al código propio.
- Antes de dar un trabajo por terminado, ejecuta `npm run upgrade:validate`, los tests, el lint, la comprobación de tipos y el build de producción.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
