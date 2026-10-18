'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
const links = [
  ['/admin', 'Resumen', '▦'],
  ['/admin/orders', 'Pedidos', '▤'],
  ['/admin/products', 'Productos', '◇'],
  ['/admin/categories', 'Categorías', '▧'],
  ['/admin/promotions', 'Promociones', '♧'],
] as const;
export function AdminNav({ role }: { role: 'OWNER' | 'ADMIN' }) {
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleLinks =
    role === 'OWNER'
      ? [...links, ['/admin/users', 'Usuarios', '♙'] as const]
      : links;
  return (
    <>
      <button
        ref={toggle}
        className="admin-menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="admin-menu"
        onClick={() => setOpen(!open)}
      >
        Menú administrativo <span aria-hidden="true">☰</span>
      </button>
      <nav
        id="admin-menu"
        className={open ? 'admin-nav is-open' : 'admin-nav'}
        aria-label="Administración"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            toggle.current?.focus();
          }
        }}
      >
        <p className="admin-nav-caption">Tu panadería</p>
        <ul className="admin-navigation">
          {visibleLinks.map(([href, label, icon]) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={
                  pathname === href ||
                  (href !== '/admin' && pathname.startsWith(href + '/'))
                    ? 'page'
                    : undefined
                }
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="admin-nav-account">
          <span aria-hidden="true">G</span>
          <div>
            {role === 'OWNER' ? 'Propietaria' : 'Administración'}
            <small>
              {role === 'OWNER'
                ? 'Acceso de propietario'
                : 'Acceso administrativo'}
            </small>
          </div>
        </div>
      </nav>
    </>
  );
}
