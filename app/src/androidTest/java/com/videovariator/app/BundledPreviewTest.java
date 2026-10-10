package com.videovariator.app;

import android.content.Intent;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.atomic.AtomicReference;
import java.io.File;
import java.util.ArrayList;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class BundledPreviewTest {
    private WebView web(View v) { if(v instanceof WebView)return(WebView)v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++){WebView w=web(g.getChildAt(i));if(w!=null)return w;}}return null; }
    private String read(android.content.Context c,String name)throws Exception {try(java.io.InputStream in=c.getAssets().open(name)){java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);return out.toString("UTF-8");}}
    private String js(ActivityScenario<MainActivity> scenario,String expression)throws Exception {
        AtomicReference<String> result=new AtomicReference<>();
        scenario.onActivity(a->web(a.getWindow().getDecorView()).evaluateJavascript(expression,result::set));
        long end=SystemClock.elapsedRealtime()+5000;while(result.get()==null&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(50);
        assertNotNull("JS callback",result.get());return result.get();
    }

    @Test public void ownerPreviewLoadsPackagedWowAndEncodesSavedResult() throws Exception {
        org.junit.Assume.assumeTrue(BuildConfig.BUNDLED_PREVIEW);
        android.content.Context app=ApplicationProvider.getApplicationContext();
        android.content.Context test=InstrumentationRegistry.getInstrumentation().getContext();
        if(android.os.Build.VERSION.SDK_INT>=33)InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission("com.videovariator.app",android.Manifest.permission.POST_NOTIFICATIONS);
        String fixture=read(test,"background-source.base64");
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            long end=SystemClock.elapsedRealtime()+60000;
            while(!"true".equals(js(scenario,"!!window.VU_BUNDLED_PREVIEW&&!!window.VUWowMontage?.ready&&!!window.VideoVariatorCore&&!!document.getElementById('bundledPreviewNotice')"))&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(300);
            assertEquals("Packaged WOW UI must load rather than production UI: "+js(scenario,"JSON.stringify({href:location.href,body:document.body?.innerText?.slice(0,350),preview:window.VU_BUNDLED_PREVIEW,core:typeof VideoVariatorCore})"),"true",js(scenario,"!!window.VU_BUNDLED_PREVIEW&&!!window.VUWowMontage?.ready&&!!document.getElementById('bundledPreviewNotice')"));
            assertEquals("Default remains off","false",js(scenario,"document.getElementById('wowMontage').checked"));
            assertEquals("Toggle is working","false",js(scenario,"document.getElementById('wowMontage').disabled"));
            assertEquals("Same HTTPS API origin", "true", js(scenario,"window.VV_API_BASE===location.origin"));
            js(scenario,"window.previewConfig=null;fetch('/api/config').then(r=>r.json()).then(c=>window.previewConfig=c).catch(e=>window.previewConfig={error:e.message})");
            end=SystemClock.elapsedRealtime()+30000;
            while("null".equals(js(scenario,"window.previewConfig"))&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(300);
            assertEquals("Real production config is reachable","true",js(scenario,"!!window.previewConfig?.privacy?.localVideoProcessing"));
            js(scenario,"window.previewError='';window.previewResult=null;const bytes=Uint8Array.from(atob("+JSONObject.quote(fixture)+"),c=>c.charCodeAt(0));VideoVariatorCore.setFiles([new File([bytes],'preview-wow.mp4',{type:'video/mp4'})]);VideoVariatorCore.process({variants:1,mode:'gentle',resolution:'720x1280',wowMontage:true}).then(r=>window.previewResult=r).catch(e=>window.previewError=e.message)");
            end=SystemClock.elapsedRealtime()+240000;
            while("null".equals(js(scenario,"window.previewResult"))&&SystemClock.elapsedRealtime()<end){assertEquals("No encode error", "\"\"", js(scenario,"window.previewError"));SystemClock.sleep(500);}
            assertEquals("1",js(scenario,"window.previewResult?.results.length"));
            assertEquals("true",js(scenario,"!!window.previewResult.results[0].wowMontage&&window.previewResult.results[0].saved"));
            try(android.database.Cursor cursor=app.getContentResolver().query(android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,new String[]{android.provider.MediaStore.Video.Media._ID},android.provider.MediaStore.Video.Media.DISPLAY_NAME+" = ?",new String[]{"preview-wow_variant_1.mp4"},android.provider.MediaStore.Video.Media.DATE_ADDED+" DESC")) {
                assertNotNull(cursor);assertTrue("Saved to Gallery",cursor.moveToFirst());Uri uri=android.content.ContentUris.withAppendedId(android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,cursor.getLong(0));
                try(MediaMetadataRetriever retriever=new MediaMetadataRetriever()){retriever.setDataSource(app,uri);assertNotNull(retriever.getFrameAtTime());assertTrue(Long.parseLong(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION))>2000);}
                finally{app.getContentResolver().delete(uri,null,null);}
            }
        }
    }
    @Test public void realPackagedDashboardImportsColdAndWarmShares() throws Exception {
        org.junit.Assume.assumeTrue(BuildConfig.BUNDLED_PREVIEW);
        android.content.Context app=ApplicationProvider.getApplicationContext();
        android.content.Context test=InstrumentationRegistry.getInstrumentation().getContext();
        File folder=new File(app.getCacheDir(),"shared-tools");folder.mkdirs();
        byte[] bytes=android.util.Base64.decode(read(test,"background-source.base64"),android.util.Base64.DEFAULT);
        File one=new File(folder,"wow-share-one.mp4"),two=new File(folder,"wow-share-two.mp4");
        java.nio.file.Files.write(one.toPath(),bytes);java.nio.file.Files.write(two.toPath(),bytes);
        Uri first=androidx.core.content.FileProvider.getUriForFile(app,"com.videovariator.app.files",one);
        Uri second=androidx.core.content.FileProvider.getUriForFile(app,"com.videovariator.app.files",two);
        Intent launch=new Intent(Intent.ACTION_SEND).setType("video/mp4").putExtra(Intent.EXTRA_STREAM,first).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION).setClass(app,MainActivity.class);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(launch)) {
            long end=SystemClock.elapsedRealtime()+30000;
            while(!"true".equals(js(scenario,"!!window.VU_BUNDLED_PREVIEW&&VideoVariatorCore?.state.files.length===1"))&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(200);
            assertEquals("Cold share reaches actual packaged dashboard","1",js(scenario,"VideoVariatorCore?.state.files.length"));
            assertEquals("\"wow-share-one.mp4\"",js(scenario,"VideoVariatorCore.state.files[0].name"));
            ArrayList<Uri> files=new ArrayList<>();files.add(first);files.add(second);
            Intent multiple=new Intent(Intent.ACTION_SEND_MULTIPLE).setType("video/mp4").putParcelableArrayListExtra(Intent.EXTRA_STREAM,files).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            scenario.onActivity(a->{a.onNewIntent(multiple);a.setIntent(launch);});
            end=SystemClock.elapsedRealtime()+30000;
            while(!"2".equals(js(scenario,"VideoVariatorCore?.state.files.length"))&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(200);
            assertEquals("Warm share retains actual packaged dashboard","2",js(scenario,"VideoVariatorCore?.state.files.length"));
            assertEquals("\"wow-share-two.mp4\"",js(scenario,"VideoVariatorCore.state.files[1].name"));
        } finally {one.delete();two.delete();}
    }

    @Test public void smartStudioPackagedModelAndCaptionExportSaveToGallery() throws Exception {
        org.junit.Assume.assumeTrue(BuildConfig.BUNDLED_PREVIEW);
        android.content.Context app=ApplicationProvider.getApplicationContext();
        android.content.Context test=InstrumentationRegistry.getInstrumentation().getContext();
        if(android.os.Build.VERSION.SDK_INT>=33)InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission("com.videovariator.app",android.Manifest.permission.POST_NOTIFICATIONS);
        String fixture=read(test,"background-source.base64");
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(a->web(a.getWindow().getDecorView()).loadUrl("https://video-variator-android.onrender.com/smart-studio.html"));
            long end=SystemClock.elapsedRealtime()+60000;
            while(!"true".equals(js(scenario,"!!document.getElementById('source')&&document.title.startsWith('Smart Studio')"))&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(300);
            assertEquals("Smart Studio packaged page", "true", js(scenario,"document.title.startsWith('Smart Studio')"));
            js(scenario,"window.smartModel=null;window.smartError='';(async()=>{const c=document.createElement('canvas');c.width=160;c.height=160;c.getContext('2d').fillRect(0,0,160,160);const bitmap=await createImageBitmap(c);const w=new Worker('smart-face-worker.js');w.onmessage=({data})=>{window.smartModel=data;w.terminate();};w.onerror=e=>window.smartError=e.message;w.postMessage({id:1,bitmap},[bitmap]);})().catch(e=>window.smartError=e.message)");
            end=SystemClock.elapsedRealtime()+90000;
            while("null".equals(js(scenario,"window.smartModel"))&&SystemClock.elapsedRealtime()<end){assertEquals("No worker error", "\"\"",js(scenario,"window.smartError"));SystemClock.sleep(300);}
            assertEquals("Local face model executes in Android WebView: "+js(scenario,"JSON.stringify(window.smartModel)"),"true",js(scenario,"Array.isArray(window.smartModel?.faces)&&!window.smartModel.error"));
            js(scenario,"const bytes=Uint8Array.from(atob("+JSONObject.quote(fixture)+"),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([bytes],'smart-source.mp4',{type:'video/mp4'}));document.getElementById('source').files=dt.files;document.getElementById('source').dispatchEvent(new Event('change'))");
            end=SystemClock.elapsedRealtime()+30000;
            while("true".equals(js(scenario,"document.getElementById('addCaption').disabled"))&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(200);
            js(scenario,"document.getElementById('follow').checked=false;document.getElementById('follow').dispatchEvent(new Event('change'));document.getElementById('addCaption').click();document.getElementById('brand').value='Android Smart Studio';document.getElementById('export').click()");
            end=SystemClock.elapsedRealtime()+180000;
            while(!"true".equals(js(scenario,"document.getElementById('status').textContent.includes('Saved automatically')"))&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(500);
            assertEquals("Caption export automatically saved: "+js(scenario,"document.getElementById('status').textContent"),"true",js(scenario,"document.getElementById('status').textContent.includes('Saved automatically')"));
            try(android.database.Cursor cursor=app.getContentResolver().query(android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,new String[]{android.provider.MediaStore.Video.Media._ID},android.provider.MediaStore.Video.Media.DISPLAY_NAME+" LIKE ?",new String[]{"%-VideoUniquifier-Smart.mp4"},android.provider.MediaStore.Video.Media.DATE_ADDED+" DESC")) {
                assertNotNull(cursor);assertTrue("Smart result saved to Gallery",cursor.moveToFirst());Uri uri=android.content.ContentUris.withAppendedId(android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,cursor.getLong(0));
                try(MediaMetadataRetriever retriever=new MediaMetadataRetriever()){retriever.setDataSource(app,uri);assertNotNull(retriever.getFrameAtTime());assertTrue(Long.parseLong(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION))>2000);}
                finally{app.getContentResolver().delete(uri,null,null);}
            }
            js(scenario,"document.getElementById('delete').click()");assertEquals("Deleted preview", "true", js(scenario,"document.getElementById('result').hidden"));
        }
    }

}
