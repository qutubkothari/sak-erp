from pathlib import Path
from PIL import Image, ImageDraw

folder = Path('tmp/saifseas-handbook/render')
pages = [Image.open(folder / f'page-{i}.png').convert('RGB') for i in range(1, 20)]
for start in range(0, len(pages), 6):
    group = pages[start:start + 6]
    thumb_width = 400
    thumb_height = max(round(image.height * thumb_width / image.width) for image in group)
    rows = (len(group) + 2) // 3
    canvas = Image.new('RGB', (thumb_width * 3, thumb_height * rows), 'white')
    draw = ImageDraw.Draw(canvas)
    for index, image in enumerate(group):
        thumb = image.resize((thumb_width, round(image.height * thumb_width / image.width)))
        x = (index % 3) * thumb_width
        y = (index // 3) * thumb_height
        canvas.paste(thumb, (x, y))
        draw.text((x + 10, y + 10), f'Page {start + index + 1}', fill='#9A7B45')
    canvas.save(folder / f'sheet-{start // 6 + 1}.jpg', quality=92)
