import { Canvas } from '@react-three/fiber';
import { SceneLights } from '@/features/planning/components/scene/SceneLights';
import { SceneControls } from '@/features/planning/components/scene/SceneControls';
import { CargoMeshInstanced } from '@/features/planning/components/scene/CargoMeshInstanced';
import { SceneDisposer } from '@/lib/three/SceneDisposer';

interface PlanCanvasProps {
  className?: string;
  planId?: string;
}

export function PlanCanvas({ className, planId = '' }: PlanCanvasProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 8, 14], fov: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <SceneDisposer />
        <SceneLights />
        <SceneControls />
        <CargoMeshInstanced planId={planId} />
      </Canvas>
    </div>
  );
}
