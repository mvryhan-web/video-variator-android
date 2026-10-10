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
            assertEquals("Packaged WOW UI must load rather than production UI","true",js(scenario,"!!window.VU_BUNDLED_PREVIEW&&!!window.VUWowMontage?.ready&&!!document.getElementById('bundledPreviewNotice')"));
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
}
