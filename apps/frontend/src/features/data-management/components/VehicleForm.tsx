import { Controller } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { VehicleIdentityFields } from './VehicleIdentityFields';
import { VehiclePlateOrSerialField } from './VehiclePlateOrSerialField';
import { useVehicleForm } from '@/features/data-management/hooks/useVehicleForm';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { VehicleType } from '@/lib/types/vehicle';

interface VehicleFormProps {
  defaultValues?: Partial<VehicleFormValues>;
  onSubmit: (values: VehicleFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function VehicleForm({ defaultValues, onSubmit, onCancel, isSubmitting }: VehicleFormProps) {
  const form = useVehicleForm(defaultValues);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Araç Tipi</h2>
          <Controller
            control={form.control}
            name="vehicleType"
            render={({ field }) => (
              <VehicleTypeSelector
                value={field.value}
                onChange={(val) => {
                  field.onChange(val);
                  if (val === VehicleType.Konteyner) {
                    form.setValue('plate', '');
                    form.clearErrors('plate');
                  } else {
                    form.setValue('serialNumber', '');
                    form.clearErrors('serialNumber');
                  }
                }}
              />
            )}
          />
          {form.formState.errors.vehicleType && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.vehicleType.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Kimlik Bilgileri</h2>
          <VehicleIdentityFields form={form} />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Plaka / Seri No</h2>
          <VehiclePlateOrSerialField form={form} />
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              İptal
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
