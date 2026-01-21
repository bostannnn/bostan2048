const SPECIAL_PRIORITY = {
  "line-h": 1,
  "line-v": 1,
  bomb: 2,
  color: 3,
};

const keyFor = (row, col) => `${row},${col}`;
const parseKey = (key) => {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
};

export class Match3Engine {
  constructor({ rows, cols, types, rng } = {}) {
    this.rows = rows;
    this.cols = cols;
    this.types = types;
    this.rng = rng || Math.random;
    this.nextId = 1;
    this.grid = this.createGrid();
  }

  createGrid() {
    const grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        let type = this.randomType();
        let guard = 0;
        while (this.wouldCreateMatch(grid, row, col, type) && guard < 10) {
          type = this.randomType();
          guard += 1;
        }
        grid[row][col] = this.createTile(type);
      }
    }
    return grid;
  }

  createTile(type) {
    return { id: this.nextId++, type, special: null };
  }

  randomType() {
    return Math.floor(this.rng() * this.types);
  }

  wouldCreateMatch(grid, row, col, type) {
    const left1 = col >= 1 ? grid[row][col - 1] : null;
    const left2 = col >= 2 ? grid[row][col - 2] : null;
    if (left1 && left2 && left1.type === type && left2.type === type) return true;
    const up1 = row >= 1 ? grid[row - 1][col] : null;
    const up2 = row >= 2 ? grid[row - 2][col] : null;
    if (up1 && up2 && up1.type === type && up2.type === type) return true;
    return false;
  }

  getTile(pos) {
    return this.grid[pos.row]?.[pos.col] || null;
  }

  setTile(pos, tile) {
    if (!this.grid[pos.row]) return;
    this.grid[pos.row][pos.col] = tile;
  }

  isAdjacent(a, b) {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr + dc) === 1;
  }

  swapTiles(a, b) {
    const tileA = this.getTile(a);
    const tileB = this.getTile(b);
    this.setTile(a, tileB);
    this.setTile(b, tileA);
  }

  findMatches() {
    const matches = [];
    const horizontalKeys = new Set();
    const verticalKeys = new Set();

    for (let row = 0; row < this.rows; row += 1) {
      let runStart = 0;
      for (let col = 1; col <= this.cols; col += 1) {
        const current = col < this.cols ? this.grid[row][col] : null;
        const prev = this.grid[row][col - 1];
        if (current && prev && current.type === prev.type) {
          continue;
        }
        const runLength = col - runStart;
        if (prev && runLength >= 3) {
          const positions = [];
          for (let c = runStart; c < col; c += 1) {
            positions.push({ row, col: c });
            horizontalKeys.add(keyFor(row, c));
          }
          matches.push({ positions, orientation: "h" });
        }
        runStart = col;
      }
    }

    for (let col = 0; col < this.cols; col += 1) {
      let runStart = 0;
      for (let row = 1; row <= this.rows; row += 1) {
        const current = row < this.rows ? this.grid[row][col] : null;
        const prev = this.grid[row - 1][col];
        if (current && prev && current.type === prev.type) {
          continue;
        }
        const runLength = row - runStart;
        if (prev && runLength >= 3) {
          const positions = [];
          for (let r = runStart; r < row; r += 1) {
            positions.push({ row: r, col });
            verticalKeys.add(keyFor(r, col));
          }
          matches.push({ positions, orientation: "v" });
        }
        runStart = row;
      }
    }

    const intersections = new Set();
    horizontalKeys.forEach((key) => {
      if (verticalKeys.has(key)) intersections.add(key);
    });

    return { matches, intersections };
  }

  hasValidMove() {
    return !!this.findValidSwap();
  }

  findValidSwap() {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const current = this.grid[row][col];
        if (!current) continue;
        const neighbors = [
          { row, col: col + 1 },
          { row: row + 1, col },
        ];
        for (const neighbor of neighbors) {
          if (neighbor.row >= this.rows || neighbor.col >= this.cols) continue;
          const other = this.grid[neighbor.row][neighbor.col];
          if (!other) continue;
          if (current.special === "color" || other.special === "color") {
            return { from: { row, col }, to: neighbor };
          }
          this.swapTiles({ row, col }, neighbor);
          const { matches } = this.findMatches();
          this.swapTiles({ row, col }, neighbor);
          if (matches.length) {
            return { from: { row, col }, to: neighbor };
          }
        }
      }
    }
    return null;
  }

  shuffle({ maxAttempts = 25 } = {}) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const nextGrid = this.createGrid();
      this.grid = nextGrid;
      if (this.findValidSwap()) {
        return true;
      }
    }
    return false;
  }

  resolveSwap(a, b) {
    if (!this.isAdjacent(a, b)) return { matched: false };
    this.swapTiles(a, b);

    const tileA = this.getTile(a);
    const tileB = this.getTile(b);
    const colorSwap = this.resolveColorSwap(a, b, tileA, tileB);
    if (colorSwap) {
      return { matched: true, ...colorSwap };
    }

    const { matches, intersections } = this.findMatches();
    if (!matches.length) {
      this.swapTiles(a, b);
      return { matched: false };
    }

    return { matched: true, ...this.resolveMatches({ matches, intersections, swapPositions: [a, b] }) };
  }

  resolveColorSwap(posA, posB, tileA, tileB) {
    if (!tileA || !tileB) return null;
    if (tileA.special !== "color" && tileB.special !== "color") return null;
    const clearSet = new Set();
    if (tileA.special === "color" && tileB.special === "color") {
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.cols; col += 1) {
          clearSet.add(keyFor(row, col));
        }
      }
    } else {
      const targetType = tileA.special === "color" ? tileB.type : tileA.type;
      this.forEachTile((tile, row, col) => {
        if (tile && tile.type === targetType) {
          clearSet.add(keyFor(row, col));
        }
      });
    }
    clearSet.add(keyFor(posA.row, posA.col));
    clearSet.add(keyFor(posB.row, posB.col));
    const base = this.resolveClearAndCascade({ clearSet, bonus: 0 });
    let totalCleared = base.cleared;
    let totalBonus = base.bonus;
    let cascades = base.cleared ? 1 : 0;

    const next = this.findMatches();
    if (next.matches.length) {
      const cascade = this.resolveMatches({
        matches: next.matches,
        intersections: next.intersections,
        swapPositions: null,
      });
      totalCleared += cascade.cleared;
      totalBonus += cascade.bonus;
      cascades += cascade.cascades;
    }

    return { cleared: totalCleared, bonus: totalBonus, cascades };
  }

  resolveMatches({ matches, intersections, swapPositions }) {
    let totalCleared = 0;
    let totalBonus = 0;
    let cascades = 0;
    let currentMatches = matches;
    let currentIntersections = intersections;
    let firstSwap = swapPositions;

    while (currentMatches.length) {
      const { clearSet, specialsToCreate, bonus } = this.buildClearSet(currentMatches, currentIntersections, firstSwap);
      const cascadeResult = this.resolveClearAndCascade({ clearSet, specialsToCreate, bonus });
      totalCleared += cascadeResult.cleared;
      totalBonus += cascadeResult.bonus;
      cascades += 1;

      const next = this.findMatches();
      currentMatches = next.matches;
      currentIntersections = next.intersections;
      firstSwap = null;
    }

    return { cleared: totalCleared, bonus: totalBonus, cascades };
  }

  buildClearSet(matches, intersections, swapPositions) {
    const clearSet = new Set();
    const specialsToCreate = new Map();
    const swapKeys = new Set((swapPositions || []).map((pos) => keyFor(pos.row, pos.col)));

    const setSpecial = (key, type) => {
      const existing = specialsToCreate.get(key);
      if (!existing || SPECIAL_PRIORITY[type] > SPECIAL_PRIORITY[existing]) {
        specialsToCreate.set(key, type);
      }
    };

    intersections.forEach((key) => setSpecial(key, "bomb"));

    matches.forEach((match) => {
      match.positions.forEach((pos) => clearSet.add(keyFor(pos.row, pos.col)));
      const length = match.positions.length;
      const pick = this.pickSpecialPosition(match.positions, swapKeys);
      if (length >= 5) {
        setSpecial(pick, "color");
      } else if (length === 4) {
        setSpecial(pick, match.orientation === "h" ? "line-h" : "line-v");
      }
    });

    let bonus = 0;
    matches.forEach((match) => {
      if (match.positions.length > 3) {
        bonus += (match.positions.length - 3) * 50;
      }
    });

    specialsToCreate.forEach((_, key) => {
      clearSet.delete(key);
    });

    return { clearSet, specialsToCreate, bonus };
  }

  pickSpecialPosition(positions, swapKeys) {
    for (const pos of positions) {
      const key = keyFor(pos.row, pos.col);
      if (swapKeys.has(key)) return key;
    }
    const mid = Math.floor(positions.length / 2);
    const center = positions[mid];
    return keyFor(center.row, center.col);
  }

  resolveClearAndCascade({ clearSet, specialsToCreate, bonus }) {
    const expanded = this.expandClearSet(clearSet);
    let cleared = 0;

    expanded.forEach((key) => {
      const { row, col } = parseKey(key);
      const tile = this.grid[row][col];
      if (tile) {
        cleared += 1;
        this.grid[row][col] = null;
      }
    });

    if (specialsToCreate) {
      specialsToCreate.forEach((special, key) => {
        const { row, col } = parseKey(key);
        const tile = this.grid[row][col];
        if (tile) {
          tile.special = special;
        }
      });
    }

    this.collapseColumns();
    return { cleared, bonus };
  }

  expandClearSet(clearSet) {
    const queue = Array.from(clearSet);
    const expanded = new Set(clearSet);

    while (queue.length) {
      const key = queue.shift();
      const { row, col } = parseKey(key);
      const tile = this.grid[row][col];
      if (!tile || !tile.special) continue;

      if (tile.special === "line-h") {
        for (let c = 0; c < this.cols; c += 1) {
          const nextKey = keyFor(row, c);
          if (!expanded.has(nextKey)) {
            expanded.add(nextKey);
            queue.push(nextKey);
          }
        }
      } else if (tile.special === "line-v") {
        for (let r = 0; r < this.rows; r += 1) {
          const nextKey = keyFor(r, col);
          if (!expanded.has(nextKey)) {
            expanded.add(nextKey);
            queue.push(nextKey);
          }
        }
      } else if (tile.special === "bomb") {
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            const r = row + dr;
            const c = col + dc;
            if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) continue;
            const nextKey = keyFor(r, c);
            if (!expanded.has(nextKey)) {
              expanded.add(nextKey);
              queue.push(nextKey);
            }
          }
        }
      } else if (tile.special === "color") {
        const targetType = tile.type;
        this.forEachTile((candidate, r, c) => {
          if (candidate && candidate.type === targetType) {
            const nextKey = keyFor(r, c);
            if (!expanded.has(nextKey)) {
              expanded.add(nextKey);
              queue.push(nextKey);
            }
          }
        });
      }
    }

    return expanded;
  }

  collapseColumns() {
    for (let col = 0; col < this.cols; col += 1) {
      const stack = [];
      for (let row = this.rows - 1; row >= 0; row -= 1) {
        const tile = this.grid[row][col];
        if (tile) {
          stack.push(tile);
        }
      }
      for (let row = this.rows - 1; row >= 0; row -= 1) {
        if (stack.length) {
          this.grid[row][col] = stack.shift();
        } else {
          this.grid[row][col] = this.createTile(this.randomType());
        }
      }
    }
  }

  forEachTile(callback) {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        callback(this.grid[row][col], row, col);
      }
    }
  }

  toState() {
    return {
      rows: this.rows,
      cols: this.cols,
      tiles: this.grid.map((row) =>
        row.map((tile) => (tile ? { type: tile.type, special: tile.special } : null))
      ),
    };
  }

  loadState(state) {
    if (!state || !Array.isArray(state.tiles)) return false;
    this.rows = state.rows || this.rows;
    this.cols = state.cols || this.cols;
    this.grid = state.tiles.map((row) =>
      row.map((tile) => {
        if (!tile) return null;
        const nextType = Number.isFinite(tile.type) && tile.type >= 0 && tile.type < this.types
          ? tile.type
          : this.randomType();
        return this.createTile(nextType);
      })
    );
    this.forEachTile((tile, row, col) => {
      const source = state.tiles[row]?.[col];
      if (tile && source) {
        tile.special = source.special || null;
      }
    });
    return true;
  }
}
