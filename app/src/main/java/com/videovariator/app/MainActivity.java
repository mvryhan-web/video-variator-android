package com.videovariator.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.documentfile.provider.DocumentFile;

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int FOLDER_CHOOSER_REQUEST = 1002;
    private static final int PLAY_UPDATE_REQUEST = 1003;
    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private AppUpdateManager appUpdateManager;
    private String trustedWebOrigin = "";

    private final InstallStateUpdatedListener updateListener = state -> {
        if (state.installStatus() == InstallStatus.DOWNLOADED && appUpdateManager != null) {
            runOnUiThread(() -> {
                Toast.makeText(this, "Video Variator update downloaded. Applying update…", Toast.LENGTH_SHORT).show();
                appUpdateManager.completeUpdate();
            });
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = filePathCallback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("video/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                startActivityForResult(Intent.createChooser(intent, "Choose videos"), FILE_CHOOSER_REQUEST);
                return true;
            }
        });

        String remote = BuildConfig.WEB_APP_URL == null ? "" : BuildConfig.WEB_APP_URL.trim();
        if (remote.startsWith("https://")) {
            Uri uri = Uri.parse(remote);
            trustedWebOrigin = uri.getScheme() + "://" + uri.getAuthority();
            webView.loadUrl(remote);
        } else {
            trustedWebOrigin = "file://";
            webView.loadUrl("file:///android_asset/index.html");
        }

        appUpdateManager = AppUpdateManagerFactory.create(this);
        appUpdateManager.registerListener(updateListener);
        checkForPlayUpdate(false);
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        if ("file".equals(scheme) && trustedWebOrigin.startsWith("file://")) return false;
        if (("https".equals(scheme) || "http".equals(scheme)) && !trustedWebOrigin.isEmpty()) {
            String origin = scheme + "://" + uri.getAuthority();
            if (origin.equalsIgnoreCase(trustedWebOrigin)) return false;
        }
        if ("https".equals(scheme)) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
            return true;
        }
        return true;
    }

    private void checkForPlayUpdate(boolean userInitiated) {
        if (appUpdateManager == null) return;
        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                try { appUpdateManager.startUpdateFlowForResult(info, AppUpdateType.FLEXIBLE, this, PLAY_UPDATE_REQUEST); }
                catch (Exception e) { if (userInitiated) Toast.makeText(this, "Could not start the update.", Toast.LENGTH_SHORT).show(); }
            } else if (info.installStatus() == InstallStatus.DOWNLOADED) {
                appUpdateManager.completeUpdate();
            } else if (userInitiated) {
                Toast.makeText(this, "No Google Play update is available.", Toast.LENGTH_SHORT).show();
            }
        }).addOnFailureListener(e -> {
            if (userInitiated) Toast.makeText(this, "Update check is unavailable for this installation.", Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (appUpdateManager != null) appUpdateManager.getAppUpdateInfo().addOnSuccessListener((AppUpdateInfo info) -> {
            if (info.installStatus() == InstallStatus.DOWNLOADED) appUpdateManager.completeUpdate();
        });
    }

    @Override
    protected void onDestroy() {
        if (appUpdateManager != null) appUpdateManager.unregisterListener(updateListener);
        if (webView != null) { webView.removeJavascriptInterface("AndroidBridge"); webView.destroy(); }
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PLAY_UPDATE_REQUEST) return;
        if (requestCode == FOLDER_CHOOSER_REQUEST) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                Uri treeUri = data.getData();
                try { int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); getContentResolver().takePersistableUriPermission(treeUri, flags); } catch (Exception ignored) {}
                importFolder(treeUri);
            }
            return;
        }
        if (requestCode != FILE_CHOOSER_REQUEST || fileChooserCallback == null) return;
        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount(); results = new Uri[count];
                for (int i = 0; i < count; i++) results[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) results = new Uri[]{data.getData()};
        }
        fileChooserCallback.onReceiveValue(results); fileChooserCallback = null;
    }

    private void importFolder(Uri treeUri) {
        Toast.makeText(this, "Reading videos from folder…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            try {
                DocumentFile root = DocumentFile.fromTreeUri(this, treeUri); if (root == null) throw new Exception("Could not open folder");
                File batchDir = new File(getCacheDir(), "folder_" + System.currentTimeMillis()); if (!batchDir.mkdirs() && !batchDir.isDirectory()) throw new Exception("Could not create temporary folder");
                JSONArray items = new JSONArray(); int[] counter = new int[]{0}; collectVideos(root, batchDir, items, counter); final String json = items.toString();
                runOnUiThread(() -> { webView.evaluateJavascript("window.receiveNativeFolderFiles(" + json + ")", null); Toast.makeText(this, items.length() + " video(s) found", Toast.LENGTH_SHORT).show(); });
            } catch (Exception e) { runOnUiThread(() -> Toast.makeText(this, "Folder error: " + e.getMessage(), Toast.LENGTH_LONG).show()); }
        }).start();
    }

    private void collectVideos(DocumentFile node, File outDir, JSONArray items, int[] counter) throws Exception {
        if (node.isDirectory()) { for (DocumentFile child : node.listFiles()) collectVideos(child, outDir, items, counter); return; }
        if (!node.isFile()) return;
        String name = node.getName() == null ? "video.mp4" : node.getName(), type = node.getType() == null ? "" : node.getType();
        boolean video = type.startsWith("video/") || name.matches("(?i).+\\.(mp4|mov|m4v|webm|mkv|avi)$"); if (!video) return;
        String safe = name.replaceAll("[^a-zA-Z0-9._-]", "_"); File target = new File(outDir, String.format("%04d_%s", counter[0]++, safe));
        try (InputStream in = getContentResolver().openInputStream(node.getUri()); OutputStream out = new FileOutputStream(target)) { if (in == null) return; byte[] buffer = new byte[1024 * 1024]; int read; while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read); }
        JSONObject item = new JSONObject(); item.put("name", name); item.put("url", Uri.fromFile(target).toString()); item.put("type", type.isEmpty() ? "video/mp4" : type); item.put("size", target.length()); items.put(item);
    }

    @Override
    public void onBackPressed() { if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }

    private class AndroidBridge {
        private OutputStream outputStream; private Uri pendingUri; private File legacyFile;
        @JavascriptInterface public void toast(final String message) { runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show()); }
        @JavascriptInterface public void checkForUpdate() { runOnUiThread(() -> checkForPlayUpdate(true)); }
        @JavascriptInterface public void pickFolder() { runOnUiThread(() -> { Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE); intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION); startActivityForResult(Intent.createChooser(intent, "Choose a video folder"), FOLDER_CHOOSER_REQUEST); }); }
        @JavascriptInterface public synchronized boolean startFile(String fileName) {
            try {
                closeCurrent(false); String safeName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_"); if (!safeName.toLowerCase().endsWith(".mp4")) safeName += ".mp4";
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues(); values.put(MediaStore.Video.Media.DISPLAY_NAME, safeName); values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4"); values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/VideoVariator"); values.put(MediaStore.Video.Media.IS_PENDING, 1); pendingUri = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values); if (pendingUri == null) return false; outputStream = getContentResolver().openOutputStream(pendingUri, "w");
                } else { File dir = new File(getExternalFilesDir(Environment.DIRECTORY_MOVIES), "VideoVariator"); if (!dir.exists() && !dir.mkdirs()) return false; legacyFile = new File(dir, safeName); outputStream = new FileOutputStream(legacyFile, false); }
                return outputStream != null;
            } catch (Exception e) { closeCurrent(false); return false; }
        }
        @JavascriptInterface public synchronized boolean appendChunk(String base64Chunk) { try { if (outputStream == null) return false; outputStream.write(Base64.decode(base64Chunk, Base64.DEFAULT)); return true; } catch (Exception e) { return false; } }
        @JavascriptInterface public synchronized String finishFile() {
            try {
                if (outputStream != null) { outputStream.flush(); outputStream.close(); outputStream = null; }
                String result;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pendingUri != null) { ContentValues values = new ContentValues(); values.put(MediaStore.Video.Media.IS_PENDING, 0); getContentResolver().update(pendingUri, values, null, null); result = "Downloads/VideoVariator"; pendingUri = null; }
                else if (legacyFile != null) { result = legacyFile.getAbsolutePath(); legacyFile = null; } else result = "saved";
                final String message = "Saved: " + result; runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show()); return result;
            } catch (Exception e) { closeCurrent(false); return "error"; }
        }
        private synchronized void closeCurrent(boolean publish) { try { if (outputStream != null) outputStream.close(); } catch (Exception ignored) {} outputStream = null; if (!publish && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pendingUri != null) { try { getContentResolver().delete(pendingUri, null, null); } catch (Exception ignored) {} } pendingUri = null; legacyFile = null; }
    }
}
