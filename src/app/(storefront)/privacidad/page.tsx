import Link from 'next/link';
export const metadata = { title: 'Privacidad | Güteli Bakery' };
export default function PrivacyPage() {
  return (
    <main id="main-content" className="contact-page" tabIndex={-1}>
      <header className="contact-page__intro">
        <h1>Privacidad de tus datos</h1>
        <p>Usamos tus datos para atender y dar seguimiento a tu pedido.</p>
      </header>
      <section className="contact-guidance">
        <h2>Qué información usamos</h2>
        <p>
          Nombre, teléfono, productos, fecha solicitada y, cuando corresponde,
          dirección de entrega y notas del pedido. Evita escribir datos de
          tarjetas, contraseñas, documentos de identidad o información sensible
          en las notas.
        </p>
      </section>
      <section className="contact-guidance">
        <h2>Quién puede consultar tu pedido</h2>
        <p>
          El personal autorizado de Güteli puede consultar los datos necesarios
          para atenderlo. El enlace privado del recibo permite consultar su
          estado: no lo publiques ni lo compartas con personas ajenas a tu
          pedido.
        </p>
      </section>
      <section className="contact-guidance">
        <h2>WhatsApp y este dispositivo</h2>
        <p>
          Cuando decides abrir el resumen en WhatsApp, la información incluida
          pasa a ese servicio. Revisa el mensaje antes de enviarlo. La tienda
          guarda el carrito en este navegador y usa una cookie para recuperar tu
          pedido. En un dispositivo compartido, evita dejar abiertos tus recibos
          y cierra la sesión administrativa si la utilizaste.
        </p>
      </section>
      <section className="contact-guidance">
        <h2>Conservación y consultas</h2>
        <p>
          Conservamos el historial de pedidos y la evidencia necesaria para
          obligaciones comerciales, financieras y legales. La política de plazos
          está en revisión; no hay eliminación automática de datos de pedidos
          activada. Puedes solicitar revisión, corrección o eliminación de datos
          que ya no sean necesarios mediante el contacto de Güteli.
          Verificaremos tu relación con el pedido y las obligaciones de
          conservación antes de hacer cambios.
        </p>
        <p>
          <Link href="/contact/">Contactar a Güteli</Link>. Nunca envíes
          contraseñas, códigos del autenticador ni enlaces privados para
          identificarte.
        </p>
      </section>
    </main>
  );
}
