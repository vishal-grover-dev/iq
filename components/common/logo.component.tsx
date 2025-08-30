import Image from "next/image";
import { cn } from "@/utils/tailwind.utils";

export type LogoProps = {
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

export function Logo({ alt = "IQ logo", width = 32, height = 32, className, priority = false }: LogoProps) {
  return (
    <Image
      src='/logo.svg'
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn("inline-block", className)}
    />
  );
}

export default Logo;
