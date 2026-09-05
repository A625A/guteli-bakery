import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Error 404</p>
          <h1>Página administrativa no encontrada</h1>
          <p>La ruta solicitada no forma parte del espacio administrativo.</p>
        </div>
      </header>
      <Link className="button-link button-link--primary" href="/admin">
        Volver al dashboard
      </Link>
    </main>
  );
}
