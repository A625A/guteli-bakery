import Image from 'next/image';

import brandReference from '../../../assets/reference/guteli-brand-reference.jpeg';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <Image
        className="brand-mark__image"
        src={brandReference}
        alt=""
        fill
        priority
        sizes="(min-width: 48rem) 13rem, 11rem"
      />
    </span>
  );
}
