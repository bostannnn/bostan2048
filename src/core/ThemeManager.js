export class ThemeManager {
    constructor() {
        this.toggle = document.getElementById("theme-toggle");
        this.body = document.body;
        this.handleToggleChange = this.handleToggleChange.bind(this);
        this.init();
    }

    init() {
        if (!this.toggle) return;

        // Check local storage or system preference
        const savedTheme = localStorage.getItem("arcadeCityTheme");
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark" || (!savedTheme && systemDark)) {
            this.enableDarkMode();
        }

        this.toggle.addEventListener("change", this.handleToggleChange);
    }

    handleToggleChange(e) {
        if (e.target.checked) {
            this.enableDarkMode();
        } else {
            this.disableDarkMode();
        }
    }

    enableDarkMode() {
        this.body.classList.add("dark-mode");
        if (this.toggle) this.toggle.checked = true;
        localStorage.setItem("arcadeCityTheme", "dark");
        this.updateMetaColor("#000000");
    }

    disableDarkMode() {
        this.body.classList.remove("dark-mode");
        if (this.toggle) this.toggle.checked = false;
        localStorage.setItem("arcadeCityTheme", "light");
        this.updateMetaColor("#F2F2F7");
    }

    updateMetaColor(color) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", color);
    }

    destroy() {
        if (this.toggle) {
            this.toggle.removeEventListener("change", this.handleToggleChange);
        }
        this.toggle = null;
        this.body = null;
    }
}

// Auto-init and expose for potential cleanup
window.themeManager = new ThemeManager();
