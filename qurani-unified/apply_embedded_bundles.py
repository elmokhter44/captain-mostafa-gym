#!/usr/bin/env python3
from pathlib import Path
import re, shutil, subprocess, zipfile, hashlib, json, sys

root=Path(sys.argv[1])
apks=Path(sys.argv[2])
assets=root/"android/app/src/main/assets"
java_root=root/"android/app/src/main/java"
manifest=root/"android/app/src/main/AndroidManifest.xml"

mapping=[
("01-AbuAmr-v1.0.4.apk","abuamr"),("02-IbnAmir-v1.0.4.apk","ibnamir"),
("03-IbnKathir-v1.0.4.apk","ibnkathir"),("04-Khalaf-Hamza-Sakt-v1.0.4.apk","khalafhamza"),
("05-AlKisai-v1.0.4.apk","alkisai"),("06-Khallad-Hamza-NoSakt-v1.0.4.apk","khalladhamza"),
("07-AbuJaafar-v1.0.4.apk","abujaafar"),("08-Yaqub-v1.0.4.apk","yaqub"),
("09-Khalaf10-v1.0.4.apk","khalaf10"),("10-Asim-v1.0.4.apk","asim"),
("11-Warsh-Azraq-v1.0.4.apk","warshazraq"),("12-Qalun-Qasr-v1.0.4.apk","qalunqasr")]

bundle_root=assets/"mushaf-bundles"
bundle_root.mkdir(parents=True,exist_ok=True)
res_root=root/"android/app/src/main/res"
for apk,slug in mapping:
    ap=apks/apk
    if not ap.is_file() or ap.stat().st_size==0: raise SystemExit(f"missing APK {apk}")
    out=bundle_root/slug
    out.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(ap) as z:
        data=z.read("assets/index.android.bundle")
        asset_names=z.namelist()
        non_pdf=[n for n in asset_names if n.startswith("assets/") and not n.endswith("/") and not n.startswith("assets/pdf/") and n!="assets/index.android.bundle"]
        resource_names=[n for n in asset_names if n.startswith(("res/drawable","res/mipmap")) and not n.endswith("/")]
        asset_bytes={n:z.read(n) for n in non_pdf}
        resource_bytes={n:z.read(n) for n in resource_names}
    (out/"index.android.bundle").write_bytes(data)
    for n,src_bytes in asset_bytes.items():
        rel=Path(n).relative_to("assets")
        dst=out/rel
        dst.parent.mkdir(parents=True,exist_ok=True)
        dst.write_bytes(src_bytes)
    # Per-mushaf asset pack: original asset paths are preserved so the standalone
    # bundle can keep using bundle-assets://pdf/... and all of its original assets.
    pack_dir=assets/"mushaf-packs"
    pack_dir.mkdir(parents=True,exist_ok=True)
    pack=pack_dir/f"{slug}.apk"
    with zipfile.ZipFile(ap) as zsrc, zipfile.ZipFile(pack,"w",zipfile.ZIP_DEFLATED,compresslevel=6) as zp:
        zp.writestr("AndroidManifest.xml", zsrc.read("AndroidManifest.xml"), compress_type=zipfile.ZIP_STORED)
        if "resources.arsc" in zsrc.namelist():
            zp.writestr("resources.arsc", zsrc.read("resources.arsc"), compress_type=zipfile.ZIP_STORED)
        for n in asset_names:
            if n.startswith("assets/") and not n.endswith("/") and n != "assets/index.android.bundle":
                zp.writestr(n, zsrc.read(n), compress_type=zipfile.ZIP_DEFLATED)
    if pack.stat().st_size <= 0: raise SystemExit(f"empty asset pack {pack}")
    for n,src_bytes in resource_bytes.items():
        rel=Path(n).relative_to("res")
        dst=res_root/rel
        dst.parent.mkdir(parents=True,exist_ok=True)
        if dst.exists():
            if hashlib.sha256(dst.read_bytes()).digest()!=hashlib.sha256(src_bytes).digest():
                print(f"RESOURCE_CONFLICT_KEEP_MASTER={rel}")
        else:
            dst.write_bytes(src_bytes)

# Find Android package and create a dedicated ReactActivity whose bundle is selected
# by qurani://mushaf/<slug>. ReactActivity owns the RN lifecycle; the previous hand-wired
# ReactRootView Activity could terminate immediately after the card tap.
java_files=list(java_root.rglob("MainActivity.java"))+list(java_root.rglob("MainActivity.kt"))
if not java_files: raise SystemExit("MainActivity source not found")
main=java_files[0].read_text(encoding="utf-8")
m=re.search(r"package\s+([A-Za-z0-9_.]+)",main)
if not m: raise SystemExit("MainActivity package not found")
pkg=m.group(1)
# Extract the RN component name without a fragile multi-quote regex.
# Supports Java `return "App";` and Kotlin `= "App"` forms.
marker="getMainComponentName"
pos=main.find(marker)
if pos < 0: raise SystemExit("Main component name method not found")
snippet=main[pos:pos+1200]
q=re.search(r"""["']([^"']+)["']""",snippet)
if not q: raise SystemExit("Main component name not found")
component=q.group(1)

# Register the launcher in the ORIGINAL app host as well. The series selector
# invokes MushafLauncher from this host; without this registration the card tap
# is a no-op/JS native-module failure. Use toMutableList().also{...} because
# PackageList(...).packages is exposed as an immutable Kotlin List in this RN setup.
main_apps=list(java_root.rglob("MainApplication.kt")) + list(java_root.rglob("MainApplication.java"))
if not main_apps:
    raise SystemExit("MainApplication source not found")
main_app=main_apps[0]
main_src=main_app.read_text(encoding="utf-8")
if "MushafLauncherPackage" not in main_src:
    qualified=f"{pkg}.MushafLauncherPackage"
    if "PackageList(this).packages" not in main_src:
        raise SystemExit("PackageList(this).packages not found in MainApplication")
    main_src=main_src.replace(
        "PackageList(this).packages",
        f"PackageList(this).packages.toMutableList().also {{ it.add({qualified}()) }}",
        1
    )
    main_app.write_text(main_src,encoding="utf-8")
pkg_dir=java_root/Path(pkg.replace(".","/"))
pkg_dir.mkdir(parents=True,exist_ok=True)
launcher=pkg_dir/"MushafLauncherModule.java"
launcher.write_text(f'''package {pkg};

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class MushafLauncherModule extends ReactContextBaseJavaModule {{
  public MushafLauncherModule(ReactApplicationContext context) {{ super(context); }}
  @Override public String getName() {{ return "MushafLauncher"; }}
  @ReactMethod public void open(String slug) {{
    if (slug == null || !slug.matches("[a-z0-9]+")) throw new IllegalArgumentException("Invalid mushaf id");
    Activity activity = getCurrentActivity();
    android.content.Context context = activity != null ? activity : getReactApplicationContext();
    Intent intent = new Intent(context, MushafBundleActivity.class);
    intent.setData(Uri.parse("qurani://mushaf/" + slug));
    if (activity == null) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    context.startActivity(intent);
  }}
}}
''',encoding="utf-8")
launcher_pkg=pkg_dir/"MushafLauncherPackage.java"
launcher_pkg.write_text(f'''package {pkg};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MushafLauncherPackage implements ReactPackage {{
  @Override public List<NativeModule> createNativeModules(ReactApplicationContext context) {{
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new MushafLauncherModule(context));
    return modules;
  }}
  @Override public List<ViewManager> createViewManagers(ReactApplicationContext context) {{
    return Collections.emptyList();
  }}
}}
''',encoding="utf-8")
# Do not modify MainApplication. The unified launcher package is registered only
# in the dedicated per-mushaf React Native host below, which avoids coupling the
# proven base application's Kotlin MainApplication to our embedded launcher.
activity=pkg_dir/"MushafBundleActivity.java"
host=pkg_dir/"MushafBundleHost.java"
host.write_text(f'''package {pkg};

import android.app.Application;
import com.facebook.react.PackageList;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultReactNativeHost;
import {pkg}.MushafLauncherPackage;
import java.util.List;

public class MushafBundleHost extends DefaultReactNativeHost {{
  private final String bundleAsset;
  public MushafBundleHost(Application application, String bundleAsset) {{
    super(application);
    this.bundleAsset = bundleAsset;
  }}
  @Override protected List<ReactPackage> getPackages() {{
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new MushafLauncherPackage());
    return packages;
  }}
  @Override protected String getJSMainModuleName() {{ return "index"; }}
  @Override protected String getBundleAssetName() {{ return bundleAsset; }}
  @Override public boolean getUseDeveloperSupport() {{ return false; }}
  @Override public boolean isNewArchEnabled() {{ return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED; }}
  @Override public boolean isHermesEnabled() {{ return BuildConfig.IS_HERMES_ENABLED; }}
}}
''',encoding="utf-8")
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
ms=manifest.read_text(encoding="utf-8")
if "MushafBundleActivity" not in ms:
    insertion='''\n        <activity android:name=".MushafBundleActivity" android:exported="true" android:launchMode="singleTop">\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="qurani" android:host="mushaf" />\n            </intent-filter>\n        </activity>\n'''
    ms=ms.replace("</application>",insertion+"    </application>")
    manifest.write_text(ms,encoding="utf-8")

print(f"EMBEDDED_STANDALONE_BUNDLES=12 COMPONENT={component} PACKAGE={pkg}")
