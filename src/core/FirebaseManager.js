// Firebase Integration for leaderboards (CDN-based to avoid build-time deps)
export class FirebaseManager {
    constructor() {
        this.db = null;
        this.enabled = false;
        this.modules = null;
        this.config = null;
        this.initializing = null;
        this.indexRequired = false;
        this.indexLink = null;

        if (window.firebaseConfig) {
            this.configure(window.firebaseConfig);
        }
    }

    configure(config) {
        if (!config) return;
        this.config = config;
        if (!this.initializing) {
            this.initializing = this.init();
        }
        return this.initializing;
    }

    async init() {
        if (!this.config) {
            console.warn("Firebase config missing. Skipping init.");
            return;
        }

        try {
            const [appModule, firestoreModule] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
                import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
            ]);

            const app = appModule.initializeApp(this.config);
            const { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, where, serverTimestamp } = firestoreModule;
            this.db = getFirestore(app);
            this.modules = { collection, addDoc, query, orderBy, limit, getDocs, where, serverTimestamp };
            this.enabled = true;
            console.info("Firebase initialized for leaderboards.");
        } catch (e) {
            this.enabled = false;
            this.initializing = null;
            console.warn("Firebase failed to load:", e);
        }
    }

    async submitScore(gameId, score, playerName, stats = {}) {
        if (!this.enabled || !this.db) return { ok: false, reason: "disabled" };
        try {
            const { collection, addDoc, serverTimestamp } = this.modules;
            await addDoc(collection(this.db, "leaderboards"), {
                gameId,
                score,
                playerName,
                turns: Math.max(0, Math.floor(stats.turns || 0)),
                undos: Math.max(0, Math.floor(stats.undos || 0)),
                timestamp: serverTimestamp ? serverTimestamp() : Date.now()
            });
            return { ok: true };
        } catch (e) {
            console.error("Error submitting score:", e);
            return { ok: false, reason: "network-error" };
        }
    }

    async getHighScores(gameId, limitCount = 10) {
        if (!this.enabled || !this.db) return [];
        try {
            const { collection, query, orderBy, limit, getDocs, where } = this.modules;
            const q = query(
                collection(this.db, "leaderboards"),
                where("gameId", "==", gameId),
                orderBy("score", "desc"),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    ...data,
                    turns: Math.max(0, Math.floor(data?.turns || 0)),
                    undos: Math.max(0, Math.floor(data?.undos || 0)),
                    timestamp: data?.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp || Date.now()
                };
            });
        } catch (e) {
            this.indexRequired = e?.code === "failed-precondition";
            if (this.indexRequired && e?.message) {
                const match = e.message.match(/https?:\/\/[^\s]+/);
                this.indexLink = match ? match[0] : null;
                console.warn("Firestore index needed for leaderboard query.", this.indexLink || "");
            } else {
                console.error("Error fetching scores:", e);
            }
            return [];
        }
    }
}

// Global instance
window.FirebaseManager = new FirebaseManager();
