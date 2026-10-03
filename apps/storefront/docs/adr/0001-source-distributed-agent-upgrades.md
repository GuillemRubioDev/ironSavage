# Mantener el storefront como código fuente propio y actualizable por agentes

El storefront sigue siendo íntegramente código propio del equipo, en vez de trasladar el comportamiento personalizable a
paquetes de Vendure. Las actualizaciones concilian las instantáneas etiquetadas de la plantilla con la intención del
código propio usando contexto estructurado de los cambios y verificación. Se acepta el trabajo de integración a cambio
de la máxima capacidad de personalización y de independencia para los agentes.

## Opciones consideradas

Sincronizar un fork solo con Git obliga a los agentes a reconstruir la intención a partir de los diffs; empaquetar la
mayor parte del comportamiento del storefront facilita actualizar dependencias, pero hace más difícil personalizar el
código principal. El modelo elegido combina la procedencia exacta en Git con notas de actualización escritas, la
propiedad local de cada feature y scripts dentro del propio repositorio.

## Consecuencias

Quien contribuye a la plantilla debe describir los cambios que afectan al código propio, las etiquetas de versión son
entradas inmutables del protocolo y algunas actualizaciones siguen necesitando el criterio explícito de una persona o un
agente. Ninguna herramienta de actualización puede dar por buenos los archivos de la plantilla por encima del
comportamiento personalizado sin avisar.
