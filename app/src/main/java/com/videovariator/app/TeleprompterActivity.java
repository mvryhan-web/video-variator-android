package com.videovariator.app;

import android.Manifest;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.video.FallbackStrategy;
import androidx.camera.video.MediaStoreOutputOptions;
import androidx.camera.video.PendingRecording;
import androidx.camera.video.Quality;
import androidx.camera.video.QualitySelector;
import androidx.camera.video.Recorder;
import androidx.camera.video.Recording;
import androidx.camera.video.VideoCapture;
import androidx.camera.video.VideoRecordEvent;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.Locale;

/** Local camera recording. Prompt text is an overlay for the reader, not burned into video. */
public class TeleprompterActivity extends ComponentActivity {
    private PreviewView preview;
    private ScrollView scroll;
    private TextView status;
    private Button start, swap, share;
    private ProcessCameraProvider provider;
    private VideoCapture<Recorder> capture;
    private Recording recording;
    private Uri saved;
    private boolean front = true, scrolling = false, starting = false;
    private float position, pixelsPerSecond;
    private long previous;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean ru() { return Locale.getDefault().getLanguage().equals("ru"); }
    private String text(String en, String ru) { return ru() ? ru : en; }
    private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private final Runnable tick = new Runnable() { public void run() {
        if (!scrolling) return;
        long now = SystemClock.uptimeMillis(); position += (now - previous) * pixelsPerSecond / 1000f; previous = now;
        scroll.scrollTo(0, (int) position); handler.postDelayed(this, 16);
    }};
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this); root.setBackgroundColor(Color.BLACK);
        preview = new PreviewView(this); preview.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        root.addView(preview, new FrameLayout.LayoutParams(-1,-1));
        scroll = new ScrollView(this); scroll.setBackgroundColor(0x66000000); scroll.setVerticalScrollBarEnabled(false);
        TextView prompt = new TextView(this); prompt.setTextColor(Color.WHITE); prompt.setGravity(Gravity.CENTER);
        prompt.setTextSize(Math.max(24, Math.min(72, getIntent().getIntExtra("font",36))));
        prompt.setPadding(dp(22),dp(28),dp(22),dp(220)); prompt.setText(getIntent().getStringExtra("script"));
        if (getIntent().getBooleanExtra("mirror",false)) prompt.setScaleX(-1);
        scroll.addView(prompt); FrameLayout.LayoutParams overlay = new FrameLayout.LayoutParams(-1,dp(280),Gravity.TOP); overlay.topMargin=dp(70); root.addView(scroll,overlay);
        pixelsPerSecond = dp(Math.max(10,Math.min(100,getIntent().getIntExtra("speed",30))));
        LinearLayout controls = new LinearLayout(this); controls.setOrientation(LinearLayout.VERTICAL); controls.setPadding(dp(16),dp(12),dp(16),dp(28)); controls.setBackgroundColor(0xdd101522);
        status = new TextView(this); status.setTextColor(Color.WHITE); status.setText(text("Allow camera and microphone to record. Text stays off the saved video.","Разрешите камеру и микрофон. Текст не попадёт в сохранённое видео.")); controls.addView(status);
        LinearLayout buttons = new LinearLayout(this); start=button(text("Start","Старт")); swap=button(text("Flip camera","Сменить камеру")); share=button(text("Share","Поделиться"));
        buttons.addView(start,new LinearLayout.LayoutParams(0,dp(52),1)); buttons.addView(swap,new LinearLayout.LayoutParams(0,dp(52),1)); buttons.addView(share,new LinearLayout.LayoutParams(0,dp(52),1));controls.addView(buttons);
        root.addView(controls,new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM));setContentView(root);
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        start.setEnabled(false);share.setEnabled(false);swap.setEnabled(false);
        start.setOnClickListener(v->{if(recording!=null)stopRecording();else if(!starting)startRecording();});
        swap.setOnClickListener(v->{front=!front;bindCamera();});
        share.setOnClickListener(v->{if(saved!=null){try {Intent i=new Intent(Intent.ACTION_SEND).setType("video/mp4").putExtra(Intent.EXTRA_STREAM,saved).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);i.setClipData(android.content.ClipData.newRawUri("Video Uniquifier",saved));startActivity(Intent.createChooser(i,text("Share video","Поделиться видео")));}catch(Exception e){status.setText(text("No sharing app is available.","Нет приложения для отправки видео."));}}});
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){if(recording!=null||starting){stopRecording();}else finish();}});
        if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.CAMERA,Manifest.permission.RECORD_AUDIO},42);}else loadCamera();
    }
    private Button button(String label){Button b=new Button(this);b.setText(label);b.setTextSize(12);b.setAllCaps(false);return b;}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);if(request==42){if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)loadCamera();else status.setText(text("Camera access was denied. Reopen this screen to try again.","Доступ к камере отклонён. Откройте этот экран снова, чтобы повторить."));}}
    private void loadCamera(){ListenableFuture<ProcessCameraProvider> future=ProcessCameraProvider.getInstance(this);future.addListener(()->{try{provider=future.get();bindCamera();}catch(Exception e){status.setText(text("Camera is unavailable.","Камера недоступна."));}},ContextCompat.getMainExecutor(this));}
    private void bindCamera(){if(provider==null||isDestroyed())return;try{
        CameraSelector selector=front?CameraSelector.DEFAULT_FRONT_CAMERA:CameraSelector.DEFAULT_BACK_CAMERA;
        if(!provider.hasCamera(selector)){front=!front;selector=front?CameraSelector.DEFAULT_FRONT_CAMERA:CameraSelector.DEFAULT_BACK_CAMERA;}
        Preview p=new Preview.Builder().build();p.setSurfaceProvider(preview.getSurfaceProvider());
        Recorder recorder=new Recorder.Builder().setQualitySelector(QualitySelector.from(Quality.HD,FallbackStrategy.lowerQualityOrHigherThan(Quality.HD))).build();
        capture=VideoCapture.withOutput(recorder);provider.unbindAll();provider.bindToLifecycle(this,selector,p,capture);start.setEnabled(true);swap.setEnabled(true);
        status.setText(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED?text("Ready · 720p when supported · saved locally","Готово · 720p, если поддерживается · локальное сохранение"):text("Microphone denied: video will have no audio.","Микрофон отключён: видео будет без звука."));
    }catch(Exception e){start.setEnabled(false);status.setText(text("This camera cannot record. Try another camera.","Эта камера не может записывать. Попробуйте другую."));}}
    private void startRecording(){if(capture==null)return;try{
        starting=true;start.setEnabled(false);swap.setEnabled(false);share.setEnabled(false);saved=null;scroll.scrollTo(0,0);position=0;
        ContentValues values=new ContentValues();values.put(MediaStore.MediaColumns.DISPLAY_NAME,"VideoUniquifier-Prompter-"+System.currentTimeMillis()+".mp4");values.put(MediaStore.MediaColumns.MIME_TYPE,"video/mp4");if(Build.VERSION.SDK_INT>=29)values.put(MediaStore.MediaColumns.RELATIVE_PATH,"Movies/VideoUniquifier");
        MediaStoreOutputOptions output=new MediaStoreOutputOptions.Builder(getContentResolver(),MediaStore.Video.Media.EXTERNAL_CONTENT_URI).setContentValues(values).build();
        PendingRecording pending=capture.getOutput().prepareRecording(this,output);if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)pending=pending.withAudioEnabled();
        recording=pending.start(ContextCompat.getMainExecutor(this),event->{
            if(event instanceof VideoRecordEvent.Start){starting=false;scrolling=true;previous=SystemClock.uptimeMillis();handler.post(tick);start.setText(text("Stop","Стоп"));start.setEnabled(true);status.setText(text("Recording…","Запись…"));}
            else if(event instanceof VideoRecordEvent.Finalize){VideoRecordEvent.Finalize f=(VideoRecordEvent.Finalize)event;stopScroll();recording=null;starting=false;start.setText(text("Start","Старт"));start.setEnabled(true);swap.setEnabled(true);
                if(!f.hasError()){saved=f.getOutputResults().getOutputUri();share.setEnabled(saved!=null&&!Uri.EMPTY.equals(saved));status.setText(text("Saved to Gallery / Movies / VideoUniquifier","Сохранено в Галерею / Movies / VideoUniquifier"));}
                else status.setText(text("Recording failed. Check camera permissions and free storage.","Запись не удалась. Проверьте разрешения камеры и свободное место."));}
        });
    }catch(Exception e){starting=false;recording=null;start.setEnabled(true);swap.setEnabled(true);status.setText(text("Could not start recording. Check permissions and storage.","Не удалось начать запись. Проверьте разрешения и память."));}}
    private void stopScroll(){scrolling=false;handler.removeCallbacks(tick);}
    private void stopRecording(){stopScroll();if(recording!=null){start.setEnabled(false);recording.stop();}}
    @Override protected void onStop(){stopRecording();super.onStop();}
    @Override protected void onDestroy(){stopScroll();if(recording!=null)recording.close();super.onDestroy();}
}
