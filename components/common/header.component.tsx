"use client";

import Link from "next/link";
import { cn } from "@/utils/tailwind.utils";
import Logo from "@/components/common/logo.component";
import ThemeToggle from "@/components/common/themeToggle.component";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

type THeaderProps = {
  className?: string;
};

export function Header({ className }: THeaderProps) {
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
        <div className='inline-flex items-center gap-4'>
          <NavigationMenu viewport={false}>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className='text-sm font-medium text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300'
                >
                  <Link href='/upload'>Upload</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default Header;
