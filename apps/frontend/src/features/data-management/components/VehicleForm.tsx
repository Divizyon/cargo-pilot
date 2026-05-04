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
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Üst aksiyon çubuğu */}
        <VehicleFormActions
          form={form}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
          onDraftSubmit={onDraftSubmit ?? (() => undefined)}
          disableSubmitWhenPristine={disableSubmitWhenPristine}
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Sol — Form alanları */}
          <div className="space-y-4">
            {/* Araç Tipi */}
            <FormCard>
              <CardSectionTitle>Araç Tipi</CardSectionTitle>
              <div className="mt-3">
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
                  <p className="mt-1 text-sm font-medium text-destructive">
                    {form.formState.errors.vehicleType.message}
                  </p>
                )}
              </div>
            </FormCard>

            {/* Kimlik Bilgileri */}
            <FormCard>
              <CardSectionTitle>Kimlik Bilgileri</CardSectionTitle>
              <div className="mt-3 space-y-3">
                <VehicleIdentityFields form={form} />
              </div>
            </FormCard>

            {/* Fiziksel ölçüler + aks yönetimi (FormCard'ları FormLayout içinde) */}
            <VehicleFormLayout form={form} />

            {/* Plaka / Seri No + Kapı Yönü */}
            <FormCard>
              <div className="grid grid-cols-2 gap-6 divide-x divide-zinc-100">
                <div>
                  <VehiclePlateOrSerialField form={form} hideHeading={false} />
                </div>
                <div className="pl-6">
                  <VehicleDoorDirectionField form={form} hideHeading={false} />
                </div>
              </div>
            </FormCard>
          </div>

          {/* Sağ — Canlı önizleme */}
          <VehiclePreviewPanel form={form} />
        </div>
      </form>
    </Form>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">{children}</div>
  );
}

function CardSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}
