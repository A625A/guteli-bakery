'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Pedidos' },
  { href: '/admin/products', label: 'Productos' },
  { href: '/admin/categories', label: 'Categorías' },
] as const;

const ownerLinks = [{ href: '/admin/users', label: 'Usuarios' }] as const;

export function AdminNav({ role }: { role: 'OWNER' | 'ADMIN' }) {
  const pathname = usePathname();
  const visibleLinks = role === 'OWNER' ? [...links, ...ownerLinks] : links;

  return (
    <nav aria-label="Administración">
      <ul className="admin-navigation">
        {visibleLinks.map(({ href, label }) => {
          const current =
            pathname === href ||
            (href !== '/admin' && pathname.startsWith(`${href}/`));
          return (
            <li key={href}>
              <Link href={href} aria-current={current ? 'page' : undefined}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
