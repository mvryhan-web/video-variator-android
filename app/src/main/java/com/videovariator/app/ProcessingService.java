package com.videovariator.app;

import android.app.*;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.*;

/** Keeps the local WebView/WASM job eligible to run when the user presses Home.
 * This does not restart a killed renderer or survive force-stop. Completed files
 * are checkpointed separately by the page before the next variation starts. */
public class ProcessingService extends Service {
    static final String STOP = "com.videovariator.app.STOP_PROCESSING";
    static final String CANCEL = "com.videovariator.app.CANCEL_PROCESSING";
    static volatile boolean active = false;
    private static final String CHANNEL = "local-video-processing";
    private static final int ID = 41;
    private PowerManager.WakeLock wake;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable timeout = this::cancel;

    @Override public void onCreate() {
        super.onCreate();
        getSystemService(NotificationManager.class).createNotificationChannel(
            new NotificationChannel(CHANNEL, "Video processing", NotificationManager.IMPORTANCE_LOW));
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && CANCEL.equals(intent.getAction())) { cancel(); return START_NOT_STICKY; }
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, ProcessingService.class)
            .setAction(CANCEL), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_processing).setContentTitle("Video Uniquifier")
            .setContentText("Processing on this device · Tap to view progress")
            .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true)
            .addAction(new Notification.Action.Builder(null, "Cancel", stop).build()).build();
        if (Build.VERSION.SDK_INT >= 35) startForeground(ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROCESSING);
        else if (Build.VERSION.SDK_INT >= 29) startForeground(ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        else startForeground(ID, notification);
        if (!active) {
            wake = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VideoUniquifier:Processing");
            wake.acquire(5 * 60 * 60 * 1000L);
            handler.postDelayed(timeout, 5 * 60 * 60 * 1000L);
        }
        active = true;
        return START_NOT_STICKY;
    }
    private void cancel() {
        sendBroadcast(new Intent(STOP).setPackage(getPackageName()));
        stopSelf();
    }
    @Override public void onTimeout(int startId, int fgsType) { cancel(); }
    @Override public void onTaskRemoved(Intent rootIntent) { cancel(); }
    @Override public void onDestroy() {
        active = false;handler.removeCallbacks(timeout);
        if (wake != null && wake.isHeld()) wake.release();
        stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
