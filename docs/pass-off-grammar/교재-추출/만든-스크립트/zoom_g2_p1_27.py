import pymupdf, sys, os
# usage: zoom_g2_p1_27.py page x0 y0 x1 y1 dpi outname
path = r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재2.pdf"
pno = int(sys.argv[1])
x0, y0, x1, y1 = [float(v) for v in sys.argv[2:6]]
dpi = int(sys.argv[6])
out = sys.argv[7]
doc = pymupdf.open(path)
page = doc[pno - 1]
pix = page.get_pixmap(dpi=dpi, clip=pymupdf.Rect(x0, y0, x1, y1))
os.makedirs(os.path.dirname(out), exist_ok=True)
pix.save(out)
print(out, pix.width, pix.height)
