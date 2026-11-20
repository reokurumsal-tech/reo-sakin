#!/bin/bash
# REO Portal – PayTR kartla ödeme köprüsü (Caddy). Sunucuda: sudo bash paytr-caddy-kur.sh
#  /ip              : sakinin IP adresi (PayTR user_ip için)
#  /paytr/bildirim  : PayTR ödeme bildirimi → Apps Script doPost (Google yönlendirmesi "OK" cevabına çevrilir)
#  /odeme-sonuc.html: PayTR ödeme sonrası dönüş sayfası (sakin portalına haber verir)
set -u
EXEC_ID="${1:-AKfycbx88E8xU_YinGsI2sjn9xNwFjG6bujnV9qcGDgYWkUySPOCIIUxZmBHSW7huskapTRM}"
C=/etc/caddy/Caddyfile
WWW=/var/www/reo
echo "== REO PayTR köprüsü (Caddy) =="
[ -f "$C" ] || { echo "!! $C bulunamadı"; exit 1; }
mkdir -p "$WWW"
cat > "$WWW/odeme-sonuc.html" <<'HTML'
<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Ödeme</title>
<style>body{margin:0;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#0f172a;text-align:center;padding:24px;box-sizing:border-box}</style></head>
<body><div><div style="font-size:42px">⏳</div><p>Ödeme sonucu alınıyor…</p></div>
<script>var d=/[?&]d=ok/.test(location.search)?"ok":"hata";try{window.parent.postMessage({reoPos:d},"*")}catch(e){}</script></body></html>
HTML
echo "odeme-sonuc.html yazıldı."
if grep -q "handle /paytr/bildirim" "$C"; then echo "/paytr ve /ip zaten tanımlı."; else
  Y="$C.yedek-paytr-$(date +%Y%m%d%H%M)"; cp "$C" "$Y"; echo "Yedek: $Y"
  python3 - "$C" "$EXEC_ID" <<'PY' || { echo "!! Ekleme yapılamadı, dosyaya dokunulmadı."; exit 2; }
import re,sys
f,eid=sys.argv[1],sys.argv[2]; s=open(f).read()
if not re.match(r'^[A-Za-z0-9_-]{20,120}$',eid): print("!! Geçersiz Apps Script dağıtım kimliği"); sys.exit(2)
h=re.search(r'^([ \t]*)handle[ \t]*\{',s,re.M)
if not h: print("!! varsayılan handle bloğu bulunamadı"); sys.exit(2)
t=h.group(1)
blok=(t+'handle /ip {\n'+
 t+'\theader Access-Control-Allow-Origin "*"\n'+
 t+'\theader Cache-Control "no-store"\n'+
 t+'\trespond "{remote_host}" 200\n'+
 t+'}\n'+
 t+'handle /paytr/bildirim {\n'+
 t+'\trewrite * /macros/s/'+eid+'/exec\n'+
 t+'\treverse_proxy https://script.google.com {\n'+
 t+'\t\theader_up Host script.google.com\n'+
 t+'\t\theader_up -X-Forwarded-For\n'+
 t+'\t\theader_up -X-Forwarded-Host\n'+
 t+'\t\theader_up -X-Forwarded-Proto\n'+
 t+'\t\theader_up -X-Real-IP\n'+
 t+'\t\t@yonlendi status 3xx\n'+
 t+'\t\thandle_response @yonlendi {\n'+
 t+'\t\t\trespond "OK" 200\n'+
 t+'\t\t}\n'+
 t+'\t}\n'+
 t+'}\n')
s=s[:h.start()]+blok+s[h.start():]
open(f,'w').write(s); print("/ip ve /paytr/bildirim blokları eklendi.")
PY
  if caddy validate --config "$C" --adapter caddyfile >/tmp/cv.log 2>&1; then systemctl reload caddy && echo "Caddy yeniden yüklendi."
  else echo "!! Caddy ayarı geçersiz, yedeğe dönülüyor:"; tail -5 /tmp/cv.log; cp "$Y" "$C"; exit 3; fi
fi
sleep 2
echo "IP testi (bilgisayarınızın değil sunucunun IP'si görünür, normal): $(curl -s https://reo-portal.com/ip)"
echo "Dönüş sayfası: $(curl -s -o /dev/null -w '%{http_code}' https://reo-portal.com/odeme-sonuc.html) (200 beklenir)"
echo "Bildirim testi (OK beklenir): $(curl -s -X POST -d 'merchant_oid=TEST&status=failed&total_amount=0&hash=deneme' https://reo-portal.com/paytr/bildirim)"
echo "Bitti. PayTR panelinde Bildirim URL: https://reo-portal.com/paytr/bildirim"
