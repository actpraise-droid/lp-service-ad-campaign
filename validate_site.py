from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        attribute = "href" if tag in {"a", "link"} else "src"
        if tag in {"a", "link", "img", "script", "video", "source"}:
            value = values.get(attribute)
            if value:
                self.items.append((tag, attribute, value))


root = Path(__file__).resolve().parent
broken = []
pages = list(root.rglob("*.html"))

for page in pages:
    parser = References()
    parser.feed(page.read_text(encoding="utf-8"))
    for tag, attribute, value in parser.items:
        if value.startswith(("#", "http:", "https:", "mailto:", "tel:", "//", "data:")):
            continue
        relative = urlsplit(value).path
        if relative and not (page.parent / relative).exists():
            broken.append((page.relative_to(root), tag, attribute, value))

print(f"HTML pages: {len(pages)}")
print(f"Broken local references: {len(broken)}")
for item in broken:
    print(" | ".join(map(str, item)))

raise SystemExit(1 if broken else 0)
