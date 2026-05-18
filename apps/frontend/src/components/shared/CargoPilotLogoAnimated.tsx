import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface CargoPilotLogoAnimatedProps {
  className?: string;
}

type BezierTuple = [number, number, number, number];

const EASE_OUT: BezierTuple = [0.0, 0.55, 0.45, 1.0];
const EASE_IN: BezierTuple = [0.55, 0.0, 1.0, 0.45];

// Giriş: yukarıdan düşüp 2 kez sekip yerleşir
const ENTRANCE_Y = [null, 0, -16, 0, -5, 0];
const ENTRANCE_TIMES = [0, 0.44, 0.62, 0.78, 0.88, 1.0];
const ENTRANCE_EASE: BezierTuple[] = [EASE_IN, EASE_OUT, EASE_IN, EASE_OUT, EASE_IN];

// Döngü: azalan zıplama, bekleme, tekrar
const BOUNCE_Y = [0, -32, 0, -18, 0, -8, 0, -3, 0, 0];
const BOUNCE_TIMES = [0, 0.13, 0.26, 0.37, 0.48, 0.56, 0.64, 0.69, 0.74, 1.0];
const BOUNCE_EASE: BezierTuple[] = [
  EASE_OUT,
  EASE_IN,
  EASE_OUT,
  EASE_IN,
  EASE_OUT,
  EASE_IN,
  EASE_OUT,
  EASE_IN,
  [0, 0, 1, 1],
];

const paths = [
  'M817.15,541.55c-.42-2.84-1.52-5.54-2.86-6.43s-5.47-1.61-6.94-.85l-25.79,13.31-91.1,48.79c-2.51,1.34-4.13,5.82-4.13,8.91v257.4s-75.21,41.44-75.21,41.44c-3.18,1.75-8.19.81-10.81-.82-2.43-1.51-4.85-5.4-4.85-9.56l.02-346.55c0-5.9,2.62-12.37,7.7-15.21l139.53-78.21,57.14-31.85c6.39-3.56,11.98-3.23,18.2.13l52.44,28.37,25.37,15.7c6.83,4.23,10.97,11.7,10.96,20.15l-.03,112.65-1.37,69.97c.2,8.73-3.49,16.02-10.98,20.69l-183.42,101.59-.07-112.98,106.13-58.74.08-77.93Z',
  'M437.01,692.39c.12,5.02,1.62,8.13,4.92,10.84l128.65,71.53-.15,111.43-204.28-117.05c-12.31-8.71-18.4-21.23-18.4-36.31l.05-232.64c1.39-14.78,8.91-26.06,21.61-32.98l115.97-63.25,150,80.64-44.26,25.41c-12.84,8.15-20.61,20.64-20.53,36.09l-.17,62.95-121.62-66.69c-1.88-1.03-6.44-.21-8.07.67-1.78.96-3.78,4.06-3.77,7.08l.05,142.28Z',
  'M661.05,470.39l-149.81-80.14,104.73-56.15c11.05-4.04,22.27-3.94,32.9,1.07l131.7,69-119.53,66.21Z',
];

function AnimatedPath({ d, index }: { d: string; index: number }) {
  const controls = useAnimation();

  useEffect(() => {
    async function run() {
      await controls.start({
        y: ENTRANCE_Y,
        opacity: 1,
        transition: {
          y: {
            delay: index * 0.25,
            duration: 1.2,
            times: ENTRANCE_TIMES,
            ease: ENTRANCE_EASE as never,
          },
          opacity: { delay: index * 0.25, duration: 0.12 },
        },
      });

      controls.start({
        y: BOUNCE_Y,
        transition: {
          y: {
            delay: index * 0.18,
            duration: 3.0,
            times: BOUNCE_TIMES,
            ease: BOUNCE_EASE as never,
            repeat: Infinity,
            repeatDelay: 2.2,
          },
        },
      });
    }

    run();
  }, [controls, index]);

  return (
    <motion.path
      initial={{ y: -60, opacity: 0 }}
      animate={controls}
      style={{ overflow: 'visible' }}
      d={d}
    />
  );
}

export function CargoPilotLogoAnimated({ className }: CargoPilotLogoAnimatedProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="330 315 595 610"
      fill="currentColor"
      className={className}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <AnimatedPath key={i} d={d} index={i} />
      ))}
    </svg>
  );
}
