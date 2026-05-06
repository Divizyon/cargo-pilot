import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SCENE } from '@/lib/config/scene-config';
import { VehicleType } from '@/lib/types/vehicle';
import type { VehicleType as VehicleTypeValue, DoorDirection } from '@/lib/types/vehicle';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CAB_LENGTH_RATIO_KAMYON = 0.3;
const CAB_LENGTH_RATIO_TIR = 0.25;
const CAB_GAP_TIR = 100; // Tır: kabin-kargo arası boşluk; king pimi bu alanda görünür
const CAB_COLOR = '#6b7280';
const KINGPIN_RADIUS_CM = 25;
const KINGPIN_HEIGHT_CM = 120;
const KINGPIN_COLOR = '#1a1a1a';
const DOOR_PANEL_T = 3;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface VehiclePreview3DProps {
  vehicleType: VehicleTypeValue;
  length: number;
  width: number;
  height: number;
  doorDirection?: DoorDirection;
  doorSide?: 'left' | 'right';
  kingpinDistance?: number;
  axleBDistance?: number;
  axleDistances?: number[];
}

// ─── Scene Setup ───────────────────────────────────────────────────────────────

function SceneSetup({
  cx,
  cy,
  cz,
  maxDim,
}: {
  cx: number;
  cy: number;
  cz: number;
  maxDim: number;
}) {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const dist = maxDim * 1.8;

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

// ─── Cargo Body ────────────────────────────────────────────────────────────────

// Origin = sol-alt-arka. Kargo: x∈[0,w], y∈[0,h], z∈[0,l]. Rear kapı Z=0 yüzündedir.
function CargoBody({ width, height, length }: { width: number; height: number; length: number }) {
  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, length);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [width, height, length]);

  useEffect(
    () => () => {
      edgesGeo.dispose();
    },
    [edgesGeo],
  );

  return (
    <group>
      <mesh position={[width / 2, height / 2, length / 2]} receiveShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial
          color={SCENE.COLORS.CONTAINER_INSIDE}
          side={THREE.BackSide}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      <lineSegments geometry={edgesGeo} position={[width / 2, height / 2, length / 2]}>
        <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
      </lineSegments>
    </group>
  );
}

// ─── Cab (Kamyon / Tır) ────────────────────────────────────────────────────────

// Kabin, kargo alanının önüne (Z > cargoLength) yerleştirilir.
function CabMesh({
  width,
  height,
  cargoLength,
  cabLength,
  gapLength = 0,
}: {
  width: number;
  height: number;
  cargoLength: number;
  cabLength: number;
  gapLength?: number;
}) {
  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, cabLength);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [width, height, cabLength]);

  useEffect(
    () => () => {
      edgesGeo.dispose();
    },
    [edgesGeo],
  );

  const cz = cargoLength + gapLength + cabLength / 2;

  return (
    <group>
      <mesh position={[width / 2, height / 2, cz]} castShadow>
        <boxGeometry args={[width, height, cabLength]} />
        <meshStandardMaterial color={CAB_COLOR} metalness={0.2} roughness={0.7} />
      </mesh>
      <lineSegments geometry={edgesGeo} position={[width / 2, height / 2, cz]}>
        <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
      </lineSegments>
    </group>
  );
}

// ─── Door Face Indicator ──────────────────────────────────────────────────────

// Kapı yüzeyini ince renkli panel ile vurgular. Renk ContainerMesh ile aynı (CONTAINER_DOOR).
function DoorFaceIndicator({
  width,
  height,
  length,
  doorDirection,
  doorSide,
}: {
  width: number;
  height: number;
  length: number;
  doorDirection: DoorDirection;
  doorSide?: 'left' | 'right';
}) {
  const isRear = doorDirection === 'rear' || doorDirection === 'rearAndSide';
  const isSide = doorDirection === 'side' || doorDirection === 'rearAndSide';
  const isTop = doorDirection === 'top';

  const sideX = doorSide === 'right' ? width + DOOR_PANEL_T / 2 : -DOOR_PANEL_T / 2;

  return (
    <>
      {isRear && (
        <mesh position={[width / 2, height / 2, -DOOR_PANEL_T / 2]}>
          <boxGeometry args={[width, height, DOOR_PANEL_T]} />
          <meshStandardMaterial color={SCENE.COLORS.CONTAINER_DOOR} transparent opacity={0.6} />
        </mesh>
      )}
      {isSide && (
        <mesh position={[sideX, height / 2, length / 2]}>
          <boxGeometry args={[DOOR_PANEL_T, height, length]} />
          <meshStandardMaterial color={SCENE.COLORS.CONTAINER_DOOR} transparent opacity={0.6} />
        </mesh>
      )}
      {isTop && (
        <mesh position={[width / 2, height + DOOR_PANEL_T / 2, length / 2]}>
          <boxGeometry args={[width, DOOR_PANEL_T, length]} />
          <meshStandardMaterial color={SCENE.COLORS.CONTAINER_DOOR} transparent opacity={0.6} />
        </mesh>
      )}
    </>
  );
}

// ─── King Pin ─────────────────────────────────────────────────────────────────

// Kargo gövdesinin dışında, boşluk (gap) veya ön yüz ötesinde konumlandırılır.
// Y merkezi = -KINGPIN_HEIGHT_CM/2: silindir kargo tabanından (Y=0) aşağı sarkar.
// Z konumu hesabı: kargo geometrisiyle çakışmayan bölge → her zaman görünür.
function KingPinMesh({ width, zPos }: { width: number; zPos: number }) {
  return (
    <mesh position={[width / 2, -KINGPIN_HEIGHT_CM / 2, zPos]}>
      <cylinderGeometry args={[KINGPIN_RADIUS_CM, KINGPIN_RADIUS_CM, KINGPIN_HEIGHT_CM, 24]} />
      <meshStandardMaterial color={KINGPIN_COLOR} metalness={0.7} roughness={0.3} />
    </mesh>
  );
}

// ─── Axle / Wheel Assembly ────────────────────────────────────────────────────

// Dingil grubu: ince metal çubuk + her iki uçta siyah tekerlek diski.
// Tekerlek çapı ≈ kargo yüksekliğinin 0.4'ü. Grup zPos değişince birlikte hareket eder.
function AxleWheelAssembly({
  width,
  height,
  zPos,
}: {
  width: number;
  height: number;
  zPos: number;
}) {
  const wheelRadius = height * 0.2;
  const wheelThickness = Math.max(wheelRadius * 0.35, 6);
  const barRadius = Math.max(wheelRadius * 0.14, 4);
  const yCenter = -wheelRadius;

  const bDx = wheelRadius * 0.5;
  const bDy = wheelRadius;
  const braceLen = Math.sqrt(bDx * bDx + bDy * bDy);
  const braceAngle = -Math.atan2(bDx, bDy);
  const braceOffset = Math.max(barRadius * 3, 12);

  return (
    <group position={[0, yCenter, zPos]}>
      <mesh position={[width / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[barRadius, barRadius, width, 12]} />
        <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[braceOffset + bDx / 2, bDy / 2, 0]} rotation={[0, 0, braceAngle]}>
        <cylinderGeometry args={[barRadius * 0.6, barRadius * 0.6, braceLen, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[width - braceOffset - bDx / 2, bDy / 2, 0]} rotation={[0, 0, -braceAngle]}>
        <cylinderGeometry args={[barRadius * 0.6, barRadius * 0.6, braceLen, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[-wheelThickness / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelThickness, 28]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.8} />
      </mesh>
      <mesh position={[width + wheelThickness / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelThickness, 28]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Full Vehicle Scene ───────────────────────────────────────────────────────

function VehicleScene({
  vehicleType,
  length,
  width,
  height,
  doorDirection,
  doorSide,
  axleBDistance,
  axleDistances,
}: VehiclePreview3DProps) {
  const isTir = vehicleType === VehicleType.Tir;
  const isKamposet = vehicleType === VehicleType.Kamposet;
  const hasCab = vehicleType === VehicleType.Kamyon || isTir;
  const cabLength =
    vehicleType === VehicleType.Kamyon
      ? length * CAB_LENGTH_RATIO_KAMYON
      : length * CAB_LENGTH_RATIO_TIR;
  // Tır: kabin ile kargo arası boşluk; king pimi bu aralıkta görünür
  const cabGap = isTir ? CAB_GAP_TIR : 0;
  // Tır ve Römork: king pimi her zaman gösterilir; mesafe girilmemişse ön yüze (Z=length) yerleşir
  const hasKingpin = isTir || isKamposet;
  const hasAxleVehicle = isTir || vehicleType === VehicleType.Kamyon || isKamposet;

  const totalLength = hasCab ? length + cabGap + cabLength : length;
  const cx = width / 2;
  const cy = height / 2;
  const cz = totalLength / 2;
  const maxDim = Math.max(totalLength, width, height);

  // Tır: king pimi boşluğun ortasına (length + gap/2); kargo gövdesiyle çakışmaz → kesinlikle görünür.
  // Römork: ön yüzden KINGPIN_RADIUS_CM kadar öteye; zemin yüzeyi örtmez.
  const kingpinZ = isTir ? length + cabGap / 2 : length + KINGPIN_RADIUS_CM;

  const wheelRadius = height * 0.2;
  const hasRenderedAxles =
    hasAxleVehicle &&
    ((axleBDistance !== undefined && axleBDistance > 0 && axleBDistance <= length) ||
      (axleDistances ?? []).some((d) => d > 0 && d <= length));
  const shadowY = hasRenderedAxles ? -wheelRadius * 2 - 2 : -0.5;

  return (
    <>
      <SceneSetup cx={cx} cy={cy} cz={cz} maxDim={maxDim} />

      <CargoBody width={width} height={height} length={length} />

      {hasCab && (
        <CabMesh
          width={width}
          height={height}
          cargoLength={length}
          cabLength={cabLength}
          gapLength={cabGap}
        />
      )}

      {doorDirection && (
        <DoorFaceIndicator
          width={width}
          height={height}
          length={length}
          doorDirection={doorDirection}
          doorSide={doorSide}
        />
      )}

      {hasKingpin && <KingPinMesh width={width} zPos={kingpinZ} />}

      {hasAxleVehicle &&
        axleBDistance !== undefined &&
        axleBDistance > 0 &&
        axleBDistance <= length && (
          <AxleWheelAssembly width={width} height={height} zPos={axleBDistance} />
        )}

      {hasAxleVehicle &&
        (axleDistances ?? []).map((d, i) =>
          d > 0 && d <= length ? (
            <AxleWheelAssembly key={i} width={width} height={height} zPos={d} />
          ) : null,
        )}

      <ContactShadows
        position={[cx, shadowY, cz]}
        scale={Math.max(totalLength, width) * SCENE.CONTACT_SHADOW_SCALE_FACTOR}
        blur={SCENE.CONTACT_SHADOW_BLUR}
        opacity={SCENE.CONTACT_SHADOW_OPACITY}
        far={height * 1.2}
      />
    </>
  );
}

// ─── Canvas Export ────────────────────────────────────────────────────────────

export function VehiclePreview3D(props: VehiclePreview3DProps) {
  const { length, width, height } = props;

  if (!(length > 0) || !(width > 0) || !(height > 0)) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Ölçüler girilince 3D önizleme görünür
      </div>
    );
  }

  return (
    <Canvas
      camera={{ fov: SCENE.CAMERA_FOV, near: SCENE.CAMERA_NEAR, far: SCENE.CAMERA_FAR }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[SCENE.BACKGROUND_COLOR]} />
      <VehicleScene {...props} />
    </Canvas>
  );
}
