# Cómo contribuir

Usa mensajes de commit convencionales (conventional commits) y limita cada cambio a la feature o al módulo de plataforma al que pertenece.

Los pull requests que afecten al código del storefront, a las dependencias de ejecución, a la configuración, a las entradas de código generado o a la estructura del repositorio deben incluir una nota de actualización en `.upgrades/changes/`. Parte de `_example.md`. Solo se admite una exención `.none.md` con un motivo concreto.

Antes de enviarlo, ejecuta:

```bash
npm run upgrade:validate
npm test
npm run lint
npm run check-types
npm run build
```

Consulta [la guía de arquitectura](./docs/architecture.md) para saber a qué módulo pertenece cada cosa y [la guía de actualizaciones](./docs/upgrades.md) para el flujo de versiones de la plantilla.
