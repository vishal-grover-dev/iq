import { motion } from "framer-motion";
import { cn } from "@/utils/tailwind.utils";
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { usePrefersReducedMotion, EAnimationDuration, EAnimationScale } from "@/utils/animation.utils";

interface IOptionButtonProps {
  option: string;
  index: number;
  mode: "evaluation" | "review";
  isSelected: boolean;
  isUserAnswer?: boolean;
  isCorrect?: boolean;
  isSubmitting?: boolean;
  onClick: (index: number) => void;
}

/**
 * OptionButton Component
 *
 * Renders a single MCQ option button with appropriate styling and icons.
 * Handles both evaluation mode (interactive) and review mode (with feedback).
 * Includes smooth hover/active/focus animations with reduced-motion support.
 */
export default function OptionButton({
  option,
  index,
  mode,
  isSelected,
  isUserAnswer = false,
  isCorrect = false,
  isSubmitting = false,
  onClick,
}: IOptionButtonProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const getOptionStyle = () => {
    // Review mode: show user answer and correctness
    if (mode === "review") {
      if (isUserAnswer && isCorrect) {
        return "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30";
      }
      if (isUserAnswer && !isCorrect) {
        return "border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/30";
      }
      if (isCorrect) {
        return "border-emerald-500/40 bg-emerald-50/50 dark:border-emerald-600/40 dark:bg-emerald-950/20";
      }
      return "border-muted";
    }

    // Evaluation mode: show selection
    if (isSelected) {
      return "border-primary bg-primary/5 ring-2 ring-primary/20";
    }
    return "border-muted hover:border-primary/40 hover:bg-muted/50 cursor-pointer";
  };

  // Animation variants for evaluation mode only
  const buttonVariants = {
    hover:
      mode === "evaluation" && !isSubmitting
        ? {
            scale: prefersReducedMotion ? 1 : EAnimationScale.UP,
            transition: { duration: EAnimationDuration.FAST, ease: [0.4, 0, 0.2, 1] as const },
          }
        : {},
    tap:
      mode === "evaluation" && !isSubmitting
        ? {
            scale: prefersReducedMotion ? 1 : EAnimationScale.DOWN,
            transition: { duration: 0.1, ease: [0.4, 0, 0.2, 1] as const },
          }
        : {},
  };

  return (
    <motion.button
      onClick={() => onClick(index)}
      disabled={mode === "review" || isSubmitting}
      className={cn(
        "flex items-center justify-between rounded-md border p-3 text-left text-sm",
        getOptionStyle(),
        mode === "review" && "cursor-default"
      )}
      variants={buttonVariants}
      whileHover='hover'
      whileTap='tap'
      data-testid='option-button'
      data-selected={mode === "evaluation" && isSelected}
      data-correct={mode === "review" && isCorrect}
      aria-label={`Option ${String.fromCharCode(65 + index)}`}
      aria-pressed={mode === "evaluation" && isSelected}
    >
      <div className='flex items-center gap-3'>
        <span className='text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold'>
          {index + 1}
        </span>
        <span className='flex-1 break-words'>{option}</span>
      </div>

      {/* Review mode: show correctness icons */}
      {mode === "review" && (
        <>
          {isUserAnswer && isCorrect && (
            <CheckIcon className='ml-2 shrink-0 text-emerald-600 dark:text-emerald-400' weight='bold' size={20} />
          )}
          {isUserAnswer && !isCorrect && (
            <XIcon className='ml-2 shrink-0 text-red-600 dark:text-red-400' weight='bold' size={20} />
          )}
          {!isUserAnswer && isCorrect && (
            <CheckIcon className='text-muted-foreground ml-2 shrink-0' weight='regular' size={16} />
          )}
        </>
      )}
    </motion.button>
  );
}
