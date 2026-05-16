import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleFormActionsProps {
  form: UseFormReturn<VehicleFormValues>;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onDraftSubmit: (values: Partial<VehicleFormValues>) => void;
  disableSubmitWhenPristine?: boolean;
  submitLabel?: string;
}

export function VehicleFormActions({
  form,
  isSubmitting,
  onCancel,
  onDraftSubmit,
  disableSubmitWhenPristine,
  submitLabel = 'Kaydet',
}: VehicleFormActionsProps) {
  async function handleDraftSubmit() {
    const valid = await form.trigger(['name', 'vehicleType']);
    if (!valid) return;
    onDraftSubmit({ ...form.getValues(), status: 'draft' });
  }

  return (
    <>
      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-muted-foreground hover:text-foreground"
        >
          İptal Et
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
        {isSubmitting ? 'Kaydediliyor...' : submitLabel}
      </Button>
    </>
  );
}
