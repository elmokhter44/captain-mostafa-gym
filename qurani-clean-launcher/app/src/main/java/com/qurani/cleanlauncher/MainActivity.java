package com.qurani.cleanlauncher;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private int dp(int size) { return (int)(size * getResources().getDisplayMetrics().density + .5f); }
    private TextView text(String str, int size, int color, boolean bold) {
        TextView v=new TextView(this);
        v.setText(str); v.setTextSize(size); v.setTextColor(color);
        v.setTextDirection(View.TEXT_DIRECTION_RTL);
        v.setGravity(Gravity.CENTER);
        if(bold) v.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        return v;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(7,31,26));
        getWindow().setNavigationBarColor(Color.rgb(7,31,26));
        ScrollView scroll=new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(7,31,26));
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setPadding(dp(18),dp(25),dp(18),dp(36));
        TextView logo=text("قرآني",36,Color.rgb(215,185,110),true);
        root.addView(logo,new LinearLayout.LayoutParams(-1,dp(76)));
        TextView title=text("سلسلة قرآني",26,Color.WHITE,true);
        root.addView(title,new LinearLayout.LayoutParams(-1,dp(54)));
        TextView hint=text("اختر المصحف أو القراءة",17,Color.rgb(215,185,110),true);
        root.addView(hint,new LinearLayout.LayoutParams(-1,dp(54)));
        int count=0;
        try(BufferedReader reader=new BufferedReader(new InputStreamReader(getAssets().open("mushafs.tsv"), StandardCharsets.UTF_8))) {
            String line;
            while((line=reader.readLine())!=null) {
                if(line.trim().isEmpty()) continue;
                String[] fields=line.split("\\t",3);
                if(fields.length!=3) throw new IllegalStateException("Invalid catalog row");
                final String slug=fields[0], target=fields[1], name=fields[2];
                count++;
                TextView card=text(String.format(java.util.Locale.ROOT,"%02d   %s",count,name),17,Color.WHITE,true);
                card.setGravity(Gravity.CENTER_VERTICAL|Gravity.RIGHT);
                card.setBackgroundColor(Color.rgb(13,48,40));
                card.setPadding(dp(18),dp(12),dp(18),dp(12));
                card.setContentDescription("mushaf-card-"+slug);
                card.setClickable(true);
                card.setOnClickListener(v -> {
                    Intent intent=getPackageManager().getLaunchIntentForPackage(target);
                    if(intent==null) {
                        Toast.makeText(this,"ثبّت تطبيق هذا المصحف أولاً: "+name,Toast.LENGTH_LONG).show();
                        return;
                    }
                    intent.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                    startActivity(intent);
                });
                LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(116));
                lp.setMargins(0,dp(5),0,dp(8));
                root.addView(card,lp);
            }
        } catch(Exception e) {
            TextView error=text("تعذر تحميل قائمة المصاحف: "+e.getMessage(),16,Color.RED,false);
            root.addView(error);
        }
        if(count!=12) {
            Toast.makeText(this,"خطأ: عدد المصاحف "+count,Toast.LENGTH_LONG).show();
        }
        scroll.addView(root);
        setContentView(scroll);
    }
}