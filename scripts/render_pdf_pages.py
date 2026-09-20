import sys
from pathlib import Path
import pymupdf


pdf_path = Path(sys.argv[1]).resolve()
output_dir = Path(sys.argv[2]).resolve()
output_dir.mkdir(parents=True, exist_ok=True)
document = pymupdf.open(pdf_path)
matrix = pymupdf.Matrix(1.5, 1.5)
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    pixmap.save(output_dir / f"page-{index + 1}.png")
print(f"Rendered {len(document)} pages to {output_dir}")
