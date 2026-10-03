# Estados de un pedido

## Flujo normal

```
Carrito ─▶ Gestionando el pago ─▶ Pago confirmado ─▶ Preparando pedido ─▶ Pedido preparado ─▶ Enviado ─▶ Entregado
(AddingItems)  (ArrangingPayment)   (PaymentSettled)    (InPreparation)      (ReadyToShip)     (Shipped)  (Delivered)
```

| Estado (dashboard) | Código | Qué significa | Quién lo cambia |
|---|---|---|---|
| Agregando artículos | `AddingItems` | El cliente tiene un carrito abierto. Aún no es un pedido real. | El cliente, en la tienda. |
| Organizando pago | `ArrangingPayment` | El cliente ha llegado al pago (Redsys). Se envía el email «pedido recibido». | Automático, al ir a pagar. |
| Pago autorizado | `PaymentAuthorized` | Pago autorizado pero no cobrado (no se usa con Redsys, que cobra directamente). | Automático. |
| **Pago confirmado** | `PaymentSettled` | Cobrado. Se genera la factura, se suman los puntos de fidelización, la recompensa del atleta y se envía el email «pago confirmado». **El almacén ya puede empezar.** | Automático, cuando Redsys confirma. |
| **Preparando pedido** | `InPreparation` | El almacén está recogiendo y empaquetando. | Almacén / administración, a mano. |
| **Pedido preparado** | `ReadyToShip` | Empaquetado, esperando al transportista. | Almacén / administración, a mano. |
| Enviado / Enviado parcialmente | `Shipped` / `PartiallyShipped` | Entregado al transportista (todo o parte). | **Automático** al marcar el envío como enviado. |
| Entregado / Entregado parcialmente | `Delivered` / `PartiallyDelivered` | El cliente lo ha recibido. | **Automático** al marcar el envío como entregado. |
| Cancelado | `Cancelled` | Anulado. Se revierten las recompensas de atleta y se devuelven los puntos canjeados. | Administración. |
| Modificando / Organizando pago adicional | `Modifying` / `ArrangingAdditionalPayment` | Edición de un pedido ya pagado (y cobro de la diferencia si sube el importe). | Administración. |

«Preparando pedido» y «Pedido preparado» son estados propios de la tienda:
`apps/server/src/plugins/order-tools/warehouse-order-process.ts`. Desde «Pago confirmado» ya no se puede saltar
directamente a «Enviado»: todo pedido pasa por el almacén.

## Día a día en el dashboard (Ventas → Pedidos → abrir el pedido)

1. **Pago confirmado**: en el bloque de estado (arriba a la derecha), menú **⋮** → «Transición a Preparando pedido».
2. Cuando esté empaquetado: **⋮** → «Transición a Pedido preparado».
3. Aparece el botón **«Cumplir pedido»**: se crea el envío (transportista y número de seguimiento). El envío
   queda «Pendiente».
4. En «Detalles de cumplimiento», marca el envío como **Enviado** → el pedido pasa solo a «Enviado».
5. Cuando llegue, marca el envío como **Entregado** → el pedido pasa solo a «Entregado».

La hoja **«Pedidos de hoy»** (botón en la lista de pedidos) lista los pedidos del día que están pagados y aún no
se han enviado: pago confirmado, preparando o preparado.

## Corregir errores

| Situación | Cómo se corrige |
|---|---|
| Lo pasé a «Preparando pedido» por error | **⋮** → «Transición a Pago confirmado». |
| Lo marqué «Pedido preparado» y falta algo | **⋮** → «Transición a Preparando pedido». |
| Hay que cambiar productos o cantidades de un pedido pagado | Menú **⋮** de arriba → «Modificar» (y, si sube el importe, cobrar la diferencia). |
| Hay que anular el pedido | Menú **⋮** de arriba → «Reembolsar y cancelar». Un pedido pagado **no** se anula con «Transición a Cancelado»: Vendure exige cancelar las líneas (y normalmente reembolsar), y esa opción lo hace. |
| Devolución parcial | «Reembolsar y cancelar», indicando las líneas o el importe. |
| Envío marcado como enviado (o entregado) por error | 1) En «Detalles de cumplimiento», cancela ese envío. 2) **⋮** → «Transición a Pedido preparado». 3) Vuelve a «Cumplir pedido» con los datos correctos. La vuelta atrás solo se permite si el pedido ya no tiene ningún envío activo, para no dejarlo incoherente. |

Las transiciones que permite cada estado son las que muestra el menú **⋮**. Vendure no deja hacer cambios que
dejen el pedido incoherente; por ejemplo, marcar «Enviado» sin un envío creado.
