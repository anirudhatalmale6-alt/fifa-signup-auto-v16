# Quick Icon Creation Guide

The extension requires three icon files. Here are the fastest ways to create them:

## Option 1: Use Online Icon Generator (Fastest)

1. Go to https://www.favicon-generator.org/
2. Upload any image or use their text generator
3. Download the generated icons
4. Rename and place them:
   - `favicon-16x16.png` → `icons/icon16.png`
   - `favicon-48x48.png` → `icons/icon48.png`
   - `favicon-128x128.png` → `icons/icon128.png`

## Option 2: Use Paint/Image Editor

1. Open any image editor (Paint, GIMP, Photoshop, etc.)
2. Create a new image:
   - Size: 128x128 pixels
   - Background: Any color (or transparent)
   - Add simple design: circle, square, or text "P"
3. Save as `icons/icon128.png`
4. Resize to 48x48 → Save as `icons/icon48.png`
5. Resize to 16x16 → Save as `icons/icon16.png`

## Option 3: Use Python Script (If you have Python)

Create a file `create_icons.py`:

```python
from PIL import Image, ImageDraw, ImageFont

# Create 128x128 icon
img = Image.new('RGB', (128, 128), color='#667eea')
draw = ImageDraw.Draw(img)
draw.ellipse([20, 20, 108, 108], fill='white', outline='white', width=2)
img.save('icons/icon128.png')

# Resize to other sizes
img48 = img.resize((48, 48))
img48.save('icons/icon48.png')

img16 = img.resize((16, 16))
img16.save('icons/icon16.png')
```

Run: `python create_icons.py`

## Option 4: Use Any Square Image

1. Find any square image online (or use a screenshot)
2. Resize to 128x128, 48x48, and 16x16
3. Save as `icon128.png`, `icon48.png`, `icon16.png` in `icons/` folder

## Minimum Requirement

**Even a solid colored square works!** The extension will function perfectly with simple placeholder icons.

Just create three PNG files:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon48.png` (48x48 pixels)
- `icons/icon128.png` (128x128 pixels)

Any image format converter can create these from a single image.

