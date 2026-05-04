import { useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { VehicleType } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

export function useVehicleFormVisibility(control: Control<VehicleFormValues>) {
  const vehicleType = useWatch({ control, name: 'vehicleType' });

  const isContainer = vehicleType === VehicleType.Konteyner;
  const isTirOrKamposet = vehicleType === VehicleType.Tir || vehicleType === VehicleType.Kamposet;

  return {
    showAxleSection: !isContainer,
    showKingpinSection: isTirOrKamposet,
  };
}
