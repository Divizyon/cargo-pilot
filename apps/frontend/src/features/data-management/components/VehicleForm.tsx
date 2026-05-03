import { Controller } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { VehicleIdentityFields } from './VehicleIdentityFields';
import { VehiclePlateOrSerialField } from './VehiclePlateOrSerialField';
import { VehicleDoorDirectionField } from './VehicleDoorDirectionField';
import { VehicleFormLayout } from './VehicleFormLayout';
import { VehicleFormActions } from './VehicleFormActions';
import { VehiclePreviewPanel } from './VehiclePreviewPanel';
import { useVehicleForm } from '@/features/data-management/hooks/useVehicleForm';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { VehicleType } from '@/lib/types/vehicle';

interface VehicleFormProps {
  defaultValues?: Partial<VehicleFormValues>;
  onSubmit: (values: VehicleFormValues) => void;
  onDraftSubmit?: (values: Partial<VehicleFormValues>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  disableSubmitWhenPristine?: boolean;
}

export function VehicleForm({
  defaultValues,
  onSubmit,
  onDraftSubmit,
  onCancel,
  isSubmitting,
  disableSubmitWhenPristine,
}: VehicleFormProps) {
  const form = useVehicleForm(defaultValues);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Sol — Form alanları */}
          <div className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Araç Tipi
              </h3>
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
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Kimlik Bilgileri
              </h3>
              <VehicleIdentityFields form={form} />
            </section>

            <div className="grid grid-cols-2 gap-4">
              <VehiclePlateOrSerialField form={form} hideHeading />
              <VehicleDoorDirectionField form={form} hideHeading />
            </div>

            <VehicleFormLayout form={form} />
          </div>

          {/* Sağ — Canlı önizleme */}
          <VehiclePreviewPanel form={form} />
        </div>

        <VehicleFormActions
          form={form}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
          onDraftSubmit={onDraftSubmit ?? (() => undefined)}
          disableSubmitWhenPristine={disableSubmitWhenPristine}
        />
      </form>
    </Form>
  );
}
