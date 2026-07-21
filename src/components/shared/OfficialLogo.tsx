import Image from 'next/image';

type OfficialLogoProps = {
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function OfficialLogo({
  className,
  priority,
  sizes = '(min-width: 48rem) 13rem, 10.5rem',
}: OfficialLogoProps) {
  return (
    <Image
      className={className}
      src="/brand/guteli-logo-original.jpeg"
      width={864}
      height={240}
      sizes={sizes}
      priority={priority}
      alt="Güteli Bakery"
    />
  );
}
