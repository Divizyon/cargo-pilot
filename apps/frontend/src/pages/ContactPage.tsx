import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';

const contactSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
  subject: z.string().min(3, 'Konu en az 3 karakter olmalıdır.'),
  message: z.string().min(10, 'Mesajınız en az 10 karakter olmalıdır.'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  function onSubmit(_data: ContactFormValues) {
    setSubmitted(true);
  }

  return (
    <div className="min-h-dvh bg-background font-sans antialiased">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-6">
            <Link to="/">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Ana Sayfa
            </Link>
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">İletişim</h1>
          <p className="text-muted-foreground">
            Sorularınız için bize yazın, en kısa sürede dönüş yapalım.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact info */}
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-start gap-4 pt-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-0.5">E-posta</p>
                  <a
                    href="mailto:cargo-pilot@gmail.com"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    cargo-pilot@gmail.com
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start gap-4 pt-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-0.5">Adres</p>
                  <p className="text-sm text-muted-foreground">Selçuklu / Konya</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start gap-4 pt-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-0.5">Çalışma Saatleri</p>
                  <p className="text-sm text-muted-foreground">Pazartesi – Cuma, 09:00 – 18:00</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact form */}
          <div>
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 border border-border rounded-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Mail className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Mesajınız alındı</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  En kısa sürede size dönüş yapacağız. Teşekkür ederiz.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    Ad Soyad <span className="text-destructive">*</span>
                  </Label>
                  <Input id="name" placeholder="Adınız" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    E-posta <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@sirket.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject">
                    Konu <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="subject"
                    placeholder="Nasıl yardımcı olabiliriz?"
                    {...register('subject')}
                  />
                  {errors.subject && (
                    <p className="text-xs text-destructive">{errors.subject.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message">
                    Mesaj <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Mesajınızı buraya yazınız..."
                    rows={5}
                    {...register('message')}
                  />
                  {errors.message && (
                    <p className="text-xs text-destructive">{errors.message.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Gönderiliyor…' : 'Gönder'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
