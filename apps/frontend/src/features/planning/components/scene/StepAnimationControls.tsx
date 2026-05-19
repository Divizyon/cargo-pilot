import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pause, Play } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { cn } from '@/lib/utils';

interface StepAnimationControlsProps {
  totalSteps: number;
  onPlay: () => void;
  className?: string;
}

export function StepAnimationControls({
  totalSteps,
  onPlay,
  className,
}: StepAnimationControlsProps) {
  const animationMode = useSceneStore((s) => s.animationMode);
  const animationStep = useSceneStore((s) => s.animationStep);
  const setAnimationMode = useSceneStore((s) => s.setAnimationMode);
  const setAnimationStep = useSceneStore((s) => s.setAnimationStep);

  const isPlaying = animationMode === 'playing';
  const isStepped = animationMode === 'stepped';
  const displayStep = isPlaying || isStepped ? animationStep : 0;

  function handlePlayPause() {
    if (isPlaying) {
      setAnimationMode('stepped');
    } else {
      onPlay();
    }
  }

  function handleSlider(value: number[]) {
    setAnimationMode('stepped');
    setAnimationStep(value[0] ?? 0);
  }

  function stepBack() {
    setAnimationMode('stepped');
    setAnimationStep(Math.max(0, animationStep - 1));
  }

  function stepForward() {
    setAnimationMode('stepped');
    setAnimationStep(Math.min(totalSteps, animationStep + 1));
  }

  function goToStart() {
    setAnimationMode('stepped');
    setAnimationStep(0);
  }

  function goToEnd() {
    setAnimationMode('stepped');
    setAnimationStep(totalSteps);
  }

  const btnBase =
    'flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className={cn('flex flex-col gap-2.5 px-3 py-3', className)}>
      {/* Progress slider — thumb sadece hover'da görünür */}
      <div className="group/bar w-full">
        <Slider
          min={0}
          max={totalSteps}
          step={1}
          value={[displayStep]}
          onValueChange={handleSlider}
          disabled={totalSteps === 0}
          className={cn(
            'w-full',
            '[&_[role=slider]]:opacity-0 [&_[role=slider]]:transition-opacity [&_[role=slider]]:duration-150',
            'group-hover/bar:[&_[role=slider]]:opacity-100',
          )}
        />
      </div>

      {/* Kontrol butonları */}
      <div className="flex items-center justify-center gap-1">
        {/* Başa git */}
        <button
          type="button"
          onClick={goToStart}
          disabled={isPlaying || animationStep === 0}
          title="Başa git"
          className={cn(btnBase, 'h-7 w-7')}
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>

        {/* Geri */}
        <button
          type="button"
          onClick={stepBack}
          disabled={isPlaying || animationStep === 0}
          title="Geri"
          className={cn(btnBase, 'h-7 w-7')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Play / Pause — büyük dolu daire */}
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={totalSteps === 0}
          title={isPlaying ? 'Duraklat' : 'Oynat'}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/80 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-px" />
          )}
        </button>

        {/* İleri */}
        <button
          type="button"
          onClick={stepForward}
          disabled={isPlaying || animationStep === totalSteps}
          title="İleri"
          className={cn(btnBase, 'h-7 w-7')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Sona git */}
        <button
          type="button"
          onClick={goToEnd}
          disabled={isPlaying || animationStep === totalSteps}
          title="Sona git"
          className={cn(btnBase, 'h-7 w-7')}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
