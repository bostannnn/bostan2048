from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Test Desktop Size
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        cwd = os.getcwd()
        path = f"file://{cwd}/index.html"
        page.goto(path)
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/desktop_layout.png")
        print("Desktop screenshot saved.")
        
        # Test Mobile Size
        page_mobile = browser.new_page(viewport={"width": 375, "height": 667})
        page_mobile.goto(path)
        page_mobile.wait_for_timeout(1000)
        page_mobile.screenshot(path="verification/mobile_layout.png")
        print("Mobile screenshot saved.")
        
        browser.close()

if __name__ == "__main__":
    run()
