import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main-content" className="foundation-page">
      <p className="eyebrow">Error 404</p>
      <h1>Página no encontrada</h1>
      <p className="foundation-copy">
        La ruta solicitada no forma parte del sitio.
      </p>
      <Link className="text-link" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
