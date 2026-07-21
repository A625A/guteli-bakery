export function DemoBanner({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return null;
  }

  return (
    <div className="demo-banner" role="note" aria-label="Modo demostración">
      Sitio demo — ninguna solicitud se envía.
    </div>
  );
}
