import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import gsap from 'gsap';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE } from '@/lib/config/scene-config';
import { animateCameraTo } from '@/lib/three/cameraUtils';

const tmpPos = new Vector3();
const tmpLook = new Vector3();

export function SceneControls() {
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const cameraPreset = useSceneStore((s) => s.cameraPreset);
  const setCameraPreset = useSceneStore((s) => s.setCameraPreset);
  const isDragging = useSceneStore((s) => s.isDragging);

  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit) return;

    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(orbit.target);

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
    const dist = maxDim * SCENE.CAMERA_DISTANCE_FACTOR;

    camera.position.set(cx + dist * 0.55, cy + dist * 0.5, cz + dist * 0.9);
    orbit.target.set(cx, cy, cz);
    orbit.update();
  }, [vehicle, camera]);

  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit || !cameraPreset) return;

    let cx = 0,
      cy = 0,
      cz = 0,
      dist: number;
    if (vehicle) {
      cx = vehicle.width / 2;
      cy = vehicle.height / 2;
      cz = vehicle.length / 2;
      dist = Math.max(vehicle.width, vehicle.height, vehicle.length) * SCENE.CAMERA_DISTANCE_FACTOR;
    } else {
      const [px, py, pz] = SCENE.CAMERA_POSITION;
      dist = Math.hypot(px, py, pz);
    }

    const [dx, dy, dz] = SCENE.CAMERA_PRESETS[cameraPreset].dir;
    const len = Math.hypot(dx, dy, dz) || 1;
    tmpPos.set(cx + (dx / len) * dist, cy + (dy / len) * dist, cz + (dz / len) * dist);
    tmpLook.set(cx, cy, cz);

    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(orbit.target);
    animateCameraTo(camera, orbit, tmpPos, tmpLook, SCENE.CAMERA_TRANSITION_S);

    const timer = window.setTimeout(() => setCameraPreset(null), SCENE.CAMERA_TRANSITION_S * 1000);
    return () => window.clearTimeout(timer);
  }, [cameraPreset, vehicle, camera, setCameraPreset]);

  return (
    <OrbitControls
      ref={orbitRef}
      enabled={!isDragging}
      enableDamping
      dampingFactor={SCENE.ORBIT_DAMPING_FACTOR}
      minDistance={SCENE.ORBIT_MIN_DISTANCE}
      maxDistance={SCENE.ORBIT_MAX_DISTANCE}
      maxPolarAngle={SCENE.ORBIT_MAX_POLAR_ANGLE}
    />
  );
}
