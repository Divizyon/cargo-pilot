import { useEffect, type ReactNode } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { VehicleIdentityFields } from './VehicleIdentityFields';
import { VehiclePlateOrSerialField } from './VehiclePlateOrSerialField';
import { VehicleLayerCountField } from './VehicleLayerCountField';
import { VehicleDimensionsFields } from './VehicleDimensionsFields';
import { VehicleDoorDirectionField } from './VehicleDoorDirectionField';
import { VehicleWeightFields } from './VehicleWeightFields';
import { VehicleAxleBSection } from './VehicleAxleBSection';
import { VehicleAdditionalAxles } from './VehicleAdditionalAxles';
import { VehicleKingpinSection } from './VehicleKingpinSection';
import { VehicleFormActions } from './VehicleFormActions';
import { VehiclePreviewPanel } from './VehiclePreviewPanel';
import { useVehicleForm } from '@/features/data-management/hooks/useVehicleForm';
import { useVehicleFormVisibility } from '@/features/data-management/hooks/useVehicleFormVisibility';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { VehicleType } from '@/lib/types/vehicle';
import { FormWithPreviewLayout } from '@/components/shared/FormWithPreviewLayout';
import { cn } from '@/lib/utils';

interface VehicleFormProps {
  defaultValues?: Partial<VehicleFormValues>;
  onSubmit: (values: VehicleFormValues) => void;
  onDraftSubmit?: (values: Partial<VehicleFormValues>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  disableSubmitWhenPristine?: boolean;
}

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
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
  const { showAxleSection, showKingpinSection } = useVehicleFormVisibility(form.control);
  const vehicleType = useWatch({ control: form.control, name: 'vehicleType' });

  useEffect(() => {
    if (!showAxleSection) {
      form.resetField('axleB');
      form.resetField('kingpin');
      form.resetField('axles');
    }
  }, [showAxleSection, form, vehicleType]);

  const formContent = (
    <div className="divide-y divide-border">
      {/* 0. ARAÇ TİPİ */}
      <div className="space-y-3 pb-6">
        <SectionTitle>Araç Tipi</SectionTitle>
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

      {/* 1. KİMLİK — ad, plaka, maks. istif katmanı + açıklama */}
      <div className="space-y-4 py-6">
        <SectionTitle>Kimlik Bilgileri</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <VehicleIdentityFields form={form} section="name-only" />
          <VehiclePlateOrSerialField form={form} hideHeading />
          <VehicleLayerCountField form={form} />
        </div>
        <VehicleIdentityFields form={form} section="description-only" />
      </div>

      {/* 2. FİZİKSEL BOYUTLAR + KAPI — 50/50 */}
      <div className="space-y-4 py-6">
        <SectionTitle>Fiziksel Boyutlar</SectionTitle>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <VehicleDimensionsFields form={form} />
          <VehicleDoorDirectionField form={form} />
        </div>
      </div>

      {/* 3. AĞIRLIK LİMİTLERİ */}
      <div className="space-y-4 py-6">
        <SectionTitle>Ağırlık Limitleri</SectionTitle>
        <VehicleWeightFields form={form} />
      </div>

      {/* 4. AKS YÖNETİMİ (koşullu) */}
      {showAxleSection && (
        <div className="space-y-4 py-6">
          <SectionTitle>Aks Yönetimi</SectionTitle>
          <p className="text-xs text-muted-foreground">Ana Aks (Dingil B)</p>
          <VehicleAxleBSection form={form} />
          <VehicleAdditionalAxles form={form} />
        </div>
      )}

      {/* 5. KİNG PİMİ (koşullu) */}
      {showKingpinSection && (
        <div className="space-y-4 py-6">
          <SectionTitle>King Pimi (A)</SectionTitle>
          <p className="text-xs text-muted-foreground">
            Aracın ön noktasına göre king pimi konumunu ve taşıma limitlerini tanımlayın.
          </p>
          <VehicleKingpinSection form={form} />
        </div>
      )}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormWithPreviewLayout
          formContent={formContent}
          previewContent={<VehiclePreviewPanel form={form} />}
        />

        <div className="flex justify-end border-t pt-4">
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
