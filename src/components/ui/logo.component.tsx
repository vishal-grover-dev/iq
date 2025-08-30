import Image from "next/image";
import { cn } from "@/src/utils/tailwind.utils";

interface LogoProps {
  variant?: "icon" | "text";
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ variant = "icon", className, width, height }: LogoProps) {
  const defaultSizes = {
    icon: { width: 120, height: 120 },
    text: { width: 300, height: 60 },
  };

  const size = {
    width: width || defaultSizes[variant].width,
    height: height || defaultSizes[variant].height,
  };

  const src = variant === "icon" ? "/logo.svg" : "/logo-text.svg";

  return (
    <Image
      src={src}
      alt='Intelliqent Questions Logo'
      width={size.width}
      height={size.height}
      className={cn("object-contain", className)}
      priority
    />
  );
}
