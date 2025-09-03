import Link from "next/link";
import { cn } from "@/utils/tailwind.utils";
import { LinkedinLogoIcon } from "@phosphor-icons/react/dist/ssr";

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
          href='https://www.linkedin.com/in/vishal-grover/'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-2 text-sm hover:underline'
        >
          <LinkedinLogoIcon size={24} aria-hidden='true' className='text-blue-500 dark:text-blue-500' />
          <span>Vishal Grover</span>
        </Link>
        <p className='text-sm text-muted-foreground'>
          Made with <span aria-hidden='true'>❤️</span> in India
        </p>
      </div>
    </footer>
  );
}
