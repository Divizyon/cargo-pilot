import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProductForm } from '@/features/data-management/hooks/useProductForm';
import { FRAGILITY_LEVELS, type ProductFormValues } from '@/features/data-management/schemas/productSchema';

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => void;
  onCancel?: () => void;
}

export function ProductForm({ defaultValues, onSubmit, onCancel }: ProductFormProps) {
  const { t } = useTranslation();
  const form = useProductForm(defaultValues);

  const isStackable = useWatch({ control: form.control, name: 'isStackable' });
  const fragility = useWatch({ control: form.control, name: 'fragility' });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Temel bilgiler */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms.product.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('forms.product.namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms.product.sku')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('forms.product.skuPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Boyutlar */}
        <div>
          <p className="text-sm font-medium mb-3">{t('forms.product.dimensions')}</p>
          <div className="grid grid-cols-3 gap-4">
            {(['width', 'height', 'length'] as const).map((dim) => (
              <FormField
                key={dim}
                control={form.control}
                name={dim}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(`forms.product.${dim}`)}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        {/* Ağırlık */}
        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.product.weight')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  className="max-w-[200px]"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Kırılganlık */}
        <FormField
          control={form.control}
          name="fragility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.product.fragility')}</FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={(value) => {
                  const num = Number(value);
                  field.onChange(num);
                  if (num >= 1) form.setValue('allowRotateZ', false, { shouldValidate: true });
                }}
              >
                <FormControl>
                  <SelectTrigger className="max-w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={String(FRAGILITY_LEVELS.NonFragile)}>
                    {t('forms.product.fragilityNonFragile')}
                  </SelectItem>
                  <SelectItem value={String(FRAGILITY_LEVELS.Fragile)}>
                    {t('forms.product.fragilityFragile')}
                  </SelectItem>
                  <SelectItem value={String(FRAGILITY_LEVELS.Liquid)}>
                    {t('forms.product.fragilityLiquid')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* İstifleme */}
        <FormField
          control={form.control}
          name="isStackable"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>{t('forms.product.isStackable')}</FormLabel>
                <p className="text-sm text-muted-foreground">
                  {t('forms.product.isStackableHint')}
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) form.setValue('maxStackCount', undefined, { shouldValidate: true });
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Maksimum istif sayısı — isStackable false iken devre dışı */}
        <FormField
          control={form.control}
          name="maxStackCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.product.maxStackCount')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  disabled={!isStackable}
                  placeholder={t('forms.product.maxStackCountPlaceholder')}
                  className="max-w-[200px]"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Döndürme izinleri */}
        <div>
          <p className="text-sm font-medium mb-3">{t('forms.product.rotation')}</p>
          <div className="space-y-3">
            {(
              [
                { name: 'allowRotateX', labelKey: 'forms.product.allowRotateX' },
                { name: 'allowRotateY', labelKey: 'forms.product.allowRotateY' },
                { name: 'allowRotateZ', labelKey: 'forms.product.allowRotateZ' },
              ] as const
            ).map(({ name, labelKey }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="font-normal">{t(labelKey)}</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        disabled={name === 'allowRotateZ' && fragility >= 1}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        {/* Aksiyon butonları */}
        <div className="flex gap-3 pt-2">
          <Button type="submit">{t('forms.product.submit')}</Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('forms.product.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
