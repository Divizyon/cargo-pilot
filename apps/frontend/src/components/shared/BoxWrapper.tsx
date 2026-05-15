import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { ProductType } from '@/lib/types/item';

const CYLINDER_SEGMENTS = 16;

interface BoxWrapperProps {
  width: number;
  height: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  color?: string;
  opacity?: number;
  onClick?: (id: string) => void;
  itemId?: string;
  isSelected?: boolean;
  isHidden?: boolean;
  isGhosted?: boolean;
  productType?: ProductType;
  /** +Z yüzüne (kapıya bakan) uygulanacak etiket texture'ı */
  labelTexture?: THREE.Texture | null;
}

// ─── PaletContent ──────────────────────────────────────────────────────────────
// Tahtalı palet yapısı — center-relative koordinatlarda (origin = bounding box merkezi).
// Üst deck (6 tahta) + bağlantı blokları (3×3) + alt stringer (3 tahta).

function PaletMat({
  color,
  opacity,
  isSelected,
}: {
  color: string;
  opacity: number;
  isSelected: boolean;
}) {
  return (
    <meshStandardMaterial
      color={color}
      transparent
      opacity={isSelected ? 0.95 : opacity}
      emissive={isSelected ? color : '#000000'}
      emissiveIntensity={isSelected ? 0.25 : 0}
    />
  );
}

function PaletContent({
  width,
  height,
  depth,
  color,
  opacity,
  isSelected,
  isGhosted,
}: {
  width: number;
  height: number;
  depth: number;
  color: string;
  opacity: number;
  isSelected: boolean;
  isGhosted: boolean;
}) {
  // Yükseklik dağılımı: %20 üst deck, %60 bloklar, %20 alt stringer
  const deckH = height * 0.2;
  const blockH = height * 0.6;

  // Genişlik: 6 tahta + 5 boşluk, tahta=3x, boşluk=x → 23x=width
  const xUnit = width / 23;
  const slatW = 3 * xUnit;

  // Derinlik: 3 stringer (ProductPreview3D ile aynı oran: yUnit = depth/3.5)
  const yUnit = depth / 3.5;
  const crossD = 0.5 * yUnit;

  // 6 üst tahta merkez X (center-relative)
  const slatCentersX = useMemo(() => {
    const unit = width / 23;
    const sw = 3 * unit;
    return Array.from({ length: 6 }, (_, i) => -width / 2 + i * (sw + unit) + sw / 2);
  }, [width]);

  // 3 stringer merkez Z (center-relative)
  const crossCentersZ = useMemo(() => {
    const unit = depth / 3.5;
    const cd = 0.5 * unit;
    return Array.from({ length: 3 }, (_, i) => -depth / 2 + i * (cd + unit) + cd / 2);
  }, [depth]);

  const topY = height / 2 - deckH / 2;
  const btmY = -height / 2 + deckH / 2;

  if (isGhosted) {
    return (
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    );
  }

  return (
    <>
      {/* Üst deck: 6 tahta, tam derinlikte */}
      {slatCentersX.map((bx, i) => (
        <mesh key={`ts${i}`} position={[bx, topY, 0]}>
          <boxGeometry args={[slatW, deckH, depth]} />
          <PaletMat color={color} opacity={opacity} isSelected={isSelected} />
        </mesh>
      ))}
      {/* Alt stringer: 3 tahta, tam genişlikte */}
      {crossCentersZ.map((bz, i) => (
        <mesh key={`bs${i}`} position={[0, btmY, bz]}>
          <boxGeometry args={[width, deckH, crossD]} />
          <PaletMat color={color} opacity={opacity} isSelected={isSelected} />
        </mesh>
      ))}
      {/* Bağlantı blokları: 3×3 ızgara */}
      {crossCentersZ.map((bz, zi) =>
        [slatCentersX[0], slatCentersX[2], slatCentersX[5]].map((bx, xi) => (
          <mesh key={`bl${zi}${xi}`} position={[bx, 0, bz]}>
            <boxGeometry args={[slatW, blockH, crossD]} />
            <PaletMat color={color} opacity={opacity} isSelected={isSelected} />
          </mesh>
        )),
      )}
    </>
  );
}

// ─── BoxWrapper ────────────────────────────────────────────────────────────────

export function BoxWrapper({
  width,
  height,
  depth,
  positionX,
  positionY,
  positionZ,
  color = '#2563EB',
  opacity = 0.85,
  onClick,
  itemId,
  isSelected = false,
  isHidden = false,
  isGhosted = false,
  productType,
  labelTexture = null,
}: BoxWrapperProps) {
  const cx = positionX + width / 2;
  const cy = positionY + height / 2;
  const cz = positionZ + depth / 2;

  const isPalet = productType === 'palet';
  const isVaril = productType === 'varil';
  const radius = Math.min(width, depth) / 2;

  // Palet kendi kenarlarını tahta bazında çizdiği için dış edge geo'ya gerek yok
  const edgesGeo = useMemo<THREE.BufferGeometry | null>(() => {
    if (isPalet) return null;
    if (isVaril) {
      const cyl = new THREE.CylinderGeometry(radius, radius, height, CYLINDER_SEGMENTS);
      const edges = new THREE.EdgesGeometry(cyl);
      cyl.dispose();
      return edges;
    }
    const box = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [isPalet, isVaril, radius, width, height, depth]);

  useEffect(
    () => () => {
      edgesGeo?.dispose();
    },
    [edgesGeo],
  );

  // 6-material array: +X, -X, +Y, -Y, +Z(kapıya bakan), -Z(arka)
  // Sadece koli + labelTexture varsa kullanılır; varil/palet/ghosted için gerekmez.
  const boxMaterials = useMemo(() => {
    if (isPalet || isVaril || !labelTexture) return null;
    const base = {
      color,
      transparent: true,
      opacity: isSelected ? 0.95 : opacity,
      emissive: isSelected ? color : '#000000',
      emissiveIntensity: isSelected ? 0.25 : 0,
    };
    return Array.from({ length: 6 }, (_, i) => {
      const mat = new THREE.MeshStandardMaterial(base);
      // face index 4 = +Z (Z=0 yüzü — kapıya bakan)
      if (i === 4) {
        mat.map = labelTexture;
        mat.color.set('#ffffff');
        mat.transparent = false;
        mat.opacity = 1;
        mat.emissiveIntensity = 0;
      }
      return mat;
    });
  }, [isPalet, isVaril, labelTexture, color, opacity, isSelected]);

  // Dispose — boxMaterials manuel THREE nesnesi
  useEffect(
    () => () => {
      boxMaterials?.forEach((m) => m.dispose());
    },
    [boxMaterials],
  );

  if (isHidden) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (itemId !== undefined) onClick?.(itemId);
  };

  if (isPalet) {
    return (
      <group position={[cx, cy, cz]} onClick={handleClick}>
        <PaletContent
          width={width}
          height={height}
          depth={depth}
          color={color}
          opacity={opacity}
          isSelected={isSelected}
          isGhosted={isGhosted}
        />
      </group>
    );
  }

  return (
    <group position={[cx, cy, cz]} onClick={handleClick}>
      {!isGhosted && (
        <mesh material={boxMaterials ?? undefined}>
          {isVaril ? (
            <cylinderGeometry args={[radius, radius, height, CYLINDER_SEGMENTS]} />
          ) : (
            <boxGeometry args={[width, height, depth]} />
          )}
          {!boxMaterials && (
            <meshStandardMaterial
              color={color}
              transparent
              opacity={isSelected ? 0.95 : opacity}
              emissive={isSelected ? color : '#000000'}
              emissiveIntensity={isSelected ? 0.25 : 0}
            />
          )}
        </mesh>
      )}
      {edgesGeo && (
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial
            color={isGhosted ? '#94a3b8' : isSelected ? color : '#000000'}
            transparent={isGhosted}
            opacity={isGhosted ? 0.4 : 1}
          />
        </lineSegments>
      )}
    </group>
  );
}
