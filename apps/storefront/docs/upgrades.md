# Actualizaciones del storefront

El flujo de actualización respeta que el código es propiedad del equipo. Los scripts, deterministas, preparan y
verifican el contexto; un agente o una persona hace la conciliación de fondo.

## Inicializar un storefront nuevo

La primera versión gestionada es `v1.0.0`. Tras crear un storefront desde una etiqueta de versión inmutable, inicializa
su procedencia exacta:

```bash
npm run upgrade:init
git add .vendure/storefront.json
git commit -m "chore: initialize storefront provenance"
```

La plantilla no puede contener su propio hash de commit, así que la inicialización resuelve la etiqueta una vez,
comprueba que su árbol coincide exactamente con `HEAD` y lo registra. Falla si el storefront se creó desde otra rama o
commit.

## Actualización gestionada

Empieza con el árbol de trabajo limpio, en una rama dedicada a la actualización:

```bash
npm run upgrade:prepare -- 1.1.0
```

La preparación no modifica el código del storefront. Crea un espacio de trabajo (ignorado por git) en
`.vendure/upgrade-workspace/` con las instantáneas antigua y nueva de la plantilla, el parche de la plantilla, las guías
de versión ordenadas e `INTEGRATION.md`.

Lee las instrucciones de integración, concilia la intención de la plantilla con las personalizaciones propias y escribe
el informe en la ruta que indican esas instrucciones. Por defecto manda la intención del código propio. Si una regla de
la plantilla y una personalización no pueden convivir, deja constancia del compromiso en vez de descartar una de las dos
sin avisar.

Después ejecuta:

```bash
npm run upgrade:verify
npm run upgrade:finalize
```

La verificación ejecuta los comandos configurados en `.vendure/storefront.json` y toma la huella del árbol revisado. La
finalización rechaza los cambios hechos después de verificar, avanza la procedencia y borra el espacio de trabajo
temporal. Sube juntos al repositorio el código, el informe de actualización y la nueva procedencia.

Las etiquetas de versión deben ser inmutables. Si una etiqueta de la plantilla se movió a propósito, la preparación se
detiene mostrando el hash de la base registrada. Tras verificar el incidente por tu cuenta y confirmar que ese hash sigue
disponible en local, acepta esa base exacta explícitamente:

```bash
npm run upgrade:prepare -- 1.1.0 --allow-moved-baseline <commit-registrado>
```

Así se mantiene el commit registrado como base de la fusión a tres bandas, sin confiar sin avisar en la etiqueta nueva.

## Incorporar un storefront antiguo

Los storefronts creados antes de `v1.0.0` no tienen una base fiable para la fusión a tres bandas. Su incorporación, que
se hace una sola vez, es explícitamente «lo mejor posible»:

```bash
npm run upgrade:prepare -- 1.0.0 --legacy
```

Como esos repositorios son anteriores a los scripts del protocolo, primero hay que copiar los archivos de soporte y los
scripts de npm desde la etiqueta inmutable `v1.0.0`, o pedir a un agente que los prepare. Tras la conciliación, el
informe, la verificación y la finalización, las actualizaciones siguientes usan instantáneas exactas de base y destino.

## Escribir un cambio en la plantilla

Copia `.upgrades/changes/_example.md` con un nombre único y anota:

- Intención
- Zonas de módulos afectadas
- Reglas de comportamiento que deben mantenerse
- Cómo integrarlo
- Verificación concreta

`type: major` indica un cambio incompatible; a propósito no se usa un campo `breaking` aparte.

Usa un archivo `.none.md` solo cuando un diff que en principio afecta al código propio de verdad no lo afecta, y explica
por qué. La CI exige que el pull request añada una nota o una exención; modificar o borrar una nota existente no cuenta.
Las notas añadidas deben declarar todas las zonas de módulos que se deducen de las rutas afectadas. La CI valida la nota
o la exención:

```bash
npm run upgrade:validate
```

Para preparar la primera base gestionada sin crear su etiqueta:

```bash
npm run upgrade:release -- 1.0.0 --initial
```

Las versiones siguientes se preparan sin `--initial`:

```bash
npm run upgrade:release -- 1.1.0
```

El comando de versión exige un árbol de Git limpio, valida todas las entradas antes de modificar nada, agrupa y consume
las notas pendientes, actualiza la versión de la plantilla y genera `.upgrades/releases/v1.1.0/manifest.json` y
`guide.md`. Revisa y sube esos archivos antes de crear la etiqueta inmutable `v1.1.0`.
