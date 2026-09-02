'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Pedidos' },
  { href: '/admin/products', label: 'Productos' },
  { href: '/admin/categories', label: 'Categorías' },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administración">
      <ul className="admin-navigation">
        {links.map(({ href, label }) => {
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
