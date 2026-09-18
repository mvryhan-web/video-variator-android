package com.videovariator.app;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
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

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int PLAY_UPDATE_REQUEST = 1003;
    private static final int STORAGE_PERMISSION_REQUEST = 1004;
    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private AppUpdateManager appUpdateManager;
    private String trustedWebOrigin = "";
    private String pendingAuthToken = "";

    private final InstallStateUpdatedListener updateListener = state -> {
        if (state.installStatus() == InstallStatus.DOWNLOADED && appUpdateManager != null) {
            runOnUiThread(() -> {
                Toast.makeText(this, "Video Uniquifier update downloaded. Applying update…", Toast.LENGTH_SHORT).show();
                appUpdateManager.completeUpdate();
            });
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, STORAGE_PERMISSION_REQUEST);
        }

        webView = new WebView(this);
        setContentView(webView);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            webView.setOnApplyWindowInsetsListener((view, insets) -> {
                view.setPadding(
                        insets.getSystemWindowInsetLeft(),
                        insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(),
                        insets.getSystemWindowInsetBottom()
                );
                return insets;
            });
        }
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " VideoUniquifier/" + BuildConfig.VERSION_NAME);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return handleNavigation(request.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return handleNavigation(Uri.parse(url)); }
            @Override public void onPageFinished(WebView view, String url) { super.onPageFinished(view, url); deliverPendingAuthToken(); }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = filePathCallback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                String[] accepts = fileChooserParams.getAcceptTypes();
                intent.setType(accepts != null && accepts.length == 1 && !accepts[0].isEmpty() ? accepts[0] : "*/*");
                if (accepts != null && accepts.length > 1) intent.putExtra(Intent.EXTRA_MIME_TYPES, accepts);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                startActivityForResult(Intent.createChooser(intent, "Choose files"), FILE_CHOOSER_REQUEST);
                return true;
            }
        });

        String remote = safeHttps(BuildConfig.WEB_APP_URL);
        if (!remote.isEmpty()) {
            Uri uri = Uri.parse(remote);
            trustedWebOrigin = uri.getScheme() + "://" + uri.getAuthority();
            webView.loadUrl(remote);
        } else {
            trustedWebOrigin = "file://";
            webView.loadUrl("file:///android_asset/index.html");
        }

        handleAuthIntent(getIntent());

        appUpdateManager = AppUpdateManagerFactory.create(this);
        appUpdateManager.registerListener(updateListener);
        checkForPlayUpdate(false);
    }

    private String safeHttps(String value) {
        String v = value == null ? "" : value.trim();
        return v.startsWith("https://") ? v : "";
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        if ("videouniquifier".equals(scheme) && "auth".equalsIgnoreCase(uri.getHost())) {
            acceptAuthUri(uri);
            return true;
        }
        if ("file".equals(scheme) && trustedWebOrigin.startsWith("file://")) return false;
        if ("https".equals(scheme) && !trustedWebOrigin.isEmpty()) {
            String origin = scheme + "://" + uri.getAuthority();
            if (origin.equalsIgnoreCase(trustedWebOrigin)) return false;
        }
        if ("https".equals(scheme)) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
            return true;
        }
        return true;
    }

    private void handleAuthIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return;
        Uri uri = intent.getData();
        if (uri != null && "videouniquifier".equalsIgnoreCase(uri.getScheme()) && "auth".equalsIgnoreCase(uri.getHost())) acceptAuthUri(uri);
    }

    private void acceptAuthUri(Uri uri) {
        String token = uri.getQueryParameter("token");
        if ((token == null || token.isEmpty()) && uri.getFragment() != null) {
            String fragment = uri.getFragment();
            for (String part : fragment.split("&")) {
                if (part.startsWith("token=")) { token = Uri.decode(part.substring(6)); break; }
            }
        }
        if (token == null || token.trim().isEmpty()) return;
        pendingAuthToken = token.trim();
        deliverPendingAuthToken();
    }

    private void deliverPendingAuthToken() {
        if (webView == null || pendingAuthToken == null || pendingAuthToken.isEmpty()) return;
        final String token = pendingAuthToken;
        pendingAuthToken = "";
        runOnUiThread(() -> {
            String quoted = JSONObject.quote(token);
            String js = "(function(){localStorage.setItem('vv_token'," + quoted + ");" +
                    "if(window.VideoVariatorUI&&window.VideoVariatorUI.refreshAccount){window.VideoVariatorUI.refreshAccount();}" +
                    "else{location.reload();}})();";
            webView.evaluateJavascript(js, null);
            Toast.makeText(MainActivity.this, "Signed in successfully.", Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAuthIntent(intent);
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

    @Override protected void onResume() {
        super.onResume();
        if (appUpdateManager != null) appUpdateManager.getAppUpdateInfo().addOnSuccessListener((AppUpdateInfo info) -> {
            if (info.installStatus() == InstallStatus.DOWNLOADED) appUpdateManager.completeUpdate();
        });
    }

    @Override protected void onDestroy() {
        if (appUpdateManager != null) appUpdateManager.unregisterListener(updateListener);
        if (webView != null) { webView.removeJavascriptInterface("AndroidBridge"); webView.destroy(); }
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PLAY_UPDATE_REQUEST) return;
        if (requestCode != FILE_CHOOSER_REQUEST || fileChooserCallback == null) return;
        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) results[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) results = new Uri[]{data.getData()};
        }
        fileChooserCallback.onReceiveValue(results);
        fileChooserCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.getUrl() != null && webView.getUrl().contains("/free-tools.html")) {
            webView.evaluateJavascript("window.vuHandleAndroidBack && window.vuHandleAndroidBack()", null); return;
        }
        if (webView != null && webView.canGoBack()) { webView.goBack(); return; }
        if (webView == null) { super.onBackPressed(); return; }
        webView.evaluateJavascript("(function(){var b=document.getElementById('backBtn');if(b&&!b.hidden){b.click();return true;}return false;})()", value -> {
            if (!"true".equals(value)) MainActivity.super.onBackPressed();
        });
    }

    private class AndroidBridge {
        private OutputStream toolStream;
        private File toolFile;
        private String toolMime;
        @JavascriptInterface public synchronized boolean startToolFile(String name, String mime) {
            cancelToolFile();
            if (!("image/jpeg".equals(mime) || "image/png".equals(mime) || "image/webp".equals(mime) || "audio/mp4".equals(mime) || "video/mp4".equals(mime) || "video/quicktime".equals(mime))) return false;
            try {
                File dir = new File(getCacheDir(), "shared-tools");
                if (!dir.exists() && !dir.mkdirs()) return false;
                File[] old = dir.listFiles();
                if (old != null) for (File f : old) if (System.currentTimeMillis() - f.lastModified() > 86400000L) f.delete();
                String safe = name.replaceAll("[^a-zA-Z0-9._-]", "_");
                if (safe.length() > 120) safe = safe.substring(safe.length()-120);
                toolFile = new File(dir, System.currentTimeMillis() + "-" + safe);
                toolMime = mime; toolStream = new FileOutputStream(toolFile); return true;
            } catch (Exception e) { cancelToolFile(); return false; }
        }
        @JavascriptInterface public synchronized boolean appendToolChunk(String data) {
            try { if (toolStream == null || data.length() > 400000) return false; toolStream.write(Base64.decode(data, Base64.DEFAULT)); return true; }
            catch (Exception e) { cancelToolFile(); return false; }
        }
        @JavascriptInterface public synchronized boolean finishToolFile(boolean share) {
            Uri dest = null;
            try {
                if (toolStream == null || toolFile == null) return false;
                toolStream.close(); toolStream = null;
                final File ready = toolFile; final String mime = toolMime;
                if (share) {
                    final Uri uri = androidx.core.content.FileProvider.getUriForFile(MainActivity.this, getPackageName()+".files", ready);
                    runOnUiThread(() -> {
                        try { Intent intent = new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            intent.setClipData(android.content.ClipData.newRawUri("Video Uniquifier", uri));
                            startActivity(Intent.createChooser(intent, "Share"));
                        } catch (Exception e) { Toast.makeText(MainActivity.this, "Could not open sharing", Toast.LENGTH_SHORT).show(); }
                    });
                } else {
                    OutputStream target;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentValues values = new ContentValues(); values.put(MediaStore.MediaColumns.DISPLAY_NAME, ready.getName());
                        values.put(MediaStore.MediaColumns.MIME_TYPE, mime); values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS+"/VideoUniquifier");
                        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                        dest = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                        if (dest == null) throw new java.io.IOException("No destination");
                        target = getContentResolver().openOutputStream(dest);
                    } else {
                        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "VideoUniquifier");
                        if (!dir.exists() && !dir.mkdirs()) throw new java.io.IOException("No directory");
                        target = new FileOutputStream(new File(dir, ready.getName()));
                    }
                    try (java.io.InputStream input = new java.io.FileInputStream(ready); OutputStream output = target) {
                        byte[] bytes = new byte[262144]; int count; while ((count = input.read(bytes)) != -1) output.write(bytes, 0, count);
                    }
                    if (dest != null) { ContentValues values = new ContentValues(); values.put(MediaStore.MediaColumns.IS_PENDING, 0); getContentResolver().update(dest, values, null, null); }
                    ready.delete();
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "Saved to Downloads/VideoUniquifier", Toast.LENGTH_SHORT).show());
                }
                toolFile = null; return true;
            } catch (Exception e) { if (dest != null) getContentResolver().delete(dest, null, null); cancelToolFile(); return false; }
        }
        @JavascriptInterface public synchronized void cancelToolFile() {
            try { if (toolStream != null) toolStream.close(); } catch (Exception ignored) {}
            toolStream = null; if (toolFile != null) toolFile.delete(); toolFile = null;
        }
        private OutputStream outputStream;
        private Uri pendingUri;
        private File legacyFile;

        @JavascriptInterface public void toast(final String message) { runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show()); }
        @JavascriptInterface public void checkForUpdate() { runOnUiThread(() -> checkForPlayUpdate(true)); }
        @JavascriptInterface public String getAppVersion() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public String getApiBase() {
            String api = safeHttps(BuildConfig.API_BASE_URL);
            if (!api.isEmpty()) return api;
            return safeHttps(BuildConfig.WEB_APP_URL);
        }

        @JavascriptInterface
        public void openExternalAuth(String provider) {
            String p = provider == null ? "" : provider.trim().toLowerCase();
            if (!"google".equals(p) && !"apple".equals(p)) return;
            String base = getApiBase();
            if (base == null || base.isEmpty()) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Sign-in service is not configured.", Toast.LENGTH_SHORT).show());
                return;
            }
            Uri uri = Uri.parse(base + "/?mobileAuth=" + Uri.encode(p));
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (Exception e) { Toast.makeText(MainActivity.this, "Could not open the sign-in page.", Toast.LENGTH_SHORT).show(); }
            });
        }

        @JavascriptInterface
        public synchronized boolean startFile(String fileName) {
            try {
                closeCurrent(false);
                String safeName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
                if (!safeName.toLowerCase().endsWith(".mp4")) safeName += ".mp4";
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Video.Media.DISPLAY_NAME, safeName);
                    values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
                    values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/VideoUniquifier");
                    values.put(MediaStore.Video.Media.IS_PENDING, 1);
                    pendingUri = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
                    if (pendingUri == null) return false;
                    outputStream = getContentResolver().openOutputStream(pendingUri, "w");
                } else {
                    File root = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
                    File dir = new File(root, "VideoUniquifier");
                    if (!dir.exists() && !dir.mkdirs()) return false;
                    legacyFile = new File(dir, safeName);
                    outputStream = new FileOutputStream(legacyFile, false);
                }
                return outputStream != null;
            } catch (Exception e) { closeCurrent(false); return false; }
        }

        @JavascriptInterface
        public synchronized boolean appendChunk(String base64Chunk) {
            try { if (outputStream == null) return false; outputStream.write(Base64.decode(base64Chunk, Base64.DEFAULT)); return true; }
            catch (Exception e) { return false; }
        }

        @JavascriptInterface
        public synchronized String finishFile() {
            try {
                if (outputStream != null) { outputStream.flush(); outputStream.close(); outputStream = null; }
                String result = "Gallery / Movies/VideoUniquifier";
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pendingUri != null) {
                    ContentValues values = new ContentValues(); values.put(MediaStore.Video.Media.IS_PENDING, 0);
                    getContentResolver().update(pendingUri, values, null, null); pendingUri = null;
                } else if (legacyFile != null) {
                    String path = legacyFile.getAbsolutePath();
                    MediaScannerConnection.scanFile(MainActivity.this, new String[]{path}, new String[]{"video/mp4"}, null);
                    legacyFile = null;
                }
                final String message = "Saved to " + result;
                runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
                return result;
            } catch (Exception e) { closeCurrent(false); return "error"; }
        }

        private synchronized void closeCurrent(boolean publish) {
            try { if (outputStream != null) outputStream.close(); } catch (Exception ignored) { }
            outputStream = null;
            if (!publish && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pendingUri != null) {
                try { getContentResolver().delete(pendingUri, null, null); } catch (Exception ignored) { }
            }
            pendingUri = null; legacyFile = null;
        }
    }
}
