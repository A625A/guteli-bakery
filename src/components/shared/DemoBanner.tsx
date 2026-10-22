export function DemoBanner({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return null;
  }

  return (
    <div className="demo-banner" role="note" aria-label="Modo demostración">
      <strong>Sitio de demostración</strong>
      <span>
        Puedes explorar el catálogo y el carrito. Los pedidos y cobros todavía
        no están habilitados.
      </span>
    </div>
  );
}
