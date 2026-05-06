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
  FormLabel,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

export function VisualizationSettingsTab({ onDirtyChange }: VisualizationSettingsTabProps) {
  const setTheme = useUIStore((s) => s.setTheme);
  const storedTheme = useUIStore((s) => s.theme);

  const form = useForm<VisualizationSettingsValues>({
    resolver: zodResolver(visualizationSettingsSchema),
    defaultValues: { ...DEFAULT_VALUES, theme: storedTheme },
    mode: 'onBlur',
  });

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tema</CardTitle>
            <CardDescription>Uygulama teması ve renk şeması tercihleri.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tema</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light">Açık</SelectItem>
                      <SelectItem value="dark">Koyu</SelectItem>
                      <SelectItem value="system">Sistem Teması</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colorScheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>3D Renk Şeması</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="default">Varsayılan</SelectItem>
                      <SelectItem value="category">Kategoriye Göre</SelectItem>
                      <SelectItem value="weight">Ağırlığa Göre</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3D Görünüm Seçenekleri</CardTitle>
            <CardDescription>Sahne üzerinde görüntülenecek öğeler.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="showGrid"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Izgara Göster</FormLabel>
                    <FormDescription className="text-xs">
                      3D sahnede zemin ızgarasını görüntüler.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showLabels"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Etiketleri Göster</FormLabel>
                    <FormDescription className="text-xs">
                      Kutular üzerinde ürün adını gösterir.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showAxes"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Koordinat Eksenlerini Göster</FormLabel>
                    <FormDescription className="text-xs">
                      X, Y, Z eksen göstergelerini görüntüler.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="animationEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Animasyonları Etkinleştir</FormLabel>
                    <FormDescription className="text-xs">
                      Yükleme ve geçiş animasyonlarını etkinleştirir.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-40">
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Kaydet'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
