import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { Resolver, FieldValues, FieldErrors } from 'react-hook-form';
import {
  productSchema,
  type ProductFormValues,
} from '@/features/data-management/schemas/productSchema';

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
  const baseResolver = zodResolver(productSchema);

  const resolver: Resolver<ProductFormValues> = async (values, ctx, opts) => {
    const result = await baseResolver(values, ctx, opts);
    if (!result.errors || Object.keys(result.errors).length === 0) return result;
    return {
      values: {} as never,
      errors: translateErrors(result.errors, t),
    };
  };

  const rotationOverride: Partial<ProductFormValues> = (() => {
    const type = defaultValues?.productType;
    const fragility = defaultValues?.fragility ?? 0;
    if (type === 'varil') return { allowRotateX: false, allowRotateZ: false };
    if (type === 'palet') return { allowRotateY: false, allowRotateZ: false };
    if (fragility >= 1) return { allowRotateZ: false };
    return {};
  })();

  return useForm<ProductFormValues>({
    resolver,
    defaultValues: {
      productType: 'koli',
      isStackable: false,
      maxStackCount: undefined,
      fragility: 0,
      allowRotateX: true,
      allowRotateY: true,
      allowRotateZ: true,
      notes: '',
      incompatibleGroups: [],
      constraintIds: [],
      ...defaultValues,
      ...rotationOverride,
    },
    mode: 'onChange',
  });
}
