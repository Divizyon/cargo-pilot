import { SCENE } from '@/lib/config/scene-config';

export function SceneLights() {
  return (
    <>
      <ambientLight intensity={SCENE.AMBIENT_INTENSITY} />
      <directionalLight
        position={SCENE.DIRECTIONAL_POSITION}
        intensity={SCENE.DIRECTIONAL_INTENSITY}
        castShadow
        shadow-mapSize-width={SCENE.SHADOW_MAP_SIZE}
        shadow-mapSize-height={SCENE.SHADOW_MAP_SIZE}
        shadow-camera-near={SCENE.SHADOW_CAMERA_NEAR}
        shadow-camera-far={SCENE.SHADOW_CAMERA_FAR}
        shadow-camera-left={-SCENE.SHADOW_CAMERA_SIZE}
        shadow-camera-right={SCENE.SHADOW_CAMERA_SIZE}
        shadow-camera-top={SCENE.SHADOW_CAMERA_SIZE}
        shadow-camera-bottom={-SCENE.SHADOW_CAMERA_SIZE}
      />
      <pointLight
        position={SCENE.RIM_POSITION}
        intensity={SCENE.RIM_INTENSITY}
        color={SCENE.RIM_COLOR}
        decay={0}
      />
    </>
  );
}
