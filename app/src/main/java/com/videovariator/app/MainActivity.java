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
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.documentfile.provider.DocumentFile;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int FOLDER_CHOOSER_REQUEST = 1002;
    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;

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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView,
                                             ValueCallback<Uri[]> filePathCallback,
                                             FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }
                fileChooserCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("video/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                startActivityForResult(Intent.createChooser(intent, "Выберите видео"), FILE_CHOOSER_REQUEST);
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FOLDER_CHOOSER_REQUEST) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                Uri treeUri = data.getData();
                try {
                    int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    getContentResolver().takePersistableUriPermission(treeUri, flags);
                } catch (Exception ignored) {}
                importFolder(treeUri);
            }
            return;
        }

        if (requestCode != FILE_CHOOSER_REQUEST || fileChooserCallback == null) return;

        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) {
                    results[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        fileChooserCallback.onReceiveValue(results);
        fileChooserCallback = null;
    }

    private void importFolder(Uri treeUri) {
        Toast.makeText(this, "Читаю видео из папки…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            try {
                DocumentFile root = DocumentFile.fromTreeUri(this, treeUri);
                if (root == null) throw new Exception("Не удалось открыть папку");
                File batchDir = new File(getCacheDir(), "folder_" + System.currentTimeMillis());
                if (!batchDir.mkdirs() && !batchDir.isDirectory()) throw new Exception("Не удалось создать временную папку");
                JSONArray items = new JSONArray();
                int[] counter = new int[]{0};
                collectVideos(root, batchDir, items, counter);
                final String json = items.toString();
                runOnUiThread(() -> {
                    webView.evaluateJavascript("window.receiveNativeFolderFiles(" + json + ")", null);
                    Toast.makeText(this, items.length() + " видео найдено", Toast.LENGTH_SHORT).show();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Ошибка папки: " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private void collectVideos(DocumentFile node, File outDir, JSONArray items, int[] counter) throws Exception {
        if (node.isDirectory()) {
            for (DocumentFile child : node.listFiles()) collectVideos(child, outDir, items, counter);
            return;
        }
        if (!node.isFile()) return;
        String name = node.getName() == null ? "video.mp4" : node.getName();
        String type = node.getType() == null ? "" : node.getType();
        boolean video = type.startsWith("video/") || name.matches("(?i).+\\.(mp4|mov|m4v|webm|mkv|avi)$");
        if (!video) return;

        String safe = name.replaceAll("[^a-zA-Z0-9._-]", "_");
        File target = new File(outDir, String.format("%04d_%s", counter[0]++, safe));
        try (InputStream in = getContentResolver().openInputStream(node.getUri());
             OutputStream out = new FileOutputStream(target)) {
            if (in == null) return;
            byte[] buffer = new byte[1024 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
        }
        JSONObject item = new JSONObject();
        item.put("name", name);
        item.put("url", Uri.fromFile(target).toString());
        item.put("type", type.isEmpty() ? "video/mp4" : type);
        item.put("size", target.length());
        items.put(item);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private class AndroidBridge {
        private OutputStream outputStream;
        private Uri pendingUri;
        private File legacyFile;

        @JavascriptInterface
        public void toast(final String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void pickFolder() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION |
                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                        Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
                        Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
                startActivityForResult(Intent.createChooser(intent, "Выберите папку с видео"), FOLDER_CHOOSER_REQUEST);
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
                    values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/VideoVariator");
                    values.put(MediaStore.Video.Media.IS_PENDING, 1);
                    pendingUri = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
                    if (pendingUri == null) return false;
                    outputStream = getContentResolver().openOutputStream(pendingUri, "w");
                } else {
                    File dir = new File(getExternalFilesDir(Environment.DIRECTORY_MOVIES), "VideoVariator");
                    if (!dir.exists() && !dir.mkdirs()) return false;
                    legacyFile = new File(dir, safeName);
                    outputStream = new FileOutputStream(legacyFile, false);
                }
                return outputStream != null;
            } catch (Exception e) {
                closeCurrent(false);
                return false;
            }
        }

        @JavascriptInterface
        public synchronized boolean appendChunk(String base64Chunk) {
            try {
                if (outputStream == null) return false;
                byte[] bytes = Base64.decode(base64Chunk, Base64.DEFAULT);
                outputStream.write(bytes);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public synchronized String finishFile() {
            try {
                if (outputStream != null) {
                    outputStream.flush();
                    outputStream.close();
                    outputStream = null;
                }
                String result;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pendingUri != null) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Video.Media.IS_PENDING, 0);
                    getContentResolver().update(pendingUri, values, null, null);
                    result = "Downloads/VideoVariator";
                    pendingUri = null;
                } else if (legacyFile != null) {
                    result = legacyFile.getAbsolutePath();
                    legacyFile = null;
                } else {
                    result = "saved";
                }
                final String message = "Готово: " + result;
                runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show());
                return result;
            } catch (Exception e) {
                closeCurrent(false);
                return "error";
            }
        }

        private synchronized void closeCurrent(boolean publish) {
            try {
                if (outputStream != null) outputStream.close();
            } catch (Exception ignored) {}
            outputStream = null;
            if (!publish && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pendingUri != null) {
                try { getContentResolver().delete(pendingUri, null, null); } catch (Exception ignored) {}
            }
            pendingUri = null;
            legacyFile = null;
        }
    }
}
