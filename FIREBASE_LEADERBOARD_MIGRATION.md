# Firebase Leaderboard Migration (Copy to Level 1)

This guide copies existing leaderboard docs from the legacy gameId (`2048`)
into the new level-based gameId (`2048-level-1`) without deleting the originals.

## What the script does
- Reads Firestore collection `leaderboards` where `gameId == "2048"`.
- Writes new documents into the same collection with IDs like `<oldId>-level-1`.
- Sets `gameId: "2048-level-1"` and `level: 1` on the new docs.
- Preserves all other fields (`score`, `playerName`, `turns`, `undos`, `timestamp`).

Script: `scripts/migrate-firebase-level1.mjs`

## Prerequisites
- Node.js installed.
- `firebase-admin` installed (run `npm install`).
- A Firebase service account JSON file with Firestore access.

## Credentials
Set one of the following environment variables to the service account file:
- `FIREBASE_SERVICE_ACCOUNT`
- `GOOGLE_APPLICATION_CREDENTIALS`

Example (PowerShell):
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
```

Optional override:
```powershell
$env:FIREBASE_PROJECT_ID="your-project-id"
```

## Dry run (no writes)
```powershell
node scripts/migrate-firebase-level1.mjs
```

## Commit (writes new docs)
```powershell
node scripts/migrate-firebase-level1.mjs --commit
```

## Optional overrides
Use these if you want to copy to a different target:
```powershell
$env:SOURCE_GAME_ID="2048"
$env:TARGET_GAME_ID="2048-level-1"
$env:TARGET_LEVEL="1"
node scripts/migrate-firebase-level1.mjs --commit
```

## Idempotency and re-runs
- The script writes using deterministic IDs (`<oldId>-level-<n>`), so re-running
  will overwrite the same copied docs instead of creating duplicates.

## Cleanup (if needed)
If you want to remove the copied docs later, delete documents where:
- `gameId == "2048-level-1"`
You can do this from the Firebase Console, or ask for a cleanup script.
