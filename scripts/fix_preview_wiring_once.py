from pathlib import Path
import re

path = Path('js/editor.js')
text = path.read_text(encoding='utf-8')
start = text.index('function wireEvents() {')
end = text.index('\nfunction syncBusinessToolsVisibility()', start)
block = text[start:end]

header = "function wireEvents() {\n  if (editorEventsWired) return;\n  editorEventsWired = true;\n"
if header not in block:
    raise SystemExit('wireEvents header not found')

# Remove existing Preview bindings first, then add them at the very top of wiring.
block = block.replace("  document.getElementById('preview-link')?.addEventListener('click', openFullPreview);\n", '')
block = block.replace("  document.getElementById('mobile-preview-button')?.addEventListener('click', openFullPreview);\n", '')
new_header = header + "\n  // Preview is core. Wire it before any optional editor controls.\n  document.getElementById('preview-link')?.addEventListener('click', openFullPreview);\n  document.getElementById('mobile-preview-button')?.addEventListener('click', openFullPreview);\n"
block = block.replace(header, new_header, 1)

# Any optional/missing control must not abort the rest of editor event wiring.
block = re.sub(
    r"document\.getElementById\('([^']+)'\)\.addEventListener",
    r"document.getElementById('\1')?.addEventListener",
    block,
)
block = block.replace(
    "document.querySelector('[data-close-dialog]').addEventListener",
    "document.querySelector('[data-close-dialog]')?.addEventListener",
)

text = text[:start] + block + text[end:]
path.write_text(text, encoding='utf-8')

editor = Path('editor.html')
html = editor.read_text(encoding='utf-8')
html = re.sub(r"js/editor\.js\?v=[^\"']+", 'js/editor.js?v=20260829-preview-wiring-2', html, count=1)
html = re.sub(r"js/config\.js\?v=[^\"']+", 'js/config.js?v=20260829-preview-wiring-2', html, count=1)
editor.write_text(html, encoding='utf-8')
