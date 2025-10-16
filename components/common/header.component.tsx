"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/tailwind.utils";
import Logo from "@/components/common/logo.component";
import ThemeToggle from "@/components/common/themeToggle.component";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { ENavigationLabels, ENavigationRoutes } from "@/types/navigation.types";
import { NAVIGATION_STYLES, NAVIGATION_CONFIG } from "@/constants/navigation.constants";

type THeaderProps = {
  className?: string;
};

export function Header({ className }: THeaderProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const getNavLinkClassName = (href: string) => {
    return cn(
      NAVIGATION_STYLES.BASE_CLASSES,
      isActive(href) ? NAVIGATION_STYLES.ACTIVE_CLASSES : NAVIGATION_STYLES.INACTIVE_CLASSES
    );
  };

  return (
    <header
      className={cn(
        "w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "dark:bg-gray-950/80 dark:supports-[backdrop-filter]:bg-gray-950/60 dark:border-gray-800",
        className
      )}
    >
      <div className='mx-auto flex max-w-6xl items-center justify-between px-4 py-3'>
        <Link href={ENavigationRoutes.HOME} className='inline-flex items-center gap-2'>
          <Logo width={NAVIGATION_CONFIG.LOGO_SIZE} height={NAVIGATION_CONFIG.LOGO_SIZE} />
        </Link>
        <div className='inline-flex items-center gap-4'>
          <NavigationMenu viewport={false}>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href={ENavigationRoutes.UPLOAD} className={getNavLinkClassName(ENavigationRoutes.UPLOAD)}>
                    {ENavigationLabels.UPLOAD}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href={ENavigationRoutes.GENERATE} className={getNavLinkClassName(ENavigationRoutes.GENERATE)}>
                    {ENavigationLabels.GENERATE}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href={ENavigationRoutes.EVALUATE} className={getNavLinkClassName(ENavigationRoutes.EVALUATE)}>
                    {ENavigationLabels.EVALUATE}
                  </Link>
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
