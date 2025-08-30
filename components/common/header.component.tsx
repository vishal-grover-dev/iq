"use client";

import Link from "next/link";
import { cn } from "@/utils/tailwind.utils";
import Logo from "@/components/common/logo.component";
import ThemeToggle from "@/components/common/themeToggle.component";

type HeaderProps = {
  className?: string;
};

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "dark:bg-gray-950/80 dark:supports-[backdrop-filter]:bg-gray-950/60 dark:border-gray-800",
        className
      )}
    >
      <div className='mx-auto flex max-w-6xl items-center justify-between px-4 py-3'>
        <Link href='/' className='inline-flex items-center gap-2'>
          <Logo width={45} height={45} />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default Header;
