import urllib.request, re

r = urllib.request.urlopen('https://freecivilcad.vercel.app/assets/index-LAmATiGj.js')
content = r.read().decode('utf-8', errors='replace')

# 1. Show the deployed setTool method (at position 163093)
print("=== Deployed setTool ===")
st = content.find('setTool(t){if(t===this._tool')
if st >= 0:
    # Find the end - look for the next function or a `}` that closes this method
    # Based on minification, the method body starts after setTool and ends before the next `get`
    end = content.find('getTool', st)
    if end < 0:
        end = st + 300
    print(content[st:end+20])
    print()

# 2. Show the handleToolChange equivalent
print("=== handleToolChange callback ===")
idx = content.find('engine.setTool(f.toLowerCase')
if idx >= 0:
    start = max(0, idx - 200)
    end = min(len(content), idx + 150)
    snippet = content[start:end]
    print(snippet)
    print()

# 3. Show the useCanvas2D setTool call
print("=== useCanvas2D useEffect setTool ===")
idx = content.find('i.setTool(t.tool')
if idx >= 0:
    start = max(0, idx - 100)
    end = min(len(content), idx + 100)
    print(content[start:end])
    print()

# 4. Show the toolbar onClick handler
print("=== Toolbar onClick ===")
# Find the LINE button and its onClick handler
idx = content.find('"LINE"')
while idx >= 0:
    ctx = content[max(0,idx-30):idx+80]
    if 'label' not in ctx:
        idx = content.find('"LINE"', idx+1)
        continue
    print(f"  at {idx}: {ctx}")
    idx = content.find('"LINE"', idx+1)
    if idx > 225000:  # Only check first few
        break

# 5. Show the _onMouseDown line check
print("\n=== _onMouseDown 'line' check ===")
idx = content.find("'line'")
while idx >= 0:
    if 'line' in content[max(0,idx-5):idx+5]:
        ctx = content[max(0,idx-20):idx+30]
        print(f"  at {idx}: {ctx}")
        break
    idx = content.find("'line'", idx+1)
    if idx > 200000:
        break

# 6. Check the local dist setTool for comparison
print("\n=== Local dist setTool ===")
with open('frontend/dist/assets/index-dFq3hvSJ.js', 'r', encoding='utf-8', errors='replace') as f:
    local = f.read()
st_local = local.find('setTool(t){if(t=')
if st_local >= 0:
    print(local[st_local:st_local+200])
else:
    # Try other patterns
    st_local = local.find('setTool(t){')
    if st_local >= 0:
        print(local[st_local:st_local+200])
    else:
        st_local = local.find('setTool')
        if st_local >= 0:
            print(f"Found at {st_local}: {local[st_local:st_local+200]}")
