#!/bin/bash
# REO Portal – PayTR ödeme sayfası www.reo-portal.com üzerinden (PayTR API bilgileri yalnızca bu alan adı için tanımlı)
#  /odeme.html : PayTR güvenli ödeme çerçevesini www.reo-portal.com içinde açar, sonucu sakin portalına iletir
set -u
C=/etc/caddy/Caddyfile
WWW=/var/www/reo
echo "== REO PayTR www kurulumu =="
[ -f "$C" ] || { echo "!! $C bulunamadı"; exit 1; }
mkdir -p "$WWW"
cat > "$WWW/odeme.html" <<'HTML'
<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Güvenli ödeme</title>
<style>html,body{margin:0;height:100%;background:#fff}iframe{border:0;width:100%;height:100%;display:block}p{font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:40px 20px;color:#475569}</style></head>
<body><script>
var t=(location.hash||"").slice(1);
if(!/^[A-Za-z0-9]{10,200}$/.test(t)){document.body.innerHTML="<p>Ödeme bilgisi geçersiz.</p>"}
else{var f=document.createElement("iframe");f.src="https://www.paytr.com/odeme/guvenli/"+t;f.allow="payment";f.title="PayTR";document.body.appendChild(f);history.replaceState(null,"",location.pathname)}
window.addEventListener("message",function(e){var d=e.data;if(d&&typeof d==="object"&&d.reoPos&&e.origin===location.origin){try{window.parent.postMessage({reoPos:d.reoPos==="ok"?"ok":"hata"},"*")}catch(x){}}});
</script></body></html>
HTML
echo "odeme.html yazıldı."
if grep -qE '^[^#]*www\.reo-portal\.com' "$C"; then echo "www.reo-portal.com zaten tanımlı."; else
  Y="$C.yedek-www-$(date +%Y%m%d%H%M)"; cp "$C" "$Y"; echo "Yedek: $Y"
  python3 - "$C" <<'PY' || { echo "!! Ekleme yapılamadı, dosyaya dokunulmadı."; exit 2; }
import re,sys
f=sys.argv[1]; s=open(f).read()
m=re.search(r'^([ \t]*)(https?://)?reo-portal\.com([ \t]*(,[^{\n]*)?)\{',s,re.M)
if not m: print("!! reo-portal.com site bloğu bulunamadı"); sys.exit(2)
yeni=m.group(1)+(m.group(2) or '')+'reo-portal.com, www.reo-portal.com'+(m.group(3) or ' ')+'{'
s=s[:m.start()]+yeni+s[m.end():]
open(f,'w').write(s); print("www.reo-portal.com eklendi.")
PY
  if caddy validate --config "$C" --adapter caddyfile >/tmp/cv.log 2>&1; then systemctl reload caddy && echo "Caddy yeniden yüklendi."
  else echo "!! Caddy ayarı geçersiz, yedeğe dönülüyor:"; tail -5 /tmp/cv.log; cp "$Y" "$C"; exit 3; fi
fi
echo "DNS www.reo-portal.com -> $(getent hosts www.reo-portal.com | awk '{print $1}' | head -1)   (sunucu: $(curl -s https://reo-portal.com/ip))"
sleep 8
echo "Ödeme sayfası (200 beklenir): $(curl -s -o /dev/null -w '%{http_code}' https://www.reo-portal.com/odeme.html)"
echo "Dönüş sayfası (200 beklenir): $(curl -s -o /dev/null -w '%{http_code}' https://www.reo-portal.com/odeme-sonuc.html)"
echo "Bildirim testi (OK beklenir): $(curl -s -X POST -d 'merchant_oid=TEST&status=failed&total_amount=0&hash=deneme' https://www.reo-portal.com/paytr/bildirim)"
echo "Bitti. PayTR panelinde Bildirim URL: https://www.reo-portal.com/paytr/bildirim"
