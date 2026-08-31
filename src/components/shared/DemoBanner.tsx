export function DemoBanner({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return null;
  }

  return (
    <div className="demo-banner" role="note" aria-label="Modo demostración">
      <strong>Sitio de demostración</strong>
      <span>
        Explora el flujo completo; usa datos de prueba en este entorno.
      </span>
    </div>
  );
}
