import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
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
import {
  useProfile,
  useUpdateProfile,
  useRequestEmailChange,
  useChangePassword,
} from '@/lib/api/useAuth';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { profileSchema } from '@/features/platform/schemas/profileSchema';
import type { ProfileFormValues } from '@/features/platform/schemas/profileSchema';
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from '@/features/platform/schemas/passwordChangeSchema';

// ─── helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      tabIndex={-1}
      aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
      onClick={onToggle}
    >
      {show ? (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Eye className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}

// ─── email change schema (local — not reused elsewhere) ───────────────────────

const emailChangeSchema = z.object({
  newEmail: z.string().email('Geçerli bir e-posta adresi giriniz'),
});
type EmailChangeValues = z.infer<typeof emailChangeSchema>;

// ─── inline email change section ─────────────────────────────────────────────

interface EmailChangeSectionProps {
  currentEmail: string;
  onClose: () => void;
}

function EmailChangeSection({ currentEmail, onClose }: EmailChangeSectionProps) {
  const { mutate: requestChange, isPending } = useRequestEmailChange();

  const form = useForm<EmailChangeValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: '' },
    mode: 'onBlur',
  });

  function onSubmit({ newEmail }: EmailChangeValues) {
    requestChange(
      { newEmail },
      {
        onSuccess: () => {
          toast.success('Doğrulama bağlantısı yeni e-posta adresinize gönderildi.', {
            position: 'bottom-right',
          });
          onClose();
        },
        onError: () => {
          toast.error('E-posta değişikliği başlatılamadı. Lütfen tekrar deneyin.', {
            position: 'bottom-right',
          });
        },
      },
    );
  }

  return (
    <div className="mt-2">
      <p className="mb-3 text-xs text-muted-foreground">
        Yeni adresinize doğrulama bağlantısı gönderilecektir. Mevcut e-posta doğrulanmadan yeni
        adres aktif olmaz.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-foreground">Mevcut E-posta</p>
            <Input value={currentEmail} disabled className="bg-muted" />
          </div>
          <FormField
            control={form.control}
            name="newEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yeni E-posta</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="yeni@eposta.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              İptal
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                'Doğrulama Gönder'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── inline password change section ──────────────────────────────────────────

interface PasswordChangeSectionProps {
  onClose: () => void;
}

function PasswordChangeSection({ onClose }: PasswordChangeSectionProps) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { mutate: changePassword, isPending } = useChangePassword();

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  function onSubmit({ currentPassword, newPassword }: PasswordChangeFormValues) {
    changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success('Şifreniz başarıyla güncellendi.', { position: 'bottom-right' });
          onClose();
        },
        onError: () => {
          toast.error('Şifre güncellenemedi. Mevcut şifrenizi kontrol edip tekrar deneyin.', {
            position: 'bottom-right',
          });
        },
      },
    );
  }

  return (
    <div className="mt-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mevcut Şifreniz</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pr-10"
                      {...field}
                    />
                    <PasswordToggle show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yeni Şifreniz</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showNew ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pr-10"
                      {...field}
                    />
                    <PasswordToggle show={showNew} onToggle={() => setShowNew((v) => !v)} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yeni Şifreyi Tekrar Giriniz</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pr-10"
                      {...field}
                    />
                    <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              İptal
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                'Şifremi Güncelle'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function ProfileForm() {
  const { data: profile } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const currentEmail = useAuthStore((s) => s.user?.email ?? '');

  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: '', lastName: '', companyName: '' },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      companyName: profile.companyName ?? '',
    });
  }, [profile, form]);

  function onSubmit(values: ProfileFormValues) {
    updateProfile({
      firstName: values.firstName,
      lastName: values.lastName,
      companyName: values.companyName || null,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-base font-semibold text-foreground">Kişisel Bilgiler</h2>

      <Form {...form}>
        <form
          id="profile-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          {/* Ad / Soyad */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad</FormLabel>
                  <FormControl>
                    <Input placeholder="Adınız" {...field} />
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
                  <FormLabel>Soyad</FormLabel>
                  <FormControl>
                    <Input placeholder="Soyadınız" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Firma Adı */}
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
                  <Input placeholder="Firma adı giriniz" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* E-POSTA */}
      <div className="flex flex-col gap-3">
        <SectionLabel>E-Posta</SectionLabel>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-foreground">E-posta Adresi</p>
          <div className="flex gap-2">
            <Input value={currentEmail} disabled className="flex-1 bg-muted" />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                setEmailOpen((v) => !v);
                setPasswordOpen(false);
              }}
            >
              {emailOpen ? 'Kapat' : 'Değiştir'}
            </Button>
          </div>
          {emailOpen && (
            <EmailChangeSection currentEmail={currentEmail} onClose={() => setEmailOpen(false)} />
          )}
        </div>
      </div>

      {/* GÜVENLİK */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Güvenlik</SectionLabel>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-foreground">Şifre</p>
          <div className="flex gap-2">
            <Input value="••••••••••••" disabled className="flex-1 bg-muted" />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                setPasswordOpen((v) => !v);
                setEmailOpen(false);
              }}
            >
              {passwordOpen ? 'Kapat' : 'Güncelle'}
            </Button>
          </div>
          {passwordOpen && <PasswordChangeSection onClose={() => setPasswordOpen(false)} />}
        </div>
      </div>

      <div className="flex justify-end">
        <Button form="profile-form" type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            'Değişiklikleri Kaydet'
          )}
        </Button>
      </div>
    </div>
  );
}
