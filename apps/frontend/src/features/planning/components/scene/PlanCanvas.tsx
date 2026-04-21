import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, useProgress } from '@react-three/drei';
import { SceneLights } from '@/features/planning/components/scene/SceneLights';
import { SceneControls } from '@/features/planning/components/scene/SceneControls';
import { CargoMeshInstanced } from '@/features/planning/components/scene/CargoMeshInstanced';
import { SceneDisposer } from '@/lib/three/SceneDisposer';

interface PlanCanvasProps {
  className?: string;
  planId?: string;
  snapshotRef?: React.MutableRefObject<(() => string) | null>;
}

function SceneLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}

function SnapshotBridge({
  snapshotRef,
}: {
  snapshotRef?: React.MutableRefObject<(() => string) | null>;
}) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    if (snapshotRef) {
      snapshotRef.current = () => gl.domElement.toDataURL('image/png');
    }
    return () => {
      if (snapshotRef) {
        snapshotRef.current = null;
      }
    };
  }, [gl, snapshotRef]);

  return null;
}

export function PlanCanvas({
  className,
  planId = '',
  snapshotRef,
}: PlanCanvasProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 8, 14], fov: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <SceneDisposer />
        <SnapshotBridge snapshotRef={snapshotRef} />
        <Suspense fallback={<SceneLoader />}>
          <SceneLights />
          <SceneControls />
          <CargoMeshInstanced planId={planId} />
        </Suspense>
      </Canvas>
    </div>
  );
}
