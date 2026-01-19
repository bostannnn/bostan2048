export class LeaderboardManager {
    constructor({ gameId, storageKey, limit = 20, firebaseManager } = {}) {
        this.gameId = gameId;
        this.storageKey = storageKey || `${gameId || "game"}HighScores`;
        this.limit = limit;
        this.firebaseManager = firebaseManager || null;
        this.cache = null;
    }

    normalizeScores(list, cap = this.limit) {
        const normalized = (list || []).map((entry) => {
            const turns = Math.max(0, Math.floor(entry.turns || entry.moves || 0));
            const undos = Math.max(0, Math.floor(entry.undos || entry.undo || 0));
            return {
                id: entry.id || `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
                name: (entry.name || entry.playerName || "Player").slice(0, 32),
                score: Math.max(0, Math.floor(entry.score || 0)),
                turns,
                undos,
                date: entry.date || entry.timestamp || Date.now(),
            };
        }).filter((entry) => Number.isFinite(entry.score));

        normalized.sort((a, b) => b.score - a.score || (a.date || 0) - (b.date || 0));
        return normalized.slice(0, cap);
    }

    loadLocalScores() {
        if (this.cache) return [...this.cache];
        try {
            const raw = localStorage.getItem(this.storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            this.cache = this.normalizeScores(parsed);
        } catch (error) {
            this.cache = [];
        }
        return [...this.cache];
    }

    persistLocal(scores) {
        this.cache = this.normalizeScores(scores);
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
        } catch (error) {
            // Ignore quota errors; best effort persistence
        }
        return [...this.cache];
    }

    clearLocal() {
        this.cache = [];
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            // ignore
        }
    }

    isHighScore(score) {
        if (!Number.isFinite(score)) return false;
        const scores = this.loadLocalScores();
        if (scores.length < this.limit) return true;
        return score > scores[scores.length - 1].score;
    }

    addLocalScore(name, score, stats = {}) {
        const safeName = (name || "Player").trim().slice(0, 32) || "Player";
        const entry = {
            id: `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`,
            name: safeName,
            score: Math.max(0, Math.floor(score || 0)),
            turns: Math.max(0, Math.floor(stats.turns || 0)),
            undos: Math.max(0, Math.floor(stats.undos || 0)),
            date: Date.now(),
        };
        const next = this.normalizeScores([...this.loadLocalScores(), entry]);
        this.persistLocal(next);
        const rank = next.findIndex((item) => item.id === entry.id);
        return { rank: rank >= 0 ? rank + 1 : null, entry };
    }

    async submitScore(name, score, stats = {}) {
        if (!Number.isFinite(score)) {
            return { localRank: null, remote: { ok: false, reason: "invalid-score" } };
        }

        let localRank = null;
        if (this.isHighScore(score)) {
            const result = this.addLocalScore(name, score, stats);
            localRank = result.rank;
        }

        const remote = { ok: false, reason: "disabled" };
        if (this.firebaseManager && this.firebaseManager.enabled) {
            try {
                await this.firebaseManager.submitScore(this.gameId, score, name, stats);
                remote.ok = true;
                remote.reason = null;
            } catch (error) {
                remote.ok = false;
                remote.reason = "network-error";
            }
        }

        return { localRank, remote };
    }

    async fetchScores(limit = 10) {
        const local = this.loadLocalScores().slice(0, limit);
        let remote = [];

        if (this.firebaseManager && this.firebaseManager.enabled) {
            try {
                const result = await this.firebaseManager.getHighScores(this.gameId, limit);
                remote = this.normalizeScores(result || [], limit);
            } catch (error) {
                remote = [];
            }
        }

        return { local, remote };
    }
}
