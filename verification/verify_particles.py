import json
from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        file_url = f"file://{os.path.abspath('index.html')}"
        page.goto(file_url)
        
        # Check if canvas exists
        canvas = page.query_selector(".game-container canvas")
        if canvas:
            print("SUCCESS: Canvas element found in .game-container.")
        else:
            print("FAILURE: Canvas element not found.")
            exit(1)
            
        # Check if effectManager is initialized
        is_initialized = page.evaluate("!!window.effectManager")
        if is_initialized:
             print("SUCCESS: window.effectManager is initialized.")
        else:
             print("FAILURE: window.effectManager is missing.")
             exit(1)

        # Trigger an explosion manually to check for errors
        try:
            page.evaluate("""
                const container = document.querySelector('.game-container');
                const dummyElement = document.createElement('div');
                dummyElement.style.width = '100px';
                dummyElement.style.height = '100px';
                dummyElement.style.position = 'absolute';
                dummyElement.style.top = '10px';
                dummyElement.style.left = '10px';
                container.appendChild(dummyElement);
                
                window.effectManager.explode(dummyElement, 1024);
                
                container.removeChild(dummyElement);
            """)
            print("SUCCESS: effectManager.explode() called without error.")
        except Exception as e:
            print(f"FAILURE: Error calling effectManager.explode(): {e}")
            exit(1)

        browser.close()

if __name__ == "__main__":
    run_verification()
