from PIL import Image, ImageDraw
img = Image.open('public/takeabite-logo.png').convert("RGBA")
width, height = img.size
# Let's crop a square from the left side, starting a bit from the left edge.
# The pill has padding. The icon is roughly a circle.
# Let's just find the bounding box of non-transparent pixels, or just crop.
# Actually, we can just save it as is and let the browser scale it, but it's wide.
crop_size = min(width, height)
# Crop the leftmost square
icon = img.crop((0, 0, crop_size, crop_size))
icon.save('public/favicon.ico', format='ICO')
icon.save('public/icon.png', format='PNG')
print("Done")
