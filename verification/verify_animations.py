import json
from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        file_url = f"file://{os.path.abspath('index.html')}"
        
        # Load the game first to establish origin
        page.goto(file_url)
        
        # Prepare game state
        game_state = {
            "grid": {
                "size": 4,
                "cells": [
                    [
                        {"position": {"x": 0, "y": 0}, "value": 1024},
                        {"position": {"x": 0, "y": 1}, "value": 1024},
                        None, None
                    ],
                    [
                        {"position": {"x": 1, "y": 0}, "value": 262144},
                        {"position": {"x": 1, "y": 1}, "value": 262144},
                        None, None
                    ],
                    [None, None, None, None],
                    [None, None, None, None]
                ]
            },
            "score": 0,
            "over": False,
            "won": False,
            "keepPlaying": False
        }
        
        # Set localStorage
        # Note: We need to make sure the game logic doesn't immediately overwrite it on the *next* load before reading.
        # The game reads on setup().
        page.evaluate(f"window.localStorage.setItem('gameState', '{json.dumps(game_state)}');")
        
        # Reload to pick up the new state
        page.reload()
        
        # Wait for tiles to appear
        try:
            page.wait_for_selector(".tile-1024", timeout=2000)
            page.wait_for_selector(".tile-262144", timeout=2000)
        except Exception as e:
            print("Failed to find initial tiles. Maybe localStorage didn't persist or logic is flawed.")
            page.screenshot(path="verification/failed_load.png")
            raise e
        
        print("Initial state loaded.")
        page.screenshot(path="verification/before_merge.png")
        
        # Trigger merge: Press Up (ArrowUp)
        page.keyboard.press("ArrowUp")
        
        time.sleep(0.1) # Wait for JS to process
        
        # Check if merged classes exist
        tile_2048 = page.query_selector(".tile-2048.tile-merged-2048")
        tile_524288 = page.query_selector(".tile-524288.tile-merged-524288")
        
        if tile_2048:
            print("SUCCESS: Found merged 2048 tile with animation class.")
        else:
            print("FAILURE: Did not find merged 2048 tile.")
            # Dump html to see what's there
            with open("verification/dump.html", "w") as f:
                f.write(page.content())
            
        if tile_524288:
            print("SUCCESS: Found merged 524288 tile with animation class.")
        else:
            print("FAILURE: Did not find merged 524288 tile.")

        page.screenshot(path="verification/during_animation.png")
        
        time.sleep(1)
        page.screenshot(path="verification/after_merge.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
