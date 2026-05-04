import { useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { useVehicleFormVisibility } from '../hooks/useVehicleFormVisibility';
import { VehicleDimensionsFields } from './VehicleDimensionsFields';
import { VehicleLayerCountField } from './VehicleLayerCountField';
import { VehicleWeightFields } from './VehicleWeightFields';
import { VehicleKingpinSection } from './VehicleKingpinSection';
import { VehicleAxleBSection } from './VehicleAxleBSection';
import { VehicleAdditionalAxles } from './VehicleAdditionalAxles';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleFormLayoutProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleFormLayout({ form }: VehicleFormLayoutProps) {
  const { showAxleSection, showKingpinSection } = useVehicleFormVisibility(form.control);

  const vehicleType = useWatch({ control: form.control, name: 'vehicleType' });

  useEffect(() => {
    if (!showAxleSection) {
      form.resetField('axleB');
      form.resetField('kingpin');
      form.resetField('axles');
    }
  }, [showAxleSection, form, vehicleType]);

  return (
    <div className="space-y-4">
      {/* Fiziksel İç Ölçüler */}
      <FormCard>
        <VehicleDimensionsFields form={form} />
      </FormCard>

      {/* Maks. İstif Katmanı + Aks Yönetimi */}
      <FormCard>
        <div className="grid grid-cols-2 gap-6 divide-x divide-zinc-100">
          <VehicleLayerCountField form={form} hideHeading={false} />
          {showAxleSection && (
            <div className="pl-6">
              <VehicleAxleBSection form={form} />
              <VehicleAdditionalAxles form={form} />
            </div>
          )}
        </div>
      </FormCard>

      {showKingpinSection && (
        <FormCard>
          <VehicleKingpinSection form={form} />
        </FormCard>
      )}

      {/* Ağırlık Limitleri */}
      <FormCard>
        <VehicleWeightFields form={form} />
      </FormCard>
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">{children}</div>
  );
}
