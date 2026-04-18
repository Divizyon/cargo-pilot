# Commit Kuralları

Bu doküman, Cargo Pilot projesinde commit atarken uyulacak temel kuralları tanımlar.

Amaç; commit geçmişini anlaşılır, okunabilir ve takip edilebilir tutmaktır.

---

## 1. Temel Yaklaşım

Bu projede commit mesajları:

- kısa
- açık
- ne yapıldığını anlatan
- mümkünse tek bir işi kapsayan

şekilde yazılmalıdır.

Commit geçmişine bakan biri, mesajı gördüğünde değişikliğin neyle ilgili olduğunu anlayabilmelidir.

---

## 2. Commit Yazım Prensibi

Commit mesajı mümkün olduğunca sade ve açıklayıcı olmalıdır.

Örnek:

```text
docker compose local ortam için eklendi
backend container port ayarı düzeltildi
branch strategy dokümanı eklendi
health check endpointi eklendi
mssql container config düzeltildi
```

Mesajın illa belirli bir teknik formatta olması gerekmez.
Önemli olan, yapılan değişikliğin açık şekilde anlaşılmasıdır.

---

## 3. Atomic Commit Kuralı

Bu projede mümkün olduğunca atomic commit yaklaşımı kullanılmalıdır.

Yani:

* her commit tek bir amaca hizmet etmelidir
* birbiriyle ilgisiz değişiklikler aynı commit içinde toplanmamalıdır

Doğru yaklaşım:

* docker compose eklemek → ayrı commit
* backend config düzeltmek → ayrı commit
* readme güncellemek → ayrı commit

Yanlış yaklaşım:

* aynı commit içinde docker, readme, ci ve refactor değişikliklerini birlikte göndermek

Özet:

* 1 anlamlı değişiklik = 1 commit

---

## 4. Commit Mesajlarında Dikkat Edilecekler

Commit mesajları yazılırken:

* anlaşılır bir dil kullanılmalı
* mümkünse Türkçe ve sade yazılmalı
* çok genel ifadelerden kaçınılmalı
* değişikliğin ne olduğu açıkça söylenmeli

Örnek olarak şu tarz mesajlar tercih edilmelidir:

```text
local geliştirme için docker compose dosyası eklendi
backend servis port çakışması düzeltildi
minio config ayarları güncellendi
pipeline hata kontrolü eklendi
```

---

## 5. Kullanılmaması Gereken Commit Mesajları

Aşağıdaki gibi commit mesajları kullanılmamalıdır:

```text
son
deneme
güncel
fix
update
asdf
düzenleme
çeşitli değişiklikler
```

Bu tür mesajlar:

* ne yapıldığını anlatmaz
* commit geçmişini değersiz hale getirir
* review ve hata analizi süreçlerini zorlaştırır

---

## 6. Commit Öncesi Kontrol

Commit atmadan önce geliştirici kendine şunu sormalıdır:

* Bu commit tek bir işi mi kapsıyor?
* Mesaj ne yaptığımı açıkça anlatıyor mu?
* Başka biri bu mesajı görünce değişikliği anlayabilir mi?

Eğer cevap hayırsa, commit bölünmeli veya mesaj düzeltilmelidir.

---

## 7. Pull Request Öncesi Temizlik

Pull Request açmadan önce:

* anlamsız commit mesajları bırakılmamalı
* çok dağınık ve gereksiz commit geçmişi temizlenmeli
* mümkünse commit geçmişi okunabilir bırakılmalıdır

Amaç kusursuz bir geçmiş oluşturmak değil,
okunabilir ve anlaşılır bir geçmiş bırakmaktır.

---

## 8. Özet

Bu projede commit mesajlarında temel beklenti şudur:

* sade yaz
* ne yaptığını açık yaz
* tek işe tek commit at
* anlamsız mesaj kullanma

Kural basit:

Commit geçmişi okunabilir olmalı, yapılan iş anlaşılmalı ve mümkün olduğunca atomic commit yaklaşımı korunmalıdır.

---

## İlgili Dokümanlar

* [Branching Strategy](./BRANCHING.md) — Branch yönetimi ve PR kuralları

<!-- ci-rule-test: bu satır branch koruma kurallarını test etmek için eklenmiştir -->
