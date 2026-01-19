import { Game2048Logic, Grid, Tile } from '../src/games/2048/Logic.js';
import assert from 'assert';

const game = new Game2048Logic(4);
game.setup();

console.log('Testing 2048 Logic...');

// Test 1: Initial state
assert.equal(game.grid.availableCells().length, 14, 'Should have 14 available cells (2 started)');
console.log('Initial state passed');

// Test 2: Moving
// Setup a specific grid
// [2, 0, 0, 0]
// [0, 0, 0, 0]
// [0, 0, 0, 0]
// [0, 0, 0, 0]
game.grid = new Grid(4);
game.grid.insertTile(new Tile({x: 0, y: 0}, 2));
game.score = 0;

// Move Right (direction 1)
// Should be [0, 0, 0, 2]
// Note: move() also adds a random tile if moved.
const moved = game.move(1);
assert.ok(moved, 'Should have moved');

const tile = game.grid.cellContent({x: 3, y: 0});
assert.ok(tile, 'Tile should be at (3,0)');
assert.equal(tile.value, 2, 'Tile value should be 2');
assert.equal(game.grid.cellContent({x: 0, y: 0}), null, 'Original cell should be empty');
console.log('Move Right passed');

// Test 3: Merging
// [2, 2, 0, 0] -> Move Right -> [0, 0, 0, 4]
game.grid = new Grid(4);
game.grid.insertTile(new Tile({x: 0, y: 0}, 2));
game.grid.insertTile(new Tile({x: 1, y: 0}, 2));
game.score = 0;

game.move(1);

const merged = game.grid.cellContent({x: 3, y: 0});
assert.ok(merged, 'Merged tile should be at (3,0)');
assert.equal(merged.value, 4, 'Merged value should be 4');
assert.equal(game.score, 4, 'Score should be 4');
console.log('Merge Right passed');

console.log('All tests passed!');
