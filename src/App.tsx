import React, { useState, useEffect, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  History, 
  LogOut, 
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Trash2,
  UserCheck,
  Download,
  Upload,
  Database,
  AlertTriangle,
  BedDouble,
  Users as UsersIcon,
  ShieldAlert,
  Utensils,
  Check,
  HardDrive
} from 'lucide-react';
import { 
  User, 
  InventoryItem, 
  InventorySection,
  Requisition, 
  AuditLog, 
  RequisitionStatus, 
  RequisitionItem,
  Withdrawal,
  WithdrawalStatus,
  HotelRoom,
  DeployedEquipment,
  DamageReport,
  DamageReportItem,
  DamageStatus,
  FoodRequisition,
  FoodRequisitionStatus
} from './types';
import { 
  INITIAL_USERS, 
  INITIAL_INVENTORY, 
  INITIAL_REQUISITIONS, 
  INITIAL_LOGS,
  INITIAL_ROOMS,
  INITIAL_FOOD_REQUISITIONS
} from './data';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Requisitions from './components/Requisitions';
import Withdrawals from './components/Withdrawals';
import DamageReports from './components/DamageReports';
import { FoodRequisitions } from './components/FoodRequisitions';
import Users from './components/Users';
import { DatabaseSettings } from './components/DatabaseSettings';
import MadigunLogo from './components/MadigunLogo';
import { db, handleFirestoreError, OperationType, clearCachesAndVerifyServerConnection } from './firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';

function cleanUndefined<T>(obj: T): T {
  if (obj === undefined || obj === null) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export default function App() {
  // Proactive cleanup of old cached state blobs from localStorage to prevent QuotaExceededError
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('madigun_cached_') || k.startsWith('firestore_clients_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }, []);

  // --- 1. Persistent Databases synced directly with Firestore Server ---
  const [users, setUsers] = useState<User[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('kitchen_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [foodRequisitions, setFoodRequisitions] = useState<FoodRequisition[]>([]);

  const [categories, setCategories] = useState<string[]>([
    'Meat & Poultry',
    'Dairy',
    'Produce',
    'Oils & Spices',
    'Dry Goods',
    'Seafood',
    'Bakery',
    'Beverages',
    'Other'
  ]);

  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem('madigun_custom_logo') || null;
    } catch (e) {
      return null;
    }
  });

  // Sync Feedback toast state
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Navigation state
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Enforce role-based access for restricted tabs
  useEffect(() => {
    if (currentUser) {
      const isFull = currentUser.role === 'admin' || currentUser.role === 'managing_director';
      if (!isFull && (activeTab === 'database' || activeTab === 'accounts')) {
        setActiveTab('dashboard');
      } else if (currentUser.role !== 'admin' && activeTab === 'logs') {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser?.role, activeTab]);

  // Passing dynamic automated items from Dashboard to Requisitions form
  const [autoRequisitionDraft, setAutoRequisitionDraft] = useState<Omit<RequisitionItem, 'itemName' | 'unitCost' | 'unit'>[] | null>(null);

  // Backup & Restore states
  const [importedData, setImportedData] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [showConfirmLogsOverwrite, setShowConfirmLogsOverwrite] = useState(false);

  // Firestore Sync Effect
  useEffect(() => {
    // 1. Sync Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as User);
      });
      setUsers(list);

      // Auto-update currentUser session if user fields were modified in Firestore
      setCurrentUser(prevUser => {
        if (!prevUser) return null;
        const latestSelf = list.find(u => u.id === prevUser.id);
        if (latestSelf) {
          if (
            latestSelf.name !== prevUser.name ||
            latestSelf.role !== prevUser.role ||
            latestSelf.email !== prevUser.email ||
            latestSelf.phone !== prevUser.phone ||
            latestSelf.department !== prevUser.department ||
            latestSelf.shift !== prevUser.shift ||
            latestSelf.joinedDate !== prevUser.joinedDate ||
            latestSelf.emergencyContact !== prevUser.emergencyContact ||
            latestSelf.password !== prevUser.password ||
            latestSelf.username !== prevUser.username
          ) {
            return { ...prevUser, ...latestSelf };
          }
        }
        return prevUser;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    // 2. Sync Inventory
    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const list: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as InventoryItem;
        if (item.category === 'Linens' && item.section !== 'LINENS') {
          const updated = { ...item, section: 'LINENS' as const };
          setDoc(doc(db, 'inventory', item.id), cleanUndefined(updated));
          list.push(updated);
        } else {
          list.push(item);
        }
      });

      setInventory(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    });

    // 3. Sync Requisitions
    const unsubRequisitions = onSnapshot(collection(db, 'requisitions'), (snapshot) => {
      const list: Requisition[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Requisition);
      });
      // Sort requisitions by createdAt descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequisitions(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'requisitions');
    });

    // 4. Sync Audit Logs
    const unsubLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      const list: AuditLog[] = [];

      snapshot.forEach((docSnap) => {
        const log = docSnap.data() as AuditLog;
        list.push(log);
      });

      // NOTE: Automatic deletion of logs older than 7 days is temporarily disabled.
      // All historic audit logs are retained in Firestore and displayed in the UI.

      // Sort active logs by timestamp descending
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'logs');
    });

    // 5. Sync System Config
    const unsubConfigs = onSnapshot(collection(db, 'configs'), (snapshot) => {
      snapshot.forEach((doc) => {
        if (doc.id === 'categories') {
          const vals = doc.data().values || [];
          setCategories(vals);
        } else if (doc.id === 'logo') {
          const logoVal = doc.data().customLogo || null;
          setCustomLogo(logoVal);
          if (logoVal) {
            try {
              localStorage.setItem('madigun_custom_logo', logoVal);
            } catch (e) {}
          } else {
            try {
              localStorage.removeItem('madigun_custom_logo');
            } catch (e) {}
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'configs');
    });

    // 6. Sync Withdrawals
    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
      const list: Withdrawal[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Withdrawal);
      });
      // Sort withdrawals by createdAt descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWithdrawals(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'withdrawals');
    });

    // 7. Sync Rooms
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const list: HotelRoom[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as HotelRoom);
      });
      // Sort rooms by room number numeric natural sort
      list.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' }));
      setRooms(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rooms');
    });

    // 8. Sync Damage Reports
    const unsubDamageReports = onSnapshot(collection(db, 'damageReports'), (snapshot) => {
      const list: DamageReport[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as DamageReport);
      });
      list.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
      setDamageReports(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'damageReports');
    });

    // 9. Sync Food Requisitions
    const unsubFoodReqs = onSnapshot(collection(db, 'foodRequisitions'), (snapshot) => {
      const list: FoodRequisition[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as FoodRequisition);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFoodRequisitions(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'foodRequisitions');
    });

    return () => {
      unsubUsers();
      unsubInventory();
      unsubRequisitions();
      unsubLogs();
      unsubConfigs();
      unsubWithdrawals();
      unsubRooms();
      unsubDamageReports();
      unsubFoodReqs();
    };
  }, []);

  // Sync currentUser session to local storage for persistence across tab refresh/reloads
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('kitchen_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('kitchen_current_user');
    }
  }, [currentUser]);

  // Enforce role tab restriction: Primary root admin and hotel managing director have full access to accounts and audit logs.
  // All operational staff have access to Dashboard, Inventory Tracker, Purchase Requisitions, Food Requisitions, Withdrawal Slips, and Damaged Items.
  useEffect(() => {
    if (currentUser) {
      const isFull = currentUser.role === 'admin' || currentUser.role === 'managing_director';
      const adminOnlyTabs = ['accounts', 'logs', 'database'];
      if (!isFull && adminOnlyTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);


  // --- 2. Central Action Handlers & Event Logs ---
  
  const addLogEntry = async (action: string, details: string, actor: User) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: actor.id,
      username: actor.username,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'logs', newLog.id), cleanUndefined(newLog));
    } catch (e) {
      console.error("Error writing audit log:", e);
    }
  };

  // Custom Logo handler
  const handleUpdateLogo = async (newLogo: string | null) => {
    try {
      await setDoc(doc(db, 'configs', 'logo'), cleanUndefined({ customLogo: newLogo }));
      if (currentUser) {
        addLogEntry('Brand Customization', newLogo ? 'Uploaded new custom system logo and watermark.' : 'Reset system branding to default Madigun Hotel logo.', currentUser);
      }
    } catch (e) {
      console.error("Error updating system logo:", e);
    }
  };

  // Category handler
  const handleUpdateCategories = async (newCats: string[]) => {
    try {
      await setDoc(doc(db, 'configs', 'categories'), cleanUndefined({ values: newCats }));
      if (currentUser) {
        addLogEntry('Category Settings', `Updated categories (${newCats.length} active categories).`, currentUser);
      }
      setSyncFeedback('Categories updated successfully.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (e) {
      console.error("Error updating categories:", e);
      throw e;
    }
  };

  // Restore Default Hotel Database & Initial Records
  const handleRestoreDefaultData = async () => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'managing_director')) {
      throw new Error('Unauthorized');
    }
    setIsRestoring(true);
    try {
      // 1. Users
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.id), cleanUndefined(u));
      }
      // 2. Inventory
      for (const item of INITIAL_INVENTORY) {
        await setDoc(doc(db, 'inventory', item.id), cleanUndefined(item));
      }
      // 3. Rooms
      for (const r of INITIAL_ROOMS) {
        await setDoc(doc(db, 'rooms', r.id), cleanUndefined(r));
      }
      // 4. Requisitions
      for (const req of INITIAL_REQUISITIONS) {
        await setDoc(doc(db, 'requisitions', req.id), cleanUndefined(req));
      }
      // 5. Food Requisitions
      for (const freq of INITIAL_FOOD_REQUISITIONS) {
        await setDoc(doc(db, 'foodRequisitions', freq.id), cleanUndefined(freq));
      }
      // 6. Logs
      for (const log of INITIAL_LOGS) {
        await setDoc(doc(db, 'logs', log.id), cleanUndefined(log));
      }
      // 7. System configs
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
      await setDoc(doc(db, 'configs', 'categories'), cleanUndefined({ values: defaultCategories }));
      await setDoc(doc(db, 'configs', 'logo'), cleanUndefined({ customLogo: null }));

      await addLogEntry(
        'Database Reset',
        'Restored complete default Madigun Hotel database collections, products, rooms, and configuration settings.',
        currentUser
      );
      setSyncFeedback('Default hotel database, accounts, and sample records successfully restored.');
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      console.error("Failed to restore default database:", err);
      throw err;
    } finally {
      setIsRestoring(false);
    }
  };

  // Login handler
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    addLogEntry('Sign In', `${user.name} logged in successfully to terminal.`, user);
    setActiveTab('dashboard');
  };

  // Logout handler
  const handleLogout = () => {
    if (currentUser) {
      addLogEntry('Sign Out', `${currentUser.name} signed out of the terminal.`, currentUser);
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Register user
  const handleRegisterUser = async (newUser: User & { password?: string }) => {
    try {
      await setDoc(doc(db, 'users', newUser.id), cleanUndefined(newUser));
    } catch (e) {
      console.error("Error registering user:", e);
    }
  };

  // Delete a user account (for admin use during staff resignation)
  const handleDeleteUser = async (userId: string) => {
    if (!currentUser) return;
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      addLogEntry('Account Purged', `Deleted credentials of resigned staff member: ${targetUser.name} (${targetUser.username})`, currentUser);
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  };

  // Update a user's details (profile / directory)
  const handleUpdateUser = async (updatedUser: User) => {
    if (!currentUser) return;

    // Preserve any existing properties (like password) that aren't on the edited user object
    const existingUser = users.find(u => u.id === updatedUser.id);
    const mergedUser = {
      ...existingUser,
      ...updatedUser
    };

    try {
      await setDoc(doc(db, 'users', updatedUser.id), cleanUndefined(mergedUser));

      // If updating currently logged in user, also sync currentUser session state
      if (updatedUser.id === currentUser.id) {
        setCurrentUser(mergedUser);
        addLogEntry('Profile Updated', `Updated personal profile information.`, mergedUser);
      } else {
        addLogEntry('Account Modified', `Admin modified user information for: ${updatedUser.name}.`, currentUser);
      }
    } catch (e) {
      console.error("Error updating user:", e);
    }
  };

  // Inventory Add Item
  const handleAddInventoryItem = async (newItem: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    if (!currentUser) return null;
    
    const createdItem: InventoryItem = {
      ...newItem,
      id: `item-${Date.now()}`,
      lastUpdated: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'inventory', createdItem.id), cleanUndefined(createdItem));
      addLogEntry('Created Supply', `Added new inventory supply: ${createdItem.name} (${createdItem.category})`, currentUser);
      return createdItem;
    } catch (e) {
      console.error("Error adding inventory item:", e);
      return null;
    }
  };

  // Inventory Stock Adjustment
  const handleUpdateStock = async (itemId: string, newStock: number) => {
    if (!currentUser) return;

    const originalItem = inventory.find(i => i.id === itemId);
    if (!originalItem) return;

    const diff = newStock - originalItem.currentStock;
    const actionStr = diff >= 0 ? 'Stock Restocked' : 'Stock Consumption';
    const detailsStr = diff >= 0 
      ? `Increased ${originalItem.name} stock level by ${diff.toFixed(1)} ${originalItem.unit}. (New Total: ${newStock} ${originalItem.unit})`
      : `Consumed ${Math.abs(diff).toFixed(1)} ${originalItem.unit} of ${originalItem.name}. (New Total: ${newStock} ${originalItem.unit})`;

    try {
      await setDoc(doc(db, 'inventory', itemId), cleanUndefined({
        ...originalItem,
        currentStock: newStock,
        lastUpdated: new Date().toISOString()
      }));
      addLogEntry(actionStr, detailsStr, currentUser);
    } catch (e) {
      console.error("Error updating stock:", e);
    }
  };

  // Edit Item Details
  const handleEditItem = async (updatedItem: InventoryItem) => {
    if (!currentUser) return;

    try {
      await setDoc(doc(db, 'inventory', updatedItem.id), cleanUndefined({
        ...updatedItem,
        lastUpdated: new Date().toISOString()
      }));
      addLogEntry('Edited Supply Details', `Modified details of product: ${updatedItem.name}. Adjusted unit cost to $${updatedItem.unitCost.toFixed(2)}.`, currentUser);
    } catch (e) {
      console.error("Error editing inventory item:", e);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!currentUser) return;

    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    try {
      await deleteDoc(doc(db, 'inventory', itemId));
      addLogEntry('Deleted Supply', `Purged ${item.name} from kitchen supplies.`, currentUser);
    } catch (e) {
      console.error("Error deleting item:", e);
    }
  };

  // Recover Kitchen Inventory
  const handleRecoverKitchenInventory = async () => {
    if (!currentUser) return;
    try {
      const batch = writeBatch(db);
      let count = 0;
      INITIAL_INVENTORY.forEach((initItem) => {
        if ((initItem.section || 'KITCHEN') === 'KITCHEN') {
          const exists = inventory.some(i => i.id === initItem.id || (i.name.trim().toLowerCase() === initItem.name.trim().toLowerCase() && (i.section || 'KITCHEN') === 'KITCHEN'));
          if (!exists) {
            batch.set(doc(db, 'inventory', initItem.id), cleanUndefined(initItem));
            count++;
          }
        }
      });
      if (count > 0) {
        await batch.commit();
        addLogEntry('Recovered Kitchen Supplies', `Restored ${count} standard kitchen inventory items to active inventory.`, currentUser);
      }
    } catch (e) {
      console.error("Error recovering kitchen inventory:", e);
    }
  };

  // Add Category
  const handleAddCategory = async (newCat: string) => {
    if (!currentUser) return;
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) return;

    try {
      await setDoc(doc(db, 'configs', 'categories'), cleanUndefined({ values: [...categories, trimmed] }));
      addLogEntry('Category Added', `Added new kitchen supply category: ${trimmed}`, currentUser);
    } catch (e) {
      console.error("Error adding category:", e);
    }
  };

  // Remove Category
  const handleRemoveCategory = async (catToRemove: string) => {
    if (!currentUser) return;

    try {
      await setDoc(doc(db, 'configs', 'categories'), cleanUndefined({ values: categories.filter(c => c !== catToRemove) }));

      // Auto re-assign items in deleted category to 'Other'
      const batch = writeBatch(db);
      let count = 0;
      inventory.forEach(item => {
        if (item.category === catToRemove) {
          batch.set(doc(db, 'inventory', item.id), cleanUndefined({
            ...item,
            category: 'Other',
            lastUpdated: new Date().toISOString()
          }));
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }

      addLogEntry('Category Removed', `Deleted supply category: ${catToRemove}. Any affected products have been re-assigned to 'Other'.`, currentUser);
    } catch (e) {
      console.error("Error removing category:", e);
    }
  };

  // --- Room Action Handlers ---
  const handleAddRoom = async (newRoomData: Omit<HotelRoom, 'id'>) => {
    if (!currentUser) return;
    const newRoom: HotelRoom = {
      ...newRoomData,
      id: `room-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    };
    await setDoc(doc(db, 'rooms', newRoom.id), cleanUndefined(newRoom));
    await addLogEntry('Created Room', `Added new room ${newRoom.roomNumber} (${newRoom.roomType})`, currentUser);
  };

  const handleUpdateRoom = async (updatedRoom: HotelRoom) => {
    if (!currentUser) return;
    await setDoc(doc(db, 'rooms', updatedRoom.id), cleanUndefined(updatedRoom));
    await addLogEntry('Updated Room', `Updated room details/status for ${updatedRoom.roomNumber}`, currentUser);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!currentUser) return;
    const target = rooms.find(r => r.id === roomId);
    await deleteDoc(doc(db, 'rooms', roomId));
    if (target) {
      await addLogEntry('Deleted Room', `Removed room ${target.roomNumber} from system`, currentUser);
    }
  };

  const handleAddDeployedItem = async (roomId: string, newItemData: Omit<DeployedEquipment, 'id'>, deductFromInventory?: boolean) => {
    if (!currentUser) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const newItem: DeployedEquipment = {
      ...newItemData,
      id: `dep-${Date.now()}`
    };

    const updatedItems = [...(room.deployedItems || []), newItem];
    const updatedRoom: HotelRoom = { ...room, deployedItems: updatedItems };

    await setDoc(doc(db, 'rooms', roomId), cleanUndefined(updatedRoom));
    await addLogEntry('Deployed Equipment', `Deployed ${newItem.quantity}x ${newItem.name} to ${room.roomNumber}`, currentUser);

    if (deductFromInventory && newItem.inventoryItemId) {
      const invItem = inventory.find(i => i.id === newItem.inventoryItemId);
      if (invItem) {
        const newStock = Math.max(0, invItem.currentStock - newItem.quantity);
        await setDoc(doc(db, 'inventory', invItem.id), cleanUndefined({
          ...invItem,
          currentStock: newStock,
          lastUpdated: new Date().toISOString()
        }));
        await addLogEntry('Auto Stock Deduction', `Deducted ${newItem.quantity} ${newItem.unit} of ${invItem.name} from inventory for room deployment`, currentUser);
      }
    }
  };

  const handleUpdateDeployedItem = async (roomId: string, updatedItem: DeployedEquipment) => {
    if (!currentUser) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const updatedItems = (room.deployedItems || []).map(item => item.id === updatedItem.id ? updatedItem : item);
    const updatedRoom: HotelRoom = { ...room, deployedItems: updatedItems };

    await setDoc(doc(db, 'rooms', roomId), cleanUndefined(updatedRoom));
    await addLogEntry('Updated Deployed Equipment', `Updated equipment ${updatedItem.name} in ${room.roomNumber}`, currentUser);
  };

  const handleRemoveDeployedItem = async (roomId: string, itemId: string) => {
    if (!currentUser) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const removedItem = room.deployedItems.find(i => i.id === itemId);
    const updatedItems = (room.deployedItems || []).filter(item => item.id !== itemId);
    const updatedRoom: HotelRoom = { ...room, deployedItems: updatedItems };

    await setDoc(doc(db, 'rooms', roomId), cleanUndefined(updatedRoom));
    if (removedItem) {
      await addLogEntry('Removed Deployed Equipment', `Removed ${removedItem.name} from ${room.roomNumber}`, currentUser);
    }
  };

  // Create Requisition
  const handleCreateRequisition = async (draftReq: Omit<Requisition, 'id' | 'requisitionNumber' | 'createdBy' | 'createdByName' | 'createdAt' | 'totalCost'>) => {
    if (!currentUser) return;

    // Generate unique PR number
    const maxNum = requisitions.reduce((max, r) => {
      const match = r.requisitionNumber.match(/PR-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 1000);

    const nextNumber = `PR-${maxNum + 1}`;
    
    // Calculate final costing totals
    const totalCost = draftReq.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    const newRequisition: Requisition = {
      ...draftReq,
      id: `req-${Date.now()}`,
      requisitionNumber: nextNumber,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
      totalCost
    };

    // Instant optimistic state update in React
    setRequisitions(prev => [newRequisition, ...prev]);
    setSyncFeedback(`PR ${nextNumber} created & synced to cloud`);
    setTimeout(() => setSyncFeedback(null), 3000);

    try {
      await setDoc(doc(db, 'requisitions', newRequisition.id), cleanUndefined(newRequisition));
      addLogEntry('Created Requisition', `Drafted ${nextNumber} for: "${newRequisition.purpose}" valued at ₱${totalCost.toFixed(2)}`, currentUser).catch(() => {});
    } catch (e: any) {
      console.error("Error creating requisition in Firestore:", e);
      setRequisitions(prev => prev.filter(r => r.id !== newRequisition.id));
      handleFirestoreError(e, OperationType.CREATE, `requisitions/${newRequisition.id}`);
    }
  };

  // Update Requisition Content (Adding/Deducting Items, changing fields)
  const handleUpdateRequisition = async (reqId: string, updatedFields: Partial<Requisition>) => {
    if (!currentUser) return;
    const targetReq = requisitions.find(r => r.id === reqId);
    if (!targetReq) return;

    let totalCost = targetReq.totalCost;
    if (updatedFields.items) {
      totalCost = updatedFields.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    }

    const updatedReq: Requisition = {
      ...targetReq,
      ...updatedFields,
      totalCost,
      lastUpdated: new Date().toISOString()
    };

    // Instant optimistic state update
    setRequisitions(prev => prev.map(r => r.id === reqId ? updatedReq : r));
    setSyncFeedback(`PR ${targetReq.requisitionNumber} updated & synced to cloud`);
    setTimeout(() => setSyncFeedback(null), 3000);

    try {
      await setDoc(doc(db, 'requisitions', reqId), cleanUndefined(updatedReq));
      addLogEntry('Updated Requisition', `Modified items/details of purchase requisition ${targetReq.requisitionNumber}`, currentUser).catch(() => {});
    } catch (e: any) {
      console.error("Error updating requisition in Firestore:", e);
      setRequisitions(prev => prev.map(r => r.id === reqId ? targetReq : r));
      handleFirestoreError(e, OperationType.UPDATE, `requisitions/${reqId}`);
    }
  };

  // Update Requisition Status and Sync Stocks on Receive
  const handleUpdateRequisitionStatus = async (
    reqId: string, 
    newStatus: RequisitionStatus, 
    signatureDataUrl?: string,
    specificReceivedItems?: RequisitionItem[],
    receivedNotes?: string
  ) => {
    if (!currentUser) return;

    const targetReq = requisitions.find(r => r.id === reqId);
    if (!targetReq) return;

    let logAction = '';
    let logDetails = '';

    // Handle distinct states
    const statusMetadata: Partial<Requisition> = {};
    const timestamp = new Date().toISOString();

    if (newStatus === 'approved') {
      statusMetadata.approvedBy = currentUser.id;
      statusMetadata.approvedByName = currentUser.name;
      statusMetadata.approvedAt = timestamp;
      if (signatureDataUrl) {
        statusMetadata.approvedSignature = signatureDataUrl;
      }
      logAction = 'Approved Requisition';
      logDetails = `Approved purchase requisition ${targetReq.requisitionNumber}. Supply ordering dispatched.`;
    } else if (newStatus === 'ordered') {
      statusMetadata.orderedAt = timestamp;
      logAction = 'Dispatched Order';
      logDetails = `Dispatched orders for requisition ${targetReq.requisitionNumber} to respective suppliers.`;
    } else if (newStatus === 'received') {
      statusMetadata.receivedAt = timestamp;
      statusMetadata.receivedBy = currentUser.id;
      statusMetadata.receivedByName = currentUser.name;
      if (specificReceivedItems !== undefined) {
        statusMetadata.receivedItems = specificReceivedItems;
      }
      if (receivedNotes) {
        statusMetadata.receivedNotes = receivedNotes;
      }
      const actualReceivedCount = specificReceivedItems 
        ? specificReceivedItems.filter(i => (i.quantity || 0) > 0).length 
        : targetReq.items.length;
      logAction = 'Received Requisition';
      logDetails = `Delivered and verified items of ${targetReq.requisitionNumber}. ${actualReceivedCount} item(s) confirmed and added to actual inventory.`;
    } else if (newStatus === 'rejected') {
      statusMetadata.rejectedBy = currentUser.id;
      statusMetadata.rejectedByName = currentUser.name;
      statusMetadata.rejectedAt = timestamp;
      logAction = 'Rejected Requisition';
      logDetails = `Rejected purchase requisition ${targetReq.requisitionNumber}.`;
    }

    const updatedRequisition: Requisition = {
      ...targetReq,
      status: newStatus,
      ...statusMetadata,
      lastUpdated: timestamp
    };

    // 1. Instant optimistic state update in React
    setRequisitions(prev => prev.map(r => r.id === reqId ? updatedRequisition : r));
    setSyncFeedback(`PR ${targetReq.requisitionNumber} status updated to ${newStatus.toUpperCase()} & synced to cloud`);
    setTimeout(() => setSyncFeedback(null), 3000);

    // 2. Persist directly to Firestore Cloud Server
    try {
      await setDoc(doc(db, 'requisitions', reqId), cleanUndefined(updatedRequisition));
      console.log(`Requisition ${targetReq.requisitionNumber} status successfully persisted to Firestore cloud.`);
    } catch (e: any) {
      console.error("Error updating requisition status in Firestore:", e);
      // Rollback optimistic state if cloud write failed
      setRequisitions(prev => prev.map(r => r.id === reqId ? targetReq : r));
      handleFirestoreError(e, OperationType.UPDATE, `requisitions/${reqId}`);
      throw new Error(`Cloud sync error: ${e?.message || 'Failed to persist status to server'}`);
    }

    // 3. Sync inventory in background safely (non-blocking for instant responsiveness)
    syncRequisitionItemsToInventory(updatedRequisition, newStatus === 'received').catch(e => {
      console.error("Background inventory sync note:", e);
    });

    // 4. Log audit action in background safely (non-blocking)
    if (logAction) {
      addLogEntry(logAction, logDetails, currentUser).catch(e => {
        console.error("Background audit log note:", e);
      });
    }
  };

  // Helper: Automatically add/update requisition items in the inventory of the requesting department
  const syncRequisitionItemsToInventory = async (targetReq: Requisition, isReceived: boolean) => {
    if (!targetReq || !Array.isArray(targetReq.items) || targetReq.items.length === 0) return;
    const timestamp = new Date().toISOString();
    const batch = writeBatch(db);
    let updatedCount = 0;

    // Use specific received items if defined, otherwise fallback to targetReq.items
    const itemsToProcess = (isReceived && targetReq.receivedItems !== undefined)
      ? targetReq.receivedItems
      : targetReq.items;

    if (!itemsToProcess || itemsToProcess.length === 0) return;

    // Get target department/section for the inventory item
    const deptSection = (targetReq.requestingDept || 'KITCHEN') as InventorySection;

    itemsToProcess.forEach((reqItem, idx) => {
      if (!reqItem) return;
      // Skip if quantity is 0 or negative - item was NOT purchased!
      if (typeof reqItem.quantity === 'number' && reqItem.quantity <= 0) return;
      const rawName = reqItem.itemName || '';
      const trimmedName = rawName.trim().toLowerCase();
      if (!trimmedName) return;

      // Look for existing inventory item by exact ID or by lowercased name in same section
      const existing = inventory.find(i => 
        (i.id && reqItem.itemId && i.id === reqItem.itemId) || 
        (i.name && i.name.trim().toLowerCase() === trimmedName && (i.section || 'KITCHEN') === deptSection)
      );

      // Determine the bought price (actualUnitCost prioritized, or unitCost)
      const boughtPrice = (typeof reqItem.actualUnitCost === 'number' && reqItem.actualUnitCost >= 0)
        ? reqItem.actualUnitCost
        : ((typeof reqItem.unitCost === 'number' && reqItem.unitCost >= 0) ? reqItem.unitCost : undefined);

      if (existing) {
        if (isReceived) {
          // Increment stock when received and update to actual bought price
          batch.set(doc(db, 'inventory', existing.id), cleanUndefined({
            ...existing,
            currentStock: (existing.currentStock || 0) + (reqItem.quantity || 0),
            unitCost: boughtPrice !== undefined ? boughtPrice : (existing.unitCost || 0),
            lastUpdated: timestamp
          }));
          updatedCount++;
        }
      } else {
        // Automatically create the new requested item in the inventory of the requesting department ONLY if actually received
        if (isReceived) {
          const newInvId = (reqItem.itemId && !reqItem.itemId.startsWith('replaced_')) ? reqItem.itemId : `inv_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
          const newInvItem: InventoryItem = {
            id: newInvId,
            name: rawName.trim(),
            category: reqItem.targetTab || targetReq.requestingDept || 'General Requisitions',
            section: deptSection,
            currentStock: reqItem.quantity || 0,
            unit: reqItem.unit || 'pcs',
            unitCost: boughtPrice !== undefined ? boughtPrice : 0,
            minStock: 5,
            supplier: targetReq.quotationVendor || 'Requisition Restock',
            lastUpdated: timestamp
          };

          batch.set(doc(db, 'inventory', newInvId), cleanUndefined(newInvItem));
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }
  };

  // Checked/Verified by Purchaser
  const handleCheckRequisition = async (reqId: string, signatureDataUrl?: string) => {
    if (!currentUser) return;
    const targetReq = requisitions.find(r => r.id === reqId);
    if (!targetReq) return;

    const timestamp = new Date().toISOString();
    const updateData: Partial<Requisition> = {
      checkedBy: currentUser.id,
      checkedByName: currentUser.name,
      checkedAt: timestamp
    };
    if (signatureDataUrl) {
      updateData.checkedSignature = signatureDataUrl;
    }

    const updatedRequisition: Requisition = {
      ...targetReq,
      ...updateData,
      lastUpdated: timestamp
    };

    setRequisitions(prev => prev.map(r => r.id === reqId ? updatedRequisition : r));
    setSyncFeedback(`PR ${targetReq.requisitionNumber} checked & verified on cloud`);
    setTimeout(() => setSyncFeedback(null), 3000);

    try {
      await setDoc(doc(db, 'requisitions', reqId), cleanUndefined(updatedRequisition));
      addLogEntry('Checked Requisition', `Verified and checked purchase requisition ${targetReq.requisitionNumber}.`, currentUser).catch(() => {});
    } catch (e: any) {
      console.error("Error checking requisition in Firestore:", e);
      setRequisitions(prev => prev.map(r => r.id === reqId ? targetReq : r));
      handleFirestoreError(e, OperationType.UPDATE, `requisitions/${reqId}`);
      throw new Error(`Cloud sync error: ${e?.message || 'Failed to verify PR on server'}`);
    }
  };

  // Reverse Requisition Status back to Pending (and reverse inventory stock additions if received)
  const handleReverseRequisitionStatus = async (reqId: string) => {
    if (!currentUser) return;

    const targetReq = requisitions.find(r => r.id === reqId);
    if (!targetReq) return;

    const timestamp = new Date().toISOString();

    const updatedRequisition: Requisition = {
      ...targetReq,
      status: 'pending',
      approvedBy: undefined,
      approvedByName: undefined,
      approvedAt: undefined,
      approvedSignature: undefined,
      checkedBy: undefined,
      checkedByName: undefined,
      checkedAt: undefined,
      checkedSignature: undefined,
      orderedAt: undefined,
      receivedAt: undefined,
      receivedBy: undefined,
      receivedByName: undefined,
      receivedItems: undefined,
      receivedNotes: undefined,
      rejectedAt: undefined,
      rejectedBy: undefined,
      rejectedByName: undefined,
      lastUpdated: timestamp
    };

    // Optimistic UI update
    setRequisitions(prev => prev.map(r => r.id === reqId ? updatedRequisition : r));

    try {
      // If it was already received, we reverse the quantities from active stock!
      if (targetReq.status === 'received') {
        const batch = writeBatch(db);
        const itemsToReverse = (targetReq.receivedItems !== undefined)
          ? targetReq.receivedItems
          : targetReq.items;

        inventory.forEach(invItem => {
          const reqItem = itemsToReverse.find(ri => 
            (ri.itemId && ri.itemId === invItem.id) || 
            (ri.itemName && invItem.name && ri.itemName.trim().toLowerCase() === invItem.name.trim().toLowerCase())
          );
          if (reqItem && (reqItem.quantity || 0) > 0) {
            batch.set(doc(db, 'inventory', invItem.id), cleanUndefined({
              ...invItem,
              currentStock: Math.max(0, (invItem.currentStock || 0) - (reqItem.quantity || 0)),
              lastUpdated: timestamp
            }));
          }
        });
        await batch.commit();
      }

      // Set the status back to 'pending' and clear workflow metadata in Firestore
      await setDoc(doc(db, 'requisitions', reqId), cleanUndefined(updatedRequisition));
      addLogEntry('Reversed Requisition', `Replaced status of ${targetReq.requisitionNumber} back to Pending due to discrepancy.`, currentUser);
    } catch (e) {
      console.error("Error reversing requisition status:", e);
      handleFirestoreError(e, OperationType.UPDATE, `requisitions/${reqId}`);
    }
  };

  // Delete Requisition (Soft Deletion to Recycle Bin)
  const handleDeleteRequisition = async (reqId: string) => {
    if (!currentUser) return;
    const targetReq = requisitions.find(r => r.id === reqId);
    if (!targetReq) return;

    try {
      await setDoc(doc(db, 'requisitions', reqId), cleanUndefined({
        ...targetReq,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: currentUser.id,
        deletedByName: currentUser.name
      }));
      addLogEntry('Deleted Requisition', `Moved purchase requisition ${targetReq.requisitionNumber} to Recycle Bin.`, currentUser);
    } catch (e) {
      console.error("Error deleting requisition:", e);
    }
  };

  // Restore Requisition (Any authorized staff/user can restore)
  const handleRestoreRequisition = async (reqId: string) => {
    if (!currentUser) return;
    const targetReq = requisitions.find(r => r.id === reqId);
    if (!targetReq) return;

    try {
      await setDoc(doc(db, 'requisitions', reqId), cleanUndefined({
        ...targetReq,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null
      }));
      addLogEntry('Restored Requisition', `${currentUser.name} restored purchase requisition ${targetReq.requisitionNumber} from Recycle Bin.`, currentUser);
    } catch (e) {
      console.error("Error restoring requisition:", e);
    }
  };

  // Permanently Purge Requisition (Admin only) - also deletes matching requisition logs
  const handlePurgeRequisition = async (reqId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    const targetReq = requisitions.find(r => r.id === reqId);
    if (!targetReq) return;

    try {
      await deleteDoc(doc(db, 'requisitions', reqId));
      
      // Clear all audit logs mentioning this requisition number
      const batch = writeBatch(db);
      logs.forEach(log => {
        if (log.details.includes(targetReq.requisitionNumber)) {
          batch.delete(doc(db, 'logs', log.id));
        }
      });
      await batch.commit();

      addLogEntry('Purged Requisition', `Permanently deleted purchase requisition ${targetReq.requisitionNumber} and deleted associated logs.`, currentUser);
    } catch (e) {
      console.error("Error purging requisition:", e);
    }
  };

  // Create Warehouse Withdrawal Request
  const handleCreateWithdrawal = async (draftWd: Omit<Withdrawal, 'id' | 'withdrawalNumber' | 'createdBy' | 'createdAt' | 'status'> & { status?: WithdrawalStatus }) => {
    if (!currentUser) return;

    // Generate unique WD number
    const maxNum = withdrawals.reduce((max, w) => {
      const match = w.withdrawalNumber.match(/WD-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 1000);

    const nextNumber = `WD-${maxNum + 1}`;
    const timestamp = new Date().toISOString();
    const finalStatus = draftWd.status || 'completed';

    const newWithdrawal: Withdrawal = {
      ...draftWd,
      id: `wd-${Date.now()}`,
      withdrawalNumber: nextNumber,
      createdBy: currentUser.id,
      createdByName: draftWd.createdByName || currentUser.name,
      createdAt: timestamp,
      status: finalStatus,
      completedBy: finalStatus === 'completed' ? currentUser.id : undefined,
      completedByName: finalStatus === 'completed' ? currentUser.name : undefined,
      completedAt: finalStatus === 'completed' ? timestamp : undefined
    };

    try {
      if (finalStatus === 'completed') {
        // Immediately decrement inventory stocks since it's completed
        const batch = writeBatch(db);
        inventory.forEach(invItem => {
          const wdItem = newWithdrawal.items.find(wi => wi.itemId === invItem.id);
          if (wdItem) {
            const newStock = Math.max(0, invItem.currentStock - wdItem.quantity);
            batch.set(doc(db, 'inventory', invItem.id), cleanUndefined({
              ...invItem,
              currentStock: newStock,
              lastUpdated: timestamp
            }));
          }
        });

        await setDoc(doc(db, 'withdrawals', newWithdrawal.id), cleanUndefined(newWithdrawal));
        await batch.commit();

        addLogEntry('Created Withdrawal', `Disbursed warehouse withdrawal ${nextNumber} for requestor "${newWithdrawal.createdByName}": "${newWithdrawal.purpose}"`, currentUser);
      } else {
        await setDoc(doc(db, 'withdrawals', newWithdrawal.id), cleanUndefined(newWithdrawal));
        addLogEntry('Saved Withdrawal Draft', `Created draft withdrawal slip ${nextNumber} for requestor "${newWithdrawal.createdByName}": "${newWithdrawal.purpose}"`, currentUser);
      }
    } catch (e) {
      console.error("Error creating withdrawal:", e);
    }
  };

  // Update Warehouse Withdrawal Status and Sync Stocks on Completed
  const handleUpdateWithdrawalStatus = async (withdrawalId: string, newStatus: WithdrawalStatus) => {
    if (!currentUser) return;

    const targetWd = withdrawals.find(w => w.id === withdrawalId);
    if (!targetWd) return;

    let logAction = '';
    let logDetails = '';

    const statusMetadata: Partial<Withdrawal> = {};
    const timestamp = new Date().toISOString();

    try {
      if (newStatus === 'approved') {
        statusMetadata.approvedBy = currentUser.id;
        statusMetadata.approvedByName = currentUser.name;
        statusMetadata.approvedAt = timestamp;
        logAction = 'Approved Withdrawal';
        logDetails = `Approved warehouse withdrawal request ${targetWd.withdrawalNumber}. Pending disbursement.`;
      } else if (newStatus === 'completed') {
        statusMetadata.completedBy = currentUser.id;
        statusMetadata.completedByName = currentUser.name;
        statusMetadata.completedAt = timestamp;
        logAction = 'Completed Withdrawal';
        logDetails = `Fulfilled and disbursed warehouse withdrawal ${targetWd.withdrawalNumber}. Active inventory stocks decremented.`;

        // CRITICAL DECREMENT SIDE-EFFECT: Reduce currentStock of matching products in inventory!
        const batch = writeBatch(db);
        inventory.forEach(invItem => {
          const wdItem = targetWd.items.find(wi => wi.itemId === invItem.id);
          if (wdItem) {
            const newStock = Math.max(0, invItem.currentStock - wdItem.quantity);
            batch.set(doc(db, 'inventory', invItem.id), cleanUndefined({
              ...invItem,
              currentStock: newStock,
              lastUpdated: timestamp
            }));
          }
        });
        await batch.commit();
      } else if (newStatus === 'rejected') {
        statusMetadata.rejectedBy = currentUser.id;
        statusMetadata.rejectedByName = currentUser.name;
        statusMetadata.rejectedAt = timestamp;
        logAction = 'Rejected Withdrawal';
        logDetails = `Rejected warehouse withdrawal request ${targetWd.withdrawalNumber}.`;
      }

      await setDoc(doc(db, 'withdrawals', withdrawalId), cleanUndefined({
        ...targetWd,
        ...statusMetadata,
        status: newStatus
      }));

      addLogEntry(logAction, logDetails, currentUser);
    } catch (e) {
      console.error("Error updating withdrawal status:", e);
    }
  };

  // Delete Withdrawal Slip
  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    if (!currentUser) return;
    const targetWd = withdrawals.find(w => w.id === withdrawalId);
    if (!targetWd) return;

    try {
      await deleteDoc(doc(db, 'withdrawals', withdrawalId));
      addLogEntry('Deleted Withdrawal Slip', `Permanently deleted warehouse withdrawal slip ${targetWd.withdrawalNumber} from active records.`, currentUser);
    } catch (e) {
      console.error("Error deleting withdrawal:", e);
    }
  };

  // --- DAMAGE REPORTS HANDLERS ---
  const handleCreateDamageReport = async (draft: any) => {
    if (!currentUser) return;
    try {
      const timestamp = new Date().toISOString();
      const reportNumSeq = damageReports.length + 1001;
      const reportNumber = `DMR-${reportNumSeq}`;

      const itemsList: DamageReportItem[] = (draft.items && draft.items.length > 0)
        ? draft.items
        : [{
            itemId: draft.itemId,
            itemName: draft.itemName || 'Unspecified Item',
            category: draft.category || 'General',
            quantity: draft.quantity || 1,
            unit: draft.unit || 'pcs',
            unitCost: draft.unitCost || 0,
            totalCost: (draft.quantity || 1) * (draft.unitCost || 0),
            deductFromStock: draft.deductedFromStock ?? true
          }];

      const calculatedTotalCost = itemsList.reduce((sum, item) => sum + (item.totalCost || ((item.quantity || 1) * (item.unitCost || 0))), 0);
      const primaryItem = itemsList[0];
      const summaryItemName = itemsList.length === 1 
        ? primaryItem.itemName 
        : `${primaryItem.itemName} (+${itemsList.length - 1} more items)`;
      
      const summaryCategory = Array.from(new Set(itemsList.map(i => i.category || 'General'))).join(', ');

      const newReport: DamageReport = {
        id: `dmr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        reportNumber,
        items: itemsList,
        itemId: primaryItem.itemId,
        itemName: summaryItemName,
        category: summaryCategory,
        roomNumber: draft.roomNumber || primaryItem.roomNumber,
        location: draft.location || (draft.roomNumber ? `Room ${draft.roomNumber}` : undefined),
        quantity: itemsList.reduce((sum, i) => sum + (i.quantity || 0), 0),
        unit: itemsList.length === 1 ? (primaryItem.unit || 'pcs') : 'items',
        unitCost: primaryItem.unitCost || 0,
        totalCost: calculatedTotalCost,
        severity: draft.severity,
        status: draft.status || 'reported',
        incidentDate: draft.incidentDate,
        reportedBy: currentUser.id,
        reportedByName: draft.reportedByName || currentUser.name,
        reportedAt: timestamp,
        description: draft.description,
        notes: draft.notes,
        deductedFromStock: itemsList.some(i => i.deductFromStock)
      };

      await setDoc(doc(db, 'damageReports', newReport.id), cleanUndefined(newReport));

      // Decrement active stock from inventory for each item with deductFromStock
      for (const item of itemsList) {
        if (item.deductFromStock && item.itemId) {
          const targetInv = inventory.find(i => i.id === item.itemId);
          if (targetInv) {
            const updatedStock = Math.max(0, targetInv.currentStock - item.quantity);
            await setDoc(doc(db, 'inventory', targetInv.id), cleanUndefined({
              ...targetInv,
              currentStock: updatedStock,
              lastUpdated: timestamp
            }));
          }
        }
      }

      addLogEntry(
        'Filed Damage Report',
        `Filed damage report ${reportNumber} with ${itemsList.length} item(s) [Total Loss: PHP ${calculatedTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}]`,
        currentUser
      );
    } catch (e) {
      console.error("Error creating damage report:", e);
    }
  };

  const handleUpdateDamageReportStatus = async (reportId: string, newStatus: DamageStatus, actionNotes?: string) => {
    if (!currentUser) return;
    const target = damageReports.find(r => r.id === reportId);
    if (!target) return;

    try {
      const timestamp = new Date().toISOString();
      const updated: DamageReport = {
        ...target,
        status: newStatus,
        reviewedBy: currentUser.id,
        reviewedByName: currentUser.name,
        reviewedAt: timestamp,
        notes: actionNotes ? `${target.notes || ''}\n[Status update to ${newStatus}]: ${actionNotes}`.trim() : target.notes
      };

      await setDoc(doc(db, 'damageReports', reportId), cleanUndefined(updated));
      addLogEntry('Updated Damage Report Status', `Updated report ${target.reportNumber} status to "${newStatus}"`, currentUser);
    } catch (e) {
      console.error("Error updating damage report status:", e);
    }
  };

  const handleDeleteDamageReport = async (reportId: string) => {
    if (!currentUser) return;
    const target = damageReports.find(r => r.id === reportId);
    if (!target) return;

    try {
      await deleteDoc(doc(db, 'damageReports', reportId));
      addLogEntry('Deleted Damage Report', `Deleted damage report ${target.reportNumber} for "${target.itemName}"`, currentUser);
    } catch (e) {
      console.error("Error deleting damage report:", e);
    }
  };

  const handleRequestReplacementPR = (item: { itemId?: string; itemName: string; quantity: number; unit: string; unitCost?: number; location?: string; reason: string }) => {
    setAutoRequisitionDraft([{
      itemId: item.itemId || `replaced_${Date.now()}`,
      quantity: item.quantity,
      allocatedLocation: item.location || 'Main Kitchen'
    }]);
    setActiveTab('requisitions');
  };

  // --- Food Requisitions Handlers ---
  const handleAddFoodRequisition = async (reqData: Omit<FoodRequisition, 'id' | 'requisitionNumber' | 'createdAt'>) => {
    if (!currentUser) return;
    try {
      const id = `freq-${Date.now()}`;
      const count = foodRequisitions.length + 1;
      const reqNum = `FREQ-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
      const newReq: FoodRequisition = {
        ...reqData,
        id,
        requisitionNumber: reqNum,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'foodRequisitions', id), cleanUndefined(newReq));
      addLogEntry('Created Food Requisition', `Created food requisition ${reqNum} for ${newReq.eventOrPurpose} (₱${newReq.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })})`, currentUser);
    } catch (e) {
      console.error("Error adding food requisition:", e);
    }
  };

  const handleUpdateFoodRequisitionStatus = async (id: string, status: FoodRequisitionStatus, signatureDataUrl?: string) => {
    if (!currentUser) return;
    const target = foodRequisitions.find(r => r.id === id);
    if (!target) return;

    const updates: Partial<FoodRequisition> = { status };
    if (status === 'approved') {
      updates.approvedBy = currentUser.id;
      updates.approvedByName = currentUser.name;
      updates.approvedAt = new Date().toISOString();
      if (signatureDataUrl) updates.approvedSignature = signatureDataUrl;
    } else if (status === 'rejected') {
      updates.rejectedBy = currentUser.id;
      updates.rejectedByName = currentUser.name;
      updates.rejectedAt = new Date().toISOString();
    }

    const updatedReq: FoodRequisition = { ...target, ...updates };

    // 1. Optimistic state update
    setFoodRequisitions(prev => prev.map(r => r.id === id ? updatedReq : r));

    // 2. Persist to Firestore
    try {
      await setDoc(doc(db, 'foodRequisitions', id), cleanUndefined(updatedReq));
      addLogEntry('Updated Food Requisition Status', `Updated food requisition ${target.requisitionNumber} status to ${status.toUpperCase()}`, currentUser);
      setSyncFeedback(`Food Req ${target.requisitionNumber} updated to ${status.toUpperCase()}`);
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (e: any) {
      console.error("Error updating food requisition status:", e);
      setFoodRequisitions(prev => prev.map(r => r.id === id ? target : r));
      handleFirestoreError(e, OperationType.UPDATE, `foodRequisitions/${id}`);
      throw new Error(`Cloud sync error: ${e?.message || 'Failed to update food requisition'}`);
    }
  };

  const handleVerifyFoodRequisition = async (id: string, signatureDataUrl?: string) => {
    if (!currentUser) return;
    const target = foodRequisitions.find(r => r.id === id);
    if (!target) return;

    const updates: Partial<FoodRequisition> = {
      checkedBy: currentUser.id,
      checkedByName: currentUser.name,
      checkedAt: new Date().toISOString()
    };
    if (signatureDataUrl) {
      updates.checkedSignature = signatureDataUrl;
    }

    const updatedReq: FoodRequisition = { ...target, ...updates };

    // 1. Optimistic state update
    setFoodRequisitions(prev => prev.map(r => r.id === id ? updatedReq : r));

    // 2. Persist to Firestore
    try {
      await setDoc(doc(db, 'foodRequisitions', id), cleanUndefined(updatedReq));
      addLogEntry('Verified Food Requisition', `Purchaser verified food requisition ${target.requisitionNumber}`, currentUser);
      setSyncFeedback(`Food Req ${target.requisitionNumber} verified on cloud`);
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (e: any) {
      console.error("Error verifying food requisition:", e);
      setFoodRequisitions(prev => prev.map(r => r.id === id ? target : r));
      handleFirestoreError(e, OperationType.UPDATE, `foodRequisitions/${id}`);
      throw new Error(`Cloud sync error: ${e?.message || 'Failed to verify food requisition'}`);
    }
  };

  const handleDeleteFoodRequisition = async (id: string) => {
    if (!currentUser) return;
    try {
      const target = foodRequisitions.find(r => r.id === id);
      if (!target) return;
      await deleteDoc(doc(db, 'foodRequisitions', id));
      addLogEntry('Deleted Food Requisition', `Deleted food requisition ${target.requisitionNumber}`, currentUser);
    } catch (e) {
      console.error("Error deleting food requisition:", e);
    }
  };

  const handleEditFoodRequisition = async (updated: FoodRequisition) => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, 'foodRequisitions', updated.id), cleanUndefined(updated));
      addLogEntry('Updated Food Requisition', `Updated food requisition ${updated.requisitionNumber}`, currentUser);
    } catch (e) {
      console.error("Error editing food requisition:", e);
    }
  };

  // Delete Individual Audit Log Entry
  const handleDeleteLog = async (logId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'logs', logId));
    } catch (e) {
      console.error("Error deleting audit log:", e);
    }
  };

  // Export backup JSON
  const handleExportBackup = () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    const backupData = {
      system: 'Madigun Hotel & Events Property Management System',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.username || currentUser.name,
      summary: {
        usersCount: users.length,
        inventoryCount: inventory.length,
        requisitionsCount: requisitions.length,
        foodRequisitionsCount: foodRequisitions.length,
        withdrawalsCount: withdrawals.length,
        roomsCount: rooms.length,
        damageReportsCount: damageReports.length,
        logsCount: logs.length
      },
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `madigun_hotel_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addLogEntry('Export Backup', 'Successfully exported system database backup JSON (v2.0.0).', currentUser);
  };

  // Import backup select handler
  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || currentUser.role !== 'admin') return;
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
        // Basic check for valid properties
        const hasUsers = Array.isArray(json.users);
        const hasInventory = Array.isArray(json.inventory);
        const hasRequisitions = Array.isArray(json.requisitions);
        const hasWithdrawals = Array.isArray(json.withdrawals);
        const hasRooms = Array.isArray(json.rooms);
        const hasDamage = Array.isArray(json.damageReports);

        if (!hasUsers && !hasInventory && !hasRequisitions && !hasWithdrawals && !hasRooms && !hasDamage) {
          setImportError('Invalid backup: File does not contain recognized database collections.');
          return;
        }

        setImportedData(json);
        setImportError(null);
        setRestoreSuccess(false);
      } catch (err) {
        setImportError('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Unified Core Database Restore Engine (supports both file uploads and backups)
  const handleRestoreBackupData = async (data: any, mode: 'merge' | 'overwrite') => {
    if (!data || !currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'managing_director')) {
      throw new Error('Unauthorized or missing backup payload');
    }
    setIsRestoring(true);
    setImportError(null);
    setRestoreSuccess(false);

    try {
      // Helper to batch operations safely within Firestore 500-op limits
      const commitOperations = async (ops: Array<(batch: any) => void>) => {
        const CHUNK_SIZE = 400;
        for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
          const chunk = ops.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const op of chunk) {
            op(batch);
          }
          await batch.commit();
        }
      };

      const incomingUsers: any[] = Array.isArray(data.users) ? data.users : [];
      const incomingInventory: any[] = Array.isArray(data.inventory) ? data.inventory : [];
      const incomingRequisitions: any[] = Array.isArray(data.requisitions) ? data.requisitions : [];
      const incomingFoodRequisitions: any[] = Array.isArray(data.foodRequisitions) 
        ? data.foodRequisitions 
        : (Array.isArray(data.food_requisitions) ? data.food_requisitions : []);
      const incomingWithdrawals: any[] = Array.isArray(data.withdrawals) ? data.withdrawals : [];
      const incomingRooms: any[] = Array.isArray(data.rooms) 
        ? data.rooms 
        : (Array.isArray(data.hotel_rooms) ? data.hotel_rooms : []);
      const incomingDamageReports: any[] = Array.isArray(data.damageReports) 
        ? data.damageReports 
        : (Array.isArray(data.damage_reports) ? data.damage_reports : []);
      const incomingLogs: any[] = Array.isArray(data.logs) 
        ? data.logs 
        : (Array.isArray(data.audit_logs) ? data.audit_logs : []);

      if (mode === 'overwrite') {
        // Delete current records in Firestore via batched deletes
        const deleteOps: Array<(batch: any) => void> = [];
        
        // Only delete users if incoming backup contains user accounts, and keep currentUser safe
        if (incomingUsers.length > 0) {
          users.forEach(u => deleteOps.push(b => b.delete(doc(db, 'users', u.id))));
        }
        inventory.forEach(i => deleteOps.push(b => b.delete(doc(db, 'inventory', i.id))));
        requisitions.forEach(r => deleteOps.push(b => b.delete(doc(db, 'requisitions', r.id))));
        foodRequisitions.forEach(fr => deleteOps.push(b => b.delete(doc(db, 'foodRequisitions', fr.id))));
        withdrawals.forEach(w => deleteOps.push(b => b.delete(doc(db, 'withdrawals', w.id))));
        rooms.forEach(rm => deleteOps.push(b => b.delete(doc(db, 'rooms', rm.id))));
        damageReports.forEach(dr => deleteOps.push(b => b.delete(doc(db, 'damageReports', dr.id))));
        logs.forEach(l => deleteOps.push(b => b.delete(doc(db, 'logs', l.id))));

        if (deleteOps.length > 0) {
          await commitOperations(deleteOps);
        }
      }

      // Prepare insertion operations
      const insertOps: Array<(batch: any) => void> = [];

      // 1. Restoring users (preserve currentUser session)
      if (incomingUsers.length > 0) {
        const hasCurrentUser = incomingUsers.some(u => u.id === currentUser.id || (u.username && u.username.toLowerCase() === currentUser.username?.toLowerCase()));
        const usersToSave = hasCurrentUser ? incomingUsers : [currentUser, ...incomingUsers];

        for (const u of usersToSave) {
          if (mode === 'merge') {
            const exists = users.some(existing => existing.id === u.id || (u.username && existing.username.toLowerCase() === u.username.toLowerCase()));
            if (exists) continue;
          }
          insertOps.push(b => b.set(doc(db, 'users', u.id), cleanUndefined(u)));
        }
      }

      // 2. Restoring inventory
      for (const i of incomingInventory) {
        if (mode === 'merge') {
          const exists = inventory.some(existing => existing.id === i.id || (i.name && existing.name.toLowerCase().trim() === i.name.toLowerCase().trim()));
          if (exists) continue;
        }
        insertOps.push(b => b.set(doc(db, 'inventory', i.id), cleanUndefined(i)));
      }

      // 3. Restoring requisitions
      for (const r of incomingRequisitions) {
        if (mode === 'merge') {
          const exists = requisitions.some(existing => existing.id === r.id || existing.requisitionNumber === r.requisitionNumber);
          if (exists) continue;
        }
        insertOps.push(b => b.set(doc(db, 'requisitions', r.id), cleanUndefined(r)));
      }

      // 4. Restoring food requisitions
      for (const fr of incomingFoodRequisitions) {
        if (mode === 'merge') {
          const exists = foodRequisitions.some(existing => existing.id === fr.id || existing.requisitionNumber === fr.requisitionNumber);
          if (exists) continue;
        }
        insertOps.push(b => b.set(doc(db, 'foodRequisitions', fr.id), cleanUndefined(fr)));
      }

      // 5. Restoring withdrawals
      for (const w of incomingWithdrawals) {
        if (mode === 'merge') {
          const exists = withdrawals.some(existing => existing.id === w.id || existing.withdrawalNumber === w.withdrawalNumber);
          if (exists) continue;
        }
        insertOps.push(b => b.set(doc(db, 'withdrawals', w.id), cleanUndefined(w)));
      }

      // 6. Restoring rooms
      for (const rm of incomingRooms) {
        if (mode === 'merge') {
          const exists = rooms.some(existing => existing.id === rm.id || existing.roomNumber === rm.roomNumber);
          if (exists) continue;
        }
        insertOps.push(b => b.set(doc(db, 'rooms', rm.id), cleanUndefined(rm)));
      }

      // 7. Restoring damage reports
      for (const dr of incomingDamageReports) {
        if (mode === 'merge') {
          const exists = damageReports.some(existing => existing.id === dr.id || existing.reportNumber === dr.reportNumber);
          if (exists) continue;
        }
        insertOps.push(b => b.set(doc(db, 'damageReports', dr.id), cleanUndefined(dr)));
      }

      // 8. Restoring logs
      for (const l of incomingLogs) {
        if (mode === 'merge') {
          const exists = logs.some(existing => existing.id === l.id);
          if (exists) continue;
        }
        insertOps.push(b => b.set(doc(db, 'logs', l.id), cleanUndefined(l)));
      }

      if (insertOps.length > 0) {
        await commitOperations(insertOps);
      }

      // 9. Restoring configs (categories and logo)
      if (data.configs) {
        if (Array.isArray(data.configs.categories)) {
          let targetCategories = data.configs.categories;
          if (mode === 'merge') {
            const merged = [...categories];
            data.configs.categories.forEach((cat: string) => {
              const trimmed = cat.trim();
              if (trimmed && !merged.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
                merged.push(trimmed);
              }
            });
            targetCategories = merged;
          }
          await setDoc(doc(db, 'configs', 'categories'), cleanUndefined({ values: targetCategories }));
        }
        if (data.configs.customLogo !== undefined) {
          if (mode === 'overwrite' || (mode === 'merge' && !customLogo)) {
            await setDoc(doc(db, 'configs', 'logo'), cleanUndefined({ customLogo: data.configs.customLogo }));
          }
        }
      }

      await addLogEntry(
        'Database Restore',
        `Restored database from backup using [${mode === 'merge' ? 'Safely Merge' : 'Delete and Overwrite'}] mode.`,
        currentUser
      );

      setRestoreSuccess(true);
      setImportedData(null);
    } catch (err: any) {
      console.error("Error restoring database backup:", err);
      setImportError(`Failed to restore data: ${err.message || err}`);
      throw err;
    } finally {
      setIsRestoring(false);
    }
  };

  // Execute restore in selected mode from local upload
  const handleExecuteRestore = async (mode: 'merge' | 'overwrite') => {
    if (!importedData) return;
    try {
      await handleRestoreBackupData(importedData, mode);
      setShowConfirmLogsOverwrite(false);
    } catch (err) {
      console.error("Failed to restore data:", err);
    }
  };

  // Trigger automated restock requisition
  const handleTriggerAutoRequisition = () => {
    if (!currentUser) return;

    // Filter items where stock <= safety min stock
    const lowStockItems = inventory.filter(item => item.currentStock <= item.minStock);
    if (lowStockItems.length === 0) return;

    // Create recommended quantities
    // Bring it to safety limit + 50% surplus: minStock * 1.5 - currentStock
    const recommendedItems = lowStockItems.map(item => {
      const needed = Math.max(1, Math.ceil(item.minStock * 1.5 - item.currentStock));
      return {
        itemId: item.id,
        quantity: needed
      };
    });

    setAutoRequisitionDraft(recommendedItems);
    setActiveTab('requisitions');
  };

  // Clear auto requisition draft once consumed by component
  const handleClearDraftAuto = () => {
    setAutoRequisitionDraft(null);
  };

  // --- 3. View Router Rendering ---
  if (!currentUser) {
    return (
      <Auth 
        onLogin={handleLogin} 
        users={users} 
        onRegisterUser={handleRegisterUser} 
        customLogo={customLogo}
      />
    );
  }

  const isFullAccessUser = currentUser.role === 'admin' || currentUser.role === 'managing_director';

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col font-sans text-[#3E312C] relative" id="kitchen-app-container">
      
      {/* Dynamic Watermark background */}
      <div 
        className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.025] select-none z-0 overflow-hidden"
        id="system-brand-watermark"
      >
        {customLogo ? (
          <img 
            src={customLogo} 
            alt="System Watermark" 
            className="w-[450px] h-[450px] object-contain max-w-[80vw] max-h-[80vh]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="scale-[5] opacity-40">
            <MadigunLogo iconOnly size={100} />
          </div>
        )}
      </div>
      
      {/* Visual BOH Navigation bar */}
      <header className="bg-[#F4F2EB] border-b border-[#EBE6DD] shadow-xs shrink-0 select-none text-[#3E312C]" id="kitchen-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <MadigunLogo size={42} customLogo={customLogo} />
            </div>

            {/* Main Tabs */}
            <nav className="hidden md:flex space-x-1" id="desktop-nav-tabs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                  activeTab === 'dashboard' 
                    ? 'bg-[#3E312C] text-white shadow-xs' 
                    : 'text-[#8C7A6B] hover:bg-[#EBE6DD] hover:text-[#3E312C]'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                  activeTab === 'inventory' 
                    ? 'bg-[#3E312C] text-white shadow-xs' 
                    : 'text-[#8C7A6B] hover:bg-[#EBE6DD] hover:text-[#3E312C]'
                }`}
              >
                <Package className="h-4 w-4" />
                Inventory Tracker
              </button>

              <button
                onClick={() => setActiveTab('requisitions')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                  activeTab === 'requisitions' 
                    ? 'bg-[#3E312C] text-white shadow-xs' 
                    : 'text-[#8C7A6B] hover:bg-[#EBE6DD] hover:text-[#3E312C]'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                Purchase Requisitions
              </button>

              <button
                onClick={() => setActiveTab('food_requisitions')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                  activeTab === 'food_requisitions' 
                    ? 'bg-[#3E312C] text-white shadow-xs' 
                    : 'text-[#8C7A6B] hover:bg-[#EBE6DD] hover:text-[#3E312C]'
                }`}
              >
                <Utensils className="h-4 w-4" />
                Food Requisitions
              </button>

              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                  activeTab === 'withdrawals' 
                    ? 'bg-[#3E312C] text-white shadow-xs' 
                    : 'text-[#8C7A6B] hover:bg-[#EBE6DD] hover:text-[#3E312C]'
                }`}
              >
                <BedDouble className="h-4 w-4" />
                Withdrawal Slip
              </button>

              <button
                onClick={() => setActiveTab('damage_reports')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                  activeTab === 'damage_reports' 
                    ? 'bg-[#3E312C] text-white shadow-xs' 
                    : 'text-[#8C7A6B] hover:bg-[#EBE6DD] hover:text-[#3E312C]'
                }`}
              >
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                Damaged Items
              </button>

              {isFullAccessUser && (
                <button
                  onClick={() => setActiveTab('database')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                    activeTab === 'database' 
                      ? 'bg-[#3E312C] text-white shadow-xs' 
                      : 'text-[#8C7A6B] hover:bg-[#EBE6DD] hover:text-[#3E312C]'
                  }`}
                  id="database-desktop-tab"
                >
                  <Database className="h-4 w-4 text-amber-600" />
                  Database Settings
                </button>
              )}

              {isFullAccessUser && (
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                    activeTab === 'accounts' 
                      ? 'bg-[#3E312C] text-white shadow-xs' 
                      : 'text-[#8C7A6B] hover:bg-[#EBE6DD] hover:text-[#3E312C]'
                  }`}
                >
                  <UsersIcon className="h-4 w-4" />
                  Accounts
                </button>
              )}

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                    activeTab === 'logs' 
                      ? 'bg-[#3E312C] text-white shadow-xs' 
                      : 'text-[#8C7A6B] hover:bg-[#EBE6DD] hover:text-[#3E312C]'
                  }`}
                >
                  <History className="h-4 w-4" />
                  Audit Logs
                </button>
              )}
            </nav>

            {/* Profile / Logout Section */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-right">
                <div>
                  <p className="text-xs font-bold leading-tight text-[#3E312C]">{currentUser.name}</p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B] bg-[#EBE6DD] border border-[#DFD9D0] px-1.5 py-0.5 rounded-md">
                    {currentUser.role === 'admin' ? (
                      <>
                        <ShieldCheck className="h-2.5 w-2.5 text-amber-700" />
                        Property Custodian
                      </>
                    ) : currentUser.role === 'managing_director' ? (
                      <>
                        <ShieldCheck className="h-2.5 w-2.5 text-purple-700" />
                        Managing Director
                      </>
                    ) : (
                      <>
                        <UserIcon className="h-2.5 w-2.5 text-emerald-700" />
                        {currentUser.role.replace(/_/g, ' ')} (PR, Withdrawal & Damaged)
                      </>
                    )}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFD9D0] bg-[#EBE6DD] text-xs font-bold text-[#3E312C] hover:bg-[#DFD9D0] cursor-pointer transition-all shadow-2xs"
                title="Switch user account or sign out"
                id="signout-header-btn"
              >
                <LogOut className="h-4 w-4 text-[#8C7A6B]" />
                <span className="hidden sm:inline">Switch Account</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Sync / Cache Feedback Toast */}
      {syncFeedback && (
        <div className="bg-emerald-700 text-white text-xs font-semibold py-2 px-4 text-center shadow-md flex items-center justify-center gap-2 transition-all z-50">
          <Check className="h-4 w-4" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Mobile Sticky Tab switcher */}
      <div className="bg-[#F4F2EB] border-t border-[#EBE6DD] md:hidden flex items-center justify-between overflow-x-auto py-2.5 px-3 text-[#3E312C] select-none shrink-0 gap-3 no-scrollbar" id="mobile-tabs-bar">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'dashboard' ? 'bg-[#3E312C] text-white shadow-2xs' : 'text-[#8C7A6B] hover:bg-[#EBE6DD]'}`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('inventory')} 
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'inventory' ? 'bg-[#3E312C] text-white shadow-2xs' : 'text-[#8C7A6B] hover:bg-[#EBE6DD]'}`}
        >
          <Package className="h-4 w-4" />
          <span>Inventory</span>
        </button>
        <button 
          onClick={() => setActiveTab('requisitions')} 
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'requisitions' ? 'bg-[#3E312C] text-white shadow-2xs' : 'text-[#8C7A6B] hover:bg-[#EBE6DD]'}`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>PR Slip</span>
        </button>
        <button 
          onClick={() => setActiveTab('food_requisitions')} 
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'food_requisitions' ? 'bg-[#3E312C] text-white shadow-2xs' : 'text-[#8C7A6B] hover:bg-[#EBE6DD]'}`}
        >
          <Utensils className="h-4 w-4" />
          <span>Food PR</span>
        </button>
        <button 
          onClick={() => setActiveTab('withdrawals')} 
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'withdrawals' ? 'bg-[#3E312C] text-white shadow-2xs' : 'text-[#8C7A6B] hover:bg-[#EBE6DD]'}`}
        >
          <BedDouble className="h-4 w-4" />
          <span>Withdrawal</span>
        </button>
        <button 
          onClick={() => setActiveTab('damage_reports')} 
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'damage_reports' ? 'bg-[#3E312C] text-white shadow-2xs' : 'text-[#8C7A6B] hover:bg-[#EBE6DD]'}`}
        >
          <ShieldAlert className={`h-4 w-4 ${activeTab === 'damage_reports' ? 'text-rose-300' : 'text-rose-600'}`} />
          <span>Damaged</span>
        </button>
        {isFullAccessUser && (
          <button 
            onClick={() => setActiveTab('database')} 
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'database' ? 'bg-[#3E312C] text-white shadow-2xs' : 'text-[#8C7A6B] hover:bg-[#EBE6DD]'}`}
            id="database-mobile-tab"
          >
            <Database className={`h-4 w-4 ${activeTab === 'database' ? 'text-amber-300' : 'text-amber-600'}`} />
            <span>Database</span>
          </button>
        )}
        {isFullAccessUser && (
          <button 
            onClick={() => setActiveTab('accounts')} 
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'accounts' ? 'bg-[#3E312C] text-white shadow-2xs' : 'text-[#8C7A6B] hover:bg-[#EBE6DD]'}`}
          >
            <UsersIcon className="h-4 w-4" />
            <span>Accounts</span>
          </button>
        )}
        {currentUser.role === 'admin' && (
          <button 
            onClick={() => setActiveTab('logs')} 
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'logs' ? 'bg-[#3E312C] text-white shadow-2xs' : 'text-[#8C7A6B] hover:bg-[#EBE6DD]'}`}
          >
            <History className="h-4 w-4" />
            <span>Logs</span>
          </button>
        )}
      </div>

      {/* --- Main Contents Container --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto relative z-10" id="main-content-scroll">
        
        {activeTab === 'dashboard' && (
          <Dashboard
            inventory={inventory}
            requisitions={requisitions}
            logs={logs}
            currentUser={currentUser}
            onNavigate={(tab) => setActiveTab(tab)}
            onTriggerAutoRequisition={handleTriggerAutoRequisition}
            customLogo={customLogo}
            onUpdateLogo={handleUpdateLogo}
            withdrawals={withdrawals}
          />
        )}

        {activeTab === 'inventory' && (
          <Inventory
            inventory={inventory}
            currentUser={currentUser}
            onAddItem={handleAddInventoryItem}
            onUpdateStock={handleUpdateStock}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            categories={categories}
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
            rooms={rooms}
            onAddRoom={handleAddRoom}
            onUpdateRoom={handleUpdateRoom}
            onDeleteRoom={handleDeleteRoom}
            onAddDeployedItem={handleAddDeployedItem}
            onUpdateDeployedItem={handleUpdateDeployedItem}
            onRemoveDeployedItem={handleRemoveDeployedItem}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'requisitions' && (
          <Requisitions
            requisitions={requisitions}
            inventory={inventory}
            currentUser={currentUser}
            users={users}
            draftAutoItems={autoRequisitionDraft}
            onClearDraftAuto={handleClearDraftAuto}
            onCreateRequisition={handleCreateRequisition}
            onUpdateRequisition={handleUpdateRequisition}
            onUpdateStatus={handleUpdateRequisitionStatus}
            onCheckRequisition={handleCheckRequisition}
            onReverseStatus={handleReverseRequisitionStatus}
            onDeleteRequisition={handleDeleteRequisition}
            onRestoreRequisition={handleRestoreRequisition}
            onPurgeRequisition={handlePurgeRequisition}
          />
        )}

        {activeTab === 'food_requisitions' && (
          <FoodRequisitions
            currentUser={currentUser}
            foodRequisitions={foodRequisitions}
            onAddFoodRequisition={handleAddFoodRequisition}
            onUpdateStatus={handleUpdateFoodRequisitionStatus}
            onVerifyFoodRequisition={handleVerifyFoodRequisition}
            onDeleteFoodRequisition={handleDeleteFoodRequisition}
            onEditFoodRequisition={handleEditFoodRequisition}
          />
        )}

        {activeTab === 'withdrawals' && (
          <Withdrawals
            withdrawals={withdrawals}
            inventory={inventory}
            currentUser={currentUser}
            onCreateWithdrawal={handleCreateWithdrawal}
            onUpdateWithdrawalStatus={handleUpdateWithdrawalStatus}
            onDeleteWithdrawal={handleDeleteWithdrawal}
            onAddItem={handleAddInventoryItem}
            categories={categories}
          />
        )}

        {activeTab === 'damage_reports' && (
          <DamageReports
            reports={damageReports}
            inventory={inventory}
            rooms={rooms}
            currentUser={currentUser}
            users={users}
            onCreateReport={handleCreateDamageReport}
            onUpdateReportStatus={handleUpdateDamageReportStatus}
            onDeleteReport={handleDeleteDamageReport}
            onRequestReplacementPR={handleRequestReplacementPR}
          />
        )}

        {activeTab === 'database' && isFullAccessUser && (
          <DatabaseSettings
            currentUser={currentUser}
            users={users}
            inventory={inventory}
            requisitions={requisitions}
            foodRequisitions={foodRequisitions}
            withdrawals={withdrawals}
            rooms={rooms}
            damageReports={damageReports}
            logs={logs}
            categories={categories}
            customLogo={customLogo}
            onUpdateLogo={handleUpdateLogo}
            onUpdateCategories={handleUpdateCategories}
            onExportBackup={handleExportBackup}
            onRestoreBackupData={handleRestoreBackupData}
            onRestoreDefaultData={handleRestoreDefaultData}
            onClearCaches={clearCachesAndVerifyServerConnection}
            onNavigateToLogs={() => setActiveTab('logs')}
            onLogAudit={(action, details) => addLogEntry(action, details, currentUser)}
          />
        )}

        {activeTab === 'accounts' && (currentUser.role === 'admin' || currentUser.role === 'managing_director') && (
          <Users
            currentUser={currentUser}
            users={users}
            onDeleteUser={handleDeleteUser}
            onUpdateUser={handleUpdateUser}
            onAddUser={handleRegisterUser}
          />
        )}

        {activeTab === 'logs' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            {/* Database Backup & Restore Controls */}
            <div className="bg-white border border-[#E6E4DD] rounded-[32px] shadow-sm p-6" id="db-backup-restore-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EFE9] pb-4 mb-5">
                <div>
                  <h2 className="font-serif text-xl text-[#3E312C] flex items-center gap-2">
                    <Database className="h-5 w-5 text-[#8C7A6B]" />
                    Database Backup & Restore
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('database')}
                    className="flex items-center gap-1.5 bg-[#8C7355] hover:bg-[#745E44] text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-colors cursor-pointer shadow-2xs"
                    title="Open Database Settings & Recovery"
                  >
                    <Database className="h-3.5 w-3.5 text-amber-200" />
                    Database Settings
                  </button>
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Backup JSON
                  </button>
                  <label className="flex items-center gap-1.5 bg-[#FAF9F5] hover:bg-[#FAF9F5]/80 text-[#3E312C] border border-[#E6E4DD] text-xs font-semibold px-4 py-2.5 rounded-full transition-colors cursor-pointer shadow-2xs">
                    <Upload className="h-3.5 w-3.5" />
                    Upload Backup JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImportChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Status messaging / notifications */}
              {importError && (
                <div className="mb-4 bg-red-50 text-red-700 text-xs p-3 rounded-2xl border border-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {restoreSuccess && (
                <div className="mb-4 bg-green-50 text-green-700 text-xs p-3 rounded-2xl border border-green-200">
                  Database restored successfully.
                </div>
              )}

              {/* Active restore staging block */}
              {importedData && (
                <div className="bg-[#FAF9F5] border border-[#E6E4DD] p-5 rounded-2xl space-y-4" id="restore-staging-box">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-[#3E312C]">Imported Backup Detected</p>
                      <div className="text-xs text-[#8C7A6B] space-y-1 font-mono">
                        <div>Exported: {new Date(importedData.exportedAt || Date.now()).toLocaleString()} (v{importedData.version || '1.0.0'})</div>
                        <div>By: {importedData.exportedBy || 'Unknown User'}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-sans text-[11px] text-[#3E312C]">
                          <span className="bg-[#EBE6DD] px-2 py-1 rounded-md"><strong>Users:</strong> {importedData.users?.length || 0}</span>
                          <span className="bg-[#EBE6DD] px-2 py-1 rounded-md"><strong>Inventory:</strong> {importedData.inventory?.length || 0}</span>
                          <span className="bg-[#EBE6DD] px-2 py-1 rounded-md"><strong>Requisitions:</strong> {importedData.requisitions?.length || 0}</span>
                          <span className="bg-[#EBE6DD] px-2 py-1 rounded-md"><strong>Withdrawals:</strong> {importedData.withdrawals?.length || 0}</span>
                          <span className="bg-[#EBE6DD] px-2 py-1 rounded-md"><strong>Rooms:</strong> {importedData.rooms?.length || 0}</span>
                          <span className="bg-[#EBE6DD] px-2 py-1 rounded-md"><strong>Damage Reports:</strong> {importedData.damageReports?.length || 0}</span>
                          <span className="bg-[#EBE6DD] px-2 py-1 rounded-md"><strong>Audit Logs:</strong> {importedData.logs?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      disabled={isRestoring}
                      onClick={() => handleExecuteRestore('merge')}
                      className="flex-1 bg-[#8C7355] hover:bg-[#745E44] disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-3xs"
                    >
                      {isRestoring ? 'Restoring...' : 'Safely Merge (Add & Update Only)'}
                    </button>
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={() => setShowConfirmLogsOverwrite(true)}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-3xs"
                    >
                      {isRestoring ? 'Restoring...' : 'Delete All Data & Restore (Overwriting)'}
                    </button>
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={() => setImportedData(null)}
                      className="bg-transparent hover:bg-[#EBE6DD] border border-[#E6E4DD] text-[#8C7A6B] font-semibold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {showConfirmLogsOverwrite && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                      <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E6E4DD] shadow-2xl space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-rose-100 text-rose-800 rounded-2xl shrink-0">
                            <AlertTriangle className="h-6 w-6 text-rose-700" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-[#3E312C]">Confirm Full Database Overwrite</h3>
                            <p className="text-xs text-[#8C7A6B] mt-1 leading-relaxed">
                              WARNING: This will delete ALL current database records in Firestore and replace them with the backup data. Are you sure you want to proceed?
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EFE9]">
                          <button
                            type="button"
                            onClick={() => setShowConfirmLogsOverwrite(false)}
                            disabled={isRestoring}
                            className="px-4 py-2 text-xs font-semibold text-[#8C7A6B] hover:text-[#3E312C] rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteRestore('overwrite')}
                            disabled={isRestoring}
                            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
                          >
                            {isRestoring ? 'Overwriting...' : 'Yes, Delete & Overwrite'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Existing Audit Logs Trail */}
            <div className="bg-white border border-[#E6E4DD] rounded-[32px] shadow-sm overflow-hidden" id="full-logs-viewer">
            <div className="px-6 py-5 border-b border-[#F0EFE9] flex items-center justify-between bg-[#F9F9F7]">
              <div>
                <h2 className="font-serif text-xl text-[#5A5A40]">System Logs & BOH Audit Trail</h2>
              </div>
              <span className="bg-[#E6E4DD] text-[#5A5A40] text-xs font-bold font-mono px-3 py-1 rounded-full border border-[#D9D8D0]">
                Log Length: {logs.length}
              </span>
            </div>

            <div className="divide-y divide-[#F0EFE9] max-h-[600px] overflow-y-auto" id="logs-scroller">
              {logs.map((log) => {
                const isSystem = log.username === 'admin';
                return (
                  <div key={log.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#F9F9F7] transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-md border ${
                          log.action.includes('Approved') || log.action.includes('Received')
                            ? 'bg-[#EAF0E6] text-[#5A5A40] border-[#D4DFCE]'
                            : log.action.includes('Created') || log.action.includes('Restock')
                            ? 'bg-[#F2EDF6] text-[#6A46A6] border-[#E2D6EE]'
                            : log.action.includes('Deleted') || log.action.includes('Rejected')
                            ? 'bg-[#FDF2F0] text-[#A65D46] border-[#F2DED9]'
                            : 'bg-[#F5F5F0] text-[#8C7A6B] border-[#E6E4DD]'
                        }`}>
                          {log.action}
                        </span>
                        <p className="text-[#424235] font-semibold text-xs leading-relaxed">{log.details}</p>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[#8C7A6B]">
                        <span className="font-bold flex items-center gap-0.5">
                          <UserIcon className="h-3 w-3 inline text-[#8C7A6B] opacity-70" />
                          By: {log.username}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3 inline text-[#8C7A6B] opacity-70" />
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <div className="text-[10px] font-mono text-[#8C7A6B] bg-[#F9F9F7] px-2 py-0.5 rounded-sm border border-[#E6E4DD]">
                        EVENT_ID: {log.id}
                      </div>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-[#8C7A6B] hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                        title="Delete Log Entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        )}

      </main>
    </div>
  );
}
