import { SCENE } from '@/lib/config/scene-config';

export function SceneLights() {
  return (
    <>
      <ambientLight intensity={SCENE.AMBIENT_INTENSITY} />
      <directionalLight
        position={SCENE.DIRECTIONAL_POSITION}
        intensity={SCENE.DIRECTIONAL_INTENSITY}
        castShadow
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
