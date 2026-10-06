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
    (out/"index.android.bundle").write_bytes(data)
    # Keep all non-PDF assets from the original app namespaced for future native assets.
    for n in z.namelist():
        if n.startswith("assets/") and not n.endswith("/") and not n.startswith("assets/pdf/") and n!="assets/index.android.bundle":
            rel=Path(n).relative_to("assets")
            dst=out/rel
            dst.parent.mkdir(parents=True,exist_ok=True)
            dst.write_bytes(z.read(n))
    # Merge RN drawable/mipmap resources when identical; reject conflicting resources.
    for n in z.namelist():
        if not n.startswith(("res/drawable","res/mipmap")) or n.endswith("/"): continue
        rel=Path(n).relative_to("res")
        src_bytes=z.read(n)
        dst=res_root/rel
        dst.parent.mkdir(parents=True,exist_ok=True)
        if dst.exists():
            if hashlib.sha256(dst.read_bytes()).digest()!=hashlib.sha256(src_bytes).digest():
                # Preserve the already-built master resource; most series apps share the same UI assets.
                print(f"RESOURCE_CONFLICT_KEEP_MASTER={rel}")
        else:
            dst.write_bytes(src_bytes)

# Find Android package from the existing MainActivity and create a dedicated ReactActivity
# whose bundle is selected by the card URI: qurani://mushaf/<slug>.
java_files=list(java_root.rglob("MainActivity.java"))+list(java_root.rglob("MainActivity.kt"))
if not java_files: raise SystemExit("MainActivity source not found")
main=java_files[0].read_text(encoding="utf-8")
m=re.search(r"package\s+([A-Za-z0-9_.]+)",main)
if not m: raise SystemExit("MainActivity package not found")
pkg=m.group(1)
mc=re.search(r'getMainComponentName\(\).*?["\']([^"\']+)["\']',main,re.S)
if not mc: raise SystemExit("Main component name not found")
component=mc.group(1)
pkg_dir=java_root/Path(pkg.replace(".","/"))
pkg_dir.mkdir(parents=True,exist_ok=True)
activity=pkg_dir/"MushafBundleActivity.java"
activity.write_text(f'''package {pkg};

import android.net.Uri;
import android.os.Bundle;
import androidx.annotation.Nullable;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

public class MushafBundleActivity extends ReactActivity {{
  @Override
  protected String getMainComponentName() {{ return "{component}"; }}

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {{
    return new DefaultReactActivityDelegate(this, getMainComponentName(), BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {{
      @Override
      protected String getBundleAssetName() {{
        Uri uri = getPlainActivity().getIntent().getData();
        String slug = uri == null ? null : uri.getLastPathSegment();
        if (slug == null || !slug.matches("[a-z0-9]+")) slug = "abuamr";
        return "mushaf-bundles/" + slug + "/index.android.bundle";
      }}
    }};
  }}
}}
''',encoding="utf-8")

# Register the activity + custom URI scheme.
ms=manifest.read_text(encoding="utf-8")
if "MushafBundleActivity" not in ms:
    insertion='''\n        <activity android:name=".MushafBundleActivity" android:exported="false">\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="qurani" android:host="mushaf" />\n            </intent-filter>\n        </activity>\n'''
    ms=ms.replace("</application>",insertion+"    </application>")
    manifest.write_text(ms,encoding="utf-8")

print(f"EMBEDDED_STANDALONE_BUNDLES=12 COMPONENT={component} PACKAGE={pkg}")
