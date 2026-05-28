import urllib.request, re

r = urllib.request.urlopen('https://freecivilcad.vercel.app/assets/index-LAmATiGj.js')
content = r.read().decode('utf-8', errors='replace')

# Find all occurrences of toLowerCase
print("=== All toLowerCase occurrences ===")
for m in re.finditer(r'.{0,80}toLowerCase.{0,80}', content):
    print(f"  at {m.start()}: ...{m.group()}...")
    print()

# Find all occurrences of setTool
print("=== All setTool occurrences ===")
for m in re.finditer(r'.{0,50}setTool.{0,80}', content):
    print(f"  at {m.start()}: ...{m.group()}...")
    print()

# Find tool handling in App-like component (search for 'activeTool', 'handleTool')
print("=== activeTool / handleTool / onToolChange ===")
for kw in ['activeTool', 'onToolChange', 'handleTool', 'setActiveTool']:
    idx = content.find(kw)
    print(f"  {kw}: {'FOUND at ' + str(idx) if idx >= 0 else 'NOT FOUND'}")
    if idx >= 0:
        print(f"    Context: {content[max(0,idx-60):idx+100]}")

# Check how tools are handled - look for LINE button click
print("\n=== onClick handler in toolbar buttons ===")
for m in re.finditer(r'LINE.{0,30}(onClick|setTool)', content):
    print(f"  at {m.start()}: {m.group()}")

# Check for 'tool' prop in Canvas2D
print("\n=== Canvas2D/tool prop ===")
idx = content.find('Canvas2D')
if idx >= 0:
    print(f"  Canvas2D at {idx}: {content[idx:idx+200]}")
