import gsap from 'gsap';
import type { Camera, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export function animateCameraTo(
  camera: Camera,
  controls: OrbitControlsImpl,
  targetPos: Vector3,
  targetLook: Vector3,
  duration = 0.8,
): void {
  const originalDamping = controls.enableDamping;
  controls.enableDamping = false;

  gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration,
    ease: 'power2.inOut',
    onUpdate: () => controls.update(),
    onComplete: () => {
      controls.enableDamping = originalDamping;
    },
  });

  gsap.to(controls.target, {
    x: targetLook.x,
    y: targetLook.y,
    z: targetLook.z,
    duration,
    ease: 'power2.inOut',
  });
}
