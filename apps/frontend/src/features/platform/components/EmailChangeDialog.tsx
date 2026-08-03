import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useRequestEmailChange } from '@/lib/api/useAuth';

const emailChangeSchema = z.object({
  newEmail: z.string().email('Geçerli bir e-posta adresi giriniz'),
});

type EmailChangeFormValues = z.infer<typeof emailChangeSchema>;

interface EmailChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailChangeDialog({ open, onOpenChange }: EmailChangeDialogProps) {
  const currentEmail = useAuthStore((s) => s.user?.email ?? '');
  const { mutate: requestChange, isPending } = useRequestEmailChange();

  const form = useForm<EmailChangeFormValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: '' },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  function onSubmit({ newEmail }: EmailChangeFormValues) {
    requestChange(
      { newEmail },
      {
        onSuccess: () => {
          toast.success('Doğrulama bağlantısı yeni e-posta adresinize gönderildi.', {
            position: 'bottom-right',
          });
          onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>E-posta Adresini Değiştir</DialogTitle>
          <DialogDescription>
            Yeni adresinize doğrulama bağlantısı gönderilecektir. Mevcut e-posta doğrulanmadan yeni
            adres aktif olmaz.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <FormLabel className="text-sm font-medium">Mevcut E-posta</FormLabel>
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
                    Gönderiliyor...
                  </>
                ) : (
                  'Doğrulama Gönder'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
