import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { KINGPIN_LEGAL_MAX_LOAD } from '@/lib/config/vehicle-config';
import { useUnitStore } from '@/lib/store/useUnitStore';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleKingpinSectionProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleKingpinSection({ form }: VehicleKingpinSectionProps) {
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  return (
    <div className="flex flex-col gap-3">
      {/* AC1 (US-VY-09): Başlık US ile eşleşecek şekilde güncellendi */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          King Pimi (A)
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Aracın ön noktasına göre king pimi konumunu ve taşıma limitlerini tanımlayın.
        </p>
      </div>

      {'message' in (form.formState.errors.kingpin ?? {}) && (
        <p className="text-sm font-medium text-destructive">
          {(form.formState.errors.kingpin as { message?: string }).message}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {/* AC3: Uzaklık — aracın ön noktasından mesafe */}
        <FormField
          control={form.control}
          name="kingpin.distance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aracın Ön Noktasından Uzaklık ({dimensionUnit})</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.valueAsNumber;
                    field.onChange(Number.isNaN(v) ? undefined : v);
                  }}
                />
              </FormControl>
              {/* AC3: Aracın ön noktasından mesafeyi temsil eder */}
              <FormDescription>Aracın ön noktasından olan mesafe</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* AC2: Dara Ağırlığı */}
        <FormField
          control={form.control}
          name="kingpin.tareWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dara Ağırlığı ({weightUnit})</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.valueAsNumber;
                    field.onChange(Number.isNaN(v) ? undefined : v);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* AC2 + AC4: Maksimum Yük — yasal limit aşılamaz */}
        <FormField
          control={form.control}
          name="kingpin.maxLoad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Maks. Yük ({weightUnit}, yasal limit:{' '}
                {KINGPIN_LEGAL_MAX_LOAD.toLocaleString('tr-TR')})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max={KINGPIN_LEGAL_MAX_LOAD}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.valueAsNumber;
                    field.onChange(Number.isNaN(v) ? undefined : v);
                  }}
                />
              </FormControl>
              {/* AC4: Yasal taşıma sınırı */}
              <FormDescription>
                Yasal limit: {KINGPIN_LEGAL_MAX_LOAD.toLocaleString('tr-TR')} {weightUnit}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
