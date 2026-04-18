import type { Item } from '@/lib/types/item';

interface ProductCardProps {
  item: Item;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export function ProductCard({ item, onSelect, isSelected = false }: ProductCardProps) {
  return (
    <div data-selected={isSelected} onClick={() => onSelect(item.id)} style={{ cursor: 'pointer' }}>
      <span>{item.name}</span>
      <span>{item.sku}</span>
    </div>
  );
}
