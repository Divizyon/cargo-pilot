import { Canvas } from '@react-three/fiber';
import { SceneLights } from '@/features/planning/components/scene/SceneLights';
import { SceneControls } from '@/features/planning/components/scene/SceneControls';
import { CargoMeshInstanced } from '@/features/planning/components/scene/CargoMeshInstanced';
import { SceneDisposer } from '@/lib/three/SceneDisposer';
import { BoxSelectionPanel } from '@/features/planning/components/BoxSelectionPanel';
import { useSceneStore } from '@/lib/store/useSceneStore';

interface PlanCanvasProps {
  className?: string;
  planId?: string;
}

export function PlanCanvas({ className, planId = '' }: PlanCanvasProps) {
  const setSelectedBoxId = useSceneStore((s) => s.setSelectedBoxId);

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 8, 14], fov: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        shadows
        style={{ width: '100%', height: '100%' }}
        onPointerMissed={() => setSelectedBoxId(null)}
      >
        <SceneDisposer />
        <SceneLights />
        <SceneControls />
        <CargoMeshInstanced planId={planId} />
      </Canvas>
      <BoxSelectionPanel />
    </div>
  );
}
