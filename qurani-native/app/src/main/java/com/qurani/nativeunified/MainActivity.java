package com.qurani.nativeunified;
import android.app.*;import android.content.*;import android.graphics.Color;import android.os.Bundle;import android.view.*;import android.widget.*;import java.io.*;import java.util.*;
public class MainActivity extends Activity {
 static final int BG=Color.rgb(7,31,26),GOLD=Color.rgb(218,187,113);
 public static TextView label(Activity a,String s,int sp){TextView t=new TextView(a);t.setText(s);t.setTextSize(sp);t.setTextColor(-1);t.setTextDirection(View.TEXT_DIRECTION_RTL);t.setGravity(Gravity.CENTER);t.setPadding(18,20,18,20);return t;}
 public static LinearLayout page(Activity a){LinearLayout v=new LinearLayout(a);v.setOrientation(1);v.setBackgroundColor(BG);v.setPadding(16,22,16,16);return v;}
 @Override public void onCreate(Bundle b){super.onCreate(b);ScrollView scroll=new ScrollView(this);LinearLayout root=page(this);TextView top=label(this,"سلسلة قرآني",30);top.setTextColor(GOLD);root.addView(top);
 try(BufferedReader r=new BufferedReader(new InputStreamReader(getAssets().open("catalog.tsv"),"UTF-8"))){String line;int index=0;while((line=r.readLine())!=null){String[] f=line.split("\t",2);if(f.length!=2)continue;String slug=f[0],title=f[1];index++;TextView card=label(this,String.format(java.util.Locale.ROOT,"%02d  %s",index,title),18);card.setBackgroundColor(Color.rgb(18,58,47));card.setContentDescription("mushaf-card-"+slug);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,6,0,8);root.addView(card,p);card.setOnClickListener(v->{Intent i=new Intent(this,SectionsActivity.class);i.putExtra("slug",slug);i.putExtra("title",title);startActivity(i);});}}
 catch(Exception e){root.addView(label(this,"تعذر تحميل المصاحف: "+e,16));}
 scroll.addView(root);setContentView(scroll);String check=getIntent().getStringExtra("verify_slug");if(check!=null&&check.matches("[a-z0-9]+")){Intent preview=new Intent(this,ReaderActivity.class);preview.putExtra("asset","pdf/"+check+"/reading.pdf");preview.putExtra("section","reading.pdf");startActivity(preview);}}
}
