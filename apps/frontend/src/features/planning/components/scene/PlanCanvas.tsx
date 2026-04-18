import { Canvas } from '@react-three/fiber';
import { SceneLights } from '@/features/planning/components/scene/SceneLights';
import { SceneControls } from '@/features/planning/components/scene/SceneControls';

interface PlanCanvasProps {
  className?: string;
}

export function PlanCanvas({ className }: PlanCanvasProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 8, 14], fov: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <SceneLights />
        <SceneControls />
      </Canvas>
    </div>
  );
}
