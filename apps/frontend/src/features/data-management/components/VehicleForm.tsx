import { useEffect, useRef, type ReactNode } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { VehicleIdentityFields } from './VehicleIdentityFields';
import { VehiclePlateOrSerialField } from './VehiclePlateOrSerialField';

import { VehicleDimensionsFields } from './VehicleDimensionsFields';
import { VehicleDoorDirectionField } from './VehicleDoorDirectionField';
import { VehicleWeightFields } from './VehicleWeightFields';
import { VehicleAxleBSection } from './VehicleAxleBSection';
import {
  VehicleAdditionalAxles,
  type VehicleAdditionalAxlesHandle,
} from './VehicleAdditionalAxles';
import { VehicleKingpinSection } from './VehicleKingpinSection';
import { VehicleFormActions } from './VehicleFormActions';
import { VehiclePreviewPanel } from './VehiclePreviewPanel';
import { useVehicleForm } from '@/features/data-management/hooks/useVehicleForm';
import { useVehicleFormVisibility } from '@/features/data-management/hooks/useVehicleFormVisibility';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { VehicleType, type Vehicle } from '@/lib/types/vehicle';
import { FormWithPreviewLayout } from '@/components/shared/FormWithPreviewLayout';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleFormProps {
  defaultValues?: Partial<VehicleFormValues>;
  onSubmit: (values: VehicleFormValues) => void;
  onDraftSubmit?: (values: Partial<VehicleFormValues>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  disableSubmitWhenPristine?: boolean;
  vehicle?: Pick<Vehicle, 'updatedAt' | 'updatedBy' | 'isActive'>;
  isCreateMode?: boolean;
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
  vehicle,
  isCreateMode = false,
}: VehicleFormProps) {
  const form = useVehicleForm(defaultValues);
  const { showAxleSection, showKingpinSection } = useVehicleFormVisibility(form.control);
  const axlesRef = useRef<VehicleAdditionalAxlesHandle>(null);
  const vehicleType = useWatch({ control: form.control, name: 'vehicleType' });
  const axles = useWatch({ control: form.control, name: 'axles' });
  const canAddAxle = (axles?.length ?? 0) < 1;

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
                  const dir = form.getValues('doorDirection');
                  if (dir === 'rearAndSide') {
                    form.setValue('doorDirection', 'rear');
                  }
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

      {/* 1. KİMLİK — ad, plaka */}
      <div className="space-y-4 py-6">
        <SectionTitle>Kimlik Bilgileri</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <VehicleIdentityFields form={form} section="name-only" />
          <VehiclePlateOrSerialField form={form} hideHeading />
        </div>
      </div>

      {/* 2. FİZİKSEL BOYUTLAR */}
      <div className="space-y-4 py-6">
        <SectionTitle>Fiziksel Özellikler</SectionTitle>
        <VehicleDimensionsFields form={form} />
      </div>

      {/* 3. AĞIRLIK LİMİTLERİ */}
      <div className="space-y-4 py-6">
        <SectionTitle>Ağırlık Limitleri</SectionTitle>
        <VehicleWeightFields form={form} />
      </div>

      {/* 4. AKS YÖNETİMİ (koşullu) */}
      {showAxleSection && (
        <div className="space-y-4 py-6">
          <div className="flex items-center justify-between">
            <SectionTitle className="mb-0">Aks Yönetimi</SectionTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-1 py-0 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
              onClick={() => axlesRef.current?.addAxle()}
              disabled={!canAddAxle}
            >
              + Ek Aks Ekle
            </Button>
          </div>
          <VehicleAxleBSection form={form} />
          <VehicleAdditionalAxles ref={axlesRef} form={form} />
        </div>
      )}

      {/* 5. KİNG PİMİ (koşullu) */}
      {showKingpinSection && (
        <div className="space-y-4 py-6">
          <div className="flex items-center gap-1">
            <SectionTitle className="mb-0">King Pimi (A)</SectionTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-auto w-auto p-0">
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Aracın ön noktasına göre king pimi konumunu ve taşıma limitlerini tanımlayın.
              </TooltipContent>
            </Tooltip>
          </div>
          <VehicleKingpinSection form={form} />
        </div>
      )}

      {/* 6. KAPI YÖNÜ */}
      <div className="space-y-4 py-6">
        <SectionTitle>Kapı Yönü</SectionTitle>
        <VehicleDoorDirectionField form={form} />
      </div>

      {/* ÖZEL TAŞIMA NOTLARI */}
      <div className="space-y-4 pt-6">
        <SectionTitle>Özel Taşıma Notları</SectionTitle>
        <VehicleIdentityFields form={form} section="description-only" />
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, () => {
            toast.error('Lütfen zorunlu alanları doldurunuz.', { position: 'bottom-right' });
          })}
          className="flex h-full flex-col"
        >
          <FormWithPreviewLayout
            className="flex-1 min-h-0"
            formContent={formContent}
            actionBar={
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-6 py-3 shadow-lg">
                <VehicleFormActions
                  form={form}
                  isSubmitting={isSubmitting}
                  onCancel={onCancel}
                  onDraftSubmit={onDraftSubmit ?? (() => undefined)}
                  disableSubmitWhenPristine={disableSubmitWhenPristine}
                  submitLabel={isCreateMode ? 'Kaydet' : 'Değişiklikleri Kaydet'}
                />
              </div>
            }
            previewContent={
              <VehiclePreviewPanel form={form} vehicle={vehicle} isCreateMode={isCreateMode} />
            }
          />
        </form>
      </Form>
    </TooltipProvider>
  );
}
