"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { CONFETTI_COLORS } from "@/constants/evaluate.constants";

interface IConfettiOverlayProps {
  prefersReducedMotion: boolean;
}

export default function ConfettiOverlay({ prefersReducedMotion }: IConfettiOverlayProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.4 + Math.random() * 0.6,
        rotation: Math.random() * 180 - 90,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        scale: 0.8 + Math.random() * 0.6,
      })),
    []
  );

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className='pointer-events-none absolute inset-0 overflow-hidden' aria-hidden>
      {pieces.map((piece, index) => (
        <motion.span
          key={index}
          className='absolute block h-2 w-2 rounded-full opacity-0'
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
          }}
          initial={{
            y: "-10%",
            scale: piece.scale,
          }}
          animate={{
            y: ["−10%", "110%"],
            rotate: piece.rotation,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
