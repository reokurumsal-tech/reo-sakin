/* Reo E-Portal – uygulama kabuğu
 * Sakin portalını (reo-portal.com/e/giris) açar ve portalla postMessage üzerinden konuşur:
 *   portal → uygulama : {reoSk:1, tip:"hazir"|"giris"|"cikis"|"bildirimAyar"|"paylas"|"ac", ...}
 *   uygulama → portal : {reoApp:1, platform:"ios"|"android", push:"<FCM kimliği>", ac:"yenile"}
 */
(function () {
  'use strict';
  // Eklenti erişimi: @capacitor/core (capacitor.js) varsa onun registerPlugin'i, yoksa yerel köprünün Plugins nesnesi
  function eklenti(ad) {
    var C = window.Capacitor;
    if (!C || !(C.isNativePlatform && C.isNativePlatform())) return null;
    try { if (window.capacitorExports && capacitorExports.registerPlugin) return capacitorExports.registerPlugin(ad); } catch (e) {}
    try { if (C.registerPlugin) return C.registerPlugin(ad); } catch (e) {}
    if (C.Plugins && C.Plugins[ad]) return C.Plugins[ad];
    return null;
  }
  try { var sp0 = eklenti('SplashScreen'); if (sp0) sp0.hide().catch(function () {}); } catch (e) {}
  try { basla(); } catch (e) { hataGoster('Uygulama başlatılamadı: ' + (e && e.message || e)); }
  function hataGoster(m) {
    var y = document.getElementById('yuk'), k = document.getElementById('yok');
    if (y) y.classList.add('gz');
    if (k) { k.classList.remove('gz'); var p = k.querySelector('p'); if (p) p.textContent = m; var b = k.querySelector('b'); if (b) b.textContent = 'Bir sorun oluştu'; }
  }
  function basla() {
  var PORTAL = 'https://reo-portal.com/e/giris';
  var C = window.Capacitor || null;
  var NATIVE = !!(C && C.isNativePlatform && C.isNativePlatform());
  var PLATFORM = NATIVE ? C.getPlatform() : 'web';
  var P = function (ad) { return NATIVE ? eklenti(ad) : null; };
  var FM = P('FirebaseMessaging'), FS = P('Filesystem'), SH = P('Share'), BR = P('Browser'),
      APPP = P('App'), SB = P('StatusBar'), SP = P('SplashScreen');

  var f = document.getElementById('f'), yuk = document.getElementById('yuk'), yok = document.getElementById('yok');
  var KAYNAK = null, PUSH = '', yuklendi = false, izinSoruldu = false;

  function guvenli(o) { return /^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com$/.test(o) || o === 'https://reo-portal.com' || o === 'https://www.reo-portal.com'; }
  function gonder(ek) {
    if (!KAYNAK) return;
    var m = { reoApp: 1, platform: PLATFORM, push: PUSH };
    for (var k in ek) m[k] = ek[k];
    try { KAYNAK.postMessage(m, '*'); } catch (e) {}
  }

  /* ---- Açılış / bağlantı ---- */
  function ac() {
    yok.classList.add('gz');
    if (!navigator.onLine) { yuk.classList.add('gz'); yok.classList.remove('gz'); return; }
    yuk.classList.remove('gz'); yuklendi = false;
    f.classList.remove('on');
    f.src = PORTAL + (PORTAL.indexOf('?') < 0 ? '?' : '&') + 'app=' + PLATFORM;
    clearTimeout(window.__zt);
    window.__zt = setTimeout(function () {
      if (yuklendi) return;
      yuk.classList.add('gz'); yok.classList.remove('gz');
      yok.querySelector('b').textContent = navigator.onLine ? 'Portal açılamadı' : 'İnternet bağlantısı yok';
      yok.querySelector('p').textContent = navigator.onLine ? 'Sunucuya ulaşılamadı. Biraz sonra tekrar deneyin. (kod: Z15)' : 'Reo E-Portal\'ı kullanmak için internete bağlanın, sonra tekrar deneyin.';
    }, 15000);
  }
  f.addEventListener('load', function () {
    if (!f.src) return;
    yuklendi = true;
    setTimeout(function () { f.classList.add('on'); yuk.classList.add('gz'); }, 400);
  });
  document.getElementById('tekrar').onclick = ac;
  window.addEventListener('online', function () { if (!yuklendi) ac(); });

  /* ---- Bildirimler ---- */
  function tokenAl() {
    if (!FM) return Promise.resolve('');
    return FM.getToken().then(function (r) { PUSH = (r && r.token) || ''; return PUSH; }).catch(function () { return ''; });
  }
  function izinIste(zorla) {
    if (!FM) return Promise.resolve(false);
    return FM.checkPermissions().then(function (s) {
      if (s.receive === 'granted') return true;
      if (s.receive === 'denied' && !zorla) return false;
      if (s.receive === 'denied') { kart('Bildirimler kapalı', 'Açmak için telefonunuzun Ayarlar › Reo E-Portal › Bildirimler bölümüne gidin.'); return false; }
      return FM.requestPermissions().then(function (r) { return r.receive === 'granted'; });
    }).then(function (ok) {
      if (!ok) return false;
      return tokenAl().then(function (t) { if (t) gonder({}); return !!t; });
    }).catch(function () { return false; });
  }
  if (FM) {
    if (PLATFORM === 'android') FM.createChannel({ id: 'reo', name: 'Site duyuruları', description: 'Site yönetiminden gelen duyurular', importance: 4, visibility: 1 }).catch(function () {});
    FM.checkPermissions().then(function (s) { if (s.receive === 'granted') tokenAl().then(function () { gonder({}); }); }).catch(function () {});
    FM.addListener('tokenReceived', function (e) { PUSH = (e && e.token) || PUSH; gonder({}); });
    FM.addListener('notificationReceived', function (e) {
      var n = (e && e.notification) || {};
      if (PLATFORM === 'android') kart(n.title || 'Duyuru', n.body || '');
      gonder({ ac: 'yenile' });
    });
    FM.addListener('notificationActionPerformed', function () { gonder({ ac: 'yenile' }); });
  }

  /* ---- Uygulama içi kart (ön planda gelen bildirim / uyarı) ---- */
  var kz = null;
  function kart(b, m) {
    var el = document.getElementById('kart');
    el.innerHTML = '';
    var x = document.createElement('b'); x.textContent = b; el.appendChild(x);
    el.appendChild(document.createTextNode(m));
    el.style.display = 'block';
    clearTimeout(kz); kz = setTimeout(function () { el.style.display = 'none'; }, 6000);
    el.onclick = function () { el.style.display = 'none'; };
  }

  /* ---- Evrak paylaş / kaydet ---- */
  function paylas(ad, b64, tur) {
    if (!FS || !SH) return;
    var guvenliAd = String(ad || 'evrak').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || 'evrak';
    FS.writeFile({ path: guvenliAd, data: b64, directory: 'CACHE' })
      .then(function (r) { return SH.share({ title: guvenliAd, files: [r.uri], dialogTitle: 'Evrakı kaydet veya paylaş' }); })
      .catch(function (e) { if (!/cancel/i.test(String(e && e.message))) kart('Evrak paylaşılamadı', 'Lütfen tekrar deneyin.'); });
  }

  /* ---- Oturum kasası ----
   * Portal uygulamanın içinde başka bir sitenin çerçevesi olarak açıldığı için iOS onun depolamasını
   * uygulama kapanınca siler. "Beni hatırla" ile verilen oturum anahtarı bu yüzden uygulamanın kendi
   * kalıcı deposunda (Preferences, yoksa localStorage) tutulur ve açılışta portala geri verilir.
   *   portal → uygulama : {reoKasa:"al", k:"sk"} | {reoKasa:"yaz", k:"sk", tok:"<64 hex>"|""}
   *   uygulama → portal : {reoKasa:"cevap", tok:"...", app:true}
   */
  var PR = P('Preferences');
  function kasaAnahtar(k) { return k === 'sk' ? 'reo_sk_tok' : 'reo__tok'; }
  function kasaOku(ad) {
    var yerel = function () { try { return localStorage.getItem(ad) || ''; } catch (e) { return ''; } };
    if (!PR) return Promise.resolve(yerel());
    return PR.get({ key: ad }).then(function (r) { return (r && r.value) || yerel(); }).catch(yerel);
  }
  function kasaYaz(ad, t) {
    try { if (t) localStorage.setItem(ad, t); else localStorage.removeItem(ad); } catch (e) {}
    if (PR) { (t ? PR.set({ key: ad, value: t }) : PR.remove({ key: ad })).catch(function () {}); }
  }
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || !d.reoKasa || !/^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com$/.test(e.origin)) return;
    var ad = kasaAnahtar(d.k);
    if (d.reoKasa === 'al') {
      var kaynak = e.source, koken = e.origin;
      kasaOku(ad).then(function (t) { try { kaynak.postMessage({ reoKasa: 'cevap', tok: /^[a-f0-9]{64}$/.test(t) ? t : '', app: true }, koken); } catch (x) {} });
    } else if (d.reoKasa === 'yaz') {
      kasaYaz(ad, /^[a-f0-9]{64}$/.test(d.tok || '') ? d.tok : '');
    }
  });

  /* ---- Portaldan gelen mesajlar ---- */
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || !d.reoSk || !guvenli(e.origin)) return;
    KAYNAK = e.source;
    if (!yuklendi) { yuklendi = true; f.classList.add('on'); yuk.classList.add('gz'); yok.classList.add('gz'); }
    switch (d.tip) {
      case 'hazir': gonder({}); break;
      case 'giris':
        gonder({});
        if (!izinSoruldu) { izinSoruldu = true; setTimeout(function () { izinIste(false); }, 800); }
        break;
      case 'bildirimAyar': izinIste(true).then(function (ok) { if (ok) kart('Bildirimler açık', 'Site duyuruları bu telefona gelecek.'); }); break;
      case 'paylas': if (typeof d.b64 === 'string') paylas(d.ad, d.b64, d.t); break;
      case 'ac': if (BR && /^https:\/\//.test(d.url || '')) BR.open({ url: d.url }); break;
    }
  });

  /* ---- Dil (cihaz diline göre: Türkçe, English, Русский) ---- */
  var DIL = (function () { var l = String((navigator.languages && navigator.languages[0]) || navigator.language || 'tr').toLowerCase(); return /^ru/.test(l) ? 'ru' : /^tr/.test(l) ? 'tr' : 'en'; })();
  var MET = {
    tr: { atla: 'Atla', ileri: 'İleri', basla: 'Başla', cikB: 'Uygulamadan çıkılsın mı?', cikP: 'REO Sakin Portalı kapatılacak.', vaz: 'Vazgeç', cik: 'Çık',
      tur: [['REO Sakin Portalı\'na hoş geldiniz', 'Yaşadığınız sitenin aidat, ödeme ve duyurularını tek yerden, güvenle takip edin.'],
            ['Borcunuz ve ödemeleriniz', 'Güncel aidat borcunuzu, ödeme geçmişinizi ve hesap ekstrenizi görün; ekstreyi PDF olarak paylaşın.'],
            ['Duyurular ve bildirimler', 'Yönetim duyuruları, su ve elektrik kesintisi gibi bilgiler telefonunuza bildirim olarak gelir.'],
            ['Nasıl giriş yapılır?', 'Dairenize kayıtlı telefon numaranızla giriş yapın. İlk kez giriyorsanız “İlk kez giriyorum”a dokunup kendi şifrenizi belirleyin.']] },
    en: { atla: 'Skip', ileri: 'Next', basla: 'Get started', cikB: 'Exit the app?', cikP: 'REO Resident Portal will be closed.', vaz: 'Cancel', cik: 'Exit',
      tur: [['Welcome to REO Resident Portal', 'Follow the dues, payments and announcements of your residence securely in one place.'],
            ['Your balance and payments', 'See your current dues balance, payment history and account statement; share the statement as a PDF.'],
            ['Announcements and notifications', 'Management announcements and notices such as water or power outages arrive as notifications on your phone.'],
            ['How to sign in', 'Sign in with the phone number registered to your flat. If this is your first time, tap “First time here” and set your own password.']] },
    ru: { atla: 'Пропустить', ileri: 'Далее', basla: 'Начать', cikB: 'Выйти из приложения?', cikP: 'Портал жильца REO будет закрыт.', vaz: 'Отмена', cik: 'Выйти',
      tur: [['Добро пожаловать в портал жильца REO', 'Следите за взносами, платежами и объявлениями вашего комплекса в одном месте.'],
            ['Ваш долг и платежи', 'Смотрите текущую задолженность, историю платежей и выписку по счёту; делитесь выпиской в PDF.'],
            ['Объявления и уведомления', 'Объявления управления и сообщения об отключении воды или электричества приходят на телефон.'],
            ['Как войти', 'Войдите по номеру телефона, указанному для вашей квартиры. При первом входе нажмите «Впервые здесь» и задайте пароль.']] }
  }[DIL];
  var IKON = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/><path d="M9.5 10.5l2 2 3.5-3.5"/></svg>'];

  /* ---- Tanıtım turu: yalnızca ilk açılışta ---- */
  var tur = document.getElementById('tur'), turI = 0;
  function turGoster() {
    var t = MET.tur[turI];
    document.getElementById('turSl').innerHTML = '<div class="ik">' + IKON[turI] + '</div><h2></h2><p></p>';
    var sl = document.getElementById('turSl'); sl.querySelector('h2').textContent = t[0]; sl.querySelector('p').textContent = t[1];
    document.getElementById('turNk').innerHTML = MET.tur.map(function (x, i) { return '<i' + (i === turI ? ' class="on"' : '') + '></i>'; }).join('');
    document.getElementById('turIleri').textContent = turI === MET.tur.length - 1 ? MET.basla : MET.ileri;
    document.getElementById('turAtla').style.visibility = turI === MET.tur.length - 1 ? 'hidden' : 'visible';
  }
  function turBitir() { tur.classList.add('gz'); try { localStorage.setItem('reo_tur_v1', '1'); } catch (e) {} }
  function turAcikMi() { return !tur.classList.contains('gz'); }
  document.getElementById('turAtla').textContent = MET.atla;
  document.getElementById('turAtla').addEventListener('click', turBitir);
  document.getElementById('turIleri').addEventListener('click', function () { if (turI < MET.tur.length - 1) { turI++; turGoster(); } else turBitir(); });
  (function () { var x = 0; tur.addEventListener('touchstart', function (e) { x = e.touches[0].clientX; }, { passive: true });
    tur.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - x; if (Math.abs(dx) < 50) return; if (dx < 0 && turI < MET.tur.length - 1) turI++; else if (dx > 0 && turI > 0) turI--; else return; turGoster(); }, { passive: true }); })();
  var turGoruldu = false; try { turGoruldu = localStorage.getItem('reo_tur_v1') === '1'; } catch (e) {}
  if (NATIVE && !turGoruldu) { turGoster(); tur.classList.remove('gz'); }

  /* ---- Çıkış onayı (Android geri tuşu) ---- */
  var cik = document.getElementById('cik');
  document.getElementById('cikB').textContent = MET.cikB; document.getElementById('cikP').textContent = MET.cikP;
  document.getElementById('cikV').textContent = MET.vaz; document.getElementById('cikE').textContent = MET.cik;
  function cikKapat() { cik.classList.add('gz'); }
  document.getElementById('cikV').addEventListener('click', cikKapat);
  cik.addEventListener('click', function (e) { if (e.target === cik) cikKapat(); });
  document.getElementById('cikE').addEventListener('click', function () { cikKapat(); if (APPP && APPP.exitApp) APPP.exitApp(); else if (APPP) APPP.minimizeApp(); });

  /* ---- Yerel ayarlar ---- */
  if (SB) { SB.setStyle({ style: 'DARK' }).catch(function () {}); if (PLATFORM === 'android') SB.setBackgroundColor({ color: '#0b3b60' }).catch(function () {}); }
  if (APPP) {
    APPP.addListener('backButton', function () {
      if (turAcikMi()) { if (turI > 0) { turI--; turGoster(); } else turBitir(); return; }
      if (!cik.classList.contains('gz')) { cikKapat(); return; }
      cik.classList.remove('gz');
    });
    APPP.addListener('resume', function () { if (!yuklendi) ac(); else gonder({}); });
  }
  if (SP) setTimeout(function () { SP.hide().catch(function () {}); }, 300);

  ac();
  }
})();
