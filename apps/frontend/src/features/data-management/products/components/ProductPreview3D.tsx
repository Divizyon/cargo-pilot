import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SCENE } from '@/lib/config/scene-config';
import type { ProductType } from '@/features/data-management/products/schemas/productSchema';
import { buildBoxLabel, loadIcons } from '@/lib/utils/scene/buildBoxLabel';

interface Props {
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  productType?: ProductType;
  color?: string;
  sku?: string;
  name?: string;
  constraintIconUrls?: string[];
}

const TYPE_COLORS: Record<ProductType, string> = {
  koli: SCENE.COLORS.NORMAL_STR,
  varil: '#f59e0b',
  palet: '#22c55e',
};

const PREVIEW_DIST_FACTOR = 2.5;
const MESH_OPACITY = 0.85;
const EDGE_COLOR = SCENE.COLORS.CONTAINER_EDGE;
const EDGE_OPACITY = 0.55;

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
  lengthCm: number;
  color: string;
  sku?: string;
  name?: string;
  constraintIconUrls?: string[];
}

function KoliScene({
  widthCm,
  heightCm,
  lengthCm,
  color,
  sku,
  name,
  constraintIconUrls,
}: ShapeProps) {
  const maxDim = Math.max(widthCm, heightCm, lengthCm);
  const label = sku || name || '—';

  const [iconImgs, setIconImgs] = useState<HTMLImageElement[]>([]);
  useEffect(() => {
    let cancelled = false;
    const urls = constraintIconUrls ?? [];
    (urls.length > 0 ? loadIcons(urls) : Promise.resolve([] as HTMLImageElement[])).then((imgs) => {
      if (!cancelled) setIconImgs(imgs);
    });
    return () => {
      cancelled = true;
    };
  }, [constraintIconUrls]);

  const labelTexture = useMemo(
    () => buildBoxLabel(label, 1, 1, color, iconImgs),
    [label, color, iconImgs],
  );

  useEffect(
    () => () => {
      labelTexture.dispose();
    },
    [labelTexture],
  );

  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(widthCm, heightCm, lengthCm);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [widthCm, heightCm, lengthCm]);

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
          <boxGeometry args={[widthCm, heightCm, lengthCm]} />
          {/* BoxGeometry yüz sırası: +X(0), -X(1), +Y(2), -Y(3/taban), +Z(4), -Z(5) */}
          {[0, 1, 2, 3, 4, 5].map((face) =>
            face === 3 ? (
              <meshStandardMaterial
                key={face}
                attach={`material-${face}`}
                color={color}
                transparent
                opacity={MESH_OPACITY}
                metalness={0.1}
                roughness={0.6}
              />
            ) : (
              <meshStandardMaterial
                key={face}
                attach={`material-${face}`}
                map={labelTexture}
                color="#ffffff"
                metalness={0.1}
                roughness={0.6}
              />
            ),
          )}
        </mesh>
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color={EDGE_COLOR} transparent opacity={EDGE_OPACITY} />
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
          <meshStandardMaterial
            color={color}
            transparent
            opacity={MESH_OPACITY}
            metalness={0.1}
            roughness={0.6}
          />
        </mesh>
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color={EDGE_COLOR} transparent opacity={EDGE_OPACITY} />
        </lineSegments>
      </group>
    </>
  );
}

const PALLET_HEIGHT_CM = 14;
const PALLET_WOOD_COLOR = '#c8a96e';

function PaletScene({
  widthCm,
  heightCm,
  lengthCm,
  color,
  sku,
  name,
  constraintIconUrls,
}: ShapeProps) {
  // heightCm = kullanıcının girdiği toplam yükseklik; palet sabit 14 cm, kargo = kalan
  const paletH = Math.min(PALLET_HEIGHT_CM, heightCm);
  const cargoH = Math.max(0, heightCm - paletH);
  const totalH = paletH + cargoH;
  const maxDim = Math.max(widthCm, totalH, lengthCm);
  const label = sku || name || '—';

  const [iconImgs, setIconImgs] = useState<HTMLImageElement[]>([]);
  useEffect(() => {
    let cancelled = false;
    const urls = constraintIconUrls ?? [];
    (urls.length > 0 ? loadIcons(urls) : Promise.resolve([] as HTMLImageElement[])).then((imgs) => {
      if (!cancelled) setIconImgs(imgs);
    });
    return () => {
      cancelled = true;
    };
  }, [constraintIconUrls]);

  const labelTexture = useMemo(
    () => buildBoxLabel(label, 1, 1, color, iconImgs),
    [label, color, iconImgs],
  );
  useEffect(
    () => () => {
      labelTexture.dispose();
    },
    [labelTexture],
  );

  const xUnit = widthCm / 23;
  const slatW = 3 * xUnit;
  const slatGapW = xUnit;

  const yUnit = lengthCm / 3.5;
  const crossD = 0.5 * yUnit;
  const crossGapD = yUnit;

  const slatH = paletH * 0.22;
  const carrierH = paletH * 0.5;
  const crossH = paletH;

  const [slatGeo, slatEdges, carrierGeo, carrierEdges, crossGeo, crossEdges] = useMemo(() => {
    const sg = new THREE.BoxGeometry(slatW, slatH, lengthCm);
    const se = new THREE.EdgesGeometry(sg);
    const cg = new THREE.BoxGeometry(slatW, carrierH, lengthCm);
    const ce = new THREE.EdgesGeometry(cg);
    const xg = new THREE.BoxGeometry(widthCm, crossH, crossD);
    const xe = new THREE.EdgesGeometry(xg);
    return [sg, se, cg, ce, xg, xe] as const;
  }, [slatW, slatH, carrierH, crossH, lengthCm, widthCm, crossD]);

  const [cargoGeo, cargoEdges] = useMemo(() => {
    if (cargoH <= 0) return [null, null] as const;
    const cg = new THREE.BoxGeometry(widthCm, cargoH, lengthCm);
    const ce = new THREE.EdgesGeometry(cg);
    return [cg, ce] as const;
  }, [widthCm, cargoH, lengthCm]);

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

  const sceneCenter: [number, number, number] = [widthCm / 2, totalH / 2, lengthCm / 2];

  return (
    <>
      <SceneSetup maxDim={maxDim} center={sceneCenter} distFactor={PREVIEW_DIST_FACTOR / 2} />
      <group>
        {/* Üst tahtalar */}
        {slatCentersX.map((cx, i) => (
          <group key={`top-${i}`} position={[cx, topCenterY, lengthCm / 2]}>
            <mesh geometry={slatGeo}>
              <meshStandardMaterial color={PALLET_WOOD_COLOR} transparent opacity={MESH_OPACITY} />
            </mesh>
            <lineSegments geometry={slatEdges}>
              <lineBasicMaterial color={EDGE_COLOR} transparent opacity={EDGE_OPACITY} />
            </lineSegments>
          </group>
        ))}

        {/* Alt taşıyıcı tahtalar */}
        {slatCentersX.map((cx, i) => (
          <group key={`carrier-${i}`} position={[cx, carrierCenterY, lengthCm / 2]}>
            <mesh geometry={carrierGeo}>
              <meshStandardMaterial color={PALLET_WOOD_COLOR} transparent opacity={MESH_OPACITY} />
            </mesh>
            <lineSegments geometry={carrierEdges}>
              <lineBasicMaterial color={EDGE_COLOR} transparent opacity={EDGE_OPACITY} />
            </lineSegments>
          </group>
        ))}

        {/* Çapraz bağlantı tahtaları */}
        {crossZCenters.map((cz, i) => (
          <group key={`cross-${i}`} position={[widthCm / 2, crossCenterY, cz]}>
            <mesh geometry={crossGeo}>
              <meshStandardMaterial color={PALLET_WOOD_COLOR} transparent opacity={MESH_OPACITY} />
            </mesh>
            <lineSegments geometry={crossEdges}>
              <lineBasicMaterial color={EDGE_COLOR} transparent opacity={EDGE_OPACITY} />
            </lineSegments>
          </group>
        ))}

        {/* Kargo kutusu (palet üstünde) */}
        {cargoGeo && cargoEdges && cargoH > 0 && (
          <group position={[widthCm / 2, cargoCenterY, lengthCm / 2]}>
            <mesh geometry={cargoGeo}>
              {[0, 1, 2, 3, 4, 5].map((face) =>
                face === 3 ? (
                  <meshStandardMaterial
                    key={face}
                    attach={`material-${face}`}
                    color={color}
                    transparent
                    opacity={MESH_OPACITY}
                    metalness={0.1}
                    roughness={0.6}
                  />
                ) : (
                  <meshStandardMaterial
                    key={face}
                    attach={`material-${face}`}
                    map={labelTexture}
                    color="#ffffff"
                    metalness={0.1}
                    roughness={0.6}
                  />
                ),
              )}
            </mesh>
            <lineSegments geometry={cargoEdges}>
              <lineBasicMaterial color={EDGE_COLOR} transparent opacity={EDGE_OPACITY} />
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
  lengthCm,
  productType = 'koli',
  color,
  sku,
  name,
  constraintIconUrls,
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
        lengthCm={lengthCm}
        color={resolvedColor}
        sku={sku}
        name={name}
        constraintIconUrls={constraintIconUrls}
      />
    </Canvas>
  );
}
