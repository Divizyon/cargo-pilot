import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useUIStore } from '@/lib/store/useUIStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form';
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pt-4 pb-1 first:pt-0">
      {children}
    </p>
  );
}

interface SelectRowProps {
  label: string;
  children: React.ReactNode;
}

function SelectRow({ label, children }: SelectRowProps) {
  return (
    <div className="flex items-center gap-6 border-b border-border py-2.5 last:border-0">
      <span className="w-44 shrink-0 text-sm text-foreground">{label}</span>
      <div className="w-52">{children}</div>
    </div>
  );
}

interface SwitchRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

function SwitchRow({ label, description, children }: SwitchRowProps) {
  return (
    <div className="flex items-center gap-6 border-b border-border py-2.5 last:border-0">
      <div className="w-44 shrink-0">
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

  const { isDirty } = form.formState;
  useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);

  function onSubmit(values: VisualizationSettingsValues) {
    setTheme(values.theme);
    toast.success('Görselleştirme ayarları kaydedildi.');
    form.reset(values);
    onDirtyChange(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl">
        <SectionLabel>Tema</SectionLabel>

        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <SelectRow label="Tema">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
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
                    <SelectTrigger className="h-8 text-sm">
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

        <SectionLabel>3D Görünüm</SectionLabel>

        <FormField
          control={form.control}
          name="showGrid"
          render={({ field }) => (
            <FormItem>
              <SwitchRow label="Izgara Göster" description="3D sahnede zemin ızgarasını görüntüler.">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </SwitchRow>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="showLabels"
          render={({ field }) => (
            <FormItem>
              <SwitchRow label="Etiketleri Göster" description="Kutular üzerinde ürün adını gösterir.">
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
              <SwitchRow label="Koordinat Eksenleri" description="X, Y, Z eksen göstergelerini görüntüler.">
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
              <SwitchRow label="Animasyonlar" description="Yükleme ve geçiş animasyonlarını etkinleştirir.">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </SwitchRow>
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" size="sm" disabled={form.formState.isSubmitting} className="min-w-36">
            {form.formState.isSubmitting ? (
              <><Loader2 className="animate-spin" />Kaydediliyor...</>
            ) : (
              'Değişiklikleri Kaydet'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
