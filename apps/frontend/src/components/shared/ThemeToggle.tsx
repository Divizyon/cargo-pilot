import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/lib/store/useUIStore';
import { cn } from '@/lib/utils';

function resolveIsDark(theme: string): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const isDark = resolveIsDark(theme);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const nextTheme = isDark ? 'light' : 'dark';
    const x = e.clientX;
    const y = e.clientY;

    if (!('startViewTransition' in document)) {
      setTheme(nextTheme);
      return;
    }

    const transition = (
      document as Document & {
        startViewTransition: (cb: () => void) => { ready: Promise<void> };
      }
    ).startViewTransition(() => {
      setTheme(nextTheme);
    });

    void transition.ready.then(() => {
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: 450,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  }

  return (
    <button
      onClick={handleClick}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      className={cn(
        'relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-100 border-zinc-200',
        className,
      )}
    >
      {/* Thumb */}
      <span
        className={cn(
          'pointer-events-none absolute inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300',
          isDark ? 'translate-x-[26px]' : 'translate-x-[2px]',
        )}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-zinc-800" />
        ) : (
          <Sun className="h-3 w-3 text-zinc-800" />
        )}
      </span>
    </button>
  );
}
