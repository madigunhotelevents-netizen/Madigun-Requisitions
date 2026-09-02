import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  Cloud,
  CloudUpload,
  CloudDownload,
  FolderPlus,
  Folder,
  FileText,
  FileImage,
  FileCode,
  FileSpreadsheet,
  File as FileIcon,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Database,
  ArrowUpDown,
  Download,
  Upload,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Info,
  X,
  Plus
} from 'lucide-react';
import {
  signInWithGoogleDrive,
  disconnectGoogleDrive,
  getDriveAccessToken,
  setDriveAccessToken,
  getDriveAbout,
  listDriveFiles,
  createDriveFolder,
  uploadFileToDrive,
  downloadDriveTextFile,
  downloadDriveFile,
  deleteDriveFile,
  ensureAppFolderStructure,
  DriveFileItem,
  StorageQuota,
  AppFolderStructure
} from '../services/googleDrive';
import { User, InventoryItem, Requisition, FoodRequisition, Withdrawal, HotelRoom, DamageReport, AuditLog } from '../types';

interface GoogleDriveStorageProps {
  currentUser: User;
  users: User[];
  inventory: InventoryItem[];
  requisitions: Requisition[];
  foodRequisitions: FoodRequisition[];
  withdrawals: Withdrawal[];
  rooms: HotelRoom[];
  damageReports: DamageReport[];
  logs: AuditLog[];
  categories: string[];
  customLogo: string | null;
  onRestoreBackupData?: (data: any, mode: 'merge' | 'overwrite') => Promise<void>;
  onLogAudit?: (action: string, details: string) => void;
}

export function GoogleDriveStorage({
  currentUser,
  users,
  inventory,
  requisitions,
  foodRequisitions,
  withdrawals,
  rooms,
  damageReports,
  logs,
  categories,
  customLogo,
  onRestoreBackupData,
  onLogAudit
}: GoogleDriveStorageProps) {
  // Auth state
  const [token, setToken] = useState<string | null>(() => getDriveAccessToken());
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Folder and Files navigation state
  const [appFolders, setAppFolders] = useState<AppFolderStructure | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'Google Drive Root' }
  ]);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'folder' | 'backup' | 'pdf' | 'image' | 'sheet'>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Operation feedback states
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Modal dialog states
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Mandatory Delete Confirmation Modal
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Restore Modal
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<DriveFileItem | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [isLoadingBackupContent, setIsLoadingBackupContent] = useState(false);
  const [isRestoringData, setIsRestoringData] = useState(false);

  // Hidden File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (operationSuccess) {
      const timer = setTimeout(() => setOperationSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [operationSuccess]);

  // Load quota and folder structure whenever token changes
  useEffect(() => {
    if (token) {
      loadDriveDetails(token);
    }
  }, [token]);

  const loadDriveDetails = async (accessToken: string) => {
    try {
      setAuthError(null);
      // Fetch about & quota
      const about = await getDriveAbout(accessToken);
      setGoogleUser(about.user);
      setStorageQuota(about.storageQuota);

      // Fetch or create standard app folders
      const structure = await ensureAppFolderStructure(accessToken);
      setAppFolders(structure);

      // Set default view to App Root Folder
      setCurrentFolderId(structure.rootFolderId);
      setFolderBreadcrumbs([
        { id: 'root', name: 'Drive' },
        { id: structure.rootFolderId, name: 'Madigun Hotel & Events - Cloud Storage' }
      ]);

      await fetchFiles(accessToken, structure.rootFolderId);
    } catch (err: any) {
      console.error('Error loading Google Drive info:', err);
      setAuthError(err.message || 'Failed to connect to Google Drive');
    }
  };

  const fetchFiles = async (accessToken: string, folderId?: string) => {
    setIsLoadingFiles(true);
    setOperationError(null);
    try {
      const result = await listDriveFiles(accessToken, folderId === 'root' ? undefined : folderId);
      setFiles(result);
    } catch (err: any) {
      console.error('Error fetching files:', err);
      setOperationError(`Failed to load files: ${err.message || err}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      const { accessToken, user } = await signInWithGoogleDrive();
      setToken(accessToken);
      setGoogleUser({
        displayName: user.displayName,
        emailAddress: user.email,
        photoLink: user.photoURL
      });
      setOperationSuccess('Successfully connected to Google Drive');
      if (onLogAudit) {
        onLogAudit('Google Drive Connected', `Connected account: ${user.email}`);
      }
    } catch (err: any) {
      console.error('Google Sign In Failed:', err);
      setAuthError(err.message || 'Authentication failed. Please approve the Google Drive permissions.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
    setToken(null);
    setGoogleUser(null);
    setStorageQuota(null);
    setFiles([]);
    setAppFolders(null);
    setOperationSuccess('Disconnected from Google Drive');
  };

  const handleNavigateFolder = async (folderId: string, folderName: string) => {
    if (!token) return;
    setCurrentFolderId(folderId);

    if (folderId === 'root') {
      setFolderBreadcrumbs([{ id: 'root', name: 'Google Drive Root' }]);
    } else {
      // Check if folder is already in breadcrumbs
      const existingIdx = folderBreadcrumbs.findIndex(b => b.id === folderId);
      if (existingIdx >= 0) {
        setFolderBreadcrumbs(folderBreadcrumbs.slice(0, existingIdx + 1));
      } else {
        setFolderBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
      }
    }

    await fetchFiles(token, folderId);
  };

  const handleQuickFolderJump = async (folderId: string, folderName: string) => {
    if (!token || !appFolders) return;
    setCurrentFolderId(folderId);
    setFolderBreadcrumbs([
      { id: 'root', name: 'Drive' },
      { id: appFolders.rootFolderId, name: 'Madigun Hotel & Events - Cloud Storage' },
      { id: folderId, name: folderName }
    ]);
    await fetchFiles(token, folderId);
  };

  // 1-Click Complete System Backup to Google Drive
  const handleBackupToDrive = async () => {
    if (!token) return;
    setIsBackingUp(true);
    setOperationError(null);

    try {
      const backupPayload = {
        version: '1.2.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.name,
        exportedByRole: currentUser.role,
        exportedByEmail: currentUser.email || '',
        users,
        inventory,
        requisitions,
        foodRequisitions,
        withdrawals,
        rooms,
        damageReports,
        logs,
        configs: {
          categories,
          customLogo
        }
      };

      const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `madigun_hotel_backup_${dateStamp}.json`;
      const targetFolderId = appFolders ? appFolders.backupsFolderId : currentFolderId;

      await uploadFileToDrive(
        token,
        JSON.stringify(backupPayload, null, 2),
        fileName,
        'application/json',
        targetFolderId
      );

      setOperationSuccess(`Database backup successfully saved to Google Drive: ${fileName}`);
      if (onLogAudit) {
        onLogAudit('Google Drive Backup', `Exported full hotel database to Google Drive (${fileName})`);
      }

      // Refresh files list if in that folder
      await fetchFiles(token, currentFolderId);
    } catch (err: any) {
      console.error('Backup to Drive failed:', err);
      setOperationError(`Backup failed: ${err.message || err}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Export Inventory Sheet as CSV/JSON to Drive
  const handleExportInventoryToDrive = async (format: 'csv' | 'json') => {
    if (!token) return;
    setIsBackingUp(true);
    setOperationError(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const targetFolderId = appFolders ? appFolders.inventoryFolderId : currentFolderId;

      if (format === 'csv') {
        const headers = ['ID', 'Item Name', 'Category', 'Section', 'Current Stock', 'Unit', 'Unit Cost (PHP)', 'Min Safety Stock', 'Supplier', 'Last Updated'];
        const rows = inventory.map(item => [
          `"${item.id}"`,
          `"${item.name.replace(/"/g, '""')}"`,
          `"${item.category || ''}"`,
          `"${item.section || ''}"`,
          item.currentStock,
          `"${item.unit}"`,
          item.unitCost,
          item.minStock,
          `"${item.supplier.replace(/"/g, '""')}"`,
          `"${item.lastUpdated || ''}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const fileName = `madigun_inventory_report_${dateStamp}.csv`;

        await uploadFileToDrive(token, csvContent, fileName, 'text/csv', targetFolderId);
        setOperationSuccess(`Inventory CSV Report saved to Google Drive: ${fileName}`);
      } else {
        const fileName = `madigun_inventory_data_${dateStamp}.json`;
        await uploadFileToDrive(token, JSON.stringify(inventory, null, 2), fileName, 'application/json', targetFolderId);
        setOperationSuccess(`Inventory JSON Data saved to Google Drive: ${fileName}`);
      }

      if (onLogAudit) {
        onLogAudit('Exported Inventory to Drive', `Exported inventory in ${format.toUpperCase()} to Google Drive`);
      }
      await fetchFiles(token, currentFolderId);
    } catch (err: any) {
      setOperationError(`Export failed: ${err.message || err}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle Manual File Upload to Drive
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !token) return;

    setIsUploading(true);
    setOperationError(null);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        await uploadFileToDrive(
          token,
          file,
          file.name,
          file.type || 'application/octet-stream',
          currentFolderId === 'root' ? undefined : currentFolderId
        );
      }
      setOperationSuccess(`Uploaded ${fileList.length} file(s) to Google Drive`);
      if (onLogAudit) {
        onLogAudit('Google Drive Upload', `Uploaded ${fileList.length} file(s) into Google Drive`);
      }
      e.target.value = '';
      await fetchFiles(token, currentFolderId);
    } catch (err: any) {
      console.error('File upload error:', err);
      setOperationError(`Upload failed: ${err.message || err}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Create New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      await createDriveFolder(
        token,
        newFolderName.trim(),
        currentFolderId === 'root' ? undefined : currentFolderId
      );
      setOperationSuccess(`Created folder "${newFolderName.trim()}"`);
      setNewFolderName('');
      setCreateFolderModalOpen(false);
      await fetchFiles(token, currentFolderId);
    } catch (err: any) {
      setOperationError(`Failed to create folder: ${err.message || err}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Handle Confirmed Destructive File Deletion (Mandatory Confirmation Modal Dialog)
  const handleExecuteDelete = async () => {
    if (!token || !fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(token, fileToDelete.id);
      setOperationSuccess(`Deleted "${fileToDelete.name}" from Google Drive`);
      if (onLogAudit) {
        onLogAudit('Deleted Google Drive File', `Deleted file: ${fileToDelete.name} (ID: ${fileToDelete.id})`);
      }
      setFileToDelete(null);
      await fetchFiles(token, currentFolderId);
    } catch (err: any) {
      setOperationError(`Failed to delete file: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Inspecting & Restoring a Backup file from Drive
  const handlePrepareRestore = async (file: DriveFileItem) => {
    if (!token) return;
    setSelectedBackupFile(file);
    setIsLoadingBackupContent(true);
    setRestoreModalOpen(true);
    setParsedBackupData(null);

    try {
      const textContent = await downloadDriveTextFile(token, file.id);
      const parsed = JSON.parse(textContent);
      setParsedBackupData(parsed);
    } catch (err: any) {
      console.error('Error parsing backup file:', err);
      setOperationError(`Invalid backup file format: ${err.message || err}`);
      setRestoreModalOpen(false);
    } finally {
      setIsLoadingBackupContent(false);
    }
  };

  const handleExecuteRestoreFromDrive = async (mode: 'merge' | 'overwrite') => {
    if (!parsedBackupData || !onRestoreBackupData) return;
    setIsRestoringData(true);
    try {
      await onRestoreBackupData(parsedBackupData, mode);
      setOperationSuccess(`Successfully restored hotel database from Google Drive (${selectedBackupFile?.name})`);
      setRestoreModalOpen(false);
      setSelectedBackupFile(null);
      setParsedBackupData(null);
    } catch (err: any) {
      setOperationError(`Restore error: ${err.message || err}`);
    } finally {
      setIsRestoringData(false);
    }
  };

  // Handle Download File locally
  const handleDownloadLocal = async (file: DriveFileItem) => {
    if (!token) return;
    try {
      const blob = await downloadDriveFile(token, file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setOperationError(`Download failed: ${err.message || err}`);
    }
  };

  // Helper icon by mime type
  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="h-6 w-6 text-amber-600 fill-amber-100 shrink-0" />;
    }
    if (fileName.endsWith('.json') || mimeType.includes('json')) {
      return <FileCode className="h-6 w-6 text-purple-600 shrink-0" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="h-6 w-6 text-rose-600 shrink-0" />;
    }
    if (mimeType.includes('image') || fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      return <FileImage className="h-6 w-6 text-emerald-600 shrink-0" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || fileName.endsWith('.csv')) {
      return <FileSpreadsheet className="h-6 w-6 text-emerald-700 shrink-0" />;
    }
    return <FileIcon className="h-6 w-6 text-[#8C7A6B] shrink-0" />;
  };

  // Format file size
  const formatBytes = (bytes?: string | number) => {
    if (!bytes) return '—';
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(num)) return '—';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Filter files
  const filteredFiles = files.filter(file => {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    if (filterType === 'folder' && !isFolder) return false;
    if (filterType === 'backup' && !file.name.endsWith('.json')) return false;
    if (filterType === 'pdf' && !file.mimeType.includes('pdf')) return false;
    if (filterType === 'image' && !file.mimeType.includes('image')) return false;
    if (filterType === 'sheet' && !file.name.endsWith('.csv') && !file.mimeType.includes('spreadsheet')) return false;

    if (searchTerm.trim()) {
      return file.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  // Calculate Quota percentage
  const quotaLimit = storageQuota?.limit ? Number(storageQuota.limit) : 15 * 1024 * 1024 * 1024;
  const quotaUsage = storageQuota?.usage ? Number(storageQuota.usage) : 0;
  const quotaPercent = Math.min(100, Math.round((quotaUsage / (quotaLimit || 1)) * 100));

  if (currentUser.role !== 'admin' && currentUser.role !== 'managing_director') {
    return (
      <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-10 text-center max-w-lg mx-auto my-12 shadow-sm" id="drive-restricted-notice">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-700">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#3E312C] mb-2">Access Restricted</h2>
        <p className="text-xs text-[#8C7A6B] leading-relaxed">
          Google Drive cloud storage and database backups are restricted to the Property Custodian (Admin) and Hotel Managing Director (Primary Admin).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="google-drive-storage-module">
      
      {/* 1. Header & Connection Card */}
      <div className="bg-white border border-[#EBE6DD] rounded-[28px] shadow-xs p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
              <HardDrive className="h-7 w-7 text-amber-800" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#3E312C]">
                  Google Drive Cloud Storage
                </h1>
                {token ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF9F5] text-[#8C7A6B] border border-[#EBE6DD] font-mono">
                    Disconnected
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-[#8C7A6B] mt-1 max-w-2xl leading-relaxed">
                Seamless extra cloud storage for Madigun Hotel & Events. Securely store automated database snapshots, purchase requisition records, quotation receipts, and inventory audit reports directly in your Google Drive.
              </p>
            </div>
          </div>

          {/* Action Button: Connect or Disconnect */}
          <div className="shrink-0 flex items-center gap-3">
            {!token ? (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-3 px-5 py-3 bg-[#3E312C] hover:bg-[#2A211D] text-white rounded-2xl font-bold text-xs shadow-xs cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                id="connect-drive-btn"
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span>{isConnecting ? 'Connecting to Google Drive...' : 'Sign in with Google Drive'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl px-3.5 py-2">
                  {googleUser?.photoLink ? (
                    <img src={googleUser.photoLink} alt="Avatar" className="w-8 h-8 rounded-full border border-white shadow-2xs" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#EBE6DD] flex items-center justify-center text-xs font-bold text-[#3E312C]">
                      <UserIcon className="h-4 w-4 text-[#8C7A6B]" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#3E312C] leading-none">{googleUser?.displayName || 'Google Drive User'}</p>
                    <p className="text-[10px] text-[#8C7A6B] font-mono mt-0.5">{googleUser?.emailAddress || ''}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="p-2.5 rounded-2xl bg-[#FAF9F5] hover:bg-rose-50 text-[#8C7A6B] hover:text-rose-700 border border-[#EBE6DD] hover:border-rose-200 transition-colors cursor-pointer"
                  title="Disconnect Google Drive"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Storage Quota Bar (When connected) */}
        {token && (
          <div className="mt-6 pt-5 border-t border-[#F0EFE9] grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-[#3E312C] flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5 text-amber-700" />
                  Google Cloud Storage Quota
                </span>
                <span className="font-mono text-[#8C7A6B] text-[11px]">
                  {formatBytes(quotaUsage)} used of {formatBytes(quotaLimit)} ({quotaPercent}%)
                </span>
              </div>
              <div className="w-full bg-[#EBE6DD] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    quotaPercent > 90 ? 'bg-rose-600' : quotaPercent > 75 ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.max(2, quotaPercent)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => token && loadDriveDetails(token)}
                disabled={isLoadingFiles}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F5] hover:bg-[#EBE6DD] border border-[#EBE6DD] rounded-xl text-xs font-semibold text-[#3E312C] cursor-pointer transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                <span>Refresh Drive</span>
              </button>
            </div>
          </div>
        )}

        {/* Feedback messages */}
        {authError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{authError}</span>
          </div>
        )}

        {operationSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{operationSuccess}</span>
          </div>
        )}

        {operationError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{operationError}</span>
          </div>
        )}
      </div>

      {/* 2. When Connected: 1-Click Operations & Folders Hub */}
      {token ? (
        <div className="space-y-6">
          
          {/* Quick Action Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Backup Database to Drive */}
            <div className="bg-white border border-[#EBE6DD] rounded-2xl p-5 shadow-xs hover:border-[#8C7A6B] transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center mb-3">
                  <Database className="h-5 w-5 text-purple-700" />
                </div>
                <h3 className="font-bold text-sm text-[#3E312C]">Full Database Snapshot</h3>
                <p className="text-[11px] text-[#8C7A6B] mt-1">
                  Backup all inventory, PRs, users, rooms, and audit logs to Google Drive.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackupToDrive}
                disabled={isBackingUp}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs disabled:opacity-50"
              >
                {isBackingUp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
                <span>{isBackingUp ? 'Uploading Snapshot...' : 'Backup to Drive'}</span>
              </button>
            </div>

            {/* Export Inventory to Drive */}
            <div className="bg-white border border-[#EBE6DD] rounded-2xl p-5 shadow-xs hover:border-[#8C7A6B] transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="font-bold text-sm text-[#3E312C]">Inventory Catalogue CSV</h3>
                <p className="text-[11px] text-[#8C7A6B] mt-1">
                  Export master kitchen & hotel stock levels with valuation to Google Drive.
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleExportInventoryToDrive('csv')}
                  disabled={isBackingUp}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportInventoryToDrive('json')}
                  disabled={isBackingUp}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#FAF9F5] hover:bg-[#EBE6DD] border border-[#EBE6DD] text-[#3E312C] rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                >
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Quick Upload to Current Folder */}
            <div className="bg-white border border-[#EBE6DD] rounded-2xl p-5 shadow-xs hover:border-[#8C7A6B] transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
                  <CloudUpload className="h-5 w-5 text-amber-700" />
                </div>
                <h3 className="font-bold text-sm text-[#3E312C]">Upload Any File</h3>
                <p className="text-[11px] text-[#8C7A6B] mt-1">
                  Upload quotations, receipts, vendor contracts, or images into this folder.
                </p>
              </div>
              <label className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-[#3E312C] hover:bg-[#2A211D] text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload to Drive</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  ref={fileInputRef}
                />
              </label>
            </div>

            {/* Create New Folder */}
            <div className="bg-white border border-[#EBE6DD] rounded-2xl p-5 shadow-xs hover:border-[#8C7A6B] transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-3">
                  <FolderPlus className="h-5 w-5 text-blue-700" />
                </div>
                <h3 className="font-bold text-sm text-[#3E312C]">New Storage Folder</h3>
                <p className="text-[11px] text-[#8C7A6B] mt-1">
                  Create organized subdirectories for hotel events, banquets, or departments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateFolderModalOpen(true)}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-[#FAF9F5] hover:bg-[#EBE6DD] border border-[#EBE6DD] text-[#3E312C] rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Folder</span>
              </button>
            </div>

          </div>

          {/* Dedicated Hotel Storage Shortcut Tabs */}
          {appFolders && (
            <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-2xl p-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider px-2 shrink-0 font-mono">
                Hotel Storage Hub:
              </span>
              <button
                type="button"
                onClick={() => handleQuickFolderJump(appFolders.rootFolderId, 'Madigun Hotel & Events - Cloud Storage')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  currentFolderId === appFolders.rootFolderId
                    ? 'bg-[#3E312C] text-white shadow-2xs'
                    : 'bg-white hover:bg-[#FAF9F5] text-[#3E312C] border border-[#EBE6DD]'
                }`}
              >
                <Folder className="h-3.5 w-3.5 text-amber-500" />
                <span>All Storage</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFolderJump(appFolders.backupsFolderId, 'Backups & Database Snapshots')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  currentFolderId === appFolders.backupsFolderId
                    ? 'bg-purple-800 text-white shadow-2xs'
                    : 'bg-white hover:bg-[#FAF9F5] text-[#3E312C] border border-[#EBE6DD]'
                }`}
              >
                <Database className="h-3.5 w-3.5 text-purple-600" />
                <span>Database Backups</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFolderJump(appFolders.quotationsFolderId, 'Supplier Quotations & Receipts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  currentFolderId === appFolders.quotationsFolderId
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-white hover:bg-[#FAF9F5] text-[#3E312C] border border-[#EBE6DD]'
                }`}
              >
                <FileImage className="h-3.5 w-3.5 text-emerald-600" />
                <span>Quotations & Receipts</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFolderJump(appFolders.requisitionsFolderId, 'Purchase & Food Requisitions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  currentFolderId === appFolders.requisitionsFolderId
                    ? 'bg-amber-800 text-white shadow-2xs'
                    : 'bg-white hover:bg-[#FAF9F5] text-[#3E312C] border border-[#EBE6DD]'
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-amber-600" />
                <span>PR Documents</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFolderJump(appFolders.inventoryFolderId, 'Inventory Reports & Audits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  currentFolderId === appFolders.inventoryFolderId
                    ? 'bg-blue-800 text-white shadow-2xs'
                    : 'bg-white hover:bg-[#FAF9F5] text-[#3E312C] border border-[#EBE6DD]'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                <span>Inventory Audits</span>
              </button>
            </div>
          )}

          {/* 3. Google Drive File Browser Panel */}
          <div className="bg-white border border-[#EBE6DD] rounded-[28px] shadow-xs overflow-hidden">
            
            {/* Browser Toolbar & Breadcrumbs */}
            <div className="p-4 sm:p-6 border-b border-[#F0EFE9] bg-[#FAF9F5] flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Breadcrumb path */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium text-[#8C7A6B] no-scrollbar">
                {folderBreadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#8C7A6B]/60" />}
                    <button
                      type="button"
                      onClick={() => handleNavigateFolder(crumb.id, crumb.name)}
                      className={`hover:text-[#3E312C] hover:underline cursor-pointer truncate max-w-[200px] ${
                        idx === folderBreadcrumbs.length - 1 ? 'font-bold text-[#3E312C]' : ''
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A6B]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Drive files..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-[#EBE6DD] rounded-xl text-xs text-[#3E312C] focus:outline-hidden focus:border-[#8C7A6B] w-48 sm:w-56"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#3E312C]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filter Selector */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-[#EBE6DD] rounded-xl text-xs font-semibold text-[#3E312C] focus:outline-hidden"
                >
                  <option value="all">All File Types</option>
                  <option value="backup">Backups (.json)</option>
                  <option value="pdf">PDF Documents</option>
                  <option value="image">Receipts & Images</option>
                  <option value="sheet">Spreadsheets & CSV</option>
                </select>
              </div>

            </div>

            {/* File List / Grid Content */}
            <div className="p-4 sm:p-6 min-h-[300px]">
              {isLoadingFiles ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#8C7A6B] space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
                  <p className="text-xs font-medium">Fetching files from Google Drive...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#8C7A6B] space-y-3">
                  <Folder className="h-12 w-12 text-[#EBE6DD]" />
                  <p className="text-sm font-semibold text-[#3E312C]">This Google Drive folder is empty</p>
                  <p className="text-xs text-[#8C7A6B] max-w-sm text-center">
                    Upload hotel receipts, backup files, or create new folders to organize your storage.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredFiles.map((file) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    const isJsonBackup = file.name.endsWith('.json');

                    return (
                      <div
                        key={file.id}
                        className={`group relative rounded-2xl border p-4 transition-all flex flex-col justify-between bg-white ${
                          isFolder
                            ? 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/20 cursor-pointer shadow-2xs'
                            : 'border-[#EBE6DD] hover:border-[#8C7A6B] shadow-xs'
                        }`}
                        onClick={() => {
                          if (isFolder) {
                            handleNavigateFolder(file.id, file.name);
                          }
                        }}
                      >
                        <div>
                          {/* File Header */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-[#FAF9F5] border border-[#EBE6DD]">
                              {getFileIcon(file.mimeType, file.name)}
                            </div>
                            
                            {/* File Actions */}
                            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#EBE6DD] transition-colors"
                                  title="Open in Google Drive"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {!isFolder && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadLocal(file)}
                                  className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#EBE6DD] transition-colors cursor-pointer"
                                  title="Download to computer"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setFileToDelete(file)}
                                className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete from Google Drive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* File Name & Metadata */}
                          <p className="text-xs font-bold text-[#3E312C] truncate mb-1" title={file.name}>
                            {file.name}
                          </p>
                          <div className="text-[10px] text-[#8C7A6B] space-y-0.5 font-mono">
                            <div>Size: {isFolder ? 'Folder' : formatBytes(file.size)}</div>
                            {file.modifiedTime && (
                              <div>Updated: {new Date(file.modifiedTime).toLocaleDateString()}</div>
                            )}
                          </div>
                        </div>

                        {/* Special Action: Restore Backup */}
                        {isJsonBackup && onRestoreBackupData && (
                          <div className="mt-4 pt-3 border-t border-[#F0EFE9]" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handlePrepareRestore(file)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              <Database className="h-3 w-3" />
                              <span>Restore this Backup</span>
                            </button>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* Empty State when Disconnected */
        <div className="bg-white border border-[#EBE6DD] rounded-[28px] p-8 md:p-12 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
              <HardDrive className="h-8 w-8 text-amber-700" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#3E312C]">
              Connect Your Google Drive
            </h2>
            <p className="text-xs text-[#8C7A6B] leading-relaxed">
              Link your Google Workspace or Personal Google account to enable extra cloud storage for receipts, automated JSON database snapshots, purchase requisition PDFs, and kitchen inventory logs.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#3E312C] hover:bg-[#2A211D] text-white rounded-2xl font-bold text-xs shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Cloud className="h-4 w-4 text-amber-400" />
                <span>{isConnecting ? 'Authorizing Google Drive...' : 'Authorize Google Drive Storage'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: Create New Folder Dialog --- */}
      {createFolderModalOpen && (
        <div className="fixed inset-0 bg-[#3E312C]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#EBE6DD] rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0EFE9] pb-3">
              <h3 className="font-bold text-base text-[#3E312C] flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-amber-700" />
                Create New Folder
              </h3>
              <button
                type="button"
                onClick={() => setCreateFolderModalOpen(false)}
                className="text-[#8C7A6B] hover:text-[#3E312C]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3E312C] mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Banquet Invoices 2026"
                  className="w-full px-4 py-2.5 bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl text-xs text-[#3E312C] focus:outline-hidden focus:border-[#8C7A6B]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateFolderModalOpen(false)}
                  className="px-4 py-2 bg-[#FAF9F5] hover:bg-[#EBE6DD] text-[#8C7A6B] text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2A211D] text-white text-xs font-bold rounded-xl shadow-2xs disabled:opacity-50"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Mandatory User Confirmation Dialog for Destructive File Deletion --- */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-[#3E312C]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-rose-200 rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#3E312C]">Confirm File Deletion</h3>
                <p className="text-xs text-[#8C7A6B]">Action on Google Drive</p>
              </div>
            </div>

            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-xs space-y-2 text-[#3E312C]">
              <p className="font-semibold text-rose-900">
                Are you sure you want to permanently delete this file from Google Drive?
              </p>
              <div className="font-mono text-[11px] bg-white p-2.5 rounded-xl border border-rose-100 text-[#3E312C]">
                <div><strong>File:</strong> {fileToDelete.name}</div>
                <div><strong>Size:</strong> {formatBytes(fileToDelete.size)}</div>
                <div><strong>ID:</strong> {fileToDelete.id}</div>
              </div>
              <p className="text-[11px] text-rose-800">
                This operation will delete the file from your Google Drive storage and cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-[#FAF9F5] hover:bg-[#EBE6DD] text-[#8C7A6B] text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Inspect & Restore Backup from Google Drive --- */}
      {restoreModalOpen && (
        <div className="fixed inset-0 bg-[#3E312C]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#EBE6DD] rounded-3xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0EFE9] pb-3">
              <h3 className="font-bold text-base text-[#3E312C] flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-700" />
                Restore Database from Google Drive
              </h3>
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="text-[#8C7A6B] hover:text-[#3E312C]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingBackupContent ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-[#8C7A6B]">
                <RefreshCw className="h-7 w-7 animate-spin text-purple-700" />
                <p className="text-xs">Reading backup data from Google Drive...</p>
              </div>
            ) : parsedBackupData ? (
              <div className="space-y-4">
                <div className="bg-[#FAF9F5] border border-[#EBE6DD] p-4 rounded-2xl text-xs space-y-2 font-mono">
                  <div className="text-sm font-bold font-sans text-[#3E312C]">
                    Backup: {selectedBackupFile?.name}
                  </div>
                  <div>Exported At: {new Date(parsedBackupData.exportedAt || Date.now()).toLocaleString()}</div>
                  <div>Created By: {parsedBackupData.exportedBy || 'Unknown'} ({parsedBackupData.exportedByRole || 'Staff'})</div>

                  <div className="grid grid-cols-2 gap-2 pt-2 font-sans text-xs text-[#3E312C]">
                    <span className="bg-[#EBE6DD] px-2.5 py-1 rounded-lg"><strong>Users:</strong> {parsedBackupData.users?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1 rounded-lg"><strong>Inventory:</strong> {parsedBackupData.inventory?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1 rounded-lg"><strong>PRs:</strong> {parsedBackupData.requisitions?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1 rounded-lg"><strong>Food PRs:</strong> {parsedBackupData.foodRequisitions?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1 rounded-lg"><strong>Withdrawals:</strong> {parsedBackupData.withdrawals?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1 rounded-lg"><strong>Rooms:</strong> {parsedBackupData.rooms?.length || 0}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-[#3E312C]">Choose Restore Mode:</p>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={isRestoringData}
                      onClick={() => handleExecuteRestoreFromDrive('merge')}
                      className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      <div className="text-left">
                        <div>Safely Merge Records</div>
                        <div className="text-[10px] font-normal text-purple-700 font-sans">
                          Adds missing items and updates existing ones without deleting current data.
                        </div>
                      </div>
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                    </button>

                    <button
                      type="button"
                      disabled={isRestoringData}
                      onClick={() => {
                        if (confirm('WARNING: This will replace all current database records with the backup file data. Continue?')) {
                          handleExecuteRestoreFromDrive('overwrite');
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      <div className="text-left">
                        <div>Overwrite Database Completely</div>
                        <div className="text-[10px] font-normal text-rose-700 font-sans">
                          Deletes existing records and restores exact snapshot.
                        </div>
                      </div>
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-xs text-rose-600">Failed to parse backup data.</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="px-4 py-2 bg-[#FAF9F5] hover:bg-[#EBE6DD] text-[#8C7A6B] text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
