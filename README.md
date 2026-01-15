# Photo 2048

A modern, "Apple-style" redesign of the classic 2048 game, featuring liquid glass aesthetics and custom photo tiles.

## How to Play

*   **Swipe** (on mobile) or use **Arrow Keys** (on desktop) to move tiles.
*   Tiles with the same picture merge into one when they touch.
*   Add them up to reach the **2048** tile!

## Customization Guide

### Changing Tile Icons/Images

You can easily replace the default Unsplash images with your own photos or icons.

1.  Open the `script.js` file.
2.  Locate the `CustomImages` object near the top of the file:

    ```javascript
    const CustomImages = {
      2: "https://images.unsplash.com/...",
      4: "https://images.unsplash.com/...",
      // ...
    };
    ```

3.  Replace the URLs with:
    *   **Links to online images** (e.g., `https://imgur.com/myimage.png`).
    *   **Local paths** if you have images in the `assets/` folder (e.g., `assets/icon-2.png`).

    *Example:*
    ```javascript
    const CustomImages = {
      2: "assets/cat.png",
      4: "assets/dog.png",
      // ...
    };
    ```

### Changing the Background

To change the "liquid glass" background gradient:

1.  Open `style.css`.
2.  Find the `html, body` rule:

    ```css
    html, body {
      /* ... */
      background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
      /* ... */
    }
    ```

3.  Modify the `linear-gradient` colors to your liking. You can use tools like [cssgradient.io](https://cssgradient.io/) to generate new gradients.

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
