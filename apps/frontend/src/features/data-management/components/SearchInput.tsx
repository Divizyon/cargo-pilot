import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface SearchInputProps {
  onSearch: (debouncedValue: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export function SearchInput({
  onSearch,
  placeholder = 'SKU kodu veya ürün adı ile ara...',
  initialValue = '',
}: SearchInputProps) {
  const [rawValue, setRawValue] = useState(initialValue);
  const debouncedValue = useDebounce(rawValue, 350);
  const onSearchRef = useRef(onSearch);
    useEffect(() => {
      onSearchRef.current = onSearch;
    }, [onSearch]);  

  useEffect(() => {
    if (debouncedValue.length === 1) return;
    onSearchRef.current(debouncedValue);
  }, [debouncedValue]);

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
