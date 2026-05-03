import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleFormActionsProps {
  form: UseFormReturn<VehicleFormValues>;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onDraftSubmit: (values: Partial<VehicleFormValues>) => void;
  disableSubmitWhenPristine?: boolean;
}

export function VehicleFormActions({
  form,
  isSubmitting,
  onCancel,
  onDraftSubmit,
  disableSubmitWhenPristine,
}: VehicleFormActionsProps) {
  async function handleDraftSubmit() {
    const valid = await form.trigger(['name', 'vehicleType']);
    if (!valid) return;
    onDraftSubmit({ ...form.getValues(), status: 'draft' });
  }

  return (
    <div className="flex justify-end gap-3 border-t pt-4">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          İptal
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleDraftSubmit()}
        disabled={isSubmitting}
      >
        Taslak Olarak Kaydet
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting || (disableSubmitWhenPristine && !form.formState.isDirty)}
      >
        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
      </Button>
    </div>
  );
}
