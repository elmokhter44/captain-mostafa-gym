import hashlib
from pathlib import Path

import fitz
import pikepdf

src = Path('qurani-app/android/app/src/main/assets/pdf/warsh_summary.pdf')
replacement = Path('.ci-assets/Doc2.pdf')
dst = Path('qurani-app/android/app/src/main/assets/pdf/warsh_summary_v104.pdf')

with fitz.open(src) as old_render:
    assert old_render.page_count == 4, old_render.page_count
    before = [
        hashlib.sha256(old_render[i].get_pixmap(alpha=False).samples).hexdigest()
        for i in range(3)
    ]

with pikepdf.open(src) as old_pdf, pikepdf.open(replacement, attempt_recovery=True) as new_pdf:
    assert len(old_pdf.pages) == 4, len(old_pdf.pages)
    assert len(new_pdf.pages) == 1, len(new_pdf.pages)
    out = pikepdf.Pdf.new()
    for i in range(3):
        out.pages.append(old_pdf.pages[i])
    out.pages.append(new_pdf.pages[0])
    out.save(dst, object_stream_mode=pikepdf.ObjectStreamMode.disable, compress_streams=True)

with fitz.open(dst) as check:
    assert check.page_count == 4, check.page_count
    after = [
        hashlib.sha256(check[i].get_pixmap(alpha=False).samples).hexdigest()
        for i in range(3)
    ]
    assert before == after, 'first three pages changed'
    pix = check[3].get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    vals = bytes(pix.samples)
    assert len(set(vals[::97])) > 20, 'page 4 rendered blank/flat'
    pix.save('/tmp/page4-doc2-reference.png')

print('DOC2_DIRECT_PDF_PAGE_OK=1')
