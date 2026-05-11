import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useChangePassword } from '@/lib/api/useAuth';
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from '@/features/platform/schemas/passwordChangeSchema';

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PasswordFieldProps {
  show: boolean;
  onToggle: () => void;
}

function PasswordToggleButton({ show, onToggle }: PasswordFieldProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
    >
      {show ? (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Eye className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}

export function PasswordChangeDialog({ open, onOpenChange }: PasswordChangeDialogProps) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { mutate: changePassword, isPending } = useChangePassword();

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [open, form]);

  function onSubmit({ currentPassword, newPassword }: PasswordChangeFormValues) {
    changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success('Şifreniz başarıyla güncellendi.', { position: 'bottom-right' });
          onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Şifreni Güncelle</DialogTitle>
          <DialogDescription>
            Güvenliğiniz için güçlü bir şifre seçin. Şifreniz en az 8 karakter, 1 büyük harf ve 1
            rakam içermelidir.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                      <PasswordToggleButton
                        show={showCurrent}
                        onToggle={() => setShowCurrent((v) => !v)}
                      />
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
                      <PasswordToggleButton
                        show={showNew}
                        onToggle={() => setShowNew((v) => !v)}
                      />
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
                      <PasswordToggleButton
                        show={showConfirm}
                        onToggle={() => setShowConfirm((v) => !v)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2 gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Güncelleniyor...
                  </>
                ) : (
                  'Şifremi Güncelle'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
