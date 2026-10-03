# Distribución del storefront

Este documento describe cómo se relacionan, a lo largo de las versiones, el código de la plantilla de Vendure y un
storefront propio del equipo.

## Vocabulario

**Plantilla de origen** (*upstream starter*):
El código mantenido por Vendure del que parten los storefronts propios.
_Evitar_: framework, paquete de ejecución

**Storefront propio** (*downstream storefront*):
Una copia de la plantilla, propiedad del equipo y personalizada libremente.
_Evitar_: instalación, app generada

**Base gestionada** (*managed baseline*):
La versión etiquetada exacta de la plantilla respecto a la que se entienden los cambios posteriores de un storefront propio.
_Evitar_: versión de dependencia, base de merge

**Intención de origen** (*upstream intent*):
El motivo de un cambio de la plantilla junto con el comportamiento que ese cambio debe conservar.
_Evitar_: parche, diff de archivos

**Nota de actualización** (*upgrade note*):
La descripción estructurada, escrita por quien contribuye a la plantilla, de la intención de un cambio, las zonas
afectadas, las reglas que deben mantenerse, cómo integrarlo y cómo verificarlo.
_Evitar_: entrada del changelog

**Manifiesto de versión** (*release manifest*):
El conjunto ordenado de notas de actualización de una versión etiquetada de la plantilla.
_Evitar_: notas de la versión

**Procedencia del storefront** (*storefront provenance*):
La base gestionada que tiene adoptada actualmente un storefront propio.
_Evitar_: versión del paquete

**Storefront antiguo** (*legacy storefront*):
Un storefront propio creado antes de la primera base gestionada y que, por tanto, no tiene una procedencia exacta.
_Evitar_: storefront no soportado

**Informe de actualización** (*upgrade report*):
El registro, en el storefront propio, de los cambios de la plantilla integrados, las personalizaciones conservadas, las
desviaciones hechas y la verificación realizada.
_Evitar_: log del agente
