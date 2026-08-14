package com.coolblue.secondchance;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Compare les prix des favoris aux dernieres donnees enregistrees et notifie les baisses. */
public class PriceCheckWorker extends Worker {

    private static final String CHANNEL_ID = "price_drops";

    public PriceCheckWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        try {
            File dataFile = new File(ctx.getFilesDir(), "data.json");
            File watchFile = new File(ctx.getFilesDir(), "watchlist.json");
            if (!dataFile.exists() || !watchFile.exists()) {
                return Result.success();
            }
            JSONObject data = new JSONObject(read(dataFile));
            JSONArray products = data.getJSONArray("products");

            Map<String, JSONObject> byId = new HashMap<>();
            for (int i = 0; i < products.length(); i++) {
                JSONObject p = products.getJSONObject(i);
                byId.put(p.optString("id"), p);
            }

            JSONArray watch = new JSONArray(read(watchFile));
            JSONArray updated = new JSONArray();
            List<String> drops = new ArrayList<>();
            for (int i = 0; i < watch.length(); i++) {
                JSONObject w = watch.getJSONObject(i);
                String id = w.optString("id");
                JSONObject p = byId.get(id);
                double current = -1;
                if (p != null) current = p.optDouble("secondChancePrice", -1);
                double last = w.optDouble("price", -1);
                if (current > 0 && last > 0 && current < last - 0.01) {
                    drops.add(String.format(Locale.FRANCE,
                            "%s : %.2f € (au lieu de %.2f €)",
                            w.optString("name", "Produit"), current, last));
                }
                w.put("price", current > 0 ? current : last);
                updated.put(w);
            }
            write(watchFile, updated.toString());

            if (!drops.isEmpty()) {
                notifyPriceDrops(drops);
            }
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    private void notifyPriceDrops(List<String> drops) {
        Context ctx = getApplicationContext();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Baisses de prix", NotificationManager.IMPORTANCE_DEFAULT);
            nm.createNotificationChannel(channel);
        }

        int max = Math.min(drops.size(), 4);
        String title = drops.size() + " favori" + (drops.size() > 1 ? "s" : "") + " en baisse de prix 📉";
        StringBuilder body = new StringBuilder();
        for (int i = 0; i < max; i++) {
            if (i > 0) body.append("\n");
            body.append("• ").append(drops.get(i));
        }
        if (drops.size() > max) {
            body.append("\n… et ").append(drops.size() - max).append(" autre(s).");
        }

        Notification notif;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notif = new Notification.Builder(ctx, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.stat_notify_more)
                    .setContentTitle(title)
                    .setContentText(body.toString())
                    .setStyle(new Notification.BigTextStyle().bigText(body.toString()))
                    .setAutoCancel(true)
                    .build();
        } else {
            @SuppressWarnings("deprecation")
            Notification.Builder b = new Notification.Builder(ctx)
                    .setSmallIcon(android.R.drawable.stat_notify_more)
                    .setContentTitle(title)
                    .setContentText(body.toString())
                    .setAutoCancel(true);
            notif = b.build();
        }
        try {
            nm.notify(1001, notif);
        } catch (SecurityException ignored) {
            // permission POST_NOTIFICATIONS refusée
        }
    }

    private static String read(File f) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) sb.append(line).append('\n');
        }
        return sb.toString();
    }

    private static void write(File f, String content) throws Exception {
        try (FileWriter fw = new FileWriter(f, StandardCharsets.UTF_8)) {
            fw.write(content);
        }
    }
}
