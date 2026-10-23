# dist/ の index.html・style.css・各スクリプトを1つにまとめ、オフラインで開ける HTML を作る。
# 使い方：python3 build-offline.py （出力：dist/<リポジトリ名>.html）
from pathlib import Path
import re

root = Path(__file__).resolve().parent
dist = root / "dist"
out = dist / f"{root.name}.html"
html = (dist / "index.html").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="style.css">',
                    '<style>' + (dist / "style.css").read_text(encoding="utf-8") + '</style>')
names = re.findall(r'<script src="([^"/]+\.js)" defer></script>', html)
html = re.sub(r'<script src="[^"/]+\.js" defer></script>', '', html)
scripts = '\n'.join((dist / n).read_text(encoding="utf-8").replace('</script', '<\\/script') for n in names)
html = html.replace('</body>', '<script>' + scripts + '</script></body>')
out.write_text(html, encoding="utf-8")
print(f"Built {out.relative_to(root)} (offline, self-contained)")
