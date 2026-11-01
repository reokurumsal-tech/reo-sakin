# REO Sakin – App Store / Google Play kurulum rehberi

Uygulama kimliği: **com.reotesis.sakin** · Uygulama adı: **REO Sakin**
Uygulama, sakin portalını (reo-portal.com/e/giris) açar. Portalda yaptığınız her değişiklik uygulamaya anında yansır, mağazaya yeniden göndermek gerekmez.
Uygulamaya özel olanlar: anlık bildirim, evrakı telefona kaydetme/paylaşma, internet yokken uyarı ekranı ve hesap silme.

---

## 1. Portalı güncelleyin (5 dk)

1. **Code.gs** dosyasını Apps Script'e yapıştırın. En üstteki `GIZLILIK_ILETISIM = 'ILETISIM_BILGISI_BURAYA'` satırına gizlilik sayfasında görünecek e-posta ve adresi yazın.
2. Yeni sürüm yayınlayın: Dağıt › Dağıtımları yönet › Düzenle › **Yeni sürüm**.
3. **REO-Portal.html** dosyasını Drive'daki eskisinin yerine yükleyin.
4. Kontrol edin:
   - **https://reo-portal.com/e/gizlilik** adresinde gizlilik politikası açılmalı.
   - Sakin portalında üstteki **Hesabım** düğmesi görünmeli.

## 2. Firebase (bildirimler için, 15 dk)

1. https://console.firebase.google.com › **Proje ekle** › ad: `REO Sakin`. Google Analytics gerekmez.
2. **iOS uygulaması ekle** › Paket kimliği `com.reotesis.sakin` › `GoogleService-Info.plist` dosyasını indirin.
3. **Android uygulaması ekle** › Paket adı `com.reotesis.sakin` › `google-services.json` dosyasını indirin.
4. İki dosyayı bu klasördeki **firebase/** klasörüne koyun.
5. Apple bildirim anahtarı:
   - developer.apple.com › Certificates, IDs & Profiles › **Keys** › **+** › *Apple Push Notifications service (APNs)* › indirin (`.p8`). Key ID'yi ve Team ID'yi not edin.
   - Firebase › Proje ayarları › **Cloud Messaging** › Apple uygulama yapılandırması › **APNs kimlik doğrulama anahtarı** › `.p8` dosyasını, Key ID'yi ve Team ID'yi yükleyin.
6. Portalın bildirim gönderebilmesi için:
   - Firebase › Proje ayarları › **Hizmet hesapları** › **Yeni özel anahtar oluştur** › bir JSON dosyası iner.
   - Apps Script › Proje Ayarları › **Komut dosyası özellikleri** › Özellik ekle: ad `FCM_HESAP`, değer: JSON dosyasının **tüm içeriği**.
   - Bu dosya gizlidir. Kimseyle paylaşmayın, e-postayla göndermeyin.

## 3. Apple tarafı (20 dk)

1. developer.apple.com › Identifiers › **+** › App IDs.
   - Bundle ID: `com.reotesis.sakin`.
   - Capabilities listesinde **Push Notifications**'ı işaretleyin.
2. appstoreconnect.apple.com › Uygulamalar › **+ Yeni Uygulama**.
   - Platform iOS, ad **REO Sakin**. Ad doluysa "REO Sakin Portalı" deneyin.
   - Birincil dil Türkçe, Bundle ID `com.reotesis.sakin`, SKU `reo-sakin`.
3. Uygulamanın **Genel › Uygulama Bilgileri** sayfasındaki **Apple ID** numarasını `codemagic.yaml` içindeki `APP_STORE_APPLE_ID` yerine yazın.
4. App Store Connect › Kullanıcılar ve Erişim › **Entegrasyonlar** › App Store Connect API › Ekip Anahtarları › **+**.
   - Rol: *App Manager*.
   - `.p8` dosyasını indirin ve Issuer ID ile Key ID'yi not edin. Bunlar Codemagic için gerekecek.

## 4. Derleme – Mac gerekmez (Codemagic, ücretsiz kotası yeterli)

1. GitHub'da **özel (private)** bir depo açın ve bu klasörün tamamını yükleyin (firebase/ dahil).
2. https://codemagic.io › GitHub ile giriş › **Add application** › depoyu seçin.
3. Teams › **Integrations** › *Developer Portal* › 3.4'teki anahtarı ekleyin, adı: `REO App Store`.
4. Uygulama ayarları › Code signing › iOS: **Automatic**, Bundle ID `com.reotesis.sakin`.
5. **Start new build** › workflow **iOS → TestFlight / App Store**.
6. Yaklaşık 20–30 dakika sonra uygulama TestFlight'a düşer.

Mac'iniz varsa Codemagic yerine şunu da kullanabilirsiniz: `npm install && npm run hazirla:ios`, ardından `ios/App/App.xcworkspace` dosyasını Xcode'da açıp **Product › Archive** yapın.

## 5. TestFlight'ta deneyin

iPhone'a **TestFlight** uygulamasını kurun ve REO Sakin'i yükleyin. Şunları deneyin:

- [ ] Telefon + şifre ile giriş, daire bilgileri, dil değiştirme
- [ ] Giriş sonrası bildirim izni sorusu › **İzin ver**
- [ ] Portal › Aidat Takip › Ayarlar › Sakin Girişleri › **Uygulama bildirimi** › test mesajı › telefona geldi mi?
- [ ] Resmi evrak › aç › **İndir** › paylaşma ekranı açıldı mı?
- [ ] Uçak modu › uygulamayı açın › "İnternet bağlantısı yok" ekranı
- [ ] Bir **test hesabıyla** Hesabım › Hesabımı sil

## 6. App Store bilgileri ve incelemeye gönderme

- **Gizlilik politikası URL:** https://reo-portal.com/e/gizlilik
- **Destek URL:** https://reo-portal.com
- **Kategori:** Yaşam Tarzı (Lifestyle) · **Yaş sınırı:** 4+
- **Açıklama (öneri):** "REO Sakin, Reo Tesis Yönetimi Ltd.Şti. tarafından yönetilen sitelerin kat maliki ve kiracıları içindir. Aidat borcunuzu ve ödemelerinizi görün, site IBAN'ını kopyalayın, bütçe, karar, faaliyet raporu ve resmi evraklara ulaşın, yönetimden gelen duyuruları anında bildirim olarak alın. Türkçe, English, Русский."
- **Ekran görüntüleri:** iPhone 6,9" (1320 × 2868), en az 3 adet. TestFlight'taki uygulamadan alın; demo sitesi kullanın, gerçek kişi bilgisi görünmesin.
- **App Privacy (Veri gizliliği) formu:** "Kullanıcıyı izleme: Hayır". Toplanan veriler:
  - İletişim bilgisi › Ad, Telefon numarası
  - Finansal bilgi › Diğer finansal bilgiler (aidat kayıtları)
  - Tanımlayıcılar › Cihaz kimliği (bildirim)
  - Hepsi için: *Uygulama işlevselliği*, *kullanıcıya bağlı*.
- **İnceleme notu ve demo hesap (zorunlu):**
  1. Aidat Takip'te bir **Demo Sitesi** açın.
  2. Bir daireye kullanmadığınız bir numara yazın (örn. 0500 000 00 01) ve sakin girişini açın.
  3. Şifre oluşturup bir kez giriş yaparak kalıcı şifre belirleyin.
  4. Bu telefon ve şifreyi "Sign-in required" alanına yazın.
  5. Not: "Accounts are created by the management company for residents of managed sites; the app shows dues, payments, documents and push announcements. Account deletion: Hesabım › Hesabımı sil."

Gönderdikten sonra inceleme genelde 1–3 gün sürer.

## 7. Google Play (sonra)

1. play.google.com/console › şirket (kuruluş) hesabı açın. Tek seferlik 25 USD, D-U-N-S numarası gerekir.
   - Kuruluş hesaplarında 12 test kullanıcısı / 14 gün kuralı yoktur.
2. Codemagic › Code signing › Android keystores › **Generate**.
   - Adı: `reo_sakin_anahtar`.
   - Bu anahtarı kaybetmeyin; yedeğini indirin.
3. Workflow **Android → Google Play (.aab)** › oluşan `.aab` dosyasını Play Console › Üretim › Yeni sürüm'e yükleyin.
4. Veri güvenliği formunu App Store'daki bilgilerle aynı şekilde doldurun; gizlilik URL'si aynı.
