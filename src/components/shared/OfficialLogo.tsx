import Image from 'next/image';

type OfficialLogoProps = {
  className?: string;
  priority?: boolean;
};

export function OfficialLogo({ className, priority }: OfficialLogoProps) {
  return (
    <Image
      className={className}
      src="/brand/guteli-logo-original.jpeg"
      width={864}
      height={240}
      sizes="(min-width: 48rem) 13rem, 10.5rem"
      priority={priority}
      alt="Güteli Bakery"
    />
  );
}
