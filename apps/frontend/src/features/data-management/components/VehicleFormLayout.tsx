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
    <>
      <div className="flex flex-col gap-2">
        <VehicleDimensionsFields form={form} />
        <VehicleLayerCountField form={form} hideHeading />
      </div>
      <VehicleWeightFields form={form} />
      {showKingpinSection && <VehicleKingpinSection form={form} />}
      {showAxleSection && (
        <>
          <VehicleAxleBSection form={form} />
          <VehicleAdditionalAxles form={form} />
        </>
      )}
    </>
  );
}
