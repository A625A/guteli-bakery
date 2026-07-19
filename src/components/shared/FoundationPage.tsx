type FoundationPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function FoundationPage({
  eyebrow,
  title,
  description,
}: FoundationPageProps) {
  return (
    <main id="main-content" className="foundation-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="foundation-copy">{description}</p>
      <p className="foundation-status" role="status">
        Base técnica verificada. La experiencia final se construirá en los
        siguientes hitos.
      </p>
    </main>
  );
}
