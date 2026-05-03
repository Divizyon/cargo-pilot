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
      <form id="vehicle-form" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Sol — Form alanları */}
            <div className="flex flex-col gap-5">
              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Araç Tipi
                </p>
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
                  <p className="mt-2 text-sm font-medium text-destructive">
                    {form.formState.errors.vehicleType.message}
                  </p>
                )}
              </section>

              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Kimlik Bilgileri
                </p>
                <div className="flex flex-col gap-4">
                  <VehicleIdentityFields form={form} />
                  <div className="grid grid-cols-2 gap-4">
                    <VehiclePlateOrSerialField form={form} hideHeading />
                    <VehicleDoorDirectionField form={form} hideHeading />
                  </div>
                </div>
              </section>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <VehicleFormLayout form={form} />
              </div>
            </div>

            {/* Sağ — Canlı önizleme */}
            <VehiclePreviewPanel form={form} />
          </div>

          {/* Aksiyonlar — grid dışında, tam genişlik */}
          <VehicleFormActions
            form={form}
            isSubmitting={isSubmitting}
            onCancel={onCancel}
            onDraftSubmit={onDraftSubmit ?? (() => undefined)}
            disableSubmitWhenPristine={disableSubmitWhenPristine}
          />
        </div>
      </form>
    </Form>
  );
}
