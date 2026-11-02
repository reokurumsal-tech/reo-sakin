/* Reo Yönetim – uygulama kabuğu
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
  var PORTAL = 'https://reo-portal.com/';
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
    // Portal, Safari'de ana ekrana eklenmiş gibi doğrudan ana pencerede açılır (iç içe çerçeve yok).
    // contentInset "always" sayesinde sayfa saat/şarj çubuğunun altından başlar.
    try { location.replace(PORTAL); return; } catch (e) {}
    f.src = PORTAL;
    clearTimeout(window.__zt);
    window.__zt = setTimeout(function () {
      if (yuklendi) return;
      yuk.classList.add('gz'); yok.classList.remove('gz');
      yok.querySelector('b').textContent = navigator.onLine ? 'Portal açılamadı' : 'İnternet bağlantısı yok';
      yok.querySelector('p').textContent = navigator.onLine ? 'Sunucuya ulaşılamadı. Biraz sonra tekrar deneyin. (kod: Z15)' : 'Reo Yönetim\'ı kullanmak için internete bağlanın, sonra tekrar deneyin.';
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
      if (s.receive === 'denied') { kart('Bildirimler kapalı', 'Açmak için telefonunuzun Ayarlar › Reo Yönetim › Bildirimler bölümüne gidin.'); return false; }
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

  /* ---- Portaldan gelen mesajlar ---- */
  // Portal "reo-ust0" gönderdiğinde (modül açıldı / klavye kapandı) aradaki reo-portal.com çerçevesini üste hizala
  function ustHizala() {
    try { window.scrollTo(0, 0); } catch (x) {}
    try { f.contentWindow.postMessage('reo-ust0', '*'); } catch (x) {}
  }
  window.addEventListener('message', function (e) {
    if (e.data === 'reo-ust0') { ustHizala(); setTimeout(ustHizala, 250); setTimeout(ustHizala, 800); return; }
  });
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

  /* ---- Yerel ayarlar ---- */
  if (SB) { SB.setStyle({ style: 'DARK' }).catch(function () {}); if (PLATFORM === 'android') SB.setBackgroundColor({ color: '#0b3b60' }).catch(function () {}); }
  if (APPP) {
    APPP.addListener('backButton', function () { APPP.minimizeApp(); });
    APPP.addListener('resume', function () { if (!yuklendi) ac(); else gonder({}); });
  }
  if (SP) setTimeout(function () { SP.hide().catch(function () {}); }, 300);

  // Pencere hiçbir zaman kaymasın (iOS bazen odaklanınca tüm görünümü kaydırıyor → üstte/altta mavi boşluk)
  function sabitle() { if (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } }
  window.addEventListener('scroll', sabitle, { passive: true });
  if (window.visualViewport) visualViewport.addEventListener('resize', function () { setTimeout(sabitle, 120); });
  ac();
  }
})();
