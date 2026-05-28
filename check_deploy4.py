import urllib.request, re

r = urllib.request.urlopen('https://freecivilcad.vercel.app/assets/index-LAmATiGj.js')
content = r.read().decode('utf-8', errors='replace')

# Find the _onMouseDown method and check for 'line' and 'LINE' comparisons
print("=== Find 'line' comparisons in _onMouseDown ===")
# Look for the _onMouseDown method in deployed version
idx = content.find('_onMouseDown')
while idx >= 0:
    ctx = content[max(0,idx-10):idx+40]
    print(f"  at {idx}: ...{ctx}...")
    idx = content.find('_onMouseDown', idx+1)
    if idx > 200000:  # Only show first occurrence outside React lib
        break

# Now search for the mousedown handler pattern  
# In the minified version, look for the string patterns used in comparisons
print("\n=== All tool comparisons in mousedown handler ===")
# Look for patterns like `tool==="line"` or `tool==='line'`
for pattern in ['==="line"', "==='line'", '==="LINE"', "==='LINE'"]:
    matches = list(re.finditer(pattern, content))
    print(f"  {pattern}: {len(matches)} matches")
    for m in matches:
        ctx = content[max(0,m.start()-30):m.end()+10]
        print(f"    at {m.start()}: ...{ctx}...")

# Check _bindEvents
print("\n=== _bindEvents ===")
idx = content.find('_bindEvents')
if idx >= 0:
    ctx = content[idx:idx+300]
    print(ctx[:300])

# Compare with local
print("\n=== Local dist: tool comparisons ===")
with open('frontend/dist/assets/index-dFq3hvSJ.js', 'r', encoding='utf-8', errors='replace') as f:
    local = f.read()
for pattern in ['==="line"', "==='line'"]:
    matches = list(re.finditer(pattern, local))
    print(f"  {pattern}: {len(matches)} matches")
    for m in matches[:3]:
        ctx = local[max(0,m.start()-30):m.end()+10]
        print(f"    at {m.start()}: ...{ctx}...")
