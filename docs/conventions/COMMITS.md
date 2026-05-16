# Commit Kuralları

Commit geçmişini anlaşılır, okunabilir ve takip edilebilir tutmak için uyulacak kurallar.

---

## Temel Prensip

Commit mesajı mümkün olduğunca **sade ve açıklayıcı** olmalıdır. Geçmişe bakan biri mesajı gördüğünde değişikliğin neyle ilgili olduğunu anlayabilmelidir.

{% hint style="success" %}
**İyi örnekler:**

```
docker compose local ortam için eklendi
backend container port ayarı düzeltildi
health check endpointi eklendi
mssql container config düzeltildi
branch strategy dokümanı eklendi
```
{% endhint %}

{% hint style="danger" %}
**Kötü örnekler — kullanılmaz:**

```
son
fix
update
asdf
düzenleme
çeşitli değişiklikler
```

Bu tür mesajlar ne yapıldığını anlatmaz, commit geçmişini değersiz kılar.
{% endhint %}

---

## Atomic Commit Kuralı

**1 anlamlı değişiklik = 1 commit**

{% hint style="success" %}
**Doğru:**

```bash
git commit -m "docker compose eklendi"
git commit -m "backend config düzeltildi"
git commit -m "readme güncellendi"
```
{% endhint %}

{% hint style="danger" %}
**Yanlış:**

```bash
git commit -m "docker, readme, ci ve refactor değişiklikleri"
```

Birbiriyle ilgisiz değişiklikler aynı commit içinde toplanmaz.
{% endhint %}

---

## Commit Yazım Kuralları

- Anlaşılır ve sade dil kullan
- Mümkünse Türkçe yaz
- Çok genel ifadelerden kaçın
- Ne yapıldığını açıkça söyle

---

## Commit Öncesi Kontrol

Commit atmadan önce kendinize şunu sorun:

1. Bu commit tek bir işi mi kapsıyor?
2. Mesaj ne yaptığımı açıkça anlatıyor mu?
3. Başka biri bu mesajı görünce değişikliği anlayabilir mi?

Cevap hayırsa commit bölünmeli veya mesaj düzeltilmelidir.

---

## PR Öncesi Temizlik

PR açmadan önce:

- Anlamsız commit mesajları bırakılmamalı
- Gereksiz commit geçmişi temizlenmeli
- Mümkünse geçmiş okunabilir bırakılmalıdır

{% hint style="info" %}
Amaç kusursuz değil, **okunabilir** bir geçmiş oluşturmaktır.
{% endhint %}

---

## İlgili Dokümanlar

{% content-ref url="BRANCHING.md" %}
[Branching Strategy](BRANCHING.md)
{% endcontent-ref %}
