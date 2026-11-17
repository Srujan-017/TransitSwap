"""QR codes for the poster (vector SVG), made with ReportLab's QR widget. Run: python docs/poster/tools/make_qr.py"""
from pathlib import Path
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderSVG

OUT = Path(__file__).resolve().parent.parent / "assets"
CODES = {
    "qr-live": "https://transit-swap.vercel.app",
    "qr-github": "https://github.com/Srujan-017/TransitSwap",
}
for name, url in CODES.items():
    widget = QrCodeWidget(url, barLevel="M", barBorder=0)
    x0, y0, x1, y1 = widget.getBounds()
    drawing = Drawing(x1 - x0, y1 - y0)
    drawing.add(widget)
    renderSVG.drawToFile(drawing, str(OUT / f"{name}.svg"))
    print(name, url)
