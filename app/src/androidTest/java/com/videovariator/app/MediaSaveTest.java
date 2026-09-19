package com.videovariator.app;
import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class MediaSaveTest {
 private Object call(Object bridge,String name,Class<?>[] types,Object...args)throws Exception{Method m=bridge.getClass().getDeclaredMethod(name,types);m.setAccessible(true);return m.invoke(bridge,args);}
 @Test public void savesPhotoBytesToGalleryAndDoesNotReportEmptyVideoAsSaved(){
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){scenario.onActivity(a->{Uri saved=null;try{
   Class<?> bridgeClass=Class.forName("com.videovariator.app.MainActivity$AndroidBridge");Constructor<?> constructor=bridgeClass.getDeclaredConstructor(MainActivity.class);constructor.setAccessible(true);Object bridge=constructor.newInstance(a);
   assertEquals("error",call(bridge,"finishFile",new Class<?>[]{}));
   String name="VU-save-test-"+System.currentTimeMillis()+".png";byte[] bytes=Base64.decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ9sAAAAASUVORK5CYII=",Base64.DEFAULT);
   assertEquals(true,call(bridge,"startToolFile",new Class<?>[]{String.class,String.class},name,"image/png"));assertEquals(true,call(bridge,"appendToolChunk",new Class<?>[]{String.class},Base64.encodeToString(bytes,Base64.NO_WRAP)));assertEquals(true,call(bridge,"finishToolFile",new Class<?>[]{boolean.class},false));
   try(Cursor c=a.getContentResolver().query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,new String[]{MediaStore.Images.Media._ID,MediaStore.Images.Media.SIZE,MediaStore.Images.Media.RELATIVE_PATH},MediaStore.Images.Media.DISPLAY_NAME+" LIKE ?",new String[]{"%"+name},null)){assertNotNull(c);assertTrue(c.moveToFirst());assertEquals(bytes.length,c.getLong(1));assertEquals("Pictures/VideoUniquifier/",c.getString(2));saved=ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,c.getLong(0));}
   try(java.io.InputStream in=a.getContentResolver().openInputStream(saved)){java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] chunk=new byte[1024];int n;while((n=in.read(chunk))!=-1)out.write(chunk,0,n);assertArrayEquals(bytes,out.toByteArray());}
  }catch(Exception e){throw new AssertionError(e);}finally{if(saved!=null)a.getContentResolver().delete(saved,null,null);}});}
 }
}
