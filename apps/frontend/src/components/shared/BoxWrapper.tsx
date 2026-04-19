/**
 * BoxWrapper — Tekil kutu render'ları için zorunlu soyutlama.
 *
 * Backend'in Sol-Alt-Arka (LBR) pivot'unu Three.js'in merkez pivot'una
 * dönüştürür (cx = positionX + width/2, vb.). Tüm tekil `<mesh>` kutu
 * render'ları bu bileşen üzerinden yapılmalıdır.
 *
 * KULLANMA: 50+ kutu senaryosu — performans için `InstancedMesh`
 * kullanılmalıdır. BoxWrapper her kutu için ayrı `<mesh>` yaratır ve
 * bu ölçekte draw-call sayısı patlar.
 *
 * Bkz. apps/frontend/.claude/CLAUDE.md → "3D Sahne: R3F ve Three.js Standartları"
 */

import { useSceneStore } from '@/lib/store/useSceneStore';

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
}

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
}: BoxWrapperProps) {
  const cx = positionX + width / 2;
  const cy = positionY + height / 2;
  const cz = positionZ + depth / 2;

  const effectiveColor = isSelected ? '#F97316' : color;

  return (
    <mesh
      position={[cx, cy, cz]}
      onClick={(e) => {
        e.stopPropagation();
        if (itemId !== undefined) {
          useSceneStore.getState().setSelectedBoxId(itemId);
          onClick?.(itemId);
        }
      }}
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={effectiveColor} transparent opacity={opacity} />
    </mesh>
  );
}
