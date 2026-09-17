import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';

// Google Drive OAuth Scopes
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

export const getDriveAuthProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  DRIVE_SCOPES.forEach(scope => provider.addScope(scope));
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
};

// In-Memory cached access token (never stored in localStorage for security)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
}

export interface StorageQuota {
  limit?: number; // bytes
  usage?: number; // bytes
  usageInDrive?: number;
  usageInDriveTrash?: number;
}

// Auth State Listener
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Sign in with Google Popup
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const auth = getFirebaseAuth();
    const provider = getDriveAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google signed in, but no Google Drive OAuth access token was returned. Please make sure you grant Drive permissions.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    if (error.code === 'auth/popup-blocked') {
      throw new Error('The sign-in popup was blocked by your browser. Please allow popups for this site or open the app in a new window to sign in.');
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Sign-in was cancelled before completing.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Another sign-in window was opened. Please complete the active popup.');
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized in Firebase Auth. Please open the app in a new tab or add this host to authorized domains.');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Disconnect Google Drive
export const disconnectGoogleDrive = async (): Promise<void> => {
  cachedAccessToken = null;
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } catch (err) {
    console.error('Sign-out error:', err);
  }
};

// Get current Access Token
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Manually set access token (if refreshed)
export const setDriveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Fetch Google Drive user details and storage quota
export const getDriveAbout = async (token: string): Promise<{ user: any; storageQuota: StorageQuota }> => {
  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Drive quota: ${res.statusText}`);
  }
  return res.json();
};

// List files & folders
export const listDriveFiles = async (
  token: string,
  parentFolderId?: string,
  searchTerm?: string,
  mimeTypeFilter?: string
): Promise<DriveFileItem[]> => {
  let queryParts: string[] = ['trashed = false'];

  if (parentFolderId) {
    queryParts.push(`'${parentFolderId}' in parents`);
  }

  if (searchTerm && searchTerm.trim()) {
    const escaped = searchTerm.replace(/'/g, "\\'");
    queryParts.push(`name contains '${escaped}'`);
  }

  if (mimeTypeFilter === 'folder') {
    queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
  } else if (mimeTypeFilter === 'file') {
    queryParts.push("mimeType != 'application/vnd.google-apps.folder'");
  }

  const q = encodeURIComponent(queryParts.join(' and '));
  const fields = encodeURIComponent('files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, thumbnailLink, iconLink, parents)');
  const orderBy = encodeURIComponent('folder,modifiedTime desc');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=${orderBy}&pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.files || [];
};

// Create a Folder in Google Drive
export const createDriveFolder = async (
  token: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFileItem> => {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to create folder: ${errBody}`);
  }

  return res.json();
};

// Upload Blob or File via Multipart Upload to Google Drive
export const uploadFileToDrive = async (
  token: string,
  fileContent: Blob | File | string,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
): Promise<DriveFileItem> => {
  const metadata: any = {
    name: fileName,
    mimeType: mimeType
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  let bodyBlob: Blob;

  if (fileContent instanceof Blob) {
    const metadataBlob = new Blob([
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`
    ], { type: 'text/plain' });

    const closeBlob = new Blob([closeDelimiter], { type: 'text/plain' });
    bodyBlob = new Blob([metadataBlob, fileContent, closeBlob], { type: `multipart/related; boundary=${boundary}` });
  } else {
    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      fileContent +
      closeDelimiter;
    bodyBlob = new Blob([multipartBody], { type: `multipart/related; boundary=${boundary}` });
  }

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: bodyBlob
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload file to Google Drive: ${errText}`);
  }

  return res.json();
};

// Download File content from Drive
export const downloadDriveFile = async (token: string, fileId: string): Promise<Blob> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive: ${res.statusText}`);
  }

  return res.blob();
};

// Download Text (e.g. JSON Backup) from Drive
export const downloadDriveTextFile = async (token: string, fileId: string): Promise<string> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to download JSON from Google Drive: ${res.statusText}`);
  }

  return res.text();
};

// Delete a file or folder from Google Drive
export const deleteDriveFile = async (token: string, fileId: string): Promise<void> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Failed to delete file from Google Drive: ${errText}`);
  }
};

// Get or Create standard App folders
export interface AppFolderStructure {
  rootFolderId: string;
  backupsFolderId: string;
  quotationsFolderId: string;
  requisitionsFolderId: string;
  inventoryFolderId: string;
}

export const ensureAppFolderStructure = async (token: string): Promise<AppFolderStructure> => {
  // 1. Search for root folder
  const files = await listDriveFiles(token, undefined, 'Madigun Hotel & Events - Cloud Storage', 'folder');
  let rootFolder = files.find(f => f.name === 'Madigun Hotel & Events - Cloud Storage');

  if (!rootFolder) {
    rootFolder = await createDriveFolder(token, 'Madigun Hotel & Events - Cloud Storage');
  }

  // 2. Search subfolders inside root
  const subfolders = await listDriveFiles(token, rootFolder.id, undefined, 'folder');

  const getOrCreateSubfolder = async (name: string): Promise<string> => {
    const found = subfolders.find(f => f.name === name);
    if (found) return found.id;
    const created = await createDriveFolder(token, name, rootFolder!.id);
    return created.id;
  };

  const backupsFolderId = await getOrCreateSubfolder('Backups & Database Snapshots');
  const quotationsFolderId = await getOrCreateSubfolder('Supplier Quotations & Receipts');
  const requisitionsFolderId = await getOrCreateSubfolder('Purchase & Food Requisitions');
  const inventoryFolderId = await getOrCreateSubfolder('Inventory Reports & Audits');

  return {
    rootFolderId: rootFolder.id,
    backupsFolderId,
    quotationsFolderId,
    requisitionsFolderId,
    inventoryFolderId
  };
};
