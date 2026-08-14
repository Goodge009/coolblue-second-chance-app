package com.coolblue.secondchance;

import android.app.Activity;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Pont JavaScript -> natif : permet au scraper JS d'utiliser le reseau Android
 *  (pas de limite CORS) et d'enregistrer les donnees hors ligne. */
public class ScraperBridge {

    private final Activity activity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public ScraperBridge(Activity activity) {
        this.activity = activity;
    }

    /** Recupere une page Coolblue, la stocke dans un fichier temporaire et
     *  notifie JS avec l'URL locale (appassets.androidplatform.net/html/...). */
    @JavascriptInterface
    public void fetchPage(final String url, final int callbackId) {
        new Thread(() -> {
            String html = httpGet(url);
            if (html == null) {
                postResult(callbackId, null);
                return;
            }
            File dir = new File(activity.getFilesDir(), "html");
            if (!dir.exists() && !dir.mkdirs()) {
                postResult(callbackId, null);
                return;
            }
            File out = new File(dir, "page_" + callbackId + ".html");
            try {
                try (FileWriter fw = new FileWriter(out, StandardCharsets.UTF_8)) {
                    fw.write(html);
                }
                postResult(callbackId,
                        "https://appassets.androidplatform.net/html/page_" + callbackId + ".html");
            } catch (Exception e) {
                postResult(callbackId, null);
            }
        }).start();
    }

    /** Enregistre le JSON scrape hors ligne (internal storage). */
    @JavascriptInterface
    public void saveJson(final String json) {
        new Thread(() -> {
            try {
                File out = new File(activity.getFilesDir(), "data.json");
                try (FileWriter fw = new FileWriter(out, StandardCharsets.UTF_8)) {
                    fw.write(json);
                }
            } catch (Exception ignored) {
            }
        }).start();
    }

    /** Renvoie le JSON enregistre (ou null si aucun). */
    @JavascriptInterface
    public String loadJson() {
        File in = new File(activity.getFilesDir(), "data.json");
        if (!in.exists()) return null;
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(new FileInputStream(in), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) sb.append(line).append('\n');
        } catch (Exception e) {
            return null;
        }
        return sb.toString();
    }

    /** Enregistre la liste de suivi des prix (favoris) pour le worker de notifications. */
    @JavascriptInterface
    public void saveWatchlist(final String json) {
        new Thread(() -> {
            try {
                File out = new File(activity.getFilesDir(), "watchlist.json");
                try (FileWriter fw = new FileWriter(out, StandardCharsets.UTF_8)) {
                    fw.write(json);
                }
            } catch (Exception ignored) {
            }
        }).start();
    }

    /** Renvoie le JSON de la liste de suivi (ou null si aucun). */
    @JavascriptInterface
    public String loadWatchlist() {
        File in = new File(activity.getFilesDir(), "watchlist.json");
        if (!in.exists()) return null;
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(new FileInputStream(in), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) sb.append(line).append('\n');
        } catch (Exception e) {
            return null;
        }
        return sb.toString();
    }

    /** Ouvre le volet de partage natif Android. */
    @JavascriptInterface
    public void shareText(final String subject, final String text) {
        mainHandler.post(() -> {
            try {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_SUBJECT, subject);
                send.putExtra(Intent.EXTRA_TEXT, text);
                activity.startActivity(Intent.createChooser(send, "Partager via…"));
            } catch (Exception ignored) {
            }
        });
    }

    private void postResult(final int callbackId, final String fileUrl) {
        mainHandler.post(() -> {
            WebView wv = activity.findViewById(R.id.webView);
            if (wv == null) return;
            String url = fileUrl == null ? "null" : "'" + fileUrl + "'";
            wv.evaluateJavascript(
                    "window.__cbFetchResponse(" + callbackId + ", " + url + ");", null);
        });
    }

    private String httpGet(String urlStr) {
        for (int attempt = 0; attempt < 4; attempt++) {
            try {
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("User-Agent",
                        "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 "
                                + "(KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36");
                conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
                conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,*/*;q=0.8");
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                conn.setInstanceFollowRedirects(true);
                int code = conn.getResponseCode();
                if (code == 200) {
                    StringBuilder sb = new StringBuilder();
                    try (BufferedReader br = new BufferedReader(
                            new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = br.readLine()) != null) sb.append(line).append('\n');
                    }
                    return sb.toString();
                }
                if (code == 503 || code == 429) {
                    Thread.sleep(4000 + attempt * 4000L);
                    continue;
                }
                return null;
            } catch (Exception e) {
                try {
                    Thread.sleep(3000 + attempt * 3000L);
                } catch (InterruptedException ignored) {
                }
            }
        }
        return null;
    }
}
