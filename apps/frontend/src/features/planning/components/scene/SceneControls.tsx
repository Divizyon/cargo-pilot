import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE } from '@/lib/config/scene-config';

export function SceneControls() {
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const vehicle = usePlanStore((s) => s.selectedVehicle);

  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit) return;

    if (!vehicle) {
      camera.position.set(
        SCENE.CAMERA_POSITION[0],
        SCENE.CAMERA_POSITION[1],
        SCENE.CAMERA_POSITION[2],
      );
      orbit.target.set(0, 0, 0);
      orbit.update();
      return;
    }

    const { width, height, length } = vehicle;
    const cx = width / 2;
    const cy = height / 2;
    const cz = length / 2;
    const maxDim = Math.max(width, height, length);
    const dist = maxDim * 1.5;

    camera.position.set(cx + dist * 0.55, cy + dist * 0.5, cz + dist * 0.9);
    orbit.target.set(cx, cy, cz);
    orbit.update();
  }, [vehicle, camera]);

  return (
    <OrbitControls
      ref={orbitRef}
      enableDamping
      dampingFactor={SCENE.ORBIT_DAMPING_FACTOR}
      minDistance={SCENE.ORBIT_MIN_DISTANCE}
      maxDistance={SCENE.ORBIT_MAX_DISTANCE}
    />
  );
}
