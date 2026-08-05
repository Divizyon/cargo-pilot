import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ResourceTracker } from '@/features/planning/scene/utils/ResourceTracker';

/**
 * `<Canvas>` içine yerleştirilen cleanup bileşeni.
 *
 * Planlama ekranı unmount olduğunda veya sekme kapatıldığında sahne
 * grafiğini gezerek geometry/material/texture dispose eder ve WebGL
 * context'ini serbest bırakır.
 *
 * R3F JSX primitive'leri (`<boxGeometry>`, `<meshStandardMaterial>`) R3F
 * tarafından otomatik dispose edilir; bu bileşen imperative oluşturulan
 * kaynakları ve renderer'ın kendisini güvence altına alır.
 */
export function SceneDisposer() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const handleBeforeUnload = () => disposeScene(scene, gl);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      disposeScene(scene, gl);
    };
  }, [gl, scene]);

  return null;
}

function disposeScene(scene: THREE.Scene, gl: THREE.WebGLRenderer): void {
  const tracker = new ResourceTracker();
  tracker.track(scene);
  tracker.disposeAll();
  gl.dispose();
}
