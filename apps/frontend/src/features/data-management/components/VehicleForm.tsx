import type { ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { VehicleIdentityFields } from './VehicleIdentityFields';
import { VehiclePlateOrSerialField } from './VehiclePlateOrSerialField';
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
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
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
                <div className="grid grid-cols-2 gap-3">
                  <VehicleIdentityFields form={form} section="name-only" />
                  <VehiclePlateOrSerialField form={form} hideHeading />
                </div>
                <VehicleIdentityFields form={form} section="description-only" />
              </div>
            </FormCard>

            {/* Fiziksel ölçüler + aks yönetimi + kapı yönü */}
            <VehicleFormLayout form={form} />
          </div>

          {/* Sağ — Canlı önizleme */}
          <div className="flex flex-col gap-4">
            <VehiclePreviewPanel form={form} />
          </div>
        </div>

        {/* Aksiyon butonları — sayfanın en altı, sağa hizalı */}
        <div className="mt-6 flex justify-end">
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

function FormCard({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-4 shadow-sm">{children}</div>;
}

function CardSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}
