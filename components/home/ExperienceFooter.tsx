import Image from 'next/image';

export function ExperienceFooter() {
  return (
    <>
      <Image
        src="/figma/avtaar-home/footer-lines.svg"
        alt=""
        width={987}
        height={1}
        priority
        className="pointer-events-none absolute left-[4.259%] top-[97.865%] z-20 h-px w-[91.389%] max-w-none select-none"
      />
      <p className="pointer-events-none absolute left-1/2 top-[97.344%] z-20 -translate-x-1/2 whitespace-nowrap pl-[0.58em] text-center font-['Inter',system-ui,sans-serif] text-[clamp(0.54rem,1.481cqw,1rem)] font-normal uppercase leading-normal tracking-[0.58em] text-white">
        Initialising Experience
      </p>
    </>
  );
}
