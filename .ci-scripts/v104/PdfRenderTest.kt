package com.qurani.app
import android.graphics.*
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.*
import org.junit.runner.RunWith
import java.io.*
@RunWith(AndroidJUnit4::class) class PdfRenderTest {
 @Test fun page4IsNotGray(){
  val c=InstrumentationRegistry.getInstrumentation().targetContext
  val f=File(c.cacheDir,"p.pdf"); c.assets.open("pdf/warsh_summary_v104.pdf").use{a->FileOutputStream(f).use{a.copyTo(it)}}
  val fd=ParcelFileDescriptor.open(f,ParcelFileDescriptor.MODE_READ_ONLY); val r=PdfRenderer(fd); val p=r.openPage(3)
  val w=720; val h=p.height*w/p.width; val b=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888); b.eraseColor(Color.WHITE); p.render(b,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
  var gray=0; var dark=0; var n=0
  for(y in h/3 until h step 8) for(x in 0 until w step 8){ val q=b.getPixel(x,y); val rr=Color.red(q); val g=Color.green(q); val bb=Color.blue(q); if(kotlin.math.abs(rr-128)<12&&kotlin.math.abs(g-128)<12&&kotlin.math.abs(bb-128)<12)gray++; if((rr+g+bb)/3<100)dark++; n++ }
  p.close(); r.close(); fd.close(); Assert.assertTrue("gray="+gray.toDouble()/n,gray.toDouble()/n<0.12); Assert.assertTrue("dark="+dark.toDouble()/n,dark.toDouble()/n>0.01)
 }
}
