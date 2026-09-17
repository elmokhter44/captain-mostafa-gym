import base64
import fitz
from PIL import Image
from pathlib import Path

parts = sorted(Path('.ci-assets/q50-b64').glob('part*'))
assert parts, 'replacement image chunks missing'
payload = ''.join(''.join(p.read_text().split()) for p in parts)
payload += '=' * (-len(payload) % 4)
jpg = Path('.ci-assets/q9.jpg')
jpg.write_bytes(base64.b64decode(payload, validate=False))
assert jpg.stat().st_size > 20000, jpg.stat().st_size
with Image.open(jpg) as check:
    check.verify()
with Image.open(jpg) as check:
    assert check.width >= 500 and check.height >= 700, (check.width, check.height)
    print('REPLACEMENT_IMAGE_SIZE=', check.size)
    rgb = check.convert('RGB')
    if rgb.width < 900:
        target_w = 1056
        target_h = round(rgb.height * target_w / rgb.width)
        rgb = rgb.resize((target_w, target_h), Image.Resampling.LANCZOS)

safe=Path('/tmp/q9-safe.jpg')
rgb.save(safe,'JPEG',quality=95,subsampling=0,progressive=False,optimize=False,icc_profile=None)
Image.open(safe).save('/tmp/q9-safe.pdf','PDF',resolution=127.5,quality=95,subsampling=0)
old=fitz.open('qurani-app/android/app/src/main/assets/pdf/warsh_summary.pdf'); src=fitz.open('/tmp/q9-safe.pdf'); rect=old[3].rect
one=fitz.open(); p=one.new_page(width=rect.width,height=rect.height); p.show_pdf_page(p.rect,src,0,keep_proportion=False)
meta=one[0].get_images(full=True); assert len(meta)==1 and meta[0][5]=='DeviceRGB',meta
out=fitz.open(); out.insert_pdf(old,from_page=0,to_page=2); out.insert_pdf(one); out.save('qurani-app/android/app/src/main/assets/pdf/warsh_summary_v104.pdf',garbage=4,deflate=True)
chk=fitz.open('qurani-app/android/app/src/main/assets/pdf/warsh_summary_v104.pdf'); assert chk.page_count==4
pix=chk[3].get_pixmap(alpha=False); assert len(set(bytes(pix.samples)[::101]))>20
print('PDF_PAGE_9_SAFE=1')
