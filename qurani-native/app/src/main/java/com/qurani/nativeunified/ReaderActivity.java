package com.qurani.nativeunified;
import android.app.*;import android.os.*;import android.graphics.*;import android.graphics.pdf.PdfRenderer;import android.view.*;import android.widget.*;import java.io.*;
public class ReaderActivity extends Activity{
 PdfRenderer renderer;ParcelFileDescriptor fd;ImageView image;TextView counter;int page=0;float zoom=1f;String asset;
 @Override public void onCreate(Bundle state){super.onCreate(state);asset=getIntent().getStringExtra("asset");if(asset==null||!asset.startsWith("pdf/")||!asset.endsWith(".pdf")||asset.contains("..")){finish();return;}
 LinearLayout root=MainActivity.page(this);TextView heading=MainActivity.label(this,getIntent().getStringExtra("section"),18);root.addView(heading);
 image=new ImageView(this);image.setAdjustViewBounds(true);image.setScaleType(ImageView.ScaleType.FIT_CENTER);ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.addView(image);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
 LinearLayout actions=new LinearLayout(this);counter=MainActivity.label(this,"",15);
 Button previous=new Button(this);previous.setText("السابق");Button next=new Button(this);next.setText("التالي");Button bigger=new Button(this);bigger.setText("+");Button smaller=new Button(this);smaller.setText("-");
 actions.addView(previous,new LinearLayout.LayoutParams(0,-2,1));actions.addView(counter,new LinearLayout.LayoutParams(0,-2,2));actions.addView(next,new LinearLayout.LayoutParams(0,-2,1));root.addView(actions);
 LinearLayout zoomButtons=new LinearLayout(this);zoomButtons.addView(smaller,new LinearLayout.LayoutParams(0,-2,1));zoomButtons.addView(bigger,new LinearLayout.LayoutParams(0,-2,1));root.addView(zoomButtons);
 previous.setOnClickListener(v->{if(page>0){page--;render();}});next.setOnClickListener(v->{if(renderer!=null&&page<renderer.getPageCount()-1){page++;render();}});bigger.setOnClickListener(v->{zoom=Math.min(4f,zoom*1.3f);render();});smaller.setOnClickListener(v->{zoom=Math.max(1f,zoom/1.3f);render();});setContentView(root);
 try{File cacheDir=new File(getCacheDir(),"qurani-pdfs");cacheDir.mkdirs();String key=asset.replace('/','_');File file=new File(cacheDir,key);if(!file.isFile()||file.length()<1024){File partial=new File(cacheDir,key+".tmp");try(InputStream in=getAssets().open(asset);FileOutputStream out=new FileOutputStream(partial)){byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);}if(!partial.renameTo(file))throw new IOException("Could not prepare PDF");}
 fd=ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY);renderer=new PdfRenderer(fd);android.util.Log.i("QURANI","PDF_OPEN_OK="+asset+" pages="+renderer.getPageCount());render();}
 catch(Exception e){android.util.Log.e("QURANI","PDF_OPEN_ERROR="+asset,e);counter.setText("تعذر فتح الملف: "+e.getMessage());}
 }
 void render(){if(renderer==null)return;try(PdfRenderer.Page p=renderer.openPage(page)){int w=Math.max(700,(int)(getResources().getDisplayMetrics().widthPixels*zoom));int h=Math.max(1,(int)((double)p.getHeight()*w/p.getWidth()));if((long)w*h>12000000){w=(int)Math.sqrt(12000000.0*p.getWidth()/p.getHeight());h=(int)((double)p.getHeight()*w/p.getWidth());}Bitmap bmp=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);bmp.eraseColor(Color.WHITE);p.render(bmp,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);image.setImageBitmap(bmp);counter.setText((page+1)+" / "+renderer.getPageCount());android.util.Log.i("QURANI","PDF_RENDER_OK="+asset+" page="+page);}
 catch(Exception e){android.util.Log.e("QURANI","PDF_RENDER_ERROR="+asset,e);counter.setText("تعذر عرض هذه الصفحة");}}
 @Override protected void onDestroy(){super.onDestroy();if(renderer!=null)renderer.close();if(fd!=null)try{fd.close();}catch(IOException ignored){}}
}
