export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-mark__symbol">
        <span className="brand-mark__loop brand-mark__loop--left" />
        <span className="brand-mark__loop brand-mark__loop--right" />
      </span>
      <span className="brand-mark__copy">
        <strong className="brand-mark__name">Güteli</strong>
        <span className="brand-mark__bakery">Bakery</span>
      </span>
    </span>
  );
}
