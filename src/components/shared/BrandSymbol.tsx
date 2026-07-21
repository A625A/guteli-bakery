import Image from 'next/image';

export function BrandSymbol({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-symbol ${className}`} aria-hidden="true">
      <Image
        src="/brand/guteli-symbol-original.jpeg"
        width={224}
        height={224}
        sizes="4rem"
        alt=""
      />
    </span>
  );
}
