"""Optional asset regeneration: Python + Playwright + installed Google Chrome.

Run `node demo/generate.mjs` and then `python scripts/capture-store.py`.
The committed PNGs are ready to upload; this is not needed for packaging.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
    page.goto((root / "demo/demo.html").as_uri())
    # Preserve the generated popup DOM and CSS in a full-bleed presentation.
    page.evaluate("""() => {
      const popup = document.createElement('section');
      popup.id = 'popup-preview';
      popup.append(...document.body.childNodes);
      document.body.append(popup);
      const intro = document.createElement('section');
      intro.id = 'store-intro';
      intro.innerHTML = `<p class="eyebrow">ENGLISH + GERMAN · ON YOUR DEVICE</p>
        <h1>Give suspicious<br>messages a<br>second look.</h1>
        <p>Select text or check the current page for scam red flags.</p>
        <ul><li>Pressure tactics and risky payment requests</li>
        <li>Lookalike domains and urgent shortened links</li>
        <li>Local checks. No account. No network calls.</li></ul>
        <p class="note">Heuristic warnings, not a verdict. No findings does not mean safe.</p>`;
      document.body.prepend(intro);
    }""")
    page.add_style_tag(content="""
      html { background: #e7eee8; }
      body { width: 1280px; height: 800px; display: flex; align-items: center;
        justify-content: space-between; padding: 19px 80px; gap: 70px; }
      #popup-preview { width: 380px; flex: 0 0 380px; background: #f6f8f5;
        box-shadow: 0 12px 44px #153e3824; }
      #store-intro { flex: 1; }
      #store-intro .eyebrow { font-size: 13px; letter-spacing: 1.5px; font-weight: 750; color: #386655; }
      #store-intro h1 { font-size: 54px; line-height: 1.06; letter-spacing: -2px; margin: 24px 0; }
      #store-intro p { font-size: 21px; line-height: 1.5; }
      #store-intro ul { padding-left: 20px; font-size: 17px; line-height: 1.7; margin: 28px 0; }
      #store-intro .note { font-size: 14px; max-width: 430px; color: #536460; }
    """)
    page.evaluate("document.fonts.ready")
    bounds = page.locator("#popup-preview").bounding_box()
    assert bounds["y"] >= 0 and bounds["y"] + bounds["height"] <= 800, bounds
    page.screenshot(path=str(root / "demo/screenshot.png"), full_page=False)

    # Chrome also requires a small promotional tile. Reuse the existing brand
    # artwork and native HTML/CSS; no generated or external art is needed.
    page.set_viewport_size({"width": 440, "height": 280})
    page.set_content("""<!doctype html><html><head><style>
      * { box-sizing: border-box; } body { margin: 0; width: 440px; height: 280px;
        background: #153e38; color: white; display: flex; flex-direction: column;
        align-items: center; justify-content: center; font-family: system-ui, sans-serif; }
      img { width: 112px; height: 112px; }
      h1 { margin: 10px 0 0; font-size: 38px; letter-spacing: -1px; }
    </style></head><body><img alt="" src=""/><h1>ScamSniff</h1></body></html>""")
    import base64
    icon = base64.b64encode((root / "extension/icons/icon-128.png").read_bytes()).decode()
    page.locator("img").evaluate("(img, src) => { img.src = src; }", "data:image/png;base64," + icon)
    page.locator("img").evaluate("img => img.decode()")
    page.screenshot(path=str(root / "store/promo-440x280.png"), full_page=False)
    browser.close()
print("Created demo/screenshot.png (1280x800) and store/promo-440x280.png (440x280).")
