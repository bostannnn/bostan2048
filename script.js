let selectedTheme = 'classic';
let gameInstance = null;
const CustomImages = {};
let customImageAvailability = {};
let themeLoadToken = 0;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updateRefreshRequested) {
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        trackServiceWorkerUpdates(registration);
      })
      .catch(() => {});
  });
}

const LEADERBOARD_KEY = "photo2048HighScores";
const PLAYER_NAME_KEY = "photo2048PlayerName";
const MAX_LEADERBOARD_ENTRIES = 10;
let pendingEntry = null;
let leaderboardElements = null;
let boardRefreshScheduled = false;
let devMenuElements = null;
let updateUIElements = null;
let pendingUpdateRegistration = null;
let updateRefreshRequested = false;

const GAME_OVER_QUOTES = [
  "If you don't take risks, you can't create a future. - Monkey D. Luffy (One Piece)",
  "A dropout will beat a genius through hard work. - Rock Lee (Naruto)",
  "If you don't like your destiny, don't accept it. Instead, have the courage to change it the way you want it to be. - Naruto Uzumaki (Naruto)",
  "The only thing we're allowed to do is believe that we won't regret the choice we made. - Levi Ackerman (Attack on Titan)",
  "Life is not a game of luck. If you wanna win, work hard. - Sora (No Game No Life)",
  "Don't give up, there's no shame in falling down! The true shame is to not stand up again! - Shintaro Midorima (Kuroko's Basketball)",
  "If you can't do something, then don't. Focus on what you can do. - Shiroe (Log Horizon)",
  "Giving up is what kills people. - Alucard (Hellsing)",
  "If you're gonna hit it, hit it until it breaks. - Oikawa Tooru (Haikyuu!!)",
  "Miracles happen to those who have the courage to keep on trying! - Nami (One Piece)",
  "Hard work is worthless for those that don't believe in themselves. - Naruto Uzumaki (Naruto)",
  "The difference between a novice and a master is that a master has failed more times than a novice has tried. - Koro-sensei (Assassination Classroom)",
  "It's not whether you can or can't. You do it because you want to. - Luffy (One Piece)",
  "Even if I'm weak, I'll save you! - Izuku Midoriya (My Hero Academia)",
  "Don't believe in yourself! Believe in the me who believes in you! - Kamina (Gurren Lagann)",
  "If you turn your eyes away from sad things, they'll happen again one day. If you keep running away, you'll keep repeating the same mistakes. - Riki Naoe (Little Busters!)",
  "Motivation? What more do you need than the pride of a gamer? - Kirito (Sword Art Online)",
  "You can't sit around envying other people's worlds. You have to go out and change your own. - Shinichi Chiaki (Nodame Cantabile)",
  "A lesson without pain is meaningless. - Edward Elric (Fullmetal Alchemist: Brotherhood)",
  "Set your heart ablaze. - Kyojuro Rengoku (Demon Slayer)",
  "People die when they are forgotten. - Dr. Hiriluk (One Piece)",
  "The world isn't perfect. But it's there for us, doing the best it can... that's what makes it so damn beautiful. - Roy Mustang (Fullmetal Alchemist)",
  "Fear is not evil. It tells you what your weakness is. And once you know your weakness, you can become stronger as well as kinder. - Gildarts Clive (Fairy Tail)",
  "Whatever you lose, you'll find it again. But what you throw away you'll never get back. - Kenshin Himura (Rurouni Kenshin)",
  "The world cannot be changed with pretty words alone. - Lelouch Lamperouge (Code Geass)",
  "To know sorrow is not terrifying. What is terrifying is to know you can't go back to happiness you could have. - Matsumoto Rangiku (Bleach)",
  "We are all like fireworks: We climb, we shine and always go our separate ways and become further apart. - Toshiro Hitsugaya (Bleach)",
  "I hate perfection. To be perfect is to be unable to improve any further. - Mayuri Kurotsuchi (Bleach)",
  "Human beings are strong because we can change ourselves. - Saitama (One Punch Man)",
  "Knowing what it feels like to be in pain, is exactly why we try to be kind to others. - Jiraiya (Naruto)",
  "The past is the past. We cannot indulge ourselves in memories and destroy the present. - Murata Ken (Kyou Kara Maou!)",
  "If you want to get to know someone, find out what makes them angry. - Gon Freecss (Hunter x Hunter)",
  "The loneliest people are the kindest. The saddest people smile the brightest. - Jellal Fernandes (Fairy Tail)",
  "Fake people have an image to maintain. Real people just don't care. - Hachiman Hikigaya (Oregairu)",
  "A person can change, at the moment when the person wishes to change. - Haruhi Fujioka (Ouran High School Host Club)",
  "Thinking you're no-good and worthless is the worst thing you can do. - Nobito (Doraemon)",
  "In our society, letting others know what you're thinking is a really hard thing to do. - Naruto Uzumaki (Naruto)",
  "If you look away and just turn your back on those you don't understand, you'll regret it one day. - Naruto Uzumaki (Naruto)",
  "Being alone is better than being with the wrong person. - L Lawliet (Death Note)",
  "It's meaningless to just live, and it's meaningless to just fight. I want to win. - Ichigo Kurosaki (Bleach)",
  "I am the hope of the universe. I am the answer to all living things that cry out for peace. - Goku (Dragon Ball Z)",
  "Wake up to reality! Nothing ever goes as planned in this world. - Madara Uchiha (Naruto)",
  "Omae wa mou shindeiru. (You are already dead.) - Kenshiro (Fist of the North Star)",
  "Throughout heaven and earth, I alone am the honored one. - Satoru Gojo (Jujutsu Kaisen)",
  "I'm not gonna run away, I never go back on my word! That's my nindo: my ninja way! - Naruto Uzumaki (Naruto)",
  "Yowai mo. (You are weak.) - Satoru Gojo (Jujutsu Kaisen)",
  "If you win, you live. If you lose, you die. If you don't fight, you can't win! - Eren Yeager (Attack on Titan)",
  "Do you have any idea how stupid we are? Don't underestimate us! - Kondo Isao (Gintama)",
  "The weak are destined to lie beneath the boots of the strong. - Esdeath (Akame ga Kill!)",
  "Justice comes from vengeance, but that justice only breeds more vengeance. - Pain/Nagato (Naruto)",
  "It's over 9000! - Vegeta (Dragon Ball Z)",
  "Push through the pain, giving up hurts more. - Vegeta (Dragon Ball Z)",
  "I don't want to conquer anything. I just think the guy with the most freedom in this ocean is the Pirate King! - Luffy (One Piece)",
  "When a man learns to love, he must bear the risk of hatred. - Madara Uchiha (Naruto)",
  "Revenge is just the path you take to escape your suffering. - Ichigo Kurosaki (Bleach)",
  "Power comes in response to a need, not a desire. - Goku (Dragon Ball Z)",
  "I want you to be happy. I want you to laugh a lot. I don't know what exactly I'll be able to do for you, but I'll always be by your side. - Kagome (Inuyasha)",
  "Sorry, but I can't accompany you to your death. - Kurapika (Hunter x Hunter)",
  "Those who break the rules are scum, but those who abandon their friends are worse than scum. - Obito Uchiha (Naruto)",
  "A wound that would kill an ordinary man... I will not let it kill me! - Roronoa Zoro (One Piece)",
  "If I can meet you again, against the 6 billion to 1 odds, even if you can't move, I'll marry you. - Hideki Hinata (Angel Beats!)",
  "I love you with all my heart! If you were to stay here with me, there would be no regrets. - Sakura Haruno (Naruto)",
  "Even if I lose this feeling, I'll love you all over again. - Syaoran Li (Cardcaptor Sakura)",
  "I was dead until the moment I met you. - Lelouch Lamperouge (Code Geass)",
  "Love is simply an electrical bug in the human neural circuit. - Akasaka Ryuunosuke (Pet Girl of Sakurasou)",
  "Because people don't have wings, they look for ways to fly. - Ukai Keishin (Haikyuu!!)",
  "It was like you brought color to my life. You changed my life, all by yourself. - Sawako Kuronuma (Kimi ni Todoke)",
  "No matter which line of world you're in, I'm not alone. I'm with you. - Okabe Rintarou (Steins;Gate)",
  "I want to be with you. From now on, I want to spend all and every single one of my days until I die with you, and only you. - Naruto Uzumaki (The Last: Naruto the Movie)",
  "Even if the world sends you to hell, I will be the one to get you out. - Roronoa Zoro (One Piece)",
  "If you love someone, he could make you sad. He could even make you feel lonely sometimes. But that person can also make you happier than you'll ever be. - Saki Hanajima (Fruits Basket)",
  "We are not defined by our past, but by the choices we make in the present. - Kirito (Sword Art Online)",
  "If you don't share someone's pain, you can never understand them. - Nagato (Naruto)",
  "People who can't throw away something important can never hope to change anything. - Armin Arlert (Attack on Titan)",
  "It's okay not to be okay. - Unknown (Often attributed to Tokyo Ghoul themes)",
  "I want to know what 'I love you' means. - Violet Evergarden (Violet Evergarden)",
  "There are things you can't take back. But the world is full of things that you can change. - Satoru Fujinuma (Erased)",
  "Sometimes, I wonder if I'm even human. - Kaneki Ken (Tokyo Ghoul)",
  "The sun will rise again. - Eren Yeager (Implied theme, Attack on Titan)",
  "Friendship isn't something you choose. It's something that chooses you. - Misty (Pokemon)",
  "Bang. - Spike Spiegel (Cowboy Bebop)",
  "I'll take a potato chip... AND EAT IT! - Light Yagami (Death Note)",
  "El Psy Kongroo. - Okabe Rintarou (Steins;Gate)",
  "Believe it! - Naruto Uzumaki (Naruto)",
  "Dattebayo! - Naruto Uzumaki (Naruto)",
  "Plus Ultra! - All Might (My Hero Academia)",
  "Just who the hell do you think I am?! - Kamina (Gurren Lagann)",
  "Kaizoku ou ni ore wa naru! (I'm gonna be King of the Pirates!) - Luffy (One Piece)",
  "Nico Nico Nii! - Nico Yazawa (Love Live!)",
  "Yare Yare Daze. (Good grief.) - Jotaro Kujo (JoJo's Bizarre Adventure)",
  "Whatever happens, happens. - Spike Spiegel (Cowboy Bebop)",
  "See you space cowboy. - (Cowboy Bebop End Card)",
  "Bankai. - Ichigo Kurosaki (Bleach)",
  "Tatake. (Fight.) - Eren Yeager (Attack on Titan)",
  "Mada mada dane. (You still have a ways to go.) - Ryoma Echizen (Prince of Tennis)",
  "Equivalent Exchange. - (Fullmetal Alchemist)",
  "The weak don't get to choose how they die. - Trafalgar Law (One Piece)",
  "Is this a pigeon? - Android (Viral Meme from The Brave Fighter of Sun Fighbird)",
  "Humans are interesting. - Ryuk (Death Note)",
  "You are my Nakama! - Luffy (One Piece)"
];
let lastGameOverQuoteIndex = -1;
let currentGameOverQuoteIndex = -1;

function normalizeQuoteIndex(index) {
  const count = GAME_OVER_QUOTES.length;
  if (!count) return -1;
  return ((index % count) + count) % count;
}

function setGameOverQuoteIndex(index) {
  const normalized = normalizeQuoteIndex(index);
  if (normalized < 0) return "";
  currentGameOverQuoteIndex = normalized;
  lastGameOverQuoteIndex = normalized;
  return GAME_OVER_QUOTES[normalized];
}

function getRandomGameOverQuote() {
  if (!GAME_OVER_QUOTES.length) return "";
  let index = Math.floor(Math.random() * GAME_OVER_QUOTES.length);
  if (GAME_OVER_QUOTES.length > 1) {
    while (index === lastGameOverQuoteIndex) {
      index = Math.floor(Math.random() * GAME_OVER_QUOTES.length);
    }
  }
  return setGameOverQuoteIndex(index);
}

function cycleGameOverQuote(step) {
  if (!GAME_OVER_QUOTES.length) return "";
  if (currentGameOverQuoteIndex < 0) {
    return getRandomGameOverQuote();
  }
  return setGameOverQuoteIndex(currentGameOverQuoteIndex + step);
}

/*
const CHARACTER_UNLOCK_KEY = "photo2048CharacterUnlocks";
const CHARACTERS = [
  {
    id: "aurora",
    name: "Aurora",
    tagline: "Calm and balanced.",
    themes: [
      { id: "aurora-classic", label: "Classic", themeKey: "classic" },
      { id: "aurora-nature", label: "Verdant", themeKey: "nature" },
    ],
  },
  {
    id: "ember",
    name: "Ember",
    tagline: "Bold and bright.",
    themes: [
      { id: "ember-classic", label: "Classic", themeKey: "classic" },
      { id: "ember-nature", label: "Wilds", themeKey: "nature" },
    ],
  },
  {
    id: "atlas",
    name: "Atlas",
    tagline: "Steady and strong.",
    themes: [
      { id: "atlas-classic", label: "Classic", themeKey: "classic" },
      { id: "atlas-nature", label: "Grove", themeKey: "nature" },
    ],
  },
];
let selectedCharacterId = null;
let selectedThemeIndex = 0;
let themeSelectorElements = null;
*/

function scheduleBoardRefresh() {
  if (boardRefreshScheduled) return;
  boardRefreshScheduled = true;
  window.requestAnimationFrame(() => {
    boardRefreshScheduled = false;
    if (gameInstance) {
      gameInstance.actuate();
    }
  });
}

function setupUpdateToast() {
  const toast = document.getElementById("update-toast");
  const refreshButton = document.getElementById("update-refresh");
  const dismissButton = document.getElementById("update-dismiss");

  if (!toast || !refreshButton) return;

  updateUIElements = { toast, refreshButton, dismissButton };

  refreshButton.addEventListener("click", (event) => {
    event.preventDefault();
    requestUpdateRefresh();
  });

  if (dismissButton) {
    dismissButton.addEventListener("click", (event) => {
      event.preventDefault();
      hideUpdateToast();
    });
  }
}

function showUpdateToast(registration) {
  if (registration) {
    pendingUpdateRegistration = registration;
  }
  if (!updateUIElements) return;
  updateUIElements.toast.classList.remove("hidden");
}

function hideUpdateToast() {
  if (!updateUIElements) return;
  updateUIElements.toast.classList.add("hidden");
}

function requestUpdateRefresh() {
  updateRefreshRequested = true;
  if (pendingUpdateRegistration && pendingUpdateRegistration.waiting) {
    pendingUpdateRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  } else {
    window.location.reload();
  }
}

function trackServiceWorkerUpdates(registration) {
  if (!registration) return;

  if (registration.waiting) {
    showUpdateToast(registration);
  }

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        showUpdateToast(registration);
      }
    });
  });
}

function loadLeaderboard() {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(entries) {
  try {
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch (error) {
    // Ignore storage errors (private mode or quota).
  }
}

function sortLeaderboard(entries) {
  return entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.date || "").localeCompare(String(b.date || ""));
  });
}

function addLeaderboardEntry(entry) {
  const entries = loadLeaderboard();
  entries.push(entry);
  sortLeaderboard(entries);
  const trimmed = entries.slice(0, MAX_LEADERBOARD_ENTRIES);
  saveLeaderboard(trimmed);
  return trimmed;
}

function getStoredPlayerName() {
  try {
    return window.localStorage.getItem(PLAYER_NAME_KEY) || "";
  } catch (error) {
    return "";
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function getMaxTileValue(grid) {
  let maxValue = 0;
  grid.eachCell((x, y, tile) => {
    if (tile && tile.value > maxValue) {
      maxValue = tile.value;
    }
  });
  return maxValue;
}

/*
function loadUnlocks() {
  try {
    const raw = window.localStorage.getItem(CHARACTER_UNLOCK_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? data : {};
  } catch (error) {
    return {};
  }
}

function saveUnlocks(unlocks) {
  try {
    window.localStorage.setItem(CHARACTER_UNLOCK_KEY, JSON.stringify(unlocks));
  } catch (error) {
    // Ignore storage errors (private mode or quota).
  }
}

function getUnlockedIndex(characterId) {
  const unlocks = loadUnlocks();
  const value = unlocks[characterId];
  return Number.isInteger(value) ? value : 0;
}

function setUnlockedIndex(characterId, index) {
  const unlocks = loadUnlocks();
  unlocks[characterId] = index;
  saveUnlocks(unlocks);
}

function getCharacterById(characterId) {
  return CHARACTERS.find((character) => character.id === characterId) || null;
}

function getSelectedThemeMeta() {
  const character = getCharacterById(selectedCharacterId);
  if (!character) {
    return { themeLabel: selectedTheme || "classic", characterName: "" };
  }
  const theme = character.themes[selectedThemeIndex];
  return {
    themeLabel: theme ? theme.label : selectedTheme || "classic",
    characterName: character.name,
  };
}

function buildCharacterList() {
  if (!themeSelectorElements) return;
  const list = themeSelectorElements.characterList;
  list.textContent = "";

  CHARACTERS.forEach((character) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-card";

    const title = document.createElement("div");
    title.className = "character-title";
    title.textContent = character.name;

    const meta = document.createElement("div");
    meta.className = "character-meta";
    meta.textContent = character.tagline || "";

    const progress = document.createElement("div");
    progress.className = "character-progress";
    const unlockedIndex = getUnlockedIndex(character.id);
    const unlockedCount = Math.min(unlockedIndex + 1, character.themes.length);
    progress.textContent = `${unlockedCount}/${character.themes.length} themes`;

    button.appendChild(title);
    button.appendChild(meta);
    button.appendChild(progress);

    button.addEventListener("click", () => {
      openThemePanel(character.id);
    });

    list.appendChild(button);
  });
}

function buildThemeList(character) {
  if (!themeSelectorElements) return;
  const list = themeSelectorElements.themeList;
  list.textContent = "";

  const unlockedIndex = getUnlockedIndex(character.id);

  character.themes.forEach((theme, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-card";

    const title = document.createElement("span");
    title.className = "theme-title";
    title.textContent = theme.label;

    const status = document.createElement("span");
    status.className = "theme-status";

    const isUnlocked = index <= unlockedIndex;
    if (isUnlocked) {
      status.textContent = index === unlockedIndex && index !== 0 ? "New" : "Unlocked";
      button.addEventListener("click", () => {
        selectTheme(character.id, index);
      });
    } else {
      button.classList.add("locked");
      button.disabled = true;
      status.textContent = "Locked";
    }

    button.appendChild(title);
    button.appendChild(status);
    list.appendChild(button);
  });
}

function openCharacterSelect() {
  if (!themeSelectorElements) return;
  themeSelectorElements.title.textContent = "Choose Character";
  themeSelectorElements.subtitle.classList.remove("hidden");
  themeSelectorElements.characterList.classList.remove("hidden");
  themeSelectorElements.themePanel.classList.add("hidden");
  buildCharacterList();
}

function openThemePanel(characterId) {
  if (!themeSelectorElements) return;
  const character = getCharacterById(characterId);
  if (!character) return;

  selectedCharacterId = characterId;
  themeSelectorElements.title.textContent = "Choose Theme";
  themeSelectorElements.subtitle.classList.add("hidden");
  themeSelectorElements.characterList.classList.add("hidden");
  themeSelectorElements.themePanel.classList.remove("hidden");
  themeSelectorElements.characterName.textContent = character.name;
  themeSelectorElements.characterTagline.textContent = character.tagline || "";
  buildThemeList(character);
}

function selectTheme(characterId, themeIndex) {
  const character = getCharacterById(characterId);
  if (!character || !character.themes[themeIndex]) return;

  selectedCharacterId = characterId;
  selectedThemeIndex = themeIndex;
  selectedTheme = character.themes[themeIndex].themeKey;

  applyTheme(selectedTheme);

  if (themeSelectorElements) {
    themeSelectorElements.selector.classList.add("hidden");
  }

  startGame();
}

function setupThemeSelector() {
  const selector = document.getElementById("theme-selector");
  if (!selector) return;

  themeSelectorElements = {
    selector,
    title: selector.querySelector("h1"),
    subtitle: selector.querySelector(".theme-subtitle"),
    characterList: document.getElementById("character-list"),
    themePanel: document.getElementById("theme-panel"),
    themeList: document.getElementById("theme-list"),
    backButton: document.getElementById("back-to-characters"),
    characterName: document.getElementById("character-name"),
    characterTagline: document.getElementById("character-tagline"),
  };

  if (themeSelectorElements.backButton) {
    themeSelectorElements.backButton.addEventListener("click", () => {
      openCharacterSelect();
    });
  }

  openCharacterSelect();
}

function unlockNextTheme() {
  if (!selectedCharacterId) return;
  const character = getCharacterById(selectedCharacterId);
  if (!character) return;

  const unlockedIndex = getUnlockedIndex(selectedCharacterId);
  if (selectedThemeIndex < unlockedIndex) return;
  if (selectedThemeIndex >= character.themes.length - 1) return;

  setUnlockedIndex(selectedCharacterId, selectedThemeIndex + 1);
}
*/

function renderLeaderboard() {
  if (!leaderboardElements) return;
  const list = leaderboardElements.list;
  const entries = loadLeaderboard();
  sortLeaderboard(entries);

  list.textContent = "";

  if (!entries.length) {
    const empty = document.createElement("li");
    empty.className = "score-empty";
    empty.textContent = "No scores yet. Play a game to add one.";
    list.appendChild(empty);
    return;
  }

  entries.forEach((entry, index) => {
    const row = document.createElement("li");
    row.className = "score-row";

    const rank = document.createElement("div");
    rank.className = "score-rank";
    rank.textContent = String(index + 1);

    const main = document.createElement("div");
    main.className = "score-main";

    const name = document.createElement("div");
    name.className = "score-name";
    name.textContent = entry.name || "Player";

    const meta = document.createElement("div");
    meta.className = "score-meta";

    const metaParts = [];
    if (entry.maxTile) metaParts.push(`Tile ${entry.maxTile}`);
    if (entry.character) metaParts.push(entry.character);
    if (entry.theme) metaParts.push(entry.theme);
    if (entry.date) {
      const formatted = formatDate(entry.date);
      if (formatted) metaParts.push(formatted);
    }
    meta.textContent = metaParts.join(" - ");

    main.appendChild(name);
    if (meta.textContent) {
      main.appendChild(meta);
    }

    const value = document.createElement("div");
    value.className = "score-value";
    const scoreNumber = Number(entry.score) || 0;
    value.textContent = scoreNumber.toLocaleString();

    row.appendChild(rank);
    row.appendChild(main);
    row.appendChild(value);
    list.appendChild(row);
  });
}

function clearPendingEntry() {
  if (!pendingEntry) return;
  pendingEntry = null;
  if (!leaderboardElements) return;
  leaderboardElements.entry.classList.add("hidden");
  leaderboardElements.overlay.classList.add("hidden");
}

function commitPendingEntry(name) {
  if (!pendingEntry) return;
  const cleanName = String(name || "").trim();
  const finalName = cleanName ? cleanName.slice(0, 20) : "Player";

  try {
    window.localStorage.setItem(PLAYER_NAME_KEY, finalName);
  } catch (error) {
    // Ignore storage errors.
  }

  addLeaderboardEntry({
    name: finalName,
    score: pendingEntry.score,
    maxTile: pendingEntry.maxTile,
    theme: pendingEntry.theme,
    date: pendingEntry.date,
  });

  pendingEntry = null;

  if (leaderboardElements) {
    leaderboardElements.entry.classList.add("hidden");
    renderLeaderboard();
  }
}

function queueScoreEntry(score, grid) {
  if (!score || score <= 0) return;

  const entries = loadLeaderboard();
  sortLeaderboard(entries);

  if (entries.length >= MAX_LEADERBOARD_ENTRIES) {
    const lowestScore = Number(entries[entries.length - 1].score) || 0;
    if (score <= lowestScore) return;
  }

  pendingEntry = {
    score: score,
    maxTile: getMaxTileValue(grid),
    theme: "Classic",
    date: new Date().toISOString(),
  };

  if (!leaderboardElements) {
    commitPendingEntry("Player");
    return;
  }

  const { overlay, entry, input } = leaderboardElements;
  entry.classList.remove("hidden");
  overlay.classList.remove("hidden");
  renderLeaderboard();

  if (input && !input.value) {
    input.value = getStoredPlayerName();
  }
  if (input) {
    input.focus();
  }
}

function setupLeaderboardUI() {
  const overlay = document.getElementById("leaderboard");
  if (!overlay) return;

  const list = document.getElementById("high-score-list");
  const entry = document.getElementById("leaderboard-entry");
  const input = document.getElementById("player-name");
  const saveButton = document.getElementById("save-score");
  const showButton = document.getElementById("show-leaderboard");
  const closeButton = document.getElementById("close-leaderboard");
  const clearButton = document.getElementById("clear-leaderboard");

  leaderboardElements = {
    overlay,
    list,
    entry,
    input,
    saveButton,
    showButton,
    closeButton,
    clearButton,
  };

  if (input) {
    const storedName = getStoredPlayerName();
    if (storedName) {
      input.value = storedName;
    }
  }

  if (showButton) {
    showButton.addEventListener("click", () => {
      entry.classList.add("hidden");
      overlay.classList.remove("hidden");
      renderLeaderboard();
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      if (pendingEntry) {
        commitPendingEntry(input ? input.value : "");
      }
      overlay.classList.add("hidden");
    });
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      if (pendingEntry) {
        commitPendingEntry(input ? input.value : "");
      }
      overlay.classList.add("hidden");
    }
  });

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      commitPendingEntry(input ? input.value : "");
      overlay.classList.remove("hidden");
    });
  }

  if (input) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitPendingEntry(input.value);
        overlay.classList.remove("hidden");
      }
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      if (!window.confirm("Clear all high scores?")) {
        return;
      }
      saveLeaderboard([]);
      renderLeaderboard();
    });
  }

  renderLeaderboard();
}

document.addEventListener("DOMContentLoaded", () => {
  setupLeaderboardUI();
  setupDevMenu();
  setupUpdateToast();
  applyTheme("classic");
  startGame();
});

function applyTheme(theme) {
  themeLoadToken += 1;
  const token = themeLoadToken;
  customImageAvailability = {};
  document.body.className = ''; // Reset classes
  if (theme !== 'classic') {
    document.body.classList.add(theme);
  }
  
  // Update CustomImages paths
  const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576];
  values.forEach(val => {
      CustomImages[val] = `assets/${theme}/${val}.jpg`;
      customImageAvailability[val] = false;
      const img = new Image();
      img.onload = () => {
        if (token !== themeLoadToken) return;
        customImageAvailability[val] = true;
        scheduleBoardRefresh();
      };
      img.onerror = () => {
        if (token !== themeLoadToken) return;
        customImageAvailability[val] = false;
      };
      img.src = CustomImages[val];
  });
}

function startGame() {
  if (!window.effectManager) {
    window.effectManager = new EffectManager(".game-container");
  } else {
    window.effectManager.resize();
  }
  if (gameInstance) {
    gameInstance.reset();
  } else {
    gameInstance = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  }
}

function showThemeSelector() {
  applyTheme("classic");
  startGame();
}

function setupDevMenu() {
  const toggle = document.getElementById("dev-menu-toggle");
  const menu = document.getElementById("dev-menu");
  const gameOverButton = document.getElementById("dev-game-over");

  if (!toggle || !menu || !gameOverButton) return;

  devMenuElements = { toggle, menu, gameOverButton };

  const closeMenu = () => menu.classList.add("hidden");
  const toggleMenu = () => menu.classList.toggle("hidden");

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMenu();
  });

  menu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (menu.classList.contains("hidden")) return;
    if (event.target === toggle || menu.contains(event.target)) return;
    closeMenu();
  });

  gameOverButton.addEventListener("click", (event) => {
    event.preventDefault();
    closeMenu();
    if (!gameInstance || gameInstance.over) return;
    gameInstance.over = true;
    gameInstance.won = false;
    gameInstance.keepPlaying = false;
    gameInstance.actuate();
  });
}

class GameManager {
  constructor(size, InputManager, Actuator, StorageManager) {
    this.size = size; // Size of the grid
    this.inputManager = new InputManager();
    this.storageManager = new StorageManager();
    this.actuator = new Actuator();
    this.resultRecorded = false;
    this.undoState = null;

    this.startTiles = 2;

    this.inputManager.on("move", this.move.bind(this));
    this.inputManager.on("restart", this.restart.bind(this));
    this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
    this.inputManager.on("undo", this.undo.bind(this));

    this.setup();
  }

  restart() {
    showThemeSelector();
  }
  
  reset() {
    this.storageManager.clearGameState();
    this.storageManager.clearUndoState();
    this.actuator.continueGame(); // Clear the game won/lost message
    this.setup();
  }

  keepPlaying() {
    this.keepPlaying = true;
    this.actuator.continueGame(); // Clear the game won/lost message
  }

  // Return true if the game is lost, or has won and the user hasn't kept playing
  isGameTerminated() {
    return this.over || (this.won && !this.keepPlaying);
  }

  setup() {
    var previousState = this.storageManager.getGameState();
    var storedUndoState = this.storageManager.getUndoState();

    // Reload the game from a previous game if present
    if (previousState) {
      this.grid = new Grid(previousState.grid.size, previousState.grid.cells); // Reload grid
      this.score = previousState.score;
      this.over = previousState.over;
      this.won = previousState.won;
      this.keepPlaying = previousState.keepPlaying;
      this.resultRecorded = !!previousState.resultRecorded;
      this.undoState = storedUndoState;
    } else {
      this.grid = new Grid(this.size);
      this.score = 0;
      this.over = false;
      this.won = false;
      this.keepPlaying = false;
      this.resultRecorded = false;
      this.undoState = null;
      this.storageManager.clearUndoState();

      // Add the initial tiles
      this.addStartTiles();
    }

    // Update the actuator
    this.actuate();
  }

  // Set up the initial tiles to start the game with
  addStartTiles() {
    for (var i = 0; i < this.startTiles; i++) {
      this.addRandomTile();
    }
  }

  // Adds a tile in a random position
  addRandomTile() {
    if (this.grid.cellsAvailable()) {
      var value = Math.random() < 0.9 ? 2 : 4;
      var tile = new Tile(this.grid.randomAvailableCell(), value);

      this.grid.insertTile(tile);
    }
  }

  // Sends the updated grid to the actuator
  actuate() {
    const shouldRecordResult =
      !this.resultRecorded && (this.over || (this.won && !this.keepPlaying));

    if (shouldRecordResult) {
      this.resultRecorded = true;
    }

    if (this.storageManager.getBestScore() < this.score) {
      this.storageManager.setBestScore(this.score);
    }

    // Clear the state when the game is over (game over only, not win)
    if (this.over) {
      this.storageManager.clearGameState();
    } else {
      this.storageManager.setGameState(this.serialize());
    }

    this.actuator.actuate(this.grid, {
      score: this.score,
      over: this.over,
      won: this.won,
      bestScore: this.storageManager.getBestScore(),
      terminated: this.isGameTerminated(),
    });

    if (shouldRecordResult) {
      queueScoreEntry(this.score, this.grid);
    }

    this.updateUndoAvailability();
  }

  // Represent the current game as an object
  serialize() {
    return {
      grid: this.grid.serialize(),
      score: this.score,
      over: this.over,
      won: this.won,
      keepPlaying: this.keepPlaying,
      resultRecorded: this.resultRecorded,
    };
  }

  setUndoState(state) {
    this.undoState = state || null;
    if (this.storageManager && this.storageManager.setUndoState) {
      this.storageManager.setUndoState(this.undoState);
    }
    this.updateUndoAvailability();
  }

  updateUndoAvailability() {
    if (this.actuator && this.actuator.setUndoAvailable) {
      this.actuator.setUndoAvailable(!!this.undoState);
    }
  }

  restoreState(state) {
    if (!state || !state.grid) return;

    this.grid = new Grid(state.grid.size, state.grid.cells);
    this.score = state.score;
    this.over = state.over;
    this.won = state.won;
    this.keepPlaying = state.keepPlaying;
    this.resultRecorded = !!state.resultRecorded;

    this.grid.eachCell((x, y, tile) => {
      if (tile) {
        tile.mergedFrom = null;
        tile.previousPosition = { x, y };
      }
    });

    this.actuator.continueGame();
    this.actuate();
  }

  undo() {
    if (!this.undoState) return;
    const previous = this.undoState;
    this.setUndoState(null);
    clearPendingEntry();
    this.restoreState(previous);
    if (this.actuator && this.actuator.playUndoEffect) {
      this.actuator.playUndoEffect();
    }
  }

  // Save all tile positions and remove merger info
  prepareTiles() {
    this.grid.eachCell(function (x, y, tile) {
      if (tile) {
        tile.mergedFrom = null;
        tile.savePosition();
      }
    });
  }

  // Move a tile and its representation
  moveTile(tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  }

  // Move tiles on the grid in the specified direction
  move(direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    if (this.isGameTerminated()) return; // Don't do anything if the game's over

    var previousState = this.serialize();

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    // Save the current tile positions and remove merger information
    this.prepareTiles();

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
      traversals.y.forEach(function (y) {
        cell = { x: x, y: y };
        tile = self.grid.cellContent(cell);

        if (tile) {
          var positions = self.findFarthestPosition(cell, vector);
          var next = self.grid.cellContent(positions.next);

          // Only one merger per row traversal?
          if (next && next.value === tile.value && !next.mergedFrom) {
            var merged = new Tile(positions.next, tile.value * 2);
            merged.mergedFrom = [tile, next];

            self.grid.insertTile(merged);
            self.grid.removeTile(tile);

            // Converge the two tiles' positions
            tile.updatePosition(positions.next);

            // Update the score
            self.score += merged.value;

            // The mighty 2048 tile
            if (merged.value === 2048) {
              self.won = true;
            }
          } else {
            self.moveTile(tile, positions.farthest);
          }

          if (!self.positionsEqual(cell, tile)) {
            moved = true; // The tile moved from its original cell!
          }
        }
      });
    });

    if (moved) {
      this.setUndoState(previousState);
      this.addRandomTile();

      if (!this.movesAvailable()) {
        this.over = true; // Game over!
      }

      this.actuate();
    }
  }

  // Get the vector representing the chosen direction
  getVector(direction) {
    // Vectors representing tile movement
    var map = {
      0: { x: 0, y: -1 }, // Up
      1: { x: 1, y: 0 }, // Right
      2: { x: 0, y: 1 }, // Down
      3: { x: -1, y: 0 }, // Left
    };

    return map[direction];
  }

  // Build a list of positions to traverse in the right order
  buildTraversals(vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
  }

  findFarthestPosition(cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
      previous = cell;
      cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));

    return {
      farthest: previous,
      next: cell, // Used to check if a merge is required
    };
  }

  movesAvailable() {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
  }

  // Check for available matches between tiles (more expensive check)
  tileMatchesAvailable() {
    var self = this;

    var tile;

    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        tile = this.grid.cellContent({ x: x, y: y });

        if (tile) {
          for (var direction = 0; direction < 4; direction++) {
            var vector = self.getVector(direction);
            var cell = { x: x + vector.x, y: y + vector.y };

            var other = self.grid.cellContent(cell);

            if (other && other.value === tile.value) {
              return true; // These two tiles can be merged
            }
          }
        }
      }
    }

    return false;
  }

  positionsEqual(first, second) {
    return first.x === second.x && first.y === second.y;
  }
}

class Grid {
  constructor(size, previousState) {
    this.size = size;
    this.cells = previousState ? this.fromState(previousState) : this.empty();
  }

  // Build a grid of the specified size
  empty() {
    var cells = [];

    for (var x = 0; x < this.size; x++) {
      var row = (cells[x] = []);

      for (var y = 0; y < this.size; y++) {
        row.push(null);
      }
    }

    return cells;
  }

  fromState(state) {
    var cells = [];

    for (var x = 0; x < this.size; x++) {
      var row = (cells[x] = []);

      for (var y = 0; y < this.size; y++) {
        var tile = state[x][y];
        row.push(tile ? new Tile(tile.position, tile.value) : null);
      }
    }

    return cells;
  }

  // Find the first available random position
  randomAvailableCell() {
    var cells = this.availableCells();

    if (cells.length) {
      return cells[Math.floor(Math.random() * cells.length)];
    }
  }

  availableCells() {
    var cells = [];

    this.eachCell(function (x, y, tile) {
      if (!tile) {
        cells.push({ x: x, y: y });
      }
    });

    return cells;
  }

  eachCell(callback) {
    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        callback(x, y, this.cells[x][y]);
      }
    }
  }

  cellsAvailable() {
    return !!this.availableCells().length;
  }

  cellAvailable(cell) {
    return !this.cellContent(cell);
  }

  cellContent(cell) {
    if (this.withinBounds(cell)) {
      return this.cells[cell.x][cell.y];
    } else {
      return null;
    }
  }

  insertTile(tile) {
    this.cells[tile.x][tile.y] = tile;
  }

  removeTile(tile) {
    this.cells[tile.x][tile.y] = null;
  }

  withinBounds(position) {
    return (
      position.x >= 0 &&
      position.x < this.size &&
      position.y >= 0 &&
      position.y < this.size
    );
  }

  serialize() {
    var cellState = [];

    for (var x = 0; x < this.size; x++) {
      var row = (cellState[x] = []);

      for (var y = 0; y < this.size; y++) {
        row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
      }
    }

    return {
      size: this.size,
      cells: cellState,
    };
  }
}

class Tile {
  constructor(position, value) {
    this.x = position.x;
    this.y = position.y;
    this.value = value || 2;

    this.previousPosition = null;
    this.mergedFrom = null; // Tracks tiles that merged together
  }

  savePosition() {
    this.previousPosition = { x: this.x, y: this.y };
  }

  updatePosition(position) {
    this.x = position.x;
    this.y = position.y;
  }

  serialize() {
    return {
      position: {
        x: this.x,
        y: this.y,
      },
      value: this.value,
    };
  }
}

class HTMLActuator {
  constructor() {
    this.tileContainer = document.querySelector(".tile-container");
    this.scoreContainer = document.querySelector(".score-container");
    this.bestContainer = document.querySelector(".best-container");
    this.messageContainer = document.querySelector(".game-message");
    this.quoteContainer = document.querySelector(".game-quote");
    this.quoteControls = document.querySelector(".quote-controls");
    this.quotePrevButton = document.querySelector(".quote-prev-button");
    this.quoteNextButton = document.querySelector(".quote-next-button");
    this.gameContainer = document.querySelector(".game-container");
    this.undoButton = document.getElementById("undo-button");
    this.score = 0;
    this.undoEffectTimeout = null;
    this.bindQuoteControls();
  }

  actuate(grid, metadata) {
    var self = this;

    window.requestAnimationFrame(function () {
      self.clearContainer(self.tileContainer);

      grid.cells.forEach(function (column) {
        column.forEach(function (cell) {
          if (cell) {
            self.addTile(cell);
          }
        });
      });

      self.updateScore(metadata.score);
      self.updateBestScore(metadata.bestScore);

      if (metadata.terminated) {
        if (metadata.over) {
          self.message(false); // You lose
        } else if (metadata.won) {
          self.message(true); // You win!
        }
      }
    });
  }

  continueGame() {
    this.clearMessage();
  }

  clearContainer(container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  addTile(tile) {
    var self = this;

    var wrapper = document.createElement("div");
    var inner = document.createElement("div");
    var position = tile.previousPosition || { x: tile.x, y: tile.y };
    var positionClass = this.positionClass(position);

    // We can't use classList because it somehow glitches when replacing classes
    var classes = ["tile", "tile-" + tile.value, positionClass];

    if (tile.value > 2048) classes.push("tile-super");

    this.applyClasses(wrapper, classes);

    inner.classList.add("tile-inner");
    inner.textContent = tile.value; 
    
    // Set custom background image if available
    if (CustomImages[tile.value] && customImageAvailability[tile.value]) {
      inner.style.backgroundImage = `url('${CustomImages[tile.value]}')`;
      inner.classList.add("has-image");
      inner.textContent = ""; // Clear text if image is used
    }

    if (tile.previousPosition) {
      // Make sure that the tile gets rendered in the previous position first
      // We use a small timeout to ensure the browser has time to paint the initial state
      // or double RAF to ensure next frame.
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function() {
          classes[2] = self.positionClass({ x: tile.x, y: tile.y });
          self.applyClasses(wrapper, classes); // Update the position
        });
      });
    } else if (tile.mergedFrom) {
      classes.push("tile-merged");
      
      // Add specific merged classes for high values to trigger cool animations
      if (tile.value >= 64) {
        classes.push("tile-merged-effect");
        classes.push("tile-merged-" + tile.value);
      }

      this.applyClasses(wrapper, classes);

      // Render the tiles that merged
      tile.mergedFrom.forEach(function (merged) {
        self.addTile(merged);
      });
    } else {
      classes.push("tile-new");
      this.applyClasses(wrapper, classes);
    }

    wrapper.appendChild(inner);

    // Add the inner part to the wrapper
    this.tileContainer.appendChild(wrapper);

    if (tile.mergedFrom && window.effectManager) {
      window.requestAnimationFrame(() => {
        window.effectManager.explode(wrapper, tile.value);
      });
    }
  }

  applyClasses(element, classes) {
    element.setAttribute("class", classes.join(" "));
  }

  normalizePosition(position) {
    return { x: position.x + 1, y: position.y + 1 };
  }

  positionClass(position) {
    position = this.normalizePosition(position);
    return "tile-position-" + position.x + "-" + position.y;
  }

  updateScore(score) {
    this.clearContainer(this.scoreContainer);

    var difference = score - this.score;
    this.score = score;

    this.scoreContainer.textContent = this.score;

    if (difference > 0) {
      var addition = document.createElement("div");
      addition.classList.add("score-addition");
      addition.textContent = "+" + difference;

      this.scoreContainer.appendChild(addition);
    }
  }

  updateBestScore(bestScore) {
    this.bestContainer.textContent = bestScore;
  }

  bindQuoteControls() {
    if (this.quotePrevButton) {
      this.quotePrevButton.addEventListener("click", (event) => {
        event.preventDefault();
        this.cycleQuote(-1);
      });
    }
    if (this.quoteNextButton) {
      this.quoteNextButton.addEventListener("click", (event) => {
        event.preventDefault();
        this.cycleQuote(1);
      });
    }
  }

  setQuoteControlsVisible(isVisible) {
    if (!this.quoteControls) return;
    this.quoteControls.classList.toggle("hidden", !isVisible);
  }

  showGameOverQuote(quote, reanimate) {
    if (!this.quoteContainer) return;
    this.quoteContainer.classList.remove("quote-refresh");
    this.quoteContainer.textContent = quote;
    this.quoteContainer.classList.remove("hidden");
    if (reanimate) {
      void this.quoteContainer.offsetWidth;
      this.quoteContainer.classList.add("quote-refresh");
    }
  }

  cycleQuote(step) {
    const quote = cycleGameOverQuote(step);
    if (!quote) return;
    this.showGameOverQuote(quote, true);
  }

  message(won) {
    var type = won ? "game-won" : "game-over";
    var message = won ? "You win!" : "Game over!";

    this.messageContainer.classList.add(type);
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;

    if (won) {
      if (this.quoteContainer) {
        this.quoteContainer.textContent = "";
        this.quoteContainer.classList.add("hidden");
      }
      this.setQuoteControlsVisible(false);
    } else {
      const quote = getRandomGameOverQuote();
      this.showGameOverQuote(quote, false);
      this.setQuoteControlsVisible(true);
    }
  }

  clearMessage() {
    this.messageContainer.classList.remove("game-won");
    this.messageContainer.classList.remove("game-over");
    if (this.quoteContainer) {
      this.quoteContainer.textContent = "";
      this.quoteContainer.classList.add("hidden");
      this.quoteContainer.classList.remove("quote-refresh");
    }
    this.setQuoteControlsVisible(false);
  }

  setUndoAvailable(isAvailable) {
    if (!this.undoButton) return;
    this.undoButton.disabled = !isAvailable;
  }

  playUndoEffect() {
    if (this.gameContainer) {
      this.gameContainer.classList.remove("undo-flash");
      void this.gameContainer.offsetWidth;
      this.gameContainer.classList.add("undo-flash");
      if (this.undoEffectTimeout) {
        window.clearTimeout(this.undoEffectTimeout);
      }
      this.undoEffectTimeout = window.setTimeout(() => {
        if (this.gameContainer) {
          this.gameContainer.classList.remove("undo-flash");
        }
        this.undoEffectTimeout = null;
      }, 700);
    }

    if (window.effectManager && window.effectManager.rewind) {
      window.effectManager.rewind();
    }
  }
}

class KeyboardInputManager {
  constructor() {
    this.events = {};

    if (window.navigator.msPointerEnabled) {
      //Internet Explorer 10 style
      this.eventTouchstart = "MSPointerDown";
      this.eventTouchmove = "MSPointerMove";
      this.eventTouchend = "MSPointerUp";
    } else {
      this.eventTouchstart = "touchstart";
      this.eventTouchmove = "touchmove";
      this.eventTouchend = "touchend";
    }

    this.listen();
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, data) {
    var callbacks = this.events[event];
    if (callbacks) {
      callbacks.forEach(function (callback) {
        callback(data);
      });
    }
  }

  listen() {
    var self = this;

    var map = {
      38: 0, // Up
      39: 1, // Right
      40: 2, // Down
      37: 3, // Left
      75: 0, // Vim up
      76: 1, // Vim right
      74: 2, // Vim down
      72: 3, // Vim left
      87: 0, // W
      68: 1, // D
      83: 2, // S
      65: 3, // A
    };

    function isTypingTarget(target) {
      if (!target) return false;
      if (target.isContentEditable) return true;
      var tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }

    function isOverlayActive() {
      var leaderboard = document.getElementById("leaderboard");
      if (leaderboard && !leaderboard.classList.contains("hidden")) return true;
      var themeSelector = document.getElementById("theme-selector");
      if (themeSelector && !themeSelector.classList.contains("hidden")) return true;
      return false;
    }

    // Respond to direction keys
    document.addEventListener("keydown", function (event) {
      if (isTypingTarget(event.target) || isOverlayActive()) {
        return;
      }

      var modifiers =
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
      var mapped = map[event.which];

      if (!modifiers) {
        if (mapped !== undefined) {
          event.preventDefault();
          self.emit("move", mapped);
        }
      }

      if (!modifiers && event.which === 85) {
        event.preventDefault();
        self.emit("undo");
      }

      // R key restarts the game
      if (!modifiers && event.which === 82) {
        self.restart.call(self, event);
      }
    });

    // Respond to button presses
    this.bindButtonPress(".retry-button", this.restart);
    this.bindButtonPress(".restart-button", this.restart);
    this.bindButtonPress(".undo-button", this.undo);
    this.bindButtonPress(".keep-playing-button", this.keepPlaying);

    // Respond to swipe events
    var touchStartClientX, touchStartClientY;
    var gameContainer = document.getElementsByClassName("game-container")[0];
    var hasSwiped = false;

    gameContainer.addEventListener(this.eventTouchstart, function (event) {
      if (
        (!window.navigator.msPointerEnabled && event.touches.length > 1) ||
        event.targetTouches.length > 1
      ) {
        return; // Ignore if touching with more than 1 finger
      }

      if (window.navigator.msPointerEnabled) {
        touchStartClientX = event.pageX;
        touchStartClientY = event.pageY;
      } else {
        touchStartClientX = event.touches[0].clientX;
        touchStartClientY = event.touches[0].clientY;
      }

      hasSwiped = false;
      event.preventDefault();
    });

    gameContainer.addEventListener(this.eventTouchmove, function (event) {
      event.preventDefault();

      if (hasSwiped) return;

      if (
        (!window.navigator.msPointerEnabled && event.touches.length > 1) ||
        event.targetTouches.length > 1
      ) {
        return; // Ignore if touching with more than 1 finger
      }

      var touchEndClientX, touchEndClientY;

      if (window.navigator.msPointerEnabled) {
        touchEndClientX = event.pageX;
        touchEndClientY = event.pageY;
      } else {
        touchEndClientX = event.touches[0].clientX;
        touchEndClientY = event.touches[0].clientY;
      }

      var dx = touchEndClientX - touchStartClientX;
      var dy = touchEndClientY - touchStartClientY;
      var absDx = Math.abs(dx);
      var absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) > 10) {
        // (right : left) : (down : up)
        self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
        hasSwiped = true;
      }
    });

    gameContainer.addEventListener(this.eventTouchend, function (event) {
      if (
        (!window.navigator.msPointerEnabled && event.touches.length > 0) ||
        event.targetTouches.length > 0
      ) {
        return; // Ignore if still touching with one or more fingers
      }

      if (hasSwiped) return;

      var touchEndClientX, touchEndClientY;

      if (window.navigator.msPointerEnabled) {
        touchEndClientX = event.pageX;
        touchEndClientY = event.pageY;
      } else {
        touchEndClientX = event.changedTouches[0].clientX;
        touchEndClientY = event.changedTouches[0].clientY;
      }

      var dx = touchEndClientX - touchStartClientX;
      var dy = touchEndClientY - touchStartClientY;
      var absDx = Math.abs(dx);
      var absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) > 10) {
        // (right : left) : (down : up)
        self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
      }
    });
  }

  restart(event) {
    event.preventDefault();
    this.emit("restart");
  }

  undo(event) {
    event.preventDefault();
    this.emit("undo");
  }

  keepPlaying(event) {
    event.preventDefault();
    this.emit("keepPlaying");
  }

  bindButtonPress(selector, fn) {
    var button = document.querySelector(selector);
    if (!button) return;
    button.addEventListener("click", fn.bind(this));
    button.addEventListener(this.eventTouchend, fn.bind(this));
  }
}

class LocalStorageManager {
  constructor() {
    this.bestScoreKey = "bestScore";
    this.gameStateKey = "gameState";
    this.undoStateKey = "undoState";
    var supported = this.localStorageSupported();
    this.storage = supported ? window.localStorage : window.fakeStorage;
  }

  localStorageSupported() {
    var testKey = "test";
    var storage = window.localStorage;

    try {
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  getBestScore() {
    return this.storage.getItem(this.bestScoreKey) || 0;
  }

  setBestScore(score) {
    this.storage.setItem(this.bestScoreKey, score);
  }

  getGameState() {
    var stateJSON = this.storage.getItem(this.gameStateKey);
    return stateJSON ? JSON.parse(stateJSON) : null;
  }

  setGameState(gameState) {
    this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
  }

  clearGameState() {
    this.storage.removeItem(this.gameStateKey);
  }

  getUndoState() {
    var stateJSON = this.storage.getItem(this.undoStateKey);
    if (!stateJSON) return null;
    try {
      return JSON.parse(stateJSON);
    } catch (error) {
      return null;
    }
  }

  setUndoState(undoState) {
    if (!undoState) {
      this.storage.removeItem(this.undoStateKey);
      return;
    }
    this.storage.setItem(this.undoStateKey, JSON.stringify(undoState));
  }

  clearUndoState() {
    this.storage.removeItem(this.undoStateKey);
  }
}

window.fakeStorage = {
  _data: {},

  setItem: function (id, val) {
    return (this._data[id] = String(val));
  },

  getItem: function (id) {
    return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
  },

  removeItem: function (id) {
    return delete this._data[id];
  },

  clear: function () {
    return (this._data = {});
  },
};
