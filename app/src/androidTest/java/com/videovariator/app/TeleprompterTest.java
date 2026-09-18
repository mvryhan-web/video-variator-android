package com.videovariator.app;
import android.Manifest;
import android.content.ContentUris;
import android.content.Intent;
import android.database.Cursor;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ScrollView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.GrantPermissionRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class TeleprompterTest {
 @Rule public GrantPermissionRule permissions=GrantPermissionRule.grant(Manifest.permission.CAMERA,Manifest.permission.RECORD_AUDIO);
 private Button button(View v,String label){if(v instanceof Button&&((Button)v).getText().toString().equals(label))return(Button)v;if(v instanceof ViewGroup){ViewGroup group=(ViewGroup)v;for(int i=0;i<group.getChildCount();i++){Button result=button(group.getChildAt(i),label);if(result!=null)return result;}}return null;}
 private ScrollView scroll(View v){if(v instanceof ScrollView)return(ScrollView)v;if(v instanceof ViewGroup){ViewGroup group=(ViewGroup)v;for(int i=0;i<group.getChildCount();i++){ScrollView s=scroll(group.getChildAt(i));if(s!=null)return s;}}return null;}
 private void await(ActivityScenario<TeleprompterActivity> scenario,String label,boolean click)throws Exception{long end=SystemClock.elapsedRealtime()+45000;AtomicBoolean ready=new AtomicBoolean(false);while(SystemClock.elapsedRealtime()<end){scenario.onActivity(a->{Button b=button(a.getWindow().getDecorView(),label);if(b!=null&&b.isEnabled()){ready.set(true);if(click)b.performClick();}});if(ready.get())return;SystemClock.sleep(200);}fail("Button not ready: "+label);}
 @Test public void recordsCameraAndScrollsTogetherThenSavesPlayableVideo()throws Exception{
  android.content.Context context=ApplicationProvider.getApplicationContext();StringBuilder text=new StringBuilder();for(int i=0;i<100;i++)text.append("Read this camera test script.\n");
  Intent intent=new Intent(context,TeleprompterActivity.class).putExtra("script",text.toString()).putExtra("speed",60);
  try(ActivityScenario<TeleprompterActivity> scenario=ActivityScenario.launch(intent)){await(scenario,"Start",true);await(scenario,"Stop",false);SystemClock.sleep(2200);scenario.onActivity(a->assertTrue("Text must scroll during recording",scroll(a.getWindow().getDecorView()).getScrollY()>20));await(scenario,"Stop",true);await(scenario,"Share",false);
   Uri uri=null;try(Cursor c=context.getContentResolver().query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI,new String[]{MediaStore.Video.Media._ID,MediaStore.Video.Media.SIZE},MediaStore.Video.Media.DISPLAY_NAME+" LIKE ?",new String[]{"VideoUniquifier-Prompter-%"},MediaStore.Video.Media.DATE_ADDED+" DESC")){assertNotNull(c);assertTrue(c.moveToFirst());assertTrue(c.getLong(1)>0);uri=ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI,c.getLong(0));}
   try(MediaMetadataRetriever retriever=new MediaMetadataRetriever()){retriever.setDataSource(context,uri);assertTrue(Long.parseLong(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION))>1000);assertNotNull(retriever.getFrameAtTime());}finally{if(uri!=null)context.getContentResolver().delete(uri,null,null);}
  }
 }
}
