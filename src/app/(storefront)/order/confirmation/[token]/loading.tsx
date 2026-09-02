export default function OrderConfirmationLoading() {
  return (
    <main id="main-content" className="order-confirmation" tabIndex={-1}>
      <section className="order-confirmation__loading" role="status">
        <p className="eyebrow">Confirmación segura</p>
        <h1>Consultando tu pedido…</h1>
        <p>Estamos preparando el resumen confirmado por Güteli.</p>
      </section>
    </main>
  );
}
