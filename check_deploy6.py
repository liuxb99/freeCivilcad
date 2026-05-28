import urllib.request
r = urllib.request.urlopen('https://freecivilcad.vercel.app/assets/index-LAmATiGj.js')
content = r.read().decode('utf-8', errors='replace')

# Find _bindEvents
idx = content.find('prototype._bindEvents')
if idx < 0:
    idx = content.find('._bindEvents=function')
if idx < 0:
    idx = content.find('_bindEvents=function')
    
if idx >= 0:
    # Get the function body
    print(content[idx:idx+1000])
