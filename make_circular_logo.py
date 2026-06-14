from PIL import Image, ImageDraw

def make_circle(src_path, dst_path):
    # Open the image and convert to RGBA
    img = Image.open(src_path).convert("RGBA")
    
    # Get dimensions
    w, h = img.size
    
    # Create an alpha mask
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    
    # Draw a filled circle for the mask
    # A bit of padding can be added if needed, let's just use the full dimension
    padding = 10
    draw.ellipse((padding, padding, w-padding, h-padding), fill=255)
    
    # Apply the mask to the image
    circular_img = Image.new('RGBA', (w, h))
    circular_img.paste(img, (0,0), mask)
    
    # Draw a subtle circular border (light gray)
    # We can draw it directly on the circular_img
    draw_img = ImageDraw.Draw(circular_img)
    draw_img.ellipse((padding, padding, w-padding, h-padding), outline="#cccccc", width=15)
    
    # Save as PNG
    circular_img.save(dst_path)
    
    # Save as ICO (resizing might be needed for best compatibility)
    ico_img = circular_img.resize((256, 256), Image.Resampling.LANCZOS)
    ico_img.save('public/favicon.ico', format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])

make_circle('public/fox-logo.png', 'public/logo-circle.png')
print("Done")
