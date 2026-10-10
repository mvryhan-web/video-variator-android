package com.videovariator.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.core.content.FileProvider;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class ShareImportTest {
    private WebView web(View view) {
        if (view instanceof WebView) return (WebView)view;
        if (view instanceof ViewGroup) for(int i=0;i<((ViewGroup)view).getChildCount();i++) {
            WebView result=web(((ViewGroup)view).getChildAt(i));if(result!=null)return result;
        }
        return null;
    }
    private String js(ActivityScenario<MainActivity> scenario,String script)throws Exception {
        AtomicReference<String> result=new AtomicReference<>();
        scenario.onActivity(a->web(a.getWindow().getDecorView()).evaluateJavascript(script,result::set));
        long until=SystemClock.elapsedRealtime()+5000;
        while(result.get()==null&&SystemClock.elapsedRealtime()<until)SystemClock.sleep(50);
        assertNotNull(result.get());return result.get();
    }
    private Uri fixture(Context context,String name)throws Exception {
        File directory=new File(context.getCacheDir(),"shared-tools");directory.mkdirs();
        File file=new File(directory,name);
        try(FileOutputStream out=new FileOutputStream(file)){out.write(new byte[]{1,2,3,4});}
        return FileProvider.getUriForFile(context,"com.videovariator.app.files",file);
    }
    private String read(Context context,String path)throws Exception {
        try(java.io.InputStream in=context.getAssets().open(path)){return new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}
    }
    private void importFixture(ActivityScenario<MainActivity> scenario,Context context,int expected)throws Exception {
        // Let the native copy and its dashboard navigation finish before loading
        // the isolated fixture. Otherwise that navigation replaces the fixture.
        AtomicReference<Boolean> ready=new AtomicReference<>(false);
        long copyDeadline=SystemClock.elapsedRealtime()+15000;
        while(!ready.get()&&SystemClock.elapsedRealtime()<copyDeadline) {
            scenario.onActivity(a->{try {
                java.lang.reflect.Field copying=MainActivity.class.getDeclaredField("importingShare");copying.setAccessible(true);
                java.lang.reflect.Field pending=MainActivity.class.getDeclaredField("sharedVideoMetadata");pending.setAccessible(true);
                ready.set(!copying.getBoolean(a)&&!"[]".equals(pending.get(a)));
            } catch(Exception e){throw new AssertionError(e);}});
            if(!ready.get())SystemClock.sleep(100);
        }
        assertTrue("Native share copy completed",ready.get());
        String html="<html lang='en'><body><div id='workspace'></div><script>window.selected=[];window.VideoVariatorUI={toast(){},showView(){},setFiles(files){window.selected=files;}};"+read(context,"share-import.js")+"</script></body></html>";
        scenario.onActivity(a->web(a.getWindow().getDecorView()).loadDataWithBaseURL("https://video-variator-android.onrender.com/",html,"text/html","UTF-8","https://video-variator-android.onrender.com/"));
        long until=SystemClock.elapsedRealtime()+15000;
        while(!Integer.toString(expected).equals(js(scenario,"window.selected?.length"))&&SystemClock.elapsedRealtime()<until)SystemClock.sleep(100);
        assertEquals(Integer.toString(expected),js(scenario,"selected.length"));
        assertEquals("4",js(scenario,"selected[0].size"));
        assertEquals("true",js(scenario,"selected[0].type==='video/mp4'"));
        assertEquals("true",js(scenario,"AndroidBridge.getSharedVideos()==='[]'"));
    }
    @Test public void singleShareColdStartAndMultipleShareWarmStart()throws Exception {
        Context context=ApplicationProvider.getApplicationContext();
        Uri first=fixture(context,"gallery-one.mp4"),second=fixture(context,"gallery-two.mp4");
        Intent single=new Intent(Intent.ACTION_SEND).setType("video/mp4").putExtra(Intent.EXTRA_STREAM,first).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        assertTrue(context.getPackageManager().queryIntentActivities(single,0).stream().anyMatch(info->info.activityInfo.packageName.equals(context.getPackageName())));
        single.setClass(context,MainActivity.class);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(single)) {
            importFixture(scenario,context,1);
            AtomicReference<String> currentUrl=new AtomicReference<>();
            scenario.onActivity(a->currentUrl.set(web(a.getWindow().getDecorView()).getUrl()));
            assertEquals("Fixture must have the real dashboard URL for warm import","https://video-variator-android.onrender.com/",currentUrl.get());
            ArrayList<Uri> list=new ArrayList<>();list.add(first);list.add(second);
            Intent multiple=new Intent(Intent.ACTION_SEND_MULTIPLE).setType("video/mp4").putParcelableArrayListExtra(Intent.EXTRA_STREAM,list).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            assertTrue(context.getPackageManager().queryIntentActivities(multiple,0).stream().anyMatch(info->info.activityInfo.packageName.equals(context.getPackageName())));
            scenario.onActivity(a->{
                a.onNewIntent(multiple);
                // ActivityScenario matches lifecycle events against its launch
                // Intent. Restore that identity after delivering the warm share.
                a.setIntent(single);
            });
            long until=SystemClock.elapsedRealtime()+15000;
            while(!"2".equals(js(scenario,"selected.length"))&&SystemClock.elapsedRealtime()<until)SystemClock.sleep(100);
            assertEquals("2",js(scenario,"selected.length"));
            assertEquals("\"gallery-two.mp4\"",js(scenario,"selected[1].name"));
        }
    }
}
