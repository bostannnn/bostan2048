Design System Rules (STRICT ENFORCEMENT)

1. Allowed Colors (Use CSS Variables)

Primary Accent: var(--ui-accent) or var(--gold-base)

Backgrounds: var(--ui-bg-base) or var(--material-regular)

Text: var(--ui-text-primary), var(--ui-text-secondary)

2. Components (Copy-Paste These)

Gold Button: <button class="ui-button gold">Play</button>

Glass Button: <button class="ui-button secondary">Cancel</button>

Icon Button: <button class="ui-button mini secondary">⚙️</button>

Card: <div class="glass-panel">...</div>

List: <div class="ui-list"><div class="ui-list-item">...</div></div>

3. Forbidden Actions

❌ NEVER use style="..." (Inline styles).

❌ NEVER use Hex codes like #FFFFFF (Use var(--ui-bg-base)).

❌ NEVER create new CSS classes without asking.