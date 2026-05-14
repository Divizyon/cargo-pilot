import { Suspense, useEffect, type MutableRefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Stats, useProgress } from '@react-three/drei';
import { SceneLights } from '@/features/planning/components/scene/SceneLights';
import { SceneControls } from '@/features/planning/components/scene/SceneControls';
import { CargoMeshInstanced } from '@/features/planning/components/scene/CargoMeshInstanced';
import { ContainerMesh } from '@/features/planning/components/scene/ContainerMesh';
import { CogMarker } from '@/features/planning/components/scene/CogMarker';
import { SceneDisposer } from '@/lib/three/SceneDisposer';
import { StepAnimationControls } from '@/features/planning/components/scene/StepAnimationControls';
import { SCENE } from '@/lib/config/scene-config';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SelectedBoxCoords } from '@/features/planning/components/scene/SelectedBoxCoords';
import { SceneFloor } from '@/features/planning/components/scene/SceneFloor';

interface PlanCanvasProps {
  className?: string;
  planId?: string;
  snapshotRef?: MutableRefObject<(() => string) | null>;
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
  snapshotRef?: MutableRefObject<(() => string) | null>;
}) {
  const gl = useThree((state) => state.gl);
  const requestSnapshot = useSceneStore((s) => s.requestSnapshot);
  const setSnapshotDataUrl = useSceneStore((s) => s.setSnapshotDataUrl);

  useEffect(() => {
    if (snapshotRef) {
      snapshotRef.current = () => gl.domElement.toDataURL('image/png');
    }
    return () => {
      if (snapshotRef) snapshotRef.current = null;
    };
  }, [gl, snapshotRef]);

  useEffect(() => {
    if (!requestSnapshot) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSnapshotDataUrl(gl.domElement.toDataURL('image/png'));
      });
    });
  }, [requestSnapshot, gl, setSnapshotDataUrl]);

  return null;
}

export function PlanCanvas({ className, planId = '', snapshotRef }: PlanCanvasProps) {
  const animationMode = useSceneStore((s) => s.animationMode);
  const totalSteps = usePlanStore((s) => s.placements.length);
  const showControls = totalSteps > 0 && (animationMode === 'playing' || animationMode === 'stepped');

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: SCENE.CAMERA_POSITION,
          fov: SCENE.CAMERA_FOV,
          near: SCENE.CAMERA_NEAR,
          far: SCENE.CAMERA_FAR,
        }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={[SCENE.BACKGROUND_COLOR]} />
        {import.meta.env.DEV && <Stats />}
        <SceneDisposer />
        <SnapshotBridge snapshotRef={snapshotRef} />
        <Suspense fallback={<SceneLoader />}>
          <SceneLights />
          <SceneControls />
          <SceneFloor />
          <ContainerMesh />
          <CargoMeshInstanced planId={planId} />
          <CogMarker />
        </Suspense>
      </Canvas>
      <SelectedBoxCoords />
      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[520px] max-w-[calc(100%-2rem)]">
          <StepAnimationControls
            totalSteps={totalSteps}
            onPlay={() => useSceneStore.getState().startAnimation()}
          />
        </div>
      )}
    </div>
  );
}
