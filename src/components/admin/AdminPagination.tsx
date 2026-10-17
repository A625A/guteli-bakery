import Link from 'next/link';
export function AdminPagination({
  path,
  page,
  total,
  pageSize,
  query = {},
}: {
  path: string;
  page: number;
  total: number;
  pageSize: number;
  query?: Record<string, string>;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) =>
    path +
    '?' +
    new URLSearchParams({
      ...query,
      page: String(p),
      pageSize: String(pageSize),
    });
  return (
    <nav aria-label="Paginación de resultados">
      {page > 1 ? (
        <Link href={href(page - 1)}>Anterior</Link>
      ) : (
        <span aria-disabled="true">Anterior</span>
      )}
      <p>
        {total} resultados · Página {page} de {last}
      </p>
      {page < last ? (
        <Link href={href(page + 1)}>Siguiente</Link>
      ) : (
        <span aria-disabled="true">Siguiente</span>
      )}
    </nav>
  );
}
