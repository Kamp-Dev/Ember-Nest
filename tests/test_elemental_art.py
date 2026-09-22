"""Run with python -B -m unittest discover -s tests -p test_elemental_art.py."""
import importlib.util
from pathlib import Path
import unittest
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('elemental_art', ROOT/'scripts/prepare-elemental-art.py')
art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(art)


class DragonFootprintTests(unittest.TestCase):
    def assert_footprint(self, image):
        self.assertEqual(image.size, (512, 512))
        box = image.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
        self.assertIsNotNone(box)
        width, height = box[2]-box[0], box[3]-box[1]
        self.assertGreaterEqual(max(width, height), 474)
        self.assertLessEqual(max(width, height), 482)
        self.assertLessEqual(abs((box[0]+box[2])/2-256), 3)
        self.assertLessEqual(abs((box[1]+box[3])/2-256), 3)

    def test_small_and_large_sources_have_same_visual_scale(self):
        for size in (100, 250, 800):
            with self.subTest(size=size):
                self.assert_footprint(art.square_sprite(Image.new('RGBA', (size, size//2), 'red')))

    def test_near_invisible_padding_does_not_shrink_subject(self):
        image = Image.new('RGBA', (300, 300), (255, 0, 0, 1))
        ImageDraw.Draw(image).rectangle((100, 100, 199, 199), fill=(255, 0, 0, 255))
        self.assert_footprint(art.square_sprite(image))

    def test_every_shipped_elemental_dragon_has_consistent_footprint(self):
        files = [p for p in (ROOT/'Images/elements').glob('*.png') if '-atlas-' not in p.name]
        self.assertEqual(len(files), 39)
        for path in files:
            with self.subTest(file=path.name), Image.open(path) as image:
                self.assert_footprint(image)


if __name__ == '__main__':
    unittest.main()
