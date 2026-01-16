import time
from playwright.sync_api import sync_playwright
import os
import json

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Enable touch support
        page = browser.new_page(has_touch=True)
        
        file_url = f"file://{os.path.abspath('index.html')}"
        
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))
        
        page.goto(file_url)
        
        # Setup simple state: 2 tile at 0,0 (Top-Left)
        # Grid x is col, y is row.
        # x=0, y=0.
        game_state = {
            "grid": {
                "size": 4,
                "cells": [
                    [{"position": {"x": 0, "y": 0}, "value": 2}, None, None, None],
                    [None, None, None, None],
                    [None, None, None, None],
                    [None, None, None, None]
                ]
            },
            "score": 0, "over": False, "won": False, "keepPlaying": False
        }
        page.evaluate(f"window.localStorage.setItem('gameState', '{json.dumps(game_state)}');")
        page.reload()
        
        # 1. Check CSS Transition
        tile = page.wait_for_selector(".tile-2")
        transition = tile.evaluate("el => getComputedStyle(el).transition")
        print(f"Transition computed style: {transition}")
        
        if "0.07s" not in transition and "70ms" not in transition:
            print("FAILURE: CSS Transition property not applied correctly.")
        else:
            print("SUCCESS: CSS Transition property looks correct.")

        # 2. Test Keyboard Move (Right)
        # Move Right -> x=3, y=0 (Slide to edge).
        # Class logic: tile-position-{x+1}-{y+1} -> tile-position-4-1
        page.keyboard.press("ArrowRight")
        try:
            page.wait_for_selector(".tile-position-4-1", state="attached", timeout=1000)
            print("SUCCESS: Keyboard move worked.")
        except:
            print("FAILURE: Keyboard move failed.")

        # 3. Test Touch Swipe (Down)
        # Reset state first
        page.evaluate(f"window.localStorage.setItem('gameState', '{json.dumps(game_state)}');")
        page.reload()
        page.wait_for_selector(".tile-position-1-1") # Ensure it's back at 0,0
        
        # ... existing swipe code ...
        
        container = page.locator(".game-container")
        box = container.bounding_box()
        center_x = box["x"] + box["width"] / 2
        start_y = box["y"] + 10
        end_y = box["y"] + box["height"] - 10
        
        page.mouse.move(center_x, start_y)
        page.mouse.down()
        steps = 5
        for i in range(steps):
            y = start_y + (end_y - start_y) * (i + 1) / steps
            page.mouse.move(center_x, y)
            time.sleep(0.02)
        page.mouse.up()
        
        # Expect move Down -> x=0, y=3
        # Class: tile-position-1-4
        try:
            page.wait_for_selector(".tile-position-1-4", state="attached", timeout=1000)
            print("SUCCESS: Swipe move worked.")
        except:
            print("FAILURE: Swipe move failed.")

        browser.close()

if __name__ == "__main__":
    run()
