import { useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { useVehicleFormVisibility } from '../hooks/useVehicleFormVisibility';
import { VehicleDimensionsFields } from './VehicleDimensionsFields';
import { VehicleDoorDirectionField } from './VehicleDoorDirectionField';
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
    <div className="space-y-6">
      <VehicleDimensionsFields form={form} />

      <div className="grid grid-cols-2 gap-6 divide-x divide-border">
        <div className="flex flex-col gap-6">
          <VehicleDoorDirectionField form={form} vehicleType={vehicleType} hideHeading={false} />
        </div>
        {showAxleSection && (
          <div className="pl-6">
            <VehicleAxleBSection form={form} />
            <VehicleAdditionalAxles form={form} />
          </div>
        )}
      </div>

      {showKingpinSection && <VehicleKingpinSection form={form} />}

      <VehicleWeightFields form={form} />
    </div>
  );
}
