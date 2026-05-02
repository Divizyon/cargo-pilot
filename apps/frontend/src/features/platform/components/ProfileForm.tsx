import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Info, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useProfile, useUpdateProfile } from '@/lib/api/useAuth';
import { profileSchema } from '@/features/platform/schemas/profileSchema';
import type { ProfileFormValues } from '@/features/platform/schemas/profileSchema';

export function ProfileForm() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      companyName: '',
      phone: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({ firstName: profile.firstName, lastName: profile.lastName, companyName: '', phone: '' });
  }, [profile, form]);

  function onSubmit(values: ProfileFormValues) {
    updateProfile({
      firstName: values.firstName,
      lastName: values.lastName,
      companyName: values.companyName || undefined,
      phone: values.phone || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Kişisel Bilgiler
          </h3>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Ad <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Adınız"
                        className={cn(
                          'pl-10',
                          form.formState.errors.firstName &&
                            'border-destructive bg-destructive/5 focus-visible:ring-0 focus-visible:border-destructive',
                        )}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Soyad <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Soyadınız"
                        className={cn(
                          'pl-10',
                          form.formState.errors.lastName &&
                            'border-destructive bg-destructive/5 focus-visible:ring-0 focus-visible:border-destructive',
                        )}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            İletişim
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Firma Adı{' '}
                    <span className="text-xs font-normal text-muted-foreground">(opsiyonel)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Firma adı" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Telefon{' '}
                    <span className="text-xs font-normal text-muted-foreground">(opsiyonel)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="+90 5xx xxx xx xx" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none text-foreground">E-posta</p>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={user?.email ?? ''}
                readOnly
                className="cursor-not-allowed pl-10 pr-10 text-muted-foreground"
              />
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" />
              E-posta değişikliği ayrı bir doğrulama akışıyla gerçekleştirilir.
            </p>
          </div>
        </section>

        <div>
          <Button type="submit" disabled={isPending} className="min-w-32">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Değişiklikleri Kaydet'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
