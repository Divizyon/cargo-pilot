import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  erpConnectionFormSchema,
  type ErpConnectionFormValues,
} from '@/features/platform/schemas/erpConnectionSchema';
import {
  useERPConnection,
  useSaveERPConnection,
  useTestERPConnection,
} from '@/lib/api/useERPIntegration';

type TestResult = { success: boolean; message?: string | null } | null;

export function ERPConnectionForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  const { data: existing, isLoading: isLoadingExisting } = useERPConnection();
  const { mutate: save, isPending: isSaving } = useSaveERPConnection();
  const { mutate: testConnection, isPending: isTesting } = useTestERPConnection();

  const form = useForm<ErpConnectionFormValues>({
    resolver: zodResolver(erpConnectionFormSchema),
    defaultValues: {
      systemType: 'Logo',
      companyCode: '',
      username: '',
      password: '',
      serverAddress: '',
    },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      systemType: existing.systemType,
      companyCode: existing.companyCode,
      username: existing.username,
      password: '',
      serverAddress: existing.serverAddress,
    });
  }, [existing, form]);

  function onSubmit(values: ErpConnectionFormValues) {
    setTestResult(null);
    save({ ...values, id: existing?.id });
  }

  function handleTestConnection() {
    form.trigger().then((valid) => {
      if (!valid) return;
      const values = form.getValues();
      setTestResult(null);
      testConnection(values, {
        onSuccess: (result) => setTestResult(result),
        onError: () => setTestResult({ success: false, message: 'Bağlantı test edilemedi.' }),
      });
    });
  }

  if (isLoadingExisting) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Bağlantı bilgileri yükleniyor…</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="systemType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ERP Sistemi</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sistem seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Logo">Logo</SelectItem>
                  <SelectItem value="Netsis">Netsis</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şirket Kodu</FormLabel>
              <FormControl>
                <Input placeholder="001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kullanıcı Adı</FormLabel>
              <FormControl>
                <Input placeholder="erp_user" autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şifre</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={existing ? '••••••••' : 'ERP şifrenizi girin'}
                    autoComplete="current-password"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="serverAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sunucu Adresi</FormLabel>
              <FormControl>
                <Input placeholder="192.168.1.100 veya erp.sirket.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {testResult !== null && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {testResult.success
                ? 'Bağlantı başarılı. ERP sistemine ulaşıldı.'
                : (testResult.message ??
                  'Sunucuya ulaşılamadı. Sunucu adresini ve kimlik bilgilerini kontrol edin.')}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isTesting}
            onClick={handleTestConnection}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bağlantıyı Test Et
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </form>
    </Form>
  );
}
