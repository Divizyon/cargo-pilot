import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface SearchInputProps {
  onSearch: (debouncedValue: string) => void;
  placeholder?: string;
}

export function SearchInput({
  onSearch,
  placeholder = 'Ürün adı veya SKU ara…',
}: SearchInputProps) {
  const [rawValue, setRawValue] = useState('');
  const debouncedValue = useDebounce(rawValue, 350);

  // Notify parent when debounced value settles
  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  function handleClear() {
    setRawValue('');
    onSearch(''); // immediate — bypass debounce on explicit clear
  }

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none text-muted-foreground" />
      <Input
        type="text"
        value={rawValue}
        onChange={(e) => setRawValue(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9 pr-8 text-sm"
        aria-label="Ürün ara"
      />
      {rawValue && (
        <button
          onClick={handleClear}
          aria-label="Aramayı temizle"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
