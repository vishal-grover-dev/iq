import Link from "next/link";
import { cn } from "@/utils/tailwind.utils";
import { LinkedinLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { FOOTER_CONFIG } from "@/constants/footer.constants";

type TFooterProps = {
  className?: string;
};

export default function Footer({ className }: TFooterProps) {
  return (
    <footer
      className={cn(
        "w-full border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "dark:bg-gray-950/80 dark:supports-[backdrop-filter]:bg-gray-950/60 dark:border-gray-800",
        className
      )}
    >
      <div className='mx-auto flex max-w-6xl items-center justify-between px-4 py-4'>
        <Link
          href={FOOTER_CONFIG.AUTHOR.LINKEDIN}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-2 text-sm hover:underline'
          aria-label={FOOTER_CONFIG.AUTHOR.LINK_ARIA_LABEL}
        >
          <LinkedinLogoIcon size={24} aria-hidden='true' className='text-blue-500 dark:text-blue-500' />
          <span>{FOOTER_CONFIG.AUTHOR.NAME}</span>
        </Link>
        <p className='text-sm text-muted-foreground'>
          {FOOTER_CONFIG.COPY.MADE_WITH_LOVE_PREFIX} <span aria-hidden='true'>{FOOTER_CONFIG.ICONS.HEART_EMOJI}</span>{" "}
          {FOOTER_CONFIG.COPY.LOCATION_SUFFIX}
        </p>
      </div>
    </footer>
  );
}
