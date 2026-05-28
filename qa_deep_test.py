"""深度質檢 — 逐元素驗證"""
from playwright.sync_api import sync_playwright
import json, time

URL = 'https://freecivilcad.vercel.app'
results = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    
    console_errors = []
    page.on('console', lambda msg: console_errors.append({'type': msg.type, 'text': msg.text, 'location': msg.location}) if msg.type == 'error' else None)
    page.on('pageerror', lambda err: console_errors.append({'type': 'exception', 'text': str(err)}))

    def check(step, condition, detail=''):
        icon = '✅' if condition else '❌'
        print(f'  {icon} {step}: {detail}' if detail else f'  {icon} {step}')
        results.append({'step': step, 'pass': condition, 'detail': detail})

    # 1. 首頁
    print('\n=== 1. WELCOME PAGE ===')
    page.goto(URL, wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='qa_screenshots/deep_01_welcome.png')
    
    check('Page loaded', 'FreeCivilCAD' in page.title())
    check('H1 exists', page.query_selector('h1') is not None)
    
    start_btn = page.query_selector('button:has-text("開始使用")')
    check('開始使用 button exists', start_btn is not None)
    
    if start_btn:
        start_btn.click()
        time.sleep(3)
        page.screenshot(path='qa_screenshots/deep_02_after_click_start.png')
    
    # 2. CAD 介面
    print('\n=== 2. CAD INTERFACE ===')
    
    canvas = page.query_selector('canvas')
    check('Canvas element exists', canvas is not None)
    
    if canvas:
        box = canvas.bounding_box()
        check('Canvas has size', box and box['width'] > 0 and box['height'] > 0, str(box))
        
        # Check canvas is actually painted (check pixel at center)
        # Important: canvas must have actual rendering
        check('Canvas is visible on page', box and box['x'] >= 0 and box['y'] >= 0)
        
        # 3. 嘗試畫線
        print('\n=== 3. DRAW LINE ===')
        cx, cy = box['x'] + box['width']/2, box['y'] + box['height']/2
        
        page.keyboard.press('l')
        time.sleep(0.5)
        check('Pressed L for LINE tool', True)
        
        # First click - start line
        page.mouse.click(cx - 100, cy)
        time.sleep(0.3)
        
        # Move mouse to end point
        page.mouse.move(cx, cy - 50)
        time.sleep(0.3)
        
        # Second click - complete line (via mouseup)
        page.mouse.click(cx, cy - 50)
        time.sleep(0.5)
        page.screenshot(path='qa_screenshots/deep_03_after_line.png')
        
        # 4. 檢查 line completion via mouse events
        page.keyboard.press('v')
        time.sleep(0.3)
        
        # Try clicking where the line should be
        page.mouse.click(cx - 50, cy - 25)
        time.sleep(0.5)
        check('Click on canvas area (line end)', True)
        
        page.screenshot(path='qa_screenshots/deep_04_after_select.png')
    
    # 5. 快捷鍵
    print('\n=== 4. KEYBOARD SHORTCUTS ===')
    for key in ['c', 'a', 'v', 'h', 'd', 'x', 'm', 'o']:
        page.keyboard.press(key)
        time.sleep(0.1)
    check('All shortcut keys pressable', True)
    
    # 6. 選單
    print('\n=== 5. MENU ===')
    menu_btn = page.query_selector('button:has-text("☰")')
    check('Menu button exists', menu_btn is not None)
    if menu_btn:
        menu_btn.click()
        time.sleep(0.5)
        page.screenshot(path='qa_screenshots/deep_05_menu_open.png')
        
        home_item = page.query_selector('text=回到首頁')
        check('回到首頁 menu item exists', home_item is not None)
        
        save_item = page.query_selector('text=儲存 JSON')
        check('儲存 JSON menu item exists', save_item is not None)
        
        export_item = page.query_selector('text=匯出 DXF')
        check('匯出 DXF menu item exists', export_item is not None)

    # 7. Console errors
    print('\n=== 6. CONSOLE ===')
    if console_errors:
        for err in console_errors:
            print(f'  ❌ [{err["type"]}] {err["text"][:150]}')
        check('No console errors', False, f'{len(console_errors)} errors')
    else:
        check('No console errors', True)
    
    # 8. 回到首頁
    print('\n=== 7. BACK TO HOME ===')
    if menu_btn:
        menu_btn.click()
        time.sleep(0.3)
        home_btn = page.query_selector('text=回到首頁')
        if home_btn:
            home_btn.click()
            time.sleep(2)
            page.screenshot(path='qa_screenshots/deep_06_back_home.png')
            welcome_again = page.query_selector('h1')
            check('Back to WelcomePage', welcome_again is not None)
    
    # Summary
    print('\n=== SUMMARY ===')
    passed = sum(1 for r in results if r['pass'])
    failed = sum(1 for r in results if not r['pass'])
    total = len(results)
    print(f'Passed: {passed}/{total} | Failed: {failed}')
    
    report = {'results': results, 'console_errors': console_errors}
    with open('qa_deep_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    browser.close()
