import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, CreditCard } from 'lucide-react';
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
import { useSubscriptionStore, type SavedCardInfo } from '@/lib/store/useSubscriptionStore';
import { SavedCardForm } from '@/features/platform/components/SavedCardForm';
import { profileSchema } from '@/features/platform/schemas/profileSchema';
import type { ProfileFormValues } from '@/features/platform/schemas/profileSchema';
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from '@/features/platform/schemas/passwordChangeSchema';

// ─── helpers ─────────────────────────────────────────────────────────────────

function SavedCardNetworkBadge({ network }: { network: SavedCardInfo['network'] }) {
  if (network === 'visa') {
    return (
      <span className="rounded bg-[#1a1f71] px-1.5 py-0.5 font-bold italic text-[10px] tracking-wider text-white">
        VISA
      </span>
    );
  }
  if (network === 'mastercard') {
    return (
      <div className="flex items-center">
        <div className="h-4 w-4 rounded-full bg-red-500" />
        <div className="-ml-1.5 h-4 w-4 rounded-full bg-yellow-400 opacity-90" />
      </div>
    );
  }
  if (network === 'amex') {
    return (
      <span className="rounded bg-[#007bc1] px-1.5 py-0.5 font-bold text-[10px] tracking-wider text-white">
        AMEX
      </span>
    );
  }
  if (network === 'troy') {
    return (
      <span className="rounded bg-red-600 px-1.5 py-0.5 font-bold text-[10px] tracking-wider text-white">
        TROY
      </span>
    );
  }
  return <CreditCard className="h-4 w-4 text-muted-foreground" />;
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
            <Input value={currentEmail} disabled className="h-9 bg-muted" />
          </div>
          <FormField
            control={form.control}
            name="newEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yeni E-posta</FormLabel>
                <FormControl>
                  <Input type="email" className="h-9" placeholder="yeni@eposta.com" {...field} />
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
                      className="h-9 pr-10"
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
                      className="h-9 pr-10"
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
                      className="h-9 pr-10"
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

  const savedCard = useSubscriptionStore((s) => s.savedCard);
  const clearSavedCard = useSubscriptionStore((s) => s.setSavedCard);

  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [cardAddOpen, setCardAddOpen] = useState(false);

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
    <div className="flex flex-col divide-y divide-border">
      {/* Kişisel Bilgiler */}
      <div className="pb-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Kişisel Bilgiler
        </p>
        <Form {...form}>
          <form id="profile-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="flex items-start gap-6 space-y-0 border-b border-border py-3">
                  <span className="w-52 shrink-0 pt-2 text-sm text-foreground">Ad</span>
                  <div className="flex flex-1 max-w-[280px] flex-col gap-1">
                    <FormControl>
                      <Input className="h-9" placeholder="Adınız" {...field} />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="flex items-start gap-6 space-y-0 border-b border-border py-3">
                  <span className="w-52 shrink-0 pt-2 text-sm text-foreground">Soyad</span>
                  <div className="flex flex-1 max-w-[280px] flex-col gap-1">
                    <FormControl>
                      <Input className="h-9" placeholder="Soyadınız" {...field} />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem className="flex items-start gap-6 space-y-0 py-3">
                  <span className="w-52 shrink-0 pt-2 text-sm text-foreground">
                    Firma Adı{' '}
                    <span className="text-xs font-normal text-muted-foreground">(opsiyonel)</span>
                  </span>
                  <div className="flex flex-1 max-w-[280px] flex-col gap-1">
                    <FormControl>
                      <Input className="h-9" placeholder="Firma adı giriniz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>

      {/* E-POSTA */}
      <div className="py-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          E-Posta
        </p>
        <div className="flex items-start gap-6 border-b border-border py-3 last:border-0">
          <span className="w-52 shrink-0 pt-2 text-sm text-foreground">E-posta Adresi</span>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex gap-2">
              <Input value={currentEmail} disabled className="h-9 flex-1 bg-muted" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
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
      </div>

      {/* GÜVENLİK */}
      <div className="py-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Güvenlik
        </p>
        <div className="flex items-start gap-6 border-b border-border py-3 last:border-0">
          <span className="w-52 shrink-0 pt-2 text-sm text-foreground">Şifre</span>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex gap-2">
              <Input value="••••••••••••" disabled className="h-9 flex-1 bg-muted" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
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
      </div>

      {/* ÖDEME BİLGİLERİ */}
      <div className="py-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Ödeme Bilgileri
        </p>
        <div className="flex items-start gap-6 py-3">
          <span className="w-52 shrink-0 pt-2 text-sm text-foreground">Kayıtlı Kart</span>
          <div className="flex flex-1 flex-col gap-1.5">
            {savedCard ? (
              <>
                <div className="flex gap-2">
                  <div className="flex h-9 flex-1 items-center gap-2.5 rounded-md border border-input bg-muted px-3">
                    <SavedCardNetworkBadge network={savedCard.network} />
                    <span className="font-mono text-sm tracking-widest text-muted-foreground">
                      •••• •••• •••• {savedCard.last4}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={() => clearSavedCard(null)}
                  >
                    Kaldır
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {savedCard.cardholderName} · Son kullanma: {savedCard.expiry}
                </p>
              </>
            ) : cardAddOpen ? (
              <SavedCardForm onClose={() => setCardAddOpen(false)} />
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">Kayıtlı kart bulunmuyor.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setCardAddOpen(true)}
                >
                  Kart Ekle
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
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
