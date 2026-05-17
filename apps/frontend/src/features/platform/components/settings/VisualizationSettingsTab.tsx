import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useUIStore } from '@/lib/store/useUIStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  visualizationSettingsSchema,
  type VisualizationSettingsValues,
} from '@/features/platform/schemas/systemSettingsSchema';

const DEFAULT_VALUES: VisualizationSettingsValues = {
  theme: 'system',
  showGrid: true,
  showLabels: true,
  showAxes: false,
  animationEnabled: true,
  colorScheme: 'default',
};

interface VisualizationSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
}

interface SelectRowProps {
  label: string;
  children: ReactNode;
}

function SelectRow({ label, children }: SelectRowProps) {
  return (
    <div className="flex items-start gap-6 border-b border-border py-3 last:border-0">
      <span className="w-52 shrink-0 pt-2 text-sm text-foreground">{label}</span>
      <div className="flex-1 max-w-[280px]">{children}</div>
    </div>
  );
}

interface SwitchRowProps {
  label: string;
  description: string;
  children: ReactNode;
}

function SwitchRow({ label, description, children }: SwitchRowProps) {
  return (
    <div className="flex items-center gap-6 border-b border-border py-3 last:border-0">
      <div className="w-52 shrink-0">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function VisualizationSettingsTab({ onDirtyChange }: VisualizationSettingsTabProps) {
  const setTheme = useUIStore((s) => s.setTheme);
  const storedTheme = useUIStore((s) => s.theme);

  const form = useForm<VisualizationSettingsValues>({
    resolver: zodResolver(visualizationSettingsSchema),
    defaultValues: { ...DEFAULT_VALUES, theme: storedTheme },
    mode: 'onBlur',
  });

  useEffect(() => {
    form.setValue('theme', storedTheme, { shouldDirty: false });
  }, [storedTheme, form]);

  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  function onSubmit(values: VisualizationSettingsValues) {
    setTheme(values.theme);
    toast.success('Görselleştirme ayarları kaydedildi.');
    form.reset(values);
    onDirtyChange(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="divide-y divide-border">
          {/* Tema */}
          <div className="pb-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Tema
            </p>

            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <SelectRow label="Tema">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="light">Açık</SelectItem>
                        <SelectItem value="dark">Koyu</SelectItem>
                        <SelectItem value="system">Sistem Teması</SelectItem>
                      </SelectContent>
                    </Select>
                  </SelectRow>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colorScheme"
              render={({ field }) => (
                <FormItem>
                  <SelectRow label="3D Renk Şeması">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">Varsayılan</SelectItem>
                        <SelectItem value="category">Kategoriye Göre</SelectItem>
                        <SelectItem value="weight">Ağırlığa Göre</SelectItem>
                      </SelectContent>
                    </Select>
                  </SelectRow>
                </FormItem>
              )}
            />
          </div>

          {/* 3D Görünüm */}
          <div className="py-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              3D Görünüm
            </p>

            <FormField
              control={form.control}
              name="showLabels"
              render={({ field }) => (
                <FormItem>
                  <SwitchRow
                    label="Etiketleri Göster"
                    description="Kutular üzerinde ürün adını gösterir."
                  >
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </SwitchRow>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showAxes"
              render={({ field }) => (
                <FormItem>
                  <SwitchRow
                    label="Koordinat Eksenleri"
                    description="X, Y, Z eksen göstergelerini görüntüler."
                  >
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </SwitchRow>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="animationEnabled"
              render={({ field }) => (
                <FormItem>
                  <SwitchRow
                    label="Animasyonlar"
                    description="Yükleme ve geçiş animasyonlarını etkinleştirir."
                  >
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </SwitchRow>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-6">
            <Button
              type="submit"
              size="sm"
              disabled={form.formState.isSubmitting}
              className="min-w-36"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Değişiklikleri Kaydet'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
