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
    <div className="flex items-center gap-1.5">
      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          İptal Et
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleDraftSubmit()}
        disabled={isSubmitting}
        className="flex-1"
      >
        Taslak Olarak Kaydet
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting || (disableSubmitWhenPristine && !form.formState.isDirty)}
        className="flex-1"
      >
        {isSubmitting ? 'Kaydediliyor...' : submitLabel}
      </Button>
    </div>
  );
}
