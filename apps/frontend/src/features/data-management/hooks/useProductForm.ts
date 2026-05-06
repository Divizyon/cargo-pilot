import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { Resolver, FieldValues, FieldErrors } from 'react-hook-form';
import {
  productSchema,
  type ProductFormValues,
} from '@/features/data-management/schemas/productSchema';
import { useUnitStore } from '@/lib/store/useUnitStore';

function translateErrors<T extends FieldValues>(
  errors: FieldErrors<T>,
  t: (key: string) => string,
): FieldErrors<T> {
  const out: Record<string, unknown> = {};
  for (const [key, err] of Object.entries(errors)) {
    if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
      out[key] = { ...err, message: t(err.message) };
    } else {
      out[key] = err;
    }
  }
  return out as FieldErrors<T>;
}

export function useProductForm(defaultValues?: Partial<ProductFormValues>) {
  const { t } = useTranslation();
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);
  const baseResolver = zodResolver(productSchema);

  const resolver: Resolver<ProductFormValues> = async (values, ctx, opts) => {
    const result = await baseResolver(values, ctx, opts);
    if (!result.errors || Object.keys(result.errors).length === 0) return result;
    return {
      values: {} as never,
      errors: translateErrors(result.errors, t),
    };
  };

  return useForm<ProductFormValues>({
    resolver,
    defaultValues: {
      productType: 'koli',
      widthUnit: dimensionUnit,
      heightUnit: dimensionUnit,
      lengthUnit: dimensionUnit,
      weightUnit: weightUnit === 'ton' ? 'kg' : weightUnit,
      isStackable: false,
      maxStackCount: 1,
      fragility: 0,
      allowRotateX: true,
      allowRotateY: true,
      allowRotateZ: true,
      notes: '',
      incompatibleGroups: [],
      ...defaultValues,
    },
    mode: 'onChange',
  });
}
