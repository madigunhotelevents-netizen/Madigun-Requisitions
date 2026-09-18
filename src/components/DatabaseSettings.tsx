import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  RefreshCw,
  Check,
  AlertTriangle,
  Server,
  Layers,
  Users,
  Package,
  ClipboardList,
  Utensils,
  BedDouble,
  ShieldAlert,
  History,
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Info
} from 'lucide-react';
import {
  User,
  InventoryItem,
  Requisition,
  FoodRequisition,
  Withdrawal,
  HotelRoom,
  DamageReport,
  AuditLog
} from '../types';
import { firebaseConfig } from '../firebase';
import MadigunLogo from './MadigunLogo';

interface DatabaseSettingsProps {
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
  onUpdateLogo: (newLogo: string | null) => Promise<void>;
  onUpdateCategories: (newCategories: string[]) => Promise<void>;
  onExportBackup: () => void;
  onRestoreBackupData: (data: any, mode: 'merge' | 'overwrite') => Promise<void>;
  onRestoreDefaultData: () => Promise<void>;
  onClearCaches: () => Promise<boolean>;
  onNavigateToLogs?: () => void;
  onLogAudit: (action: string, details: string) => Promise<void>;
}

export function DatabaseSettings({
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
  onUpdateLogo,
  onUpdateCategories,
  onExportBackup,
  onRestoreBackupData,
  onRestoreDefaultData,
  onClearCaches,
  onNavigateToLogs,
  onLogAudit
}: DatabaseSettingsProps) {
  // Verification / health status
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Restore state
  const [isRestoringDefaults, setIsRestoringDefaults] = useState(false);
  const [showConfirmRestoreModal, setShowConfirmRestoreModal] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ text: string; ok: boolean } | null>(null);

  // JSON Import & Restore staging
  const [importedJson, setImportedJson] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isRestoringJson, setIsRestoringJson] = useState(false);
  const [showConfirmOverwriteModal, setShowConfirmOverwriteModal] = useState(false);

  // Category management
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isUpdatingCats, setIsUpdatingCats] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ name: string; count: number } | null>(null);
  const [showResetCategoriesModal, setShowResetCategoriesModal] = useState(false);

  // Logo upload
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showResetLogoModal, setShowResetLogoModal] = useState(false);

  // Handle Verify Connection
  const handleVerifyServer = async () => {
    setIsVerifying(true);
    setVerifyMessage(null);
    try {
      const ok = await onClearCaches();
      if (ok) {
        setVerifyMessage({ text: 'Cloud Firestore is online, verified, and real-time synchronization is healthy.', ok: true });
      } else {
        setVerifyMessage({ text: 'Connection check timed out or experienced offline mode. Local memory cache remains functional.', ok: false });
      }
    } catch (e: any) {
      setVerifyMessage({ text: `Connection error: ${e.message || e}`, ok: false });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Restore Default Data
  const handleExecuteRestoreDefaults = async () => {
    setIsRestoringDefaults(true);
    setStatusNotification(null);
    try {
      await onRestoreDefaultData();
      setStatusNotification({
        text: 'Default hotel inventory, staff accounts, room deployments, requisition templates, and audit logs have been successfully restored in Firestore.',
        ok: true
      });
      setShowConfirmRestoreModal(false);
    } catch (err: any) {
      setStatusNotification({
        text: `Failed to restore default database data: ${err.message || err}`,
        ok: false
      });
    } finally {
      setIsRestoringDefaults(false);
    }
  };

  // Handle File Input Change for JSON Backup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || typeof json !== 'object') {
          setImportError('Invalid backup file format.');
          return;
        }

        const hasUsers = Array.isArray(json.users);
        const hasInventory = Array.isArray(json.inventory);
        const hasRequisitions = Array.isArray(json.requisitions);
        const hasWithdrawals = Array.isArray(json.withdrawals);
        const hasRooms = Array.isArray(json.rooms);
        const hasDamage = Array.isArray(json.damageReports);

        if (!hasUsers && !hasInventory && !hasRequisitions && !hasWithdrawals && !hasRooms && !hasDamage) {
          setImportError('Invalid backup: File does not contain recognizable Madigun Hotel database collections.');
          return;
        }

        setImportedJson(json);
        setImportError(null);
      } catch (err) {
        setImportError('Failed to parse backup JSON file. Ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle Execute JSON Restore
  const handleExecuteJsonRestore = async (mode: 'merge' | 'overwrite') => {
    if (!importedJson) return;
    setIsRestoringJson(true);
    setImportError(null);
    try {
      await onRestoreBackupData(importedJson, mode);
      setStatusNotification({
        text: `Database successfully restored from JSON backup file using [${mode === 'merge' ? 'Safely Merge' : 'Full Overwrite'}] mode.`,
        ok: true
      });
      setImportedJson(null);
      setShowConfirmOverwriteModal(false);
    } catch (err: any) {
      console.error("Error executing JSON restore:", err);
      setImportError(`Failed to restore data: ${err.message || err}`);
    } finally {
      setIsRestoringJson(false);
    }
  };

  // Category handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setStatusNotification({ text: `Category "${trimmed}" already exists.`, ok: false });
      return;
    }
    setIsUpdatingCats(true);
    try {
      const updated = [...categories, trimmed];
      await onUpdateCategories(updated);
      setNewCategoryInput('');
      setStatusNotification({ text: `Category "${trimmed}" added successfully.`, ok: true });
    } catch (err: any) {
      setStatusNotification({ text: `Failed to add category: ${err.message || err}`, ok: false });
    } finally {
      setIsUpdatingCats(false);
    }
  };

  const handleRequestRemoveCategory = (catToRemove: string) => {
    const count = inventory.filter(item => item.category?.toLowerCase() === catToRemove.toLowerCase()).length;
    setCategoryToDelete({ name: catToRemove, count });
  };

  const handleConfirmRemoveCategory = async () => {
    if (!categoryToDelete) return;
    const catToRemove = categoryToDelete.name;
    setIsUpdatingCats(true);
    try {
      const updated = categories.filter(c => c !== catToRemove);
      await onUpdateCategories(updated);
      setCategoryToDelete(null);
      setStatusNotification({ text: `Category "${catToRemove}" removed successfully.`, ok: true });
    } catch (err: any) {
      setStatusNotification({ text: `Failed to remove category: ${err.message || err}`, ok: false });
    } finally {
      setIsUpdatingCats(false);
    }
  };

  const handleExecuteResetDefaultCategories = async () => {
    setIsUpdatingCats(true);
    try {
      const defaultCategories = [
        'Meat & Poultry',
        'Dairy',
        'Produce',
        'Oils & Spices',
        'Dry Goods',
        'Seafood',
        'Bakery',
        'Beverages',
        'Linens',
        'Toiletries',
        'Cleaning Supplies',
        'Other'
      ];
      await onUpdateCategories(defaultCategories);
      setShowResetCategoriesModal(false);
      setStatusNotification({ text: 'Categories reset to default hotel classification standards.', ok: true });
    } catch (err: any) {
      setStatusNotification({ text: `Failed to reset categories: ${err.message || err}`, ok: false });
    } finally {
      setIsUpdatingCats(false);
    }
  };

  // Logo handlers
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusNotification({ text: 'Please upload a valid image file (PNG, JPG, SVG, WebP).', ok: false });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setStatusNotification({ text: 'Logo file size must be less than 2MB.', ok: false });
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        await onUpdateLogo(base64);
        setStatusNotification({ text: 'Custom hotel logo and watermark successfully updated.', ok: true });
      } catch (err: any) {
        setStatusNotification({ text: `Failed to update logo: ${err.message || err}`, ok: false });
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExecuteResetLogo = async () => {
    setIsUploadingLogo(true);
    try {
      await onUpdateLogo(null);
      setShowResetLogoModal(false);
      setStatusNotification({ text: 'Branding emblem restored to standard Madigun Hotel logo.', ok: true });
    } catch (err: any) {
      setStatusNotification({ text: `Failed to reset logo: ${err.message || err}`, ok: false });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12" id="database-settings-view">
      {/* Top Banner & Title */}
      <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F0EFE9] pb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl text-[#8C7A6B]">
              <Database className="h-7 w-7 text-[#3E312C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3E312C]">Database Settings & Recovery</h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Active Sync
                </span>
              </div>
              <p className="text-sm text-[#8C7A6B] mt-1">
                Centralized database management, real-time Firestore sync status, collection statistics, and one-click data restoration.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleVerifyServer}
              disabled={isVerifying}
              className="inline-flex items-center gap-1.5 bg-[#FAF9F5] hover:bg-[#EBE6DD] border border-[#E6E4DD] text-[#3E312C] text-xs font-bold px-4 py-2.5 rounded-full transition-all cursor-pointer shadow-3xs disabled:opacity-50"
              id="verify-db-connection-btn"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isVerifying ? 'animate-spin text-amber-600' : 'text-[#8C7A6B]'}`} />
              <span>{isVerifying ? 'Verifying...' : 'Verify Connection'}</span>
            </button>
            <button
              onClick={onExportBackup}
              className="inline-flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all cursor-pointer shadow-3xs"
              id="export-db-backup-btn"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Full Backup</span>
            </button>
          </div>
        </div>

        {/* Status Notifications */}
        {verifyMessage && (
          <div className={`mt-4 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
            verifyMessage.ok 
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}>
            {verifyMessage.ok ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
            <span>{verifyMessage.text}</span>
          </div>
        )}

        {statusNotification && (
          <div className={`mt-4 p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2.5 ${
            statusNotification.ok 
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {statusNotification.ok ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />}
              <span>{statusNotification.text}</span>
            </div>
            <button
              onClick={() => setStatusNotification(null)}
              className="text-xs font-bold underline opacity-80 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Live Database Collections Overview */}
        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B] mb-3 flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5" />
            Live Firestore Collections & Document Counts
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
              <Users className="h-4 w-4 text-[#8C7A6B] mx-auto mb-1" />
              <div className="text-lg font-bold text-[#3E312C] font-mono">{users.length}</div>
              <div className="text-[10px] text-[#8C7A6B] font-medium">Users</div>
            </div>
            <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
              <Package className="h-4 w-4 text-[#8C7A6B] mx-auto mb-1" />
              <div className="text-lg font-bold text-[#3E312C] font-mono">{inventory.length}</div>
              <div className="text-[10px] text-[#8C7A6B] font-medium">Inventory</div>
            </div>
            <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
              <ClipboardList className="h-4 w-4 text-[#8C7A6B] mx-auto mb-1" />
              <div className="text-lg font-bold text-[#3E312C] font-mono">{requisitions.length}</div>
              <div className="text-[10px] text-[#8C7A6B] font-medium">Purchase PRs</div>
            </div>
            <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
              <Utensils className="h-4 w-4 text-[#8C7A6B] mx-auto mb-1" />
              <div className="text-lg font-bold text-[#3E312C] font-mono">{foodRequisitions.length}</div>
              <div className="text-[10px] text-[#8C7A6B] font-medium">Food PRs</div>
            </div>
            <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
              <BedDouble className="h-4 w-4 text-[#8C7A6B] mx-auto mb-1" />
              <div className="text-lg font-bold text-[#3E312C] font-mono">{rooms.length}</div>
              <div className="text-[10px] text-[#8C7A6B] font-medium">Hotel Rooms</div>
            </div>
            <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
              <Layers className="h-4 w-4 text-[#8C7A6B] mx-auto mb-1" />
              <div className="text-lg font-bold text-[#3E312C] font-mono">{withdrawals.length}</div>
              <div className="text-[10px] text-[#8C7A6B] font-medium">Withdrawals</div>
            </div>
            <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
              <ShieldAlert className="h-4 w-4 text-rose-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-[#3E312C] font-mono">{damageReports.length}</div>
              <div className="text-[10px] text-[#8C7A6B] font-medium">Damaged</div>
            </div>
            <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
              <History className="h-4 w-4 text-[#8C7A6B] mx-auto mb-1" />
              <div className="text-lg font-bold text-[#3E312C] font-mono">{logs.length}</div>
              <div className="text-[10px] text-[#8C7A6B] font-medium">Audit Logs</div>
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#8C7A6B] gap-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px]">Project: <strong>{firebaseConfig.projectId}</strong></span>
              {(firebaseConfig as any).firestoreDatabaseId && (
                <span className="font-mono text-[11px] bg-[#FAF9F5] px-2 py-0.5 rounded-md border border-[#E6E4DD]">
                  DB: <strong>{(firebaseConfig as any).firestoreDatabaseId}</strong>
                </span>
              )}
            </div>
            {onNavigateToLogs && (
              <button
                onClick={onNavigateToLogs}
                className="text-[#3E312C] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Audit Trail</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Section: Restore Database Data */}
      <div className="bg-white border-2 border-amber-200/80 rounded-[32px] p-6 sm:p-8 shadow-xs" id="restore-default-data-card">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 shrink-0 mt-0.5">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-[#3E312C]">Restore Default Database & Initial Records</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Data Recovery
                </span>
              </div>
              <p className="text-xs text-[#8C7A6B] mt-1 max-w-2xl leading-relaxed">
                Re-seeds the entire database with the complete official Madigun Hotel & Events dataset: 10 baseline inventory items, default staff & custodian accounts, room deployments (Room 101, 102, 201), initial purchase requisitions, food requisitions, and default audit logs.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowConfirmRestoreModal(true)}
            disabled={isRestoringDefaults}
            className="shrink-0 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-bold px-5 py-3 rounded-full transition-all cursor-pointer shadow-sm inline-flex items-center gap-2"
            id="restore-default-db-btn"
          >
            <RotateCcw className={`h-4 w-4 ${isRestoringDefaults ? 'animate-spin' : ''}`} />
            <span>{isRestoringDefaults ? 'Restoring Database...' : 'Restore Default Hotel Data'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Restoring Default Data */}
      {showConfirmRestoreModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E6E4DD] shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#3E312C]">Confirm Database Restoration</h3>
                <p className="text-xs text-[#8C7A6B] mt-1 leading-relaxed">
                  This will write the standard Madigun Hotel default records (inventory items, rooms, requisitions, food PRs, users, and audit logs) directly to your live Firestore database.
                </p>
              </div>
            </div>

            <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E6E4DD] text-xs text-[#3E312C] space-y-1.5 font-sans">
              <p className="font-semibold text-[#8C7A6B] uppercase text-[10px]">What will be restored:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#3E312C]">
                <li>Core Inventory (Chicken, Dairy, Linens, Dry Goods, etc.)</li>
                <li>System Accounts (Admin Custodian, Managing Director, Staff)</li>
                <li>Rooms 101, 102, 201 with deployed appliances and amenities</li>
                <li>Sample Purchase Requisitions and Food PR vouchers</li>
                <li>Standard 12 Hotel Inventory Categories</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EFE9]">
              <button
                type="button"
                onClick={() => setShowConfirmRestoreModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#FAF9F5] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestoreDefaults}
                disabled={isRestoringDefaults}
                className="px-5 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                {isRestoringDefaults ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Yes, Restore Hotel Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Overwrite JSON Restore */}
      {showConfirmOverwriteModal && importedJson && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="confirm-overwrite-modal">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E6E4DD] shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-2xl shrink-0">
                <AlertTriangle className="h-6 w-6 text-rose-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#3E312C]">Confirm Full Database Overwrite</h3>
                <p className="text-xs text-[#8C7A6B] mt-1 leading-relaxed">
                  Are you sure you want to delete all current Firestore database records and replace them with this backup file? This replaces existing inventory, requisitions, rooms, withdrawals, and logs with the backup contents.
                </p>
              </div>
            </div>

            <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E6E4DD] space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-[#8C7A6B]">
                <span>Data Collections in Uploaded Backup:</span>
                <span className="font-mono text-[10px]">v{importedJson.version || '2.0.0'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#3E312C]">
                <div className="bg-white p-2 rounded-xl border border-[#E6E4DD]">
                  <span className="text-[#8C7A6B] block text-[10px]">Users</span>
                  <strong className="font-mono text-sm">{importedJson.users?.length || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E6E4DD]">
                  <span className="text-[#8C7A6B] block text-[10px]">Inventory</span>
                  <strong className="font-mono text-sm">{importedJson.inventory?.length || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E6E4DD]">
                  <span className="text-[#8C7A6B] block text-[10px]">Purchase PRs</span>
                  <strong className="font-mono text-sm">{importedJson.requisitions?.length || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E6E4DD]">
                  <span className="text-[#8C7A6B] block text-[10px]">Food PRs</span>
                  <strong className="font-mono text-sm">{importedJson.foodRequisitions?.length || importedJson.food_requisitions?.length || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E6E4DD]">
                  <span className="text-[#8C7A6B] block text-[10px]">Withdrawals</span>
                  <strong className="font-mono text-sm">{importedJson.withdrawals?.length || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E6E4DD]">
                  <span className="text-[#8C7A6B] block text-[10px]">Rooms</span>
                  <strong className="font-mono text-sm">{importedJson.rooms?.length || importedJson.hotel_rooms?.length || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E6E4DD]">
                  <span className="text-[#8C7A6B] block text-[10px]">Damage Reports</span>
                  <strong className="font-mono text-sm">{importedJson.damageReports?.length || importedJson.damage_reports?.length || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E6E4DD]">
                  <span className="text-[#8C7A6B] block text-[10px]">Audit Logs</span>
                  <strong className="font-mono text-sm">{importedJson.logs?.length || importedJson.audit_logs?.length || 0}</strong>
                </div>
              </div>
            </div>

            {importError && (
              <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-xl border border-rose-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EFE9]">
              <button
                type="button"
                onClick={() => setShowConfirmOverwriteModal(false)}
                disabled={isRestoringJson}
                className="px-4 py-2.5 text-xs font-semibold text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#FAF9F5] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="execute-overwrite-now-btn"
                onClick={() => handleExecuteJsonRestore('overwrite')}
                disabled={isRestoringJson}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                {isRestoringJson ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Overwriting Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Delete & Overwrite</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Deletion Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#E6E4DD] shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3E312C]">Remove Category</h3>
                <p className="text-xs text-[#8C7A6B] mt-1 leading-relaxed">
                  Remove &quot;{categoryToDelete.name}&quot; from the category list?
                  {categoryToDelete.count > 0 && (
                    <span className="block mt-1 text-amber-800 font-medium">
                      Note: Currently assigned to {categoryToDelete.count} inventory item(s).
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EFE9]">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={isUpdatingCats}
                className="px-4 py-2 text-xs font-semibold text-[#8C7A6B] hover:text-[#3E312C] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveCategory}
                disabled={isUpdatingCats}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                {isUpdatingCats ? 'Removing...' : 'Remove Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Categories Modal */}
      {showResetCategoriesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#E6E4DD] shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                <Layers className="h-5 w-5 text-[#8C7355]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3E312C]">Reset Default Categories</h3>
                <p className="text-xs text-[#8C7A6B] mt-1 leading-relaxed">
                  Reset inventory categories list to the 12 standard hotel classification categories?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EFE9]">
              <button
                type="button"
                onClick={() => setShowResetCategoriesModal(false)}
                disabled={isUpdatingCats}
                className="px-4 py-2 text-xs font-semibold text-[#8C7A6B] hover:text-[#3E312C] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteResetDefaultCategories}
                disabled={isUpdatingCats}
                className="px-4 py-2 text-xs font-bold text-white bg-[#8C7355] hover:bg-[#745E44] rounded-xl cursor-pointer"
              >
                {isUpdatingCats ? 'Resetting...' : 'Yes, Reset Categories'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Logo Modal */}
      {showResetLogoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#E6E4DD] shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                <ImageIcon className="h-5 w-5 text-[#8C7A6B]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3E312C]">Reset Hotel Emblem</h3>
                <p className="text-xs text-[#8C7A6B] mt-1 leading-relaxed">
                  Remove custom uploaded logo and restore the standard Madigun Hotel emblem?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EFE9]">
              <button
                type="button"
                onClick={() => setShowResetLogoModal(false)}
                disabled={isUploadingLogo}
                className="px-4 py-2 text-xs font-semibold text-[#8C7A6B] hover:text-[#3E312C] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteResetLogo}
                disabled={isUploadingLogo}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                {isUploadingLogo ? 'Resetting...' : 'Yes, Reset Emblem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Backup & Restore Staging Section */}
      <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 sm:p-8 shadow-xs" id="json-backup-restore-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EFE9] pb-4 mb-5">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#3E312C] flex items-center gap-2">
              <Download className="h-5 w-5 text-[#8C7A6B]" />
              JSON Database Backup & File Upload
            </h2>
            <p className="text-xs text-[#8C7A6B] mt-0.5">
              Export an offline JSON snapshot of the entire hotel database or restore from a previously exported backup file.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onExportBackup}
              className="inline-flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all cursor-pointer shadow-3xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export Backup JSON
            </button>
            <label className="inline-flex items-center gap-1.5 bg-[#FAF9F5] hover:bg-[#FAF9F5]/80 text-[#3E312C] border border-[#E6E4DD] text-xs font-bold px-4 py-2.5 rounded-full transition-colors cursor-pointer shadow-3xs">
              <Upload className="h-3.5 w-3.5" />
              Upload Backup JSON
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Error message */}
        {importError && (
          <div className="mb-4 bg-rose-50 text-rose-800 text-xs p-3.5 rounded-2xl border border-rose-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{importError}</span>
          </div>
        )}

        {/* Active restore staging preview */}
        {importedJson && (
          <div className="bg-[#FAF9F5] border border-[#E6E4DD] p-5 rounded-2xl space-y-4" id="restore-staging-box">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <p className="text-sm font-bold text-[#3E312C]">Imported JSON Backup Staged for Restore</p>
                <div className="text-xs text-[#8C7A6B] space-y-1 font-mono">
                  <div>Exported: {new Date(importedJson.exportedAt || Date.now()).toLocaleString()} (v{importedJson.version || '2.0.0'})</div>
                  <div>By: {importedJson.exportedBy || 'Admin'}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 font-sans text-[11px] text-[#3E312C]">
                    <span className="bg-[#EBE6DD] px-2.5 py-1.5 rounded-md"><strong>Users:</strong> {importedJson.users?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1.5 rounded-md"><strong>Inventory:</strong> {importedJson.inventory?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1.5 rounded-md"><strong>Requisitions:</strong> {importedJson.requisitions?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1.5 rounded-md"><strong>Food PRs:</strong> {importedJson.foodRequisitions?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1.5 rounded-md"><strong>Withdrawals:</strong> {importedJson.withdrawals?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1.5 rounded-md"><strong>Rooms:</strong> {importedJson.rooms?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1.5 rounded-md"><strong>Damage Reports:</strong> {importedJson.damageReports?.length || 0}</span>
                    <span className="bg-[#EBE6DD] px-2.5 py-1.5 rounded-md"><strong>Audit Logs:</strong> {importedJson.logs?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#E6E4DD]/60">
              <button
                type="button"
                disabled={isRestoringJson}
                onClick={() => handleExecuteJsonRestore('merge')}
                className="flex-1 bg-[#8C7355] hover:bg-[#745E44] disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-3xs"
              >
                {isRestoringJson ? 'Restoring...' : 'Safely Merge (Add & Update Only)'}
              </button>
              <button
                type="button"
                disabled={isRestoringJson}
                onClick={() => setShowConfirmOverwriteModal(true)}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1.5"
                id="delete-and-overwrite-btn"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isRestoringJson ? 'Restoring...' : 'Delete Current Data & Overwrite'}</span>
              </button>
              <button
                type="button"
                disabled={isRestoringJson}
                onClick={() => setImportedJson(null)}
                className="bg-transparent hover:bg-[#EBE6DD] border border-[#E6E4DD] text-[#8C7A6B] font-semibold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* System Settings: Categories & Branding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Manager */}
        <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0EFE9] pb-3 mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#3E312C] flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#8C7A6B]" />
                  Inventory Categories
                </h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Customize item classification groups.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowResetCategoriesModal(true)}
                disabled={isUpdatingCats}
                className="text-[11px] font-semibold text-[#8C7355] hover:underline cursor-pointer"
              >
                Reset Defaults
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="New category name..."
                className="flex-1 px-3.5 py-2 text-xs border border-[#E6E4DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3E312C]"
              />
              <button
                type="submit"
                disabled={isUpdatingCats || !newCategoryInput.trim()}
                className="px-4 py-2 bg-[#3E312C] hover:bg-[#2C211F] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </form>

            {/* Category Tags */}
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const count = inventory.filter(i => i.category?.toLowerCase() === cat.toLowerCase()).length;
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#FAF9F5] border border-[#E6E4DD] text-[#3E312C]"
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] text-[#8C7A6B] font-mono">({count})</span>
                    <button
                      type="button"
                      onClick={() => handleRequestRemoveCategory(cat)}
                      disabled={isUpdatingCats}
                      className="text-[#8C7A6B] hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                      title={`Remove ${cat}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Custom Branding & Logo */}
        <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0EFE9] pb-3 mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#3E312C] flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#8C7A6B]" />
                  System Branding & Logo
                </h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Custom emblem applied to header, login, and print vouchers.</p>
              </div>
              {customLogo && (
                <button
                  type="button"
                  onClick={() => setShowResetLogoModal(true)}
                  disabled={isUploadingLogo}
                  className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Remove Custom Logo
                </button>
              )}
            </div>

            <div className="flex items-center gap-5 p-4 bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl mb-4">
              <div className="shrink-0 p-2 bg-white rounded-xl border border-[#E6E4DD]">
                <MadigunLogo size={56} customLogo={customLogo} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#3E312C]">
                  {customLogo ? 'Custom Logo Active' : 'Default Madigun Hotel Emblem Active'}
                </p>
                <p className="text-[11px] text-[#8C7A6B] leading-relaxed">
                  Recommended: Transparent PNG or SVG icon with minimum resolution of 200x200 pixels.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F0EFE9]">
            <label className="flex-1 text-center bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors shadow-3xs">
              <Upload className="h-3.5 w-3.5 inline mr-1.5" />
              <span>{isUploadingLogo ? 'Uploading...' : 'Upload New Logo Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileUpload}
                disabled={isUploadingLogo}
                className="hidden"
              />
            </label>
            {customLogo && (
              <button
                type="button"
                onClick={() => setShowResetLogoModal(true)}
                disabled={isUploadingLogo}
                className="px-3.5 py-2.5 text-xs font-semibold text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#FAF9F5] border border-[#E6E4DD] rounded-xl transition-colors cursor-pointer"
              >
                Reset Default
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
