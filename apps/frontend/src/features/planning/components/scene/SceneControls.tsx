import { OrbitControls } from '@react-three/drei';

export function SceneControls() {
  return <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={50} />;
}
