import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface SearchInputProps {
  onSearch: (debouncedValue: string) => void;
  placeholder?: string;
  initialValue?: string;
  size?: 'sm' | 'default';
  className?: string;
}

export function SearchInput({
  onSearch,
  placeholder = 'SKU kodu veya ürün adı ile ara...',
  initialValue = '',
  size = 'default',
  className,
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
    onSearch('');
  }

  const isSm = size === 'sm';

  return (
    <div className={cn('relative flex-1', className)}>
      <Search
        className={cn(
          'absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground',
          isSm ? 'h-3 w-3' : 'h-3.5 w-3.5',
        )}
      />
      <Input
        type="text"
        value={rawValue}
        onChange={(e) => setRawValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Ara"
        className={cn(isSm ? 'h-7 pl-7 pr-7 text-xs' : 'h-9 pl-9 pr-8 text-xs')}
      />
      {rawValue && (
        <button
          onClick={handleClear}
          aria-label="Aramayı temizle"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className={cn(isSm ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        </button>
      )}
    </div>
  );
}
