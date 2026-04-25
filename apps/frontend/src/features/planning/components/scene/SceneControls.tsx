import { useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SCENE } from '@/lib/config/scene-config';

export function SceneControls() {
  const orbitRef = useRef<OrbitControlsImpl>(null);

  return (
    <OrbitControls
      ref={orbitRef}
      enableDamping
      dampingFactor={SCENE.ORBIT_DAMPING_FACTOR}
      autoRotate
      autoRotateSpeed={SCENE.ORBIT_AUTO_ROTATE_SPEED}
      minDistance={SCENE.ORBIT_MIN_DISTANCE}
      maxDistance={SCENE.ORBIT_MAX_DISTANCE}
      onStart={() => {
        if (orbitRef.current) orbitRef.current.autoRotate = false;
      }}
    />
  );
}
