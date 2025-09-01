"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

export default function Loader() {
  const [lottieData, setLottieData] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/animations/girl-with-book.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load animation"))))
      .then((json) => {
        if (isMounted) setLottieData(json);
      })
      .catch(() => {
        // silent fallback
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 py-12 rounded-lg min-h-[60vh]'>
      {lottieData ? (
        <div className='relative mx-auto mb-2 w-[260px] sm:w-[320px] md:w-[380px]'>
          <Lottie
            animationData={lottieData}
            loop
            autoplay
            className='h-auto w-full'
            rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
          />
        </div>
      ) : null}

      <p className='mt-6 max-w-prose text-center text-sm md:text-base text-foreground'>
        Summoning the question genie… check your lamp—uh, email.
      </p>
    </div>
  );
}
