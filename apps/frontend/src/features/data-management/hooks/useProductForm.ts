import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  productSchema,
  type ProductFormValues,
} from '@/features/data-management/schemas/productSchema';

export function useProductForm(defaultValues?: Partial<ProductFormValues>) {
  return useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      isStackable: false,
      fragility: 0,
      allowRotateX: true,
      allowRotateY: true,
      allowRotateZ: true,
      ...defaultValues,
    },
  });
}
