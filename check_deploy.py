import urllib.request

# Check main page
r = urllib.request.urlopen('https://freecivilcad.vercel.app/')
html = r.read().decode('utf-8', errors='replace')
print("=== MAIN PAGE ===")
print("Status:", r.status)
print("HTML:", html[:500])
print()

# Extract JS path
import re
m = re.search(r'src="([^"]+\.js)"', html)
if m:
    js_path = m.group(1)
    print(f"JS path from HTML: {js_path}")
    full_url = f'https://freecivilcad.vercel.app{js_path}'
    print(f"Fetching: {full_url}")
    try:
        r2 = urllib.request.urlopen(full_url)
        print("JS Status:", r2.status)
        print("JS Content-Type:", r2.headers.get('Content-Type'))
        js_content = r2.read().decode('utf-8', errors='replace')
        print("JS Length:", len(js_content))
        print("JS First 200:", repr(js_content[:200]))
        
        # Search for key patterns
        for kw in ['setTool', 'toLowerCase', '_onMouseDown', '_makeEntity', 'LINE', 'handleToolChange', 'canvasRef']:
            idx = js_content.find(kw)
            print(f"  {kw}: {'FOUND at ' + str(idx) if idx >= 0 else 'NOT FOUND'}")
        
        # Check the specific critical pattern
        lo = js_content.find('toLowerCase')
        print(f"\nContext around toLowerCase:")
        if lo > 0:
            print(js_content[max(0,lo-40):lo+60])
        
        st = js_content.find('setTool')
        print(f"\nContext around setTool:")
        if st > 0:
            print(js_content[max(0,st-40):st+60])
            
    except Exception as e:
        print(f"Error fetching JS: {e}")
else:
    print("No JS file found in HTML")
