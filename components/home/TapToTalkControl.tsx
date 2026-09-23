import Image from 'next/image';
import styles from './TapToTalkControl.module.css';

interface TapToTalkControlProps {
  disabled?: boolean;
  label: string;
  onActivate: () => void;
}

export function TapToTalkControl({ disabled = false, label, onActivate }: TapToTalkControlProps) {
  return (
    <>
      <p className="pointer-events-none absolute left-[3.426%] top-[57.083%] z-30 w-[92.222%] text-center font-['Montserrat',system-ui,sans-serif] text-[clamp(0.86rem,2.222cqw,1.5rem)] font-normal uppercase leading-normal tracking-normal text-white/50">
        {label}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onActivate}
        aria-label={label}
        className={`${styles.control} group absolute left-[42.222%] top-[60.521%] z-30 h-[34.844%] w-[15.556%] cursor-pointer transition-transform duration-300 active:scale-[0.98] disabled:cursor-wait`}
      >
        <Image
          src="/figma/avtaar-home/tap-control.svg"
          alt=""
          width={168}
          height={669}
          priority
          className="pointer-events-none h-full w-full max-w-none select-none transition-transform duration-300 group-hover:scale-[1.015]"
        />
      </button>
    </>
  );
}
