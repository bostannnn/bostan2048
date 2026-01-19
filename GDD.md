**Project Name:** Arcade City **Genre:** Casual / Simulation / Puzzle **Platform:** Mobile PWA & Web **Monetization:** Free (Soft Currency Only)

**1. Game Concept**
"Build your home, play to earn." A cozy, persistent world where the player's creativity (City & Avatar) is fueled by their skill in classic arcade puzzles.

**2. Core Loops**
**The Gameplay Loop**
1. **Play:** Choose a minigame (2048, Nonogram, Match-3).
2. **Earn:** Completing levels or hitting high scores awards "Coins."
3. **Upgrade:** Use Coins to buy furniture, buildings, or clothes.
4. **Decorate:** Customize the City or Avatar to look cool.

**The Social Loop**
1. **Share:** Send a link to a friend.
2. **Visit:** Friend views your city snapshot.
3. **Interact:** Friend "Likes" your city.
4. **Reward:** You receive a "Social Bonus" of Coins.

**3. The Meta-Game**
**Character Creator**
- **Visuals:** Vector-based Skeletal Animation (e.g., Spine, Rive, or DragonBones).
- **Slots:** Hair, Face, Shirt, Pants, Shoes, Accessories.
- **Progression:** Start with "Basic" set. Unlock "Punk," "Formal," and "Costume" sets via achievements.

**City Builder**
- **View:** Isometric Grid (PixiJS).
- **Mechanics:**
    - Build: Place houses, shops, and roads.
    - Locals: Unlock NPCs (The Baker, The Cop) who wander the roads.
    - Day/Night: Visual tint changes based on the user's real-time clock.

**4. Minigames (Offline Capable)**
**"2048" (The Merger)**
- **Core:** Classic 4x4 grid merging.
- **Twist:** Unlocking visual themes (e.g., City Theme: Bricks -> Windows -> Doors).
- **Reward:** 1 Coin per 10 points.

**"Pixel Logic" (Nonograms)**
- **Core:** Picross logic puzzles (5x5 to 15x15).
- **Controls:** D-Pad overlay for precise cursor movement on mobile.
- **Reward:** Unlocks "Pixel Art" paintings for the player's house.

**"Match-3" (The Crusher)**
- **Core:** Swap tiles to match 3.
- **Tech:** Uses GSAP for precise fluid animations.
- **Modes:** Zen (Endless) and Rush (60s Score Attack).
- **Powerups:** Earned by matching 4 or 5 (Bomb, Line Clear).

**5. Economy**
- **Currency:** Coins (Soft Currency).
- **Sources:** Minigame Gameplay, Daily Login, Visitor Likes.
- **Sinks:** 60% Cosmetics, 30% City Decor, 10% Utilities.

**6. UI/UX**
- **Style:** "Liquid Glass" (Apple HIG). Translucent panels, blur effects, and soft aurora gradients.
- **Navigation (Bottom Bar):**
    - [City] (Home)
    - [Games] (Arcade Menu)
    - [Closet] (Character Editor)
    - [Shop] (Buy Items)
    - [Social] (Leaderboards & Visiting)