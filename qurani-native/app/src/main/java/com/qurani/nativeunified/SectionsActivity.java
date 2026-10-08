package com.qurani.nativeunified;
import android.app.*;import android.content.*;import android.os.Bundle;import android.view.*;import android.widget.*;import java.io.*;import java.util.*;
public class SectionsActivity extends Activity{
 @Override public void onCreate(Bundle b){super.onCreate(b);String slug=getIntent().getStringExtra("slug"),title=getIntent().getStringExtra("title");ScrollView scroll=new ScrollView(this);LinearLayout root=MainActivity.page(this);root.addView(MainActivity.label(this,title,24));
 try{String[] files=getAssets().list("pdf/"+slug);if(files==null||files.length==0)throw new IOException("No PDF sections: "+slug);Arrays.sort(files,(a,c)->{if(a.equals("reading.pdf"))return -1;if(c.equals("reading.pdf"))return 1;return a.compareTo(c);});for(String name:files){if(!name.toLowerCase(java.util.Locale.ROOT).endsWith(".pdf"))continue;TextView card=MainActivity.label(this,name.equals("reading.pdf")?"فتح المصحف":name.replace(".pdf","").replace("-"," "),19);card.setContentDescription(name.equals("reading.pdf")?"فتح المصحف":"فتح "+name);card.setBackgroundColor(android.graphics.Color.rgb(18,58,47));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,8,0,8);root.addView(card,p);card.setOnClickListener(v->{Intent intent=new Intent(this,ReaderActivity.class);intent.putExtra("asset","pdf/"+slug+"/"+name);intent.putExtra("section",name);startActivity(intent);});}}
 catch(Exception e){root.addView(MainActivity.label(this,"خطأ في ملفات المصحف: "+e,16));}
 scroll.addView(root);setContentView(scroll);}
}
