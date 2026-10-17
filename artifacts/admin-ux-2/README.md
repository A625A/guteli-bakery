# Admin UX 2.0 — Evidencia visual

Capturas reales de Chromium mediante Playwright. Todas las cuentas, pedidos y promociones de estas capturas son ficticios y están en una base de prueba aislada. Las fotos y los datos base del catálogo provienen del seed existente del proyecto. Ninguna cifra representa actividad real del negocio.

Desktop: 1440 × 1000. Móvil: 390 × 1000. Las páginas completas conservan su altura natural; los editores muestran el viewport real con desplazamiento interno.

| Pantalla | Desktop | Móvil |
|---|---|---|
| Resumen | [Ver](after/dashboard-1440.png) | [Ver](after/dashboard-390.png) |
| Productos | [Ver](after/products-1440.png) | [Ver](after/products-390.png) |
| Nuevo producto | [Ver](after/product-create-1440.png) | [Ver](after/product-create-390.png) |
| Editar producto | [Ver](after/product-edit-1440.png) | [Ver](after/product-edit-390.png) |
| Producto por enlace directo | [Ver](after/product-direct-1440.png) | [Ver](after/product-direct-390.png) |
| Categorías | [Ver](after/categories-1440.png) | [Ver](after/categories-390.png) |
| Nueva categoría | [Ver](after/category-create-1440.png) | [Ver](after/category-create-390.png) |
| Editar categoría | [Ver](after/categories-edit-1440.png) | [Ver](after/categories-edit-390.png) |
| Pedidos | [Ver](after/orders-1440.png) | [Ver](after/orders-390.png) |
| Detalle del pedido | [Ver](after/orders-GUT-26-UX000000-1440.png) | [Ver](after/orders-GUT-26-UX000000-390.png) |
| Promociones | [Ver](after/promotions-1440.png) | [Ver](after/promotions-390.png) |
| Nueva promoción | [Ver](after/promotion-create-1440.png) | [Ver](after/promotion-create-390.png) |
| Editar promoción | [Ver](after/promotions-edit-1440.png) | [Ver](after/promotions-edit-390.png) |
| Usuarios | [Ver](after/users-1440.png) | [Ver](after/users-390.png) |
| Nueva administradora | [Ver](after/users-create-1440.png) | [Ver](after/users-create-390.png) |

Hay 28 resultados de accesibilidad en `after/a11y-*.json`, sin infracciones detectadas en la corrida final. Incluyen las siete rutas principales, editores de creación/edición y creación de usuarios en ambos tamaños. La prueba también verifica ausencia de desbordamiento a 320 y 768 píxeles. Una auditoría automatizada no sustituye una evaluación completa con lectores de pantalla.

Las capturas originales anteriores al rediseño se conservan en `before/`.

[Informe de implementación, pruebas y archivos modificados](../../docs/audits/2026-10-17-admin-ux-2.md). [Resultados estructurados](verification/results.json).
