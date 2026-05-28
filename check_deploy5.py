import urllib.request
r = urllib.request.urlopen('https://freecivilcad.vercel.app/assets/index-LAmATiGj.js')
content = r.read().decode('utf-8', errors='replace')

# Show the full _onMouseDown from deployed
idx = content.find('prototype._onMouseDown=function')
if idx < 0:
    idx = content.find('._onMouseDown=function')
    
if idx >= 0:
    # Find the closing of this function - look for the pattern of next prototype method
    # The function ends before the next prototype assignment or similar
    end_markers = ['prototype._onMouseMove', 'prototype._onMouseUp', 'prototype._onDblClick']
    end_pos = len(content)
    for marker in end_markers:
        m = content.find(marker, idx)
        if m > 0 and m < end_pos:
            end_pos = m
    
    print(content[idx:min(idx+4500, end_pos)])
    print(f"\n--- clipped at {min(idx+4500, end_pos)} ---")
