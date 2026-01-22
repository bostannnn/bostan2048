/**
 * Feature Flags Configuration
 * 
 * Toggle features on/off without changing code.
 * Set to `true` to enable, `false` to hide from users.
 */

// Check if running in development mode
const isDev = import.meta.env.DEV;

// Check for dev mode override in localStorage (secret unlock)
const devModeOverride = typeof localStorage !== 'undefined' && 
  localStorage.getItem('devModeEnabled') === 'true';

// Storage key for persisted overrides
const OVERRIDES_KEY = 'featureFlagOverrides';

// Default feature flags
const DEFAULT_FEATURES = {
  // Games
  game2048: true,           // ✅ Released
  gameMatch3: false,        // 🚧 WIP - hidden
  gameCity: false,          // 🚧 WIP - hidden
  
  // UI Elements
  navbar: false,            // 🚧 WIP - hidden
  shop: false,              // 🚧 WIP - hidden
  
  // Character System
  characterCreator: false,  // 🚧 WIP - hidden
  wardrobe: false,          // 🚧 WIP - hidden
  
  // Economy
  showCoins: true,          // ✅ Show coin counter
  
  // Dev Tools (only in dev mode or with override)
  devTools: isDev || devModeOverride,
};

// Load persisted overrides
function loadOverrides() {
  try {
    const stored = localStorage.getItem(OVERRIDES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Merge defaults with overrides
const overrides = loadOverrides();
export const FEATURES = { ...DEFAULT_FEATURES, ...overrides };

// Always allow devTools if in dev mode
if (isDev || devModeOverride) {
  FEATURES.devTools = true;
}

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature flag
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName) {
  return FEATURES[featureName] === true;
}

/**
 * Toggle a feature flag and persist to localStorage
 * @param {string} featureName - Name of the feature flag
 * @param {boolean} enabled - Whether to enable or disable
 */
export function setFeatureFlag(featureName, enabled) {
  if (!(featureName in DEFAULT_FEATURES)) {
    console.warn(`Unknown feature flag: ${featureName}`);
    return;
  }
  
  const overrides = loadOverrides();
  
  // If setting to default value, remove override
  if (enabled === DEFAULT_FEATURES[featureName]) {
    delete overrides[featureName];
  } else {
    overrides[featureName] = enabled;
  }
  
  // Persist
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  
  // Update runtime value
  FEATURES[featureName] = enabled;
  
  console.log(`Feature "${featureName}" set to ${enabled}. Refresh to apply.`);
}

/**
 * Reset all feature flags to defaults
 */
export function resetFeatureFlags() {
  localStorage.removeItem(OVERRIDES_KEY);
  Object.assign(FEATURES, DEFAULT_FEATURES);
  if (isDev || devModeOverride) {
    FEATURES.devTools = true;
  }
  console.log('Feature flags reset to defaults. Refresh to apply.');
}

/**
 * Get all feature flags with their current values and defaults
 */
export function getFeatureFlagInfo() {
  const overrides = loadOverrides();
  return Object.entries(DEFAULT_FEATURES).map(([key, defaultValue]) => ({
    key,
    label: formatFeatureName(key),
    defaultValue,
    currentValue: FEATURES[key],
    isOverridden: key in overrides,
  }));
}

/**
 * Format feature name for display
 */
function formatFeatureName(key) {
  const labels = {
    game2048: '2048 Game',
    gameMatch3: 'Match-3 Game',
    gameCity: 'City Hub',
    navbar: 'Navigation Bar',
    shop: 'Shop',
    characterCreator: 'Character Creator',
    wardrobe: 'Wardrobe',
    showCoins: 'Show Coins',
    devTools: 'Dev Tools',
  };
  return labels[key] || key;
}

/**
 * Enable dev mode (call from console: enableDevMode())
 */
export function enableDevMode() {
  localStorage.setItem('devModeEnabled', 'true');
  console.log('Dev mode enabled. Refresh to see changes.');
  return 'Dev mode enabled. Refresh the page.';
}

/**
 * Disable dev mode
 */
export function disableDevMode() {
  localStorage.removeItem('devModeEnabled');
  console.log('Dev mode disabled. Refresh to see changes.');
  return 'Dev mode disabled. Refresh the page.';
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.enableDevMode = enableDevMode;
  window.disableDevMode = disableDevMode;
  window.setFeatureFlag = setFeatureFlag;
  window.resetFeatureFlags = resetFeatureFlags;
  window.FEATURES = FEATURES;
}
