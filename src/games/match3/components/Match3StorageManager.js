export class Match3StorageManager {
  constructor(levelId) {
    const prefix = `match3:level-${levelId}:`;
    this.bestScoreKey = `${prefix}bestScore`;
    this.gameStateKey = `${prefix}gameState`;
  }

  getBestScore() {
    return Number(localStorage.getItem(this.bestScoreKey)) || 0;
  }

  setBestScore(score) {
    localStorage.setItem(this.bestScoreKey, String(score));
  }

  getGameState() {
    const raw = localStorage.getItem(this.gameStateKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  setGameState(state) {
    localStorage.setItem(this.gameStateKey, JSON.stringify(state));
  }

  clearGameState() {
    localStorage.removeItem(this.gameStateKey);
  }
}
