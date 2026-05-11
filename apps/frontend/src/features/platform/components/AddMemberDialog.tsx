import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useCreateCompanyMember } from '@/lib/api/useCompanyMembers';
import {
  createMemberSchema,
  type CreateMemberFormValues,
} from '@/features/platform/schemas/createMemberSchema';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS: { value: CreateMemberFormValues['role']; label: string; description: string }[] =
  [
    { value: 'admin', label: 'Admin', description: 'Tüm yönetim yetkilerine sahip' },
    { value: 'operator', label: 'Operatör', description: 'Yükleme planı oluşturabilir' },
  ];

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: createMember, isPending } = useCreateCompanyMember();

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'operator',
    },
    mode: 'onBlur',
  });

  function onSubmit(values: CreateMemberFormValues) {
    createMember(values, {
      onSuccess: () => {
        toast.success('Kullanıcı başarıyla eklendi. Giriş bilgileri e-posta ile gönderildi.', {
          position: 'bottom-right',
        });
        form.reset();
        onOpenChange(false);
      },
      onError: () => {
        toast.error('Kullanıcı eklenirken bir hata oluştu. Lütfen tekrar deneyin.', {
          position: 'bottom-right',
        });
      },
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-4 w-4 text-primary" />
          </div>
          <DialogTitle>Kullanıcı Ekle</DialogTitle>
          <DialogDescription>
            Yeni çalışanı platforma ekleyin. Giriş bilgileri e-posta ile iletilecektir.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad</FormLabel>
                    <FormControl>
                      <Input placeholder="Ahmet" {...field} />
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
                      <Input placeholder="Kaya" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ornek@firma.com" {...field} />
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
                  <FormLabel>Geçici Şifre</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword((p) => !p)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-3"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          htmlFor={`role-${opt.value}`}
                          className={cn(
                            'flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors',
                            field.value === opt.value
                              ? 'border-primary bg-primary/5'
                              : 'border-input hover:bg-accent',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={opt.value} id={`role-${opt.value}`} />
                            <Label
                              htmlFor={`role-${opt.value}`}
                              className="cursor-pointer text-sm font-semibold"
                            >
                              {opt.label}
                            </Label>
                          </div>
                          <p className="pl-6 text-xs text-muted-foreground">{opt.description}</p>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2 gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Ekleniyor...
                  </>
                ) : (
                  'Kullanıcı Ekle'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
