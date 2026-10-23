# 01: Cerrar discrepancias locales de regresión

**What to build / Qué entrega:** Una revisión de release distingue fallos heredados de regresiones y dispone de comprobaciones reproducibles sin cambiar assertions para ocultar problemas.

**Blocked by / Bloqueado por:** Ninguno. Puede empezar localmente.

**Status / Estado:** CERRADO LOCALMENTE — 18/10/2026; evidencia dirigida y límites documentados.

**Criterios de aceptación:**

- [x] Reconciliar los dos contratos README Docker con el flujo de desarrollo real y la nueva guía separada; no recomendar Compose de desarrollo para producción.
- [x] Reproducir sólo la captura móvil con caret-color/hidratación y decidir si pertenece al harness; corregir la causa demostrada conservando validación visual y de consola.
- [x] Ejecutar únicamente las pruebas afectadas y la suite de headers de privacidad aún no cubierta completamente; reutilizar admin/TLS/integración/demo ya válidas.
- [x] Registrar resultado y límites sin presentar como aprobada la ejecución general que tuvo fallos. No tocar datos reales.

**Límites:** Sin acceso externo privilegiado, datos reales, gasto, commit/push/merge/deploy ni cambios a otros proyectos sin autorización específica. No repetir evidencia válida; registrar qué cambio justifica cada prueba nueva.

## Resultado

README corregido sin cambiar los contratos unitarios: 7/7. Carrera de screenshot/hidratación reproducida con diez mutaciones prematuras y corregida mediante espera del estado interactivo: desktop, mobile y regresión controlada 3/3. Headers de privacidad 1/1 con build de producción requerido; lint dirigido aprobado. Evidencia histórica y capturas originales conservadas.

[Informe, comandos y riesgos](../../../artifacts/oracle-preparation/ticket-01/RESULTADO.md). No se repitieron suites generales. Cierre exclusivamente local: Docker/Linux ARM64/Oracle siguen pendientes y **no se inició Ticket 02**.
