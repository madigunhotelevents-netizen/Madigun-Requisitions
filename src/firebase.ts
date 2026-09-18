import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  memoryLocalCache, 
  doc, 
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';

export const firebaseConfig = {
  projectId: firebaseAppletConfig.projectId || "arcane-wharf-btsmh",
  appId: firebaseAppletConfig.appId || "1:741671541489:web:456aea7014ffaec92de750",
  apiKey: firebaseAppletConfig.apiKey || "AIzaSyDEL29m45qvch3-1MnCgU1OaQzez-VP16o",
  authDomain: firebaseAppletConfig.authDomain || "arcane-wharf-btsmh.firebaseapp.com",
  storageBucket: firebaseAppletConfig.storageBucket || "arcane-wharf-btsmh.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "741671541489",
  ...(firebaseAppletConfig as Record<string, any>)
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
// 2. experimentalAutoDetectLongPolling handles network roaming seamlessly.
function createFirestoreInstance(): Firestore {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;

  try {
    if (dbId) {
      return initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true
      }, dbId);
    } else {
      return initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true
      });
    }
  } catch (err: any) {
    try {
      return dbId ? getFirestore(app, dbId) : getFirestore(app);
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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

