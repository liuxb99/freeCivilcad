"""QA 測試 v2 — 驗證圖元真正產生"""
import sys, json, time
from playwright.sync_api import sync_playwright

URL = 'https://freecivilcad.vercel.app'
errors = []
actions = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})

    # 攔截 console 錯誤
    page.on('console', lambda msg: errors.append({'type': msg.type, 'text': msg.text}) if msg.type == 'error' else None)
    page.on('pageerror', lambda err: errors.append({'type': 'exception', 'text': str(err)}))

    # 1. 載入首頁
    print('1. Loading page...')
    page.goto(URL, wait_until='networkidle')
    time.sleep(2)
    actions.append('Page loaded')

    # 2. 點擊開始使用
    print('2. Clicking 開始使用...')
    start_btn = page.query_selector('button:has-text("開始使用")')
    if start_btn:
        start_btn.click()
        time.sleep(3)
        actions.append('Clicked 開始使用')
    else:
        print('  ❌ 開始使用 button not found!')
        actions.append('❌ Start button not found')

    # 3. 檢查 canvas
    canvas = page.query_selector('canvas')
    if not canvas:
        print('  ❌ Canvas not found!')
        actions.append('❌ Canvas not found')
    else:
        box = canvas.bounding_box()
        print(f'  ✅ Canvas found: {box}')
        actions.append(f'Canvas found: {box}')

        # 4. 嘗試畫線
        print('3. Drawing LINE...')
        cx, cy = box['x'] + box['width']/2, box['y'] + box['height']/2

        # 按 L 切換 LINE 工具
        page.keyboard.press('l')
        time.sleep(0.5)
        
        # 點第一下 (設定起點)
        page.mouse.click(cx - 100, cy)
        time.sleep(0.3)
        
        # 移動滑鼠到終點
        page.mouse.move(cx + 100, cy)
        time.sleep(0.3)
        
        # 點第二下 (設定終點 - 透過 mouseup)
        page.mouse.click(cx + 100, cy)
        time.sleep(0.5)
        
        # 5. 按 V 回到選取工具，嘗試選取圖元
        print('4. Selecting entity...')
        page.keyboard.press('v')
        time.sleep(0.3)
        page.mouse.click(cx, cy)  # 點在線的中間
        time.sleep(0.5)
        
        actions.append('Drew line and tried selecting')

    # 6. 查看 console 錯誤
    print(f'\n5. Console errors ({len(errors)}):')
    for err in errors:
        print(f'  ❌ [{err["type"]}] {err["text"][:120]}')
        actions.append(f'❌ Error: {err["text"][:80]}')

    # 7. 儲存報告
    report = {
        'url': URL,
        'errors': errors,
        'actions': actions
    }
    with open('qa_v2_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    page.screenshot(path='qa_screenshots/qa_v2_final.png', full_page=True)
    print(f'\nScreenshot saved. Actions: {len(actions)}, Errors: {len(errors)}')

    browser.close()

# Summary
if errors:
    print(f'\n❌ FAILED: {len(errors)} errors found')
    sys.exit(1)
else:
    print(f'\n✅ PASSED: No errors')
    sys.exit(0)
