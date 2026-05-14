import { ChevronLeft, ChevronRight, Play, RotateCcw, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const resetAnimation = useSceneStore((s) => s.resetAnimation);

  const isPlaying = animationMode === 'playing';
  const isStepped = animationMode === 'stepped';

  function handleClose() {
    setAnimationMode('idle');
    setAnimationStep(0);
  }

  function handleSlider(value: number[]) {
    const step = value[0] ?? 0;
    setAnimationMode('stepped');
    setAnimationStep(step);
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

  // playing modunda gösterilecek adım sayısı
  const displayStep = isPlaying ? animationStep : isStepped ? animationStep : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur-sm',
        className,
      )}
    >
      {/* Üst satır: play + reset + adım sayacı + kapat */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isPlaying ? 'secondary' : 'default'}
          onClick={onPlay}
          disabled={isPlaying}
          className="h-8 gap-1.5 px-3 text-xs"
        >
          <Play className="h-3 w-3" />
          {isPlaying ? 'Yükleniyor…' : 'Animasyonu Oynat'}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={resetAnimation}
          disabled={isPlaying}
          className="h-8 w-8 p-0"
          title="Sıfırla"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          {displayStep !== null ? (
            <>
              <span className="font-medium text-foreground">{displayStep}</span>
              {' / '}
              {totalSteps}
            </>
          ) : (
            `${totalSteps} adım`
          )}
        </span>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleClose}
          disabled={isPlaying}
          className="h-8 w-8 p-0 ml-1 text-muted-foreground hover:text-foreground"
          title="Kapat"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Alt satır: adım kontrolleri + slider */}
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={goToStart}
          disabled={isPlaying || animationStep === 0}
          className="h-7 w-7 p-0"
          title="Başa git"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={stepBack}
          disabled={isPlaying || animationStep === 0}
          className="h-7 w-7 p-0"
          title="Geri"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <Slider
          min={0}
          max={totalSteps}
          step={1}
          value={[animationStep]}
          onValueChange={handleSlider}
          disabled={isPlaying || totalSteps === 0}
          className="flex-1"
        />

        <Button
          size="sm"
          variant="ghost"
          onClick={stepForward}
          disabled={isPlaying || animationStep === totalSteps}
          className="h-7 w-7 p-0"
          title="İleri"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={goToEnd}
          disabled={isPlaying || animationStep === totalSteps}
          className="h-7 w-7 p-0"
          title="Sona git"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
