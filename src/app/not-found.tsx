import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main-content" className="foundation-page" tabIndex={-1}>
      <p className="eyebrow">Error 404</p>
      <h1>Página no encontrada</h1>
      <p className="foundation-copy">
        La ruta solicitada no forma parte del sitio. Puedes volver al inicio o
        continuar al menú.
      </p>
      <nav className="not-found-actions" aria-label="Recuperación de página">
        <Link className="button-link button-link--primary" href="/">
          Volver al inicio
        </Link>
        <Link className="button-link button-link--secondary" href="/menu/">
          Ver el menú
        </Link>
      </nav>
    </main>
  );
}
