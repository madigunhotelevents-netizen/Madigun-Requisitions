import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache, 
  doc, 
  getDocFromServer,
  enableNetwork,
  disableNetwork,
  Firestore
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "mindful-compiler-f6rpq",
  appId: "1:104282394234:web:59b082f043348fabbb75c3",
  apiKey: "AIzaSyAkeQpkzK4_oNe6nl_unDxjapHXz4og_80",
  authDomain: "mindful-compiler-f6rpq.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-madigunhoteleven-956fecc5-6f7e-44d1-a216-9bcc9e277826",
  storageBucket: "mindful-compiler-f6rpq.firebasestorage.app",
  messagingSenderId: "104282394234"
};

export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let authInstance: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    try {
      authInstance = getAuth(app);
    } catch (e) {
      console.warn("Retrying Firebase auth initialization:", e);
      authInstance = getAuth();
    }
  }
  return authInstance;
}

// Initialize Firestore with memory cache for clean, reliable real-time syncing:
// 1. memoryLocalCache eliminates IndexedDB locking issues, quota limits, and SDK assertion crashes.
// 2. experimentalAutoDetectLongPolling handles mobile network roaming seamlessly.
function createFirestoreInstance(): Firestore {
  const dbId = firebaseConfig.firestoreDatabaseId;

  try {
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true
    }, dbId);
  } catch (err: any) {
    try {
      return getFirestore(app, dbId);
    } catch (e2) {
      return getFirestore(app);
    }
  }
}

export const db: Firestore = createFirestoreInstance();

// Direct live server connection check helper (called on-demand if needed)
export async function clearCachesAndVerifyServerConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'configs', 'categories'));
    return true;
  } catch (error) {
    return false;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

