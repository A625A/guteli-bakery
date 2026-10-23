/** Explicit operator-only synthetic fixture loader. Never imported by an HTTP route. */
import { createHash, randomUUID } from 'node:crypto';
import { realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { Pool } from 'pg';

async function main() {
  if (!process.argv.includes('--apply')) {
    console.log(
      'SIMULACIÓN: 5 pedidos PRUEBA, sin teléfonos reales ni mensajes; ninguna escritura.',
    );
    return;
  }
  if (
    process.env.GUTELI_PRACTICE_AUTHORIZATION !== 'guteli-practica-v1' ||
    process.env.COMMERCIAL_ORDERS_ENABLED !== 'false' ||
    process.env.PAYMENTS_ENABLED !== 'false' ||
    process.env.WHATSAPP_NOTIFICATIONS_ENABLED !== 'false'
  )
    throw new Error('PRACTICA_NO_AUTORIZADA');
  const manifestPath = process.env.GUTELI_PRACTICE_MANIFEST ?? '';
  if (!isAbsolute(manifestPath))
    throw new Error('MANIFIESTO_EXTERNO_REQUERIDO');
  const parent = await realpath(dirname(manifestPath));
  const repo = await realpath(process.cwd());
  if (parent === repo || parent.startsWith(`${repo}/`))
    throw new Error('MANIFIESTO_FUERA_DEL_REPOSITORIO_REQUERIDO');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 1000,
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const marker = await client.query(
      "SELECT shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname = current_database()",
    );
    if (marker.rows[0]?.marker !== 'guteli-demo-fixtures-v1')
      throw new Error('BASE_NO_MARCADA_PARA_PRACTICA');
    await client.query('LOCK TABLE orders IN ACCESS EXCLUSIVE MODE');
    const existing = await client.query(
      'SELECT count(*)::int AS total FROM orders',
    );
    if (existing.rows[0].total !== 0)
      throw new Error('BASE_CON_PEDIDOS_NO_PERMITIDA');
    const catalog = await client.query(
      'SELECT p.id, p.name, p.sale_unit, p.price_minor, c.name AS category FROM products p JOIN categories c ON c.id=p.category_id WHERE p.active AND c.active AND p.deleted_at IS NULL ORDER BY p.id LIMIT 2',
    );
    if (catalog.rows.length < 2)
      throw new Error('SE_REQUIEREN_DOS_PRODUCTOS_REVISADOS');
    const records = [];
    const states = ['RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];
    for (const [index, state] of states.entries()) {
      const product = catalog.rows[index % 2];
      const id = randomUUID();
      const publicId = `PRUEBA-${index + 1}-${id.slice(0, 8)}`;
      const quantity = index + 1;
      const total = product.price_minor * quantity;
      const delivery = index % 2 === 1;
      await client.query(
        `INSERT INTO orders (id, public_id, customer_name, phone, fulfillment, requested_date, delivery_location, notes, subtotal_minor, shipping_minor, total_minor, order_status, payment_status, terminal_at, receipt_token_hash)
        VALUES ($1,$2,$3,'PRUEBA-SIN-TELEFONO',$4,CURRENT_DATE,$5,'PRUEBA SINTÉTICA; NO PREPARAR NI COBRAR',$6,0,$6,$7,'UNPAID',$8,$9)`,
        [
          id,
          publicId,
          `PRUEBA ${index + 1}`,
          delivery ? 'DELIVERY' : 'PICKUP',
          delivery ? 'PRUEBA: ubicación ficticia sin dirección' : null,
          total,
          state,
          state === 'COMPLETED' ? new Date() : null,
          createHash('sha256').update(randomUUID()).digest('hex'),
        ],
      );
      await client.query(
        'INSERT INTO order_items (order_id, source_product_id, product_name, category_label, sale_unit, unit_price_minor, quantity, line_total_minor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          id,
          product.id,
          product.name,
          product.category,
          product.sale_unit,
          product.price_minor,
          quantity,
          total,
        ],
      );
      records.push({ id, publicId, productId: product.id, state, quantity });
    }
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          fixture: 'guteli-practica-v1',
          records,
          dependencies: ['orders', 'order_items'],
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      { flag: 'wx', mode: 0o600 },
    );
    await client.query('COMMIT');
    console.log(
      '5 pedidos PRUEBA creados; todos SIN PAGO. No se enviaron mensajes.',
    );
  } catch {
    await client.query('ROLLBACK');
    throw new Error(
      'PRACTICA_RECHAZADA: revisar autorización, base vacía y manifiesto nuevo.',
    );
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(() => {
  console.error('PRACTICA_NO_EJECUTADA');
  process.exitCode = 1;
});
