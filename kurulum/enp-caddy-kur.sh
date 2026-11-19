#!/bin/bash
# REO Portal – Enpara köprüsü (/enp) – Caddy için. Sunucuda: sudo bash enp-caddy-kur.sh
set -u
C=/etc/caddy/Caddyfile
echo "== REO Enpara köprüsü (Caddy) =="
if grep -q "handle_path /enp/" "$C"; then echo "/enp zaten tanımlı."; else
  Y="$C.yedek-enpara-$(date +%Y%m%d%H%M)"; cp "$C" "$Y"; echo "Yedek: $Y"
  python3 - "$C" <<'PY' || { echo "!! Ekleme yapılamadı, dosyaya dokunulmadı."; exit 2; }
import re,sys
f=sys.argv[1]; s=open(f).read()
m=re.search(r'handle_path /ngv/\*\s*\{.*?not header X-Reo-Anahtar "([^"]+)"',s,re.S)
if not m: print("!! /ngv anahtarı bulunamadı"); sys.exit(2)
k=m.group(1)
h=re.search(r'^([ \t]*)handle[ \t]*\{',s,re.M)
if not h: print("!! varsayılan handle bloğu bulunamadı"); sys.exit(2)
t=h.group(1)
blok=(t+'handle_path /enp/* {\n'+
 t+'\t@yetkisiz not header X-Reo-Anahtar "'+k+'"\n'+
 t+'\trespond @yetkisiz "kopru anahtari gecersiz" 403\n'+
 t+'\trewrite * /v1{uri}\n'+
 t+'\treverse_proxy https://api.enpara.com {\n'+
 t+'\t\theader_up Host api.enpara.com\n'+
 t+'\t\theader_up -X-Reo-Anahtar\n'+
 t+'\t\theader_up -X-Forwarded-For\n'+
 t+'\t\theader_up -X-Forwarded-Host\n'+
 t+'\t\theader_up -X-Forwarded-Proto\n'+
 t+'\t\theader_up -X-Real-IP\n'+
 t+'\t}\n'+t+'}\n')
s=s[:h.start()]+blok+s[h.start():]
open(f,'w').write(s); print("/enp bloğu eklendi.")
PY
  if caddy validate --config "$C" --adapter caddyfile >/tmp/cv.log 2>&1; then systemctl reload caddy && echo "Caddy yeniden yüklendi."
  else echo "!! Caddy ayarı geçersiz, yedeğe dönülüyor:"; tail -5 /tmp/cv.log; cp "$Y" "$C"; exit 3; fi
fi
sleep 2
K=$(grep -A2 "handle_path /enp/" "$C" | sed -n 's/.*X-Reo-Anahtar "\([^"]*\)".*/\1/p' | head -1)
echo "Sunucunun çıkış IP'si: $(curl -s https://api.ipify.org)"
echo "Anahtarsız test (403 beklenir): $(curl -s -o /dev/null -w '%{http_code}' https://reo-portal.com/enp/accounts)"
R=$(curl -s -w ' [%{http_code}]' -H "X-Reo-Anahtar: $K" https://reo-portal.com/enp/accounts | head -c 300)
echo "Enpara cevabı (token gönderilmedi; 401/400 beklenir, 'Your IP' YAZMAMALI): $R"
echo "Bitti. Şimdi Apps Script'te bankaKopruKur işlevini çalıştırın."
