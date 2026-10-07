#!/usr/bin/env python3
from pathlib import Path
import re, zipfile, hashlib, sys

root=Path(sys.argv[1])
apks=Path(sys.argv[2])
assets=root/"android/app/src/main/assets"
java_root=root/"android/app/src/main/java"
manifest=root/"android/app/src/main/AndroidManifest.xml"

mapping=[
("01-AbuAmr-v1.0.4.apk","abuamr"),
("02-IbnAmir-v1.0.4.apk","ibnamir"),
("03-IbnKathir-v1.0.4.apk","ibnkathir"),
("04-Khalaf-Hamza-Sakt-v1.0.4.apk","khalafhamza"),
("05-AlKisai-v1.0.4.apk","alkisai"),
("06-Khallad-Hamza-NoSakt-v1.0.4.apk","khalladhamza"),
("07-AbuJaafar-v1.0.4.apk","abujaafar"),
("08-Yaqub-v1.0.4.apk","yaqub"),
("09-Khalaf10-v1.0.4.apk","khalaf10"),
("10-Asim-v1.0.4.apk","asim"),
("11-Warsh-Azraq-v1.0.4.apk","warshazraq"),
("12-Qalun-Qasr-v1.0.4.apk","qalunqasr"),
]

titles={
"abuamr":"المصحف المعلم بقراءة الإمام أبي عمرو البصري براوييه السوسي والدوري",
"ibnamir":"المصحف المعلم بقراءة الإمام ابن عامر الشامي برواية هشام وبالحاشية ما خالفه فيه ابن ذكوان",
"ibnkathir":"المصحف المعلم بقراءة الإمام عبدالله بن كثير براوييه البزي وقنبل",
"khalafhamza":"المصحف المعلم برواية الإمام خلف عن حمزة بوجه السكت على الساكن المفصول",
"alkisai":"المصحف المعلم بقراءة الإمام الكسائي براوييه الليث والدوري",
"khalladhamza":"المصحف المعلم برواية الإمام خلاد عن حمزة بوجه ترك السكت مطلقًا",
"abujaafar":"المصحف المعلم بقراءة الإمام أبي جعفر المدني براوييه ابن وردان وابن جماز",
"yaqub":"المصحف المعلم بقراءة الإمام يعقوب الحضرمي براوييه رويس وروح",
"khalaf10":"المصحف المعلم بقراءة الإمام خلف العاشر البزار براوييه إسحاق وإدريس",
"asim":"المصحف المعلم بقراءة الإمام عاصم ابن أبي النجود برواية حفص وبالحاشية ما خالفه فيه شعبة",
"warshazraq":"مصحف ورش عن نافع من طريق الأزرق",
"qalunqasr":"مصحف قالون عن نافع بوجه قصر المنفصل وإسكان ميم الجمع",
}

bundle_root=assets/"mushaf-bundles"
pack_dir=assets/"mushaf-packs"
bundle_root.mkdir(parents=True,exist_ok=True)
pack_dir.mkdir(parents=True,exist_ok=True)
res_root=root/"android/app/src/main/res"

for apk,slug in mapping:
    ap=apks/apk
    if not ap.is_file() or ap.stat().st_size==0:
        raise SystemExit(f"missing APK {apk}")
    out=bundle_root/slug
    out.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(ap) as z:
        names=z.namelist()
        (out/"index.android.bundle").write_bytes(z.read("assets/index.android.bundle"))
        for n in names:
            if n.startswith("assets/") and not n.endswith("/") and not n.startswith("assets/pdf/") and n!="assets/index.android.bundle":
                dst=out/Path(n).relative_to("assets")
                dst.parent.mkdir(parents=True,exist_ok=True)
                dst.write_bytes(z.read(n))
        for n in names:
            if n.startswith(("res/drawable","res/mipmap")) and not n.endswith("/"):
                dst=res_root/Path(n).relative_to("res")
                dst.parent.mkdir(parents=True,exist_ok=True)
                src=z.read(n)
                if not dst.exists():
                    dst.write_bytes(src)
                elif hashlib.sha256(dst.read_bytes()).digest()!=hashlib.sha256(src).digest():
                    print(f"RESOURCE_CONFLICT_KEEP_MASTER={Path(n).relative_to('res')}")
        pack=pack_dir/f"{slug}.apk"
        with zipfile.ZipFile(pack,"w",zipfile.ZIP_DEFLATED,compresslevel=6) as zp:
            zp.writestr("AndroidManifest.xml",z.read("AndroidManifest.xml"),compress_type=zipfile.ZIP_STORED)
            if "resources.arsc" in names:
                zp.writestr("resources.arsc",z.read("resources.arsc"),compress_type=zipfile.ZIP_STORED)
            for n in names:
                if n.startswith("assets/") and not n.endswith("/") and n!="assets/index.android.bundle":
                    zp.writestr(n,z.read(n),compress_type=zipfile.ZIP_DEFLATED)
        if pack.stat().st_size<=0:
            raise SystemExit(f"empty asset pack {pack}")

java_files=list(java_root.rglob("MainActivity.java"))+list(java_root.rglob("MainActivity.kt"))
if not java_files:
    raise SystemExit("MainActivity source not found")
main=java_files[0].read_text(encoding="utf-8")
m=re.search(r"package\s+([A-Za-z0-9_.]+)",main)
if not m:
    raise SystemExit("MainActivity package not found")
pkg=m.group(1)
pos=main.find("getMainComponentName")
if pos<0:
    raise SystemExit("Main component name method not found")
snippet=main[pos:pos+1200]
q=re.search(r'''["']([^"']+)["']''',snippet)
if not q:
    raise SystemExit("Main component name not found")
component=q.group(1)
pkg_dir=java_root/Path(pkg.replace(".","/"))
pkg_dir.mkdir(parents=True,exist_ok=True)

host=pkg_dir/"MushafBundleHost.java"
host.write_text(f'''package {pkg};

import android.app.Application;
import com.facebook.react.PackageList;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultReactNativeHost;
import java.util.List;

public class MushafBundleHost extends DefaultReactNativeHost {{
  private final String bundleAsset;
  public MushafBundleHost(Application application, String bundleAsset) {{
    super(application);
    this.bundleAsset = bundleAsset;
  }}
  @Override protected List<ReactPackage> getPackages() {{
    return new PackageList(this).getPackages();
  }}
  @Override protected String getJSMainModuleName() {{ return "index"; }}
  @Override protected String getBundleAssetName() {{ return bundleAsset; }}
  @Override public boolean getUseDeveloperSupport() {{ return false; }}
  @Override public boolean isNewArchEnabled() {{ return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED; }}
  @Override public boolean isHermesEnabled() {{ return BuildConfig.IS_HERMES_ENABLED; }}
}}
''',encoding="utf-8")

activity=pkg_dir/"MushafBundleActivity.java"
activity.write_text(f'''package {pkg};

import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.content.res.AssetManager;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactNativeHost;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.lang.reflect.Method;

public class MushafBundleActivity extends ReactActivity {{
  private static final String TAG = "QURANI";
  private MushafBundleHost host;

  private String selectedSlug() {{
    Uri uri = getIntent() == null ? null : getIntent().getData();
    String slug = uri == null ? null : uri.getLastPathSegment();
    return slug != null && slug.matches("[a-z0-9]+") ? slug : "abuamr";
  }}

  private void installAssetPack(String slug) throws Exception {{
    File dir = new File(getFilesDir(), "mushaf-packs");
    if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Cannot create asset pack dir");
    File pack = new File(dir, slug + ".apk");
    if (!pack.exists() || pack.length() < 1024) {{
      try (InputStream in = getAssets().open("mushaf-packs/" + slug + ".apk");
           FileOutputStream out = new FileOutputStream(pack)) {{
        byte[] buf = new byte[1024 * 1024];
        int n;
        while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
      }}
    }}
    AssetManager am = getAssets();
    Method addAssetPath = AssetManager.class.getDeclaredMethod("addAssetPath", String.class);
    addAssetPath.setAccessible(true);
    Object result = addAssetPath.invoke(am, pack.getAbsolutePath());
    int cookie = result instanceof Integer ? (Integer) result : 0;
    if (cookie == 0) throw new IllegalStateException("AssetManager rejected " + pack.getAbsolutePath());
    Log.i(TAG, "ASSET_PACK_OK=" + slug + " cookie=" + cookie);
    try (InputStream test = am.open("pdf/reading.pdf")) {{
      if (test.read() < 0) throw new IllegalStateException("Selected reading.pdf is empty");
    }}
    Log.i(TAG, "ASSET_PDF_OK=" + slug);
  }}

  @Override protected ReactActivityDelegate createReactActivityDelegate() {{
    return new ReactActivityDelegate(this, "{component}") {{
      @Override protected ReactNativeHost getReactNativeHost() {{
        return host;
      }}
    }};
  }}

  @Override protected void onCreate(Bundle savedInstanceState) {{
    String slug = selectedSlug();
    try {{
      installAssetPack(slug);
      String bundle = "mushaf-bundles/" + slug + "/index.android.bundle";
      Log.i(TAG, "BUNDLE_START=" + slug + " asset=" + bundle);
      host = new MushafBundleHost(getApplication(), bundle);
    }} catch (Exception e) {{
      Log.e(TAG, "BUNDLE_BOOT_ERROR=" + slug, e);
      throw new RuntimeException(e);
    }}
    super.onCreate(savedInstanceState);
  }}
}}
''',encoding="utf-8")

slug_java=",".join('"'+slug+'"' for _,slug in mapping)
title_java=",".join('"'+titles[slug].replace('\\','\\\\').replace('"','\\"')+'"' for _,slug in mapping)
selector=pkg_dir/"UnifiedSelectorActivity.java"
selector.write_text(f'''package {pkg};

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class UnifiedSelectorActivity extends Activity {{
  private static final String[] IDS = new String[]{{{slug_java}}};
  private static final String[] TITLES = new String[]{{{title_java}}};

  private int dp(float v) {{
    return Math.round(v * getResources().getDisplayMetrics().density);
  }}

  private TextView text(String value, int sp, int color, boolean bold) {{
    TextView t = new TextView(this);
    t.setText(value);
    t.setTextSize(sp);
    t.setTextColor(color);
    t.setGravity(Gravity.CENTER);
    t.setTextDirection(View.TEXT_DIRECTION_RTL);
    if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
    return t;
  }}

  @Override protected void onCreate(Bundle state) {{
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.rgb(7,31,26));
    getWindow().setNavigationBarColor(Color.rgb(7,31,26));

    ScrollView scroll = new ScrollView(this);
    scroll.setFillViewport(true);
    scroll.setBackgroundColor(Color.rgb(7,31,26));

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setGravity(Gravity.CENTER_HORIZONTAL);
    root.setPadding(dp(18), dp(26), dp(18), dp(40));
    root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

    TextView brand = text("قرآني", 34, Color.rgb(215,185,110), true);
    root.addView(brand, new LinearLayout.LayoutParams(-1, dp(64)));
    TextView series = text("سلسلة قرآني", 28, Color.WHITE, true);
    root.addView(series, new LinearLayout.LayoutParams(-1, dp(54)));
    TextView choose = text("اختر المصحف أو القراءة", 18, Color.rgb(215,185,110), true);
    LinearLayout.LayoutParams chooseLp = new LinearLayout.LayoutParams(-1, dp(50));
    chooseLp.setMargins(0,0,0,dp(12));
    root.addView(choose, chooseLp);

    for (int i=0;i<IDS.length;i++) {{
      final String slug = IDS[i];
      Button card = new Button(this);
      card.setAllCaps(false);
      card.setText(String.format("%02d  %s", i+1, TITLES[i]));
      card.setTextSize(16);
      card.setTextColor(Color.WHITE);
      card.setGravity(Gravity.CENTER_VERTICAL | Gravity.RIGHT);
      card.setTextDirection(View.TEXT_DIRECTION_RTL);
      card.setPadding(dp(18),dp(10),dp(18),dp(10));
      card.setBackgroundColor(Color.rgb(13,48,40));
      card.setContentDescription("mushaf-card-" + slug + "، " + TITLES[i]);
      card.setOnClickListener(v -> {{
        Intent intent = new Intent(UnifiedSelectorActivity.this, MushafBundleActivity.class);
        intent.setData(Uri.parse("qurani://mushaf/" + slug));
        startActivity(intent);
      }});
      LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, dp(108));
      lp.setMargins(0,dp(7),0,dp(7));
      root.addView(card, lp);
    }}
    scroll.addView(root);
    setContentView(scroll);
  }}
}}
''',encoding="utf-8")

ms=manifest.read_text(encoding="utf-8")
ms=re.sub(r'<intent-filter>\s*<action android:name="android.intent.action.MAIN"\s*/>\s*<category android:name="android.intent.category.LAUNCHER"\s*/>\s*</intent-filter>','',ms,flags=re.S)
ms=re.sub(r'<activity android:name="\\.UnifiedSelectorActivity"[^>]*(?:/>|>.*?</activity>)','',ms,flags=re.S)
ms=re.sub(r'<activity android:name="\\.MushafBundleActivity"[^>]*(?:/>|>.*?</activity>)','',ms,flags=re.S)
insert='''
        <activity android:name=".UnifiedSelectorActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <activity android:name=".MushafBundleActivity" android:exported="false" android:launchMode="standard"/>
'''
if "</application>" not in ms:
    raise SystemExit("manifest application end not found")
ms=ms.replace("</application>",insert+"    </application>")
manifest.write_text(ms,encoding="utf-8")

print(f"NATIVE_SELECTOR_SHELL=1 EMBEDDED_STANDALONE_BUNDLES=12 COMPONENT={component} PACKAGE={pkg}")
