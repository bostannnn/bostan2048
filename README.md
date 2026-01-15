# Photo 2048

A modern, "Apple-style" redesign of the classic 2048 game, featuring liquid glass aesthetics and custom photo tiles.

## How to Play

*   **Swipe** (on mobile) or use **Arrow Keys** (on desktop) to move tiles.
*   Tiles with the same picture merge into one when they touch.
*   Add them up to reach the **2048** tile!

## Adding a New Theme

You can add new themes to the game by following these steps:

### 1. Create Theme Assets
1.  Navigate to the `assets/` folder.
2.  Create a new folder with your theme name (e.g., `darkmode`).
3.  Add your image files to this folder. They **must** be named according to the tile values:
    *   `2.jpg`
    *   `4.jpg`
    *   `8.jpg`
    *   ... up to `2048.jpg` (and higher if you wish).
    *   *Note: The code expects `.jpg` files by default.*

### 2. Add Selection Button
1.  Open `index.html`.
2.  Find the `theme-selector` div.
3.  Add a new button to the `theme-options` container:
    ```html
    <button class="theme-btn" data-theme="darkmode">Dark Mode</button>
    ```
    *Ensure the `data-theme` attribute matches your folder name exactly.*

### 3. Add Theme Styles
1.  Open `style.css`.
2.  Add a CSS class for your theme at the end of the file. The class name must match `body.` + your theme name:
    ```css
    /* Dark Mode Theme */
    body.darkmode {
      background: linear-gradient(135deg, #2c3e50 0%, #000000 100%); /* Custom background */
      --text-color: #ecf0f1; /* Custom text color */
      --background-color: #34495e;
    }

    /* Optional: Customize specific elements for this theme */
    body.darkmode .game-container {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
    }
    
    body.darkmode h1 {
        color: #fff;
    }
    ```

### 4. Update Offline Cache (PWA)
If you want the new theme to work fully offline, update the service worker cache list.

1.  Open `sw.js`.
2.  Add your theme name to the `THEMES` array:
    ```js
    const THEMES = ['classic', 'nature', 'darkmode'];
    ```
3.  If you add higher tile values, update `TILE_VALUES` to include them.
4.  Bump `CACHE_NAME` to force a cache refresh.

That's it! Your new theme will now appear in the selector and load your custom assets (including offline).

## Deployment Guide

You can host this game for free using **GitHub Pages**. This allows anyone to play it in their browser without downloading anything.

### Step 1: Push to GitHub

1.  Create a new repository on GitHub (e.g., `my-photo-2048`).
2.  Push your files (`index.html`, `style.css`, `script.js`, `assets/`) to this repository.

### Step 2: Enable GitHub Pages

1.  Go to your repository on GitHub.
2.  Click on **Settings** > **Pages** (in the left sidebar).
3.  Under **Build and deployment** > **Source**, select **Deploy from a branch**.
4.  Under **Branch**, select `main` (or `master`) and `/ (root)`.
5.  Click **Save**.

Wait a few minutes, and GitHub will provide you with a live URL (e.g., `https://yourusername.github.io/my-photo-2048/`). You can share this link with anyone!

## License

MIT License. Based on the original 2048 by Gabriele Cirulli.
