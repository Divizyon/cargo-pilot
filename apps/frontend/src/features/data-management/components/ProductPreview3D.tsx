import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SCENE } from '@/lib/config/scene-config';
import type { ProductType } from '@/features/data-management/schemas/productSchema';

interface Props {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  productType?: ProductType;
  color?: string;
}

const TYPE_COLORS: Record<ProductType, string> = {
  koli: SCENE.COLORS.NORMAL_STR,
  varil: '#f59e0b',
  palet: '#22c55e',
};

const PREVIEW_DIST_FACTOR = 2.5;
const MESH_OPACITY = 0.85;

function SceneSetup({
  maxDim,
  center = [0, 0, 0],
  distFactor = PREVIEW_DIST_FACTOR,
}: {
  maxDim: number;
  center?: [number, number, number];
  distFactor?: number;
}) {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const dist = maxDim * distFactor;
  const [cx, cy, cz] = center;

  useEffect(() => {
    camera.position.set(cx + dist * 0.55, cy + dist * 0.5, cz + dist * 0.9);
    camera.lookAt(cx, cy, cz);
    if (orbitRef.current) {
      orbitRef.current.target.set(cx, cy, cz);
      orbitRef.current.update();
    }
  }, [camera, cx, cy, cz, dist]);

  return (
    <>
      <ambientLight intensity={SCENE.AMBIENT_INTENSITY} />
      <directionalLight
        position={[cx + maxDim * 2, cy + maxDim * 2, cz + maxDim]}
        intensity={SCENE.DIRECTIONAL_INTENSITY}
      />
      <OrbitControls
        ref={orbitRef}
        autoRotate
        autoRotateSpeed={SCENE.ORBIT_AUTO_ROTATE_SPEED}
        enableDamping
        dampingFactor={SCENE.ORBIT_DAMPING_FACTOR}
        enablePan={false}
        enableZoom={false}
        onStart={() => {
          if (orbitRef.current) orbitRef.current.autoRotate = false;
        }}
      />
    </>
  );
}

interface ShapeProps {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  color: string;
}

function KoliScene({ widthCm, heightCm, depthCm, color }: ShapeProps) {
  const maxDim = Math.max(widthCm, heightCm, depthCm);

  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(widthCm, heightCm, depthCm);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [widthCm, heightCm, depthCm]);

  useEffect(
    () => () => {
      edgesGeo.dispose();
    },
    [edgesGeo],
  );

  return (
    <>
      <SceneSetup maxDim={maxDim} />
      <group>
        <mesh>
          <boxGeometry args={[widthCm, heightCm, depthCm]} />
          <meshStandardMaterial color={color} transparent opacity={MESH_OPACITY} />
        </mesh>
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color="#000000" />
        </lineSegments>
      </group>
    </>
  );
}

function VarilScene({ widthCm, heightCm, color }: ShapeProps) {
  // width = çap (diameter), height = yükseklik (cylinder height along Y)
  const radius = widthCm / 2;
  const maxDim = Math.max(widthCm, heightCm);

  const edgesGeo = useMemo(() => {
    const cyl = new THREE.CylinderGeometry(radius, radius, heightCm, 32);
    const edges = new THREE.EdgesGeometry(cyl, 30);
    cyl.dispose();
    return edges;
  }, [radius, heightCm]);

  useEffect(
    () => () => {
      edgesGeo.dispose();
    },
    [edgesGeo],
  );

  return (
    <>
      <SceneSetup maxDim={maxDim} />
      <group>
        <mesh>
          <cylinderGeometry args={[radius, radius, heightCm, 32]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color="#000000" />
        </lineSegments>
      </group>
    </>
  );
}

const PALLET_HEIGHT_CM = 14;

function PaletScene({ widthCm, heightCm, depthCm, color }: ShapeProps) {
  // heightCm = kargo yüksekliği (palet üstündeki ürün); palet her zaman PALLET_HEIGHT_CM sabittir
  const paletH = PALLET_HEIGHT_CM;
  const cargoH = Math.max(0, heightCm);
  const totalH = paletH + cargoH;
  const maxDim = Math.max(widthCm, totalH, depthCm);

  const xUnit = widthCm / 23;
  const slatW = 3 * xUnit;
  const slatGapW = xUnit;

  const yUnit = depthCm / 3.5;
  const crossD = 0.5 * yUnit;
  const crossGapD = yUnit;

  const slatH = paletH * 0.22;
  const carrierH = paletH * 0.5;
  const crossH = paletH;

  const [slatGeo, slatEdges, carrierGeo, carrierEdges, crossGeo, crossEdges] = useMemo(() => {
    const sg = new THREE.BoxGeometry(slatW, slatH, depthCm);
    const se = new THREE.EdgesGeometry(sg);
    const cg = new THREE.BoxGeometry(slatW, carrierH, depthCm);
    const ce = new THREE.EdgesGeometry(cg);
    const xg = new THREE.BoxGeometry(widthCm, crossH, crossD);
    const xe = new THREE.EdgesGeometry(xg);
    return [sg, se, cg, ce, xg, xe] as const;
  }, [slatW, slatH, carrierH, crossH, depthCm, widthCm, crossD]);

  const [cargoGeo, cargoEdges] = useMemo(() => {
    if (cargoH <= 0) return [null, null] as const;
    const cg = new THREE.BoxGeometry(widthCm, cargoH, depthCm);
    const ce = new THREE.EdgesGeometry(cg);
    return [cg, ce] as const;
  }, [widthCm, cargoH, depthCm]);

  useEffect(
    () => () => {
      slatGeo.dispose();
      slatEdges.dispose();
      carrierGeo.dispose();
      carrierEdges.dispose();
      crossGeo.dispose();
      crossEdges.dispose();
      cargoGeo?.dispose();
      cargoEdges?.dispose();
    },
    [slatGeo, slatEdges, carrierGeo, carrierEdges, crossGeo, crossEdges, cargoGeo, cargoEdges],
  );

  const slatCentersX = Array.from({ length: 6 }, (_, i) => i * (slatW + slatGapW) + slatW / 2);
  const crossZCenters = Array.from({ length: 3 }, (_, i) => i * (crossD + crossGapD) + crossD / 2);

  const topCenterY = paletH - slatH / 2;
  const carrierCenterY = carrierH / 2;
  const crossCenterY = paletH / 2;
  // Kargo kutusunun merkezi: palet üstünden başlayıp cargoH kadar yukarda
  const cargoCenterY = paletH + cargoH / 2;

  const sceneCenter: [number, number, number] = [widthCm / 2, totalH / 2, depthCm / 2];

  return (
    <>
      <SceneSetup maxDim={maxDim} center={sceneCenter} distFactor={PREVIEW_DIST_FACTOR / 2} />
      <group>
        {/* Üst tahtalar */}
        {slatCentersX.map((cx, i) => (
          <group key={`top-${i}`} position={[cx, topCenterY, depthCm / 2]}>
            <mesh geometry={slatGeo}>
              <meshStandardMaterial color={color} transparent opacity={MESH_OPACITY} />
            </mesh>
            <lineSegments geometry={slatEdges}>
              <lineBasicMaterial color="#000000" />
            </lineSegments>
          </group>
        ))}

        {/* Alt taşıyıcı tahtalar */}
        {slatCentersX.map((cx, i) => (
          <group key={`carrier-${i}`} position={[cx, carrierCenterY, depthCm / 2]}>
            <mesh geometry={carrierGeo}>
              <meshStandardMaterial color={color} transparent opacity={MESH_OPACITY} />
            </mesh>
            <lineSegments geometry={carrierEdges}>
              <lineBasicMaterial color="#000000" />
            </lineSegments>
          </group>
        ))}

        {/* Çapraz bağlantı tahtaları */}
        {crossZCenters.map((cz, i) => (
          <group key={`cross-${i}`} position={[widthCm / 2, crossCenterY, cz]}>
            <mesh geometry={crossGeo}>
              <meshStandardMaterial color={color} transparent opacity={MESH_OPACITY} />
            </mesh>
            <lineSegments geometry={crossEdges}>
              <lineBasicMaterial color="#000000" />
            </lineSegments>
          </group>
        ))}

        {/* Kargo kutusu (palet üstünde) */}
        {cargoGeo && cargoEdges && cargoH > 0 && (
          <group position={[widthCm / 2, cargoCenterY, depthCm / 2]}>
            <mesh geometry={cargoGeo}>
              <meshStandardMaterial
                color={SCENE.COLORS.NORMAL_STR}
                transparent
                opacity={MESH_OPACITY}
              />
            </mesh>
            <lineSegments geometry={cargoEdges}>
              <lineBasicMaterial color="#000000" />
            </lineSegments>
          </group>
        )}
      </group>
    </>
  );
}

export function ProductPreview3D({
  widthCm,
  heightCm,
  depthCm,
  productType = 'koli',
  color,
}: Props) {
  const resolvedColor = color ?? TYPE_COLORS[productType];

  const SceneComponent =
    productType === 'varil' ? VarilScene : productType === 'palet' ? PaletScene : KoliScene;

  return (
    <Canvas
      camera={{ fov: SCENE.CAMERA_FOV, near: SCENE.CAMERA_NEAR, far: SCENE.CAMERA_FAR }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[SCENE.BACKGROUND_COLOR]} />
      <SceneComponent
        widthCm={widthCm}
        heightCm={heightCm}
        depthCm={depthCm}
        color={resolvedColor}
      />
    </Canvas>
  );
}
