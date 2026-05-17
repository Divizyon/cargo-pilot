import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TermsPage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Kullanım Koşulları</h1>
          <p className="text-sm text-muted-foreground">Son güncelleme: Mayıs 2025</p>
        </div>

        <div className="prose prose-sm sm:prose max-w-none text-foreground space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Kabul</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cargo Pilot'u kullanarak bu kullanım koşullarını kabul etmiş sayılırsınız. Bu
              koşulları kabul etmiyorsanız platformu kullanmayı bırakınız. Koşullar önceden
              haber verilmeksizin değiştirilebilir; güncel sürümü bu sayfada yayımlanır.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Hizmet Kapsamı</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cargo Pilot; lojistik operasyonları için yük optimizasyonu, 3D yükleme planlaması ve
              raporlama araçları sunan bir SaaS platformudur. Hizmetin kapsamı, özellik listesi ve
              kullanım limitleri abonelik planınıza göre belirlenir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Hesap Sorumluluğu</h2>
            <p className="text-muted-foreground leading-relaxed">
              Hesabınızın güvenliğinden ve hesabınız altında gerçekleştirilen tüm işlemlerden siz
              sorumlusunuz. Yetkisiz erişim tespit etmeniz durumunda derhal{' '}
              <Link to="/iletisim" className="text-foreground underline underline-offset-2 hover:opacity-75">
                bizimle iletişime
              </Link>{' '}
              geçiniz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Ödeme ve İptal</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ücretli planlar aylık veya yıllık dönemler halinde faturalandırılır. İptal işlemi
              mevcut dönemin sonunda geçerli olur; kalan süre için ücret iadesi yapılmaz. Ödeme
              bilgilerinin güncel tutulması kullanıcının sorumluluğundadır.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Kullanım Kısıtlamaları</h2>
            <p className="text-muted-foreground leading-relaxed">
              Platformu yasa dışı amaçlarla, zararlı yazılım dağıtmak, hizmetleri aksatmak veya
              başkalarının haklarını ihlal etmek amacıyla kullanamazsınız. Bu tür ihlaller hesabın
              derhal askıya alınmasıyla sonuçlanabilir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Sorumluluk Sınırlaması</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cargo Pilot, hizmet kesintileri veya veri kayıpları nedeniyle oluşabilecek dolaylı
              zararlardan sorumlu tutulamaz. Platformun sağladığı optimizasyon sonuçları tavsiye
              niteliğindedir; nihai operasyonel kararlar kullanıcıya aittir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Uygulanacak Hukuk</h2>
            <p className="text-muted-foreground leading-relaxed">
              Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Anlaşmazlıklar İstanbul mahkeme ve
              icra dairelerinde çözümlenir.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
