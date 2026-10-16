'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="contact-page" tabIndex={-1}>
      <h1>No pudimos completar la consulta</h1>
      <p>
        Intenta de nuevo en un momento. Si acabas de enviar un pedido, revisa su
        estado antes de volver a enviarlo.
      </p>
      <button onClick={reset}>Volver a intentar</button>
    </main>
  );
}
