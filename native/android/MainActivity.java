package com.reotesis.sakin;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Portal Google Apps Script üzerinde çalışır (iç çerçeve); çerezlere izin ver
        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(this.bridge.getWebView(), true);
    }
}
