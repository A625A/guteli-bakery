type BakeryIllustrationProps = {
  variant: 'hero' | 'section';
  className?: string;
};

export function BakeryIllustration({
  variant,
  className = '',
}: BakeryIllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className={`bakery-illustration bakery-illustration--${variant} ${className}`}
      viewBox="0 0 640 520"
      focusable="false"
    >
      <path
        className="bakery-illustration__loop"
        d="M172 278C88 152 158 78 252 175L320 246L388 175C482 78 552 152 468 278L320 430Z"
      />
      <circle className="bakery-illustration__dot" cx="514" cy="104" r="34" />
      <path
        className="bakery-illustration__grain"
        d="M94 404c76-80 120-161 132-244M110 360l70-16M142 300l66-20M170 240l58-24"
      />
    </svg>
  );
}
