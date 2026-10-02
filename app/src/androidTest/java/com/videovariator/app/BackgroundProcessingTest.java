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
public class BackgroundProcessingTest {
    private WebView web(View v) { if(v instanceof WebView)return(WebView)v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++){WebView w=web(g.getChildAt(i));if(w!=null)return w;}}return null; }
    private String read(android.content.Context c,String name)throws Exception {try(java.io.InputStream in=c.getAssets().open(name)){java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);return out.toString("UTF-8");}}
    private String js(ActivityScenario<MainActivity> scenario,String expression)throws Exception {
        AtomicReference<String> result=new AtomicReference<>();
        scenario.onActivity(a->web(a.getWindow().getDecorView()).evaluateJavascript(expression,result::set));
        long end=SystemClock.elapsedRealtime()+5000;while(result.get()==null&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(50);
        assertNotNull("JS callback",result.get());return result.get();
    }
    @org.junit.Before public void allowTestNotifications() {
        if(android.os.Build.VERSION.SDK_INT>=33)InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission("com.videovariator.app",android.Manifest.permission.POST_NOTIFICATIONS);
    }
    private void reopenFromLauncher()throws Exception {
        android.os.ParcelFileDescriptor fd=InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("am start -W -n com.videovariator.app/.MainActivity");
        try(java.io.InputStream in=new android.os.ParcelFileDescriptor.AutoCloseInputStream(fd)){byte[] b=new byte[1024];while(in.read(b)!=-1){}}
    }
    @Test public void serviceStartsCancelsAndStops()throws Exception {
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(a->{a.startForegroundService(new Intent(a,ProcessingService.class));});
            long end=SystemClock.elapsedRealtime()+5000;while(!ProcessingService.active&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(50);
            assertTrue(ProcessingService.active);
            scenario.onActivity(a->a.startService(new Intent(a,ProcessingService.class).setAction(ProcessingService.CANCEL)));
            end=SystemClock.elapsedRealtime()+5000;while(ProcessingService.active&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(50);
            assertFalse(ProcessingService.active);
        }
    }
    @Test public void localEncoderSurvivesHomeAndBackThenSavesGalleryVideo()throws Exception {
        android.content.Context app=ApplicationProvider.getApplicationContext();
        android.content.Context test=InstrumentationRegistry.getInstrumentation().getContext();
        String fixture=read(test,"background-source.base64");
        String html="<html><head><script>window.errors=[];window.onerror=(m)=>window.errors.push(String(m));</script></head><body><div id='progressCard'></div><script src='https://video-variator-android.onrender.com/vendor/ffmpeg/ffmpeg.js'></script><script>"+
            read(app,"processing-session.js")+read(app,"video-core.js")+
            "window.failure='';window.result=null;const bytes=Uint8Array.from(atob("+JSONObject.quote(fixture)+"),c=>c.charCodeAt(0));VideoVariatorCore.setFiles([new File([bytes],'background.mp4',{type:'video/mp4'})]);VideoVariatorCore.process({variants:2,resolution:'720x1280'}).then(r=>window.result=r).catch(e=>window.failure=e.message);</script></body></html>";
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(a->web(a.getWindow().getDecorView()).loadDataWithBaseURL("https://video-variator-android.onrender.com/",html,"text/html","UTF-8",null));
            long deadline=SystemClock.elapsedRealtime()+90000;
            while(!"true".equals(js(scenario,"!!window.VideoVariatorCore?.state.loaded"))&&SystemClock.elapsedRealtime()<deadline)SystemClock.sleep(300);
            assertEquals("Engine must load: "+js(scenario,"JSON.stringify({errors:window.errors,failure:window.failure,href:location.href,runtime:typeof FFmpegWASM,core:typeof VideoVariatorCore})"), "true",js(scenario,"!!window.VideoVariatorCore?.state.loaded"));
            assertTrue("Foreground service active",ProcessingService.active);
            // Back must keep the same Activity and worker, rather than navigating.
            scenario.onActivity(MainActivity::onBackPressed);
            Intent home=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            app.startActivity(home);SystemClock.sleep(15000);
            // An app cannot launch itself from the background on modern Android.
            // Reopen as a user would from the launcher, rather than issuing an
            // app-originated background activity start that Android can deny.
            reopenFromLauncher();
            // am start -W waits for launch, not completion of lifecycle callbacks.
            // ActivityScenario.getState throws during an intermediate STARTED stage.
            deadline=SystemClock.elapsedRealtime()+10000;
            boolean resumed=false;
            while(!resumed&&SystemClock.elapsedRealtime()<deadline){
                InstrumentationRegistry.getInstrumentation().waitForIdleSync();
                try{resumed=scenario.getState()==androidx.lifecycle.Lifecycle.State.RESUMED;}
                catch(NullPointerException transitionInProgress){/* Retry only within this bounded lifecycle wait. */}
                if(!resumed)SystemClock.sleep(100);
            }
            assertTrue("Original Activity resumes after launcher return",resumed);
            deadline=SystemClock.elapsedRealtime()+180000;
            while("null".equals(js(scenario,"window.result"))&&SystemClock.elapsedRealtime()<deadline){
                assertEquals("No encoding error","\"\"",js(scenario,"window.failure"));SystemClock.sleep(500);
            }
            assertEquals("2",js(scenario,"window.result?.results.length"));
            assertEquals("true",js(scenario,"window.result.results.every(r=>r.saved)"));
            for(int i=0;i<2;i++){
                Uri uri;
                try(android.database.Cursor cursor=app.getContentResolver().query(android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,new String[]{android.provider.MediaStore.Video.Media._ID},android.provider.MediaStore.Video.Media.DISPLAY_NAME+" = ?",new String[]{"background_variant_"+(i+1)+".mp4"},android.provider.MediaStore.Video.Media.DATE_ADDED+" DESC")){
                    assertNotNull(cursor);assertTrue("Gallery file exists",cursor.moveToFirst());uri=android.content.ContentUris.withAppendedId(android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,cursor.getLong(0));
                }
                try(MediaMetadataRetriever retriever=new MediaMetadataRetriever()){
                    retriever.setDataSource(app,uri);assertTrue(Long.parseLong(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION))>2000);assertNotNull(retriever.getFrameAtTime());
                }finally{app.getContentResolver().delete(uri,null,null);}
            }
            deadline=SystemClock.elapsedRealtime()+5000;while(ProcessingService.active&&SystemClock.elapsedRealtime()<deadline)SystemClock.sleep(100);
            assertFalse("No lingering foreground service",ProcessingService.active);
        }
    }
}
