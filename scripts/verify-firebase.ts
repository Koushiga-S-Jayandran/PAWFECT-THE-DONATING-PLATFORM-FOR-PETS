import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('FAIL: firebase-applet-config.json not found');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);
  const auth = getAuth(app);

  console.log('--- START FIREBASE VERIFICATION ---');

  // Check 1: Firebase is connected
  let check1 = false;
  try {
    const testDoc = await getDoc(doc(db, 'test', 'connection'));
    console.log('CHECK 1: Firebase & Firestore connection: PASS');
    check1 = true;
  } catch (err: any) {
    console.log('CHECK 1: Firebase & Firestore connection: FAIL ->', err.message);
  }

  // Check 2 & 3: Email/Password sign-in enabled & test account create / delete
  let check2 = false;
  let check3 = false;
  let testUserUid = '';
  const testEmail = `pawfect_test_${Date.now()}@example.com`;
  const testPass = 'Pawfect12345!Test';

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPass);
    testUserUid = userCredential.user.uid;
    console.log('CHECK 2: Email/Password sign-in enabled: PASS');
    check2 = true;

    // Check 4: Firestore accepts a write to test account's own users doc
    let check4a = false;
    let check4b = false;
    try {
      await setDoc(doc(db, 'users', testUserUid), {
        fullName: 'Test Verifier',
        phone: '+919876543210',
        consentAt: new Date().toISOString(),
        consentVersion: 'v1.0',
        role: 'DONOR',
        createdAt: new Date().toISOString()
      });
      console.log("CHECK 4a: Write to user's own doc: PASS");
      check4a = true;
    } catch (e: any) {
      console.log("CHECK 4a: Write to user's own doc: FAIL ->", e.message);
    }

    // Check 4b: Firestore refuses read of another user's doc
    try {
      await getDoc(doc(db, 'users', 'another_random_uid_99999'));
      console.log("CHECK 4b: Refuses read of another user's doc: FAIL (allowed unexpectedly)");
    } catch (e: any) {
      console.log("CHECK 4b: Refuses read of another user's doc: PASS (Denied as expected -> " + e.code + ")");
      check4b = true;
    }

    // Clean up test user doc
    try {
      // Need verified email for delete rule, or skip doc deletion
    } catch (e) {}

    // Delete the test auth account
    try {
      await deleteUser(userCredential.user);
      console.log('CHECK 3: Test account created and deleted: PASS');
      check3 = true;
    } catch (e: any) {
      console.log('CHECK 3: Delete test account: FAIL ->', e.message);
    }
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      console.log('CHECK 2: Email/Password sign-in enabled: FAIL (auth/operation-not-allowed: Email/Password provider is not enabled in Firebase Console)');
    } else {
      console.log('CHECK 2: Email/Password sign-in enabled: FAIL ->', err.code, err.message);
    }
    console.log('CHECK 3: Test account created and deleted: FAIL (blocked by Check 2)');
  }

  // Check 5: loginThrottle rules accept a +1 write and refuse a jump from 1 to 3
  let check5 = false;
  const testHash = `testhash${Date.now()}`;
  try {
    // 5a: Initial create with count: 1
    await setDoc(doc(db, 'loginThrottle', testHash), {
      count: 1,
      windowStart: new Date().toISOString()
    });
    console.log('CHECK 5a: loginThrottle initial count 1: PASS');

    // 5b: Incremental +1 update (1 -> 2)
    const existingSnap = await getDoc(doc(db, 'loginThrottle', testHash));
    const winStart = existingSnap.data()?.windowStart;
    await updateDoc(doc(db, 'loginThrottle', testHash), {
      count: 2,
      windowStart: winStart
    });
    console.log('CHECK 5b: loginThrottle +1 increment (1 -> 2): PASS');

    // 5c: Refuses jump from 2 to 4 or 1 to 3
    let jumpRefused = false;
    try {
      await updateDoc(doc(db, 'loginThrottle', testHash), {
        count: 4,
        windowStart: winStart
      });
      console.log('CHECK 5c: loginThrottle jump refused: FAIL (jump from 2 to 4 allowed!)');
    } catch (e: any) {
      console.log('CHECK 5c: loginThrottle jump refused: PASS (jump from 2 to 4 denied -> ' + e.code + ')');
      jumpRefused = true;
    }

    if (jumpRefused) {
      check5 = true;
    }
  } catch (err: any) {
    console.log('CHECK 5: loginThrottle rules: FAIL ->', err.message);
  }

  console.log('--- END FIREBASE VERIFICATION ---');
}

run().catch(console.error);
