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
    <div className="flex w-full items-center justify-end gap-1 ">
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
      >
        Taslak Olarak Kaydet
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting || (disableSubmitWhenPristine && !form.formState.isDirty)}
        className="px-5"
      >
        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
      </Button>
    </div>
  );
}
