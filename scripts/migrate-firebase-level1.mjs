import fs from "node:fs";
import path from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const sourceGameId = process.env.SOURCE_GAME_ID || "2048";
const targetGameId = process.env.TARGET_GAME_ID || "2048-level-1";
const targetLevel = Number(process.env.TARGET_LEVEL || 1);

const credPath =
  process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credPath) {
  console.error(
    "Missing credentials. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file."
  );
  process.exit(1);
}

const resolvedPath = path.resolve(credPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Service account file not found: ${resolvedPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;

if (!projectId) {
  console.error("Missing project ID. Set FIREBASE_PROJECT_ID or provide it in the service account JSON.");
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId
});

const db = getFirestore(app);

const collection = db.collection("leaderboards");
const snapshot = await collection.where("gameId", "==", sourceGameId).get();

if (snapshot.empty) {
  console.log(`No leaderboard docs found for gameId "${sourceGameId}".`);
  process.exit(0);
}

console.log(
  `Found ${snapshot.size} docs to copy from "${sourceGameId}" to "${targetGameId}" (level ${targetLevel}).`
);

if (!commit) {
  console.log("Dry run only. Re-run with --commit to apply updates.");
  process.exit(0);
}

let migrated = 0;
let batch = db.batch();
let batchSize = 0;
const batchLimit = 450;

for (const doc of snapshot.docs) {
  const targetRef = collection.doc(`${doc.id}-level-${targetLevel}`);
  const data = doc.data();
  batch.set(targetRef, {
    ...data,
    gameId: targetGameId,
    level: targetLevel
  });
  batchSize += 1;

  if (batchSize >= batchLimit) {
    await batch.commit();
    migrated += batchSize;
    batch = db.batch();
    batchSize = 0;
  }
}

if (batchSize > 0) {
  await batch.commit();
  migrated += batchSize;
}

console.log(`Migration complete. Updated ${migrated} docs.`);
