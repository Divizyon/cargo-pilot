import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background font-sans antialiased">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-6">
            <Link to="/">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Ana Sayfa
            </Link>
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Gizlilik Politikası</h1>
          <p className="text-sm text-muted-foreground">Son güncelleme: Mayıs 2025</p>
        </div>

        <div className="prose prose-sm sm:prose max-w-none text-foreground space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Toplanan Veriler</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cargo Pilot olarak; ad, e-posta adresi, şirket bilgisi ve ödeme bilgileri gibi hesap
              oluşturma sürecinde sağladığınız kişisel verileri topluyoruz. Ayrıca platform
              kullanımınıza ilişkin log verileri, IP adresi ve tarayıcı bilgisi gibi teknik verileri
              otomatik olarak işleyebiliriz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Verilerin Kullanım Amacı</h2>
            <p className="text-muted-foreground leading-relaxed">
              Toplanan veriler; hizmetlerin sunulması ve iyileştirilmesi, hesap yönetimi, fatura
              işlemleri, destek hizmetleri ve yasal yükümlülüklerin yerine getirilmesi amacıyla
              kullanılmaktadır. Verileriniz üçüncü taraflarla pazarlama amacıyla paylaşılmaz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Veri Güvenliği</h2>
            <p className="text-muted-foreground leading-relaxed">
              Verileriniz TLS şifrelemesi ve endüstri standardı güvenlik önlemleriyle korunmaktadır.
              Erişim; yalnızca yetkili personel ile sınırlıdır ve düzenli güvenlik denetimleri
              uygulanmaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Çerezler</h2>
            <p className="text-muted-foreground leading-relaxed">
              Platform, oturum yönetimi ve analitik amaçlarla çerezler kullanmaktadır. Tarayıcı
              ayarlarınızdan çerezleri devre dışı bırakabilirsiniz; ancak bu durumda bazı
              işlevler kısıtlanabilir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Haklarınız</h2>
            <p className="text-muted-foreground leading-relaxed">
              KVKK ve GDPR kapsamında; verilerinize erişim, düzeltme, silme ve taşıma haklarına
              sahipsiniz. Talepleriniz için{' '}
              <Link to="/iletisim" className="text-foreground underline underline-offset-2 hover:opacity-75">
                iletişim sayfamızdan
              </Link>{' '}
              bize ulaşabilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. İletişim</h2>
            <p className="text-muted-foreground leading-relaxed">
              Gizlilik politikamıza ilişkin sorularınız için{' '}
              <a
                href="mailto:privacy@cargopilot.io"
                className="text-foreground underline underline-offset-2 hover:opacity-75"
              >
                privacy@cargopilot.io
              </a>{' '}
              adresine yazabilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
