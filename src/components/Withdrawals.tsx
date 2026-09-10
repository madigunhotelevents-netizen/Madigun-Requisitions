import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  ArrowRight, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  RefreshCw,
  Printer,
  Calendar,
  BedDouble,
  Shirt,
  CheckCircle2,
  FileText,
  Save,
  Send,
  Layers,
  UtensilsCrossed,
  Building,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Store,
  DollarSign,
  Lock,
  Monitor
} from 'lucide-react';
import { Withdrawal, InventoryItem, User as UserType, WithdrawalItem, WithdrawalStatus, InventorySection } from '../types';

interface WithdrawalsProps {
  withdrawals: Withdrawal[];
  inventory: InventoryItem[];
  currentUser: UserType;
  onCreateWithdrawal: (draft: Omit<Withdrawal, 'id' | 'withdrawalNumber' | 'createdBy' | 'createdAt'> & { status?: WithdrawalStatus }) => void;
  onUpdateWithdrawalStatus: (withdrawalId: string, newStatus: WithdrawalStatus) => void;
  onDeleteWithdrawal: (withdrawalId: string) => void;
  onAddItem?: (newItem: Omit<InventoryItem, 'id' | 'lastUpdated'>) => Promise<InventoryItem | null>;
  categories?: string[];
}

// Section metadata mapping
const SECTION_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  ALL: { label: 'All Inventory Tabs', icon: Layers },
  KITCHEN: { label: 'Kitchen Supplies', icon: UtensilsCrossed },
  ROOMS: { label: 'Rooms & Deployed Inventory', icon: Building },
  HOUSEKEEPING: { label: 'Housekeeping Supplies', icon: Sparkles },
  HOUSEKEEPING_EQUIPMENTS: { label: 'Housekeeping Equipments', icon: ShieldCheck },
  HR_EQUIPMENTS: { label: 'HR Equipments', icon: Briefcase },
  FO_EQUIPMENTS: { label: 'Front Office Equipments', icon: Store },
  FINANCE_EQUIPMENTS: { label: 'Finance Equipments', icon: DollarSign },
  SECURITY_POST_EQUIPMENTS: { label: 'Security Post Equipments', icon: Lock },
  IT_EQUIPMENTS: { label: 'I.T. Equipments', icon: Monitor },
  LINENS: { label: 'Linens & Towels', icon: Shirt },
  INDUSTRIAL_EQUIPMENTS: { label: 'Industrial Equipments', icon: Building },
  LUZON: { label: 'Luzon', icon: Layers },
  VISAYAS: { label: 'Visayas', icon: Layers },
  MINDANAO: { label: 'Old H.R Office', icon: Layers },
  OLD_HR_OFFICE: { label: 'Old H.R Office', icon: Layers }
};

export const getSectionLabel = (section?: string): string => {
  if (!section) return 'Kitchen Supplies';
  return SECTION_CONFIG[section]?.label || section;
};

export default function Withdrawals({
  withdrawals,
  inventory,
  currentUser,
  onCreateWithdrawal,
  onUpdateWithdrawalStatus,
  onDeleteWithdrawal,
  onAddItem,
  categories = []
}: WithdrawalsProps) {
  const isAdmin = currentUser.role === 'admin';

  // Toggle create form
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [withdrawalToDelete, setWithdrawalToDelete] = useState<Withdrawal | null>(null);

  // Source section / tab selector state
  const [selectedSourceTab, setSelectedSourceTab] = useState<string>('ALL');

  // Form states
  const [requestorName, setRequestorName] = useState(currentUser?.name || '');
  const [purpose, setPurpose] = useState('');
  const [draftItems, setDraftItems] = useState<WithdrawalItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedQty, setSelectedQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [warehouseName, setWarehouseName] = useState('Central Storage Warehouse');

  // Draft persistence states
  const WD_DRAFT_KEY = 'madigun_wd_creation_draft';
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Auto-restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WD_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.requestorName || parsed.purpose || parsed.notes || (parsed.draftItems && parsed.draftItems.length > 0)) {
          if (parsed.requestorName) setRequestorName(parsed.requestorName);
          if (parsed.purpose) setPurpose(parsed.purpose);
          if (parsed.warehouseName) setWarehouseName(parsed.warehouseName);
          if (parsed.selectedSourceTab) setSelectedSourceTab(parsed.selectedSourceTab);
          if (parsed.notes) setNotes(parsed.notes);
          if (parsed.draftItems) setDraftItems(parsed.draftItems);
          setIsDraftRestored(true);
        }
      }
    } catch (err) {
      console.error("Error loading WD draft from localStorage", err);
    }
  }, []);

  // Auto-save draft on form state changes so progress is never lost
  useEffect(() => {
    if (purpose.trim() || notes.trim() || draftItems.length > 0) {
      try {
        localStorage.setItem(WD_DRAFT_KEY, JSON.stringify({
          requestorName,
          purpose,
          warehouseName,
          selectedSourceTab,
          notes,
          draftItems,
          savedAt: new Date().toISOString()
        }));
      } catch (err) {
        console.error("Error saving WD draft to localStorage", err);
      }
    } else {
      localStorage.removeItem(WD_DRAFT_KEY);
    }
  }, [requestorName, purpose, warehouseName, selectedSourceTab, notes, draftItems]);

  const handleClearLocalDraft = () => {
    setRequestorName(currentUser?.name || '');
    setPurpose('');
    setWarehouseName('Central Storage Warehouse');
    setDraftItems([]);
    setNotes('');
    localStorage.removeItem(WD_DRAFT_KEY);
    setIsDraftRestored(false);
  };

  const handleSaveAsSystemDraft = () => {
    setFormError(null);
    if (draftItems.length === 0 && !purpose.trim()) {
      setFormError("Please add at least one stock item or purpose to save as draft.");
      return;
    }

    onCreateWithdrawal({
      purpose: purpose.trim() || 'Untitled Withdrawal Draft',
      items: draftItems,
      notes: notes.trim() || undefined,
      createdByName: requestorName.trim() || currentUser?.name || 'Staff',
      warehouseName: warehouseName.trim() || 'Central Storage Warehouse',
      status: 'draft'
    });

    handleClearLocalDraft();
    setIsCreating(false);
  };

  // Quick-Add registration states
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSection, setNewItemSection] = useState<InventorySection>('HOUSEKEEPING');
  const [newItemCategory, setNewItemCategory] = useState('Other');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemStock, setNewItemStock] = useState('50');
  const [newItemCost, setNewItemCost] = useState('0');
  const [newItemMinStock, setNewItemMinStock] = useState('10');
  const [newItemSupplier, setNewItemSupplier] = useState('Central Warehouse');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [isSubmittingNewItem, setIsSubmittingNewItem] = useState(false);

  // Filter items available for withdrawal based on selectedSourceTab
  const availableTabItems = useMemo(() => {
    if (selectedSourceTab === 'ALL') return inventory;
    return inventory.filter(item => (item.section || 'KITCHEN') === selectedSourceTab);
  }, [inventory, selectedSourceTab]);

  const filteredPickerItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return availableTabItems;
    return availableTabItems.filter(item =>
      item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
  }, [itemSearchQuery, availableTabItems]);

  const currentSelectedProduct = useMemo(() => {
    return availableTabItems.find(item => item.id === selectedItemId);
  }, [selectedItemId, availableTabItems]);

  // Handle source tab switch
  const handleTabChange = (tabId: string) => {
    setSelectedSourceTab(tabId);
    setSelectedItemId('');
    setItemSearchQuery('');
    if (tabId !== 'ALL') {
      setWarehouseName(getSectionLabel(tabId));
    }
  };

  const handleSearchChange = (query: string) => {
    setItemSearchQuery(query);
    if (query.trim()) {
      const matched = availableTabItems.find(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
      );
      if (matched) {
        setSelectedItemId(matched.id);
      } else {
        setSelectedItemId('');
      }
    } else {
      setSelectedItemId('');
    }
  };

  const handleSelectChange = (id: string) => {
    setSelectedItemId(id);
    const found = availableTabItems.find(item => item.id === id);
    if (found) {
      setItemSearchQuery(found.name);
    } else {
      setItemSearchQuery('');
    }
  };

  const handleAddItemToDraft = () => {
    if (!selectedItemId || !currentSelectedProduct) return;
    const qty = parseFloat(selectedQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    // Check if item is already in draft
    const existingIndex = draftItems.findIndex(i => i.itemId === selectedItemId);
    if (existingIndex > -1) {
      const updated = [...draftItems];
      updated[existingIndex].quantity += qty;
      setDraftItems(updated);
    } else {
      setDraftItems([...draftItems, {
        itemId: selectedItemId,
        itemName: currentSelectedProduct.name,
        quantity: qty,
        unit: currentSelectedProduct.unit
      }]);
    }

    // Reset picker
    setSelectedItemId('');
    setSelectedQty('1');
    setItemSearchQuery('');
  };

  const handleRemoveFromDraft = (index: number) => {
    setDraftItems(draftItems.filter((_, i) => i !== index));
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAddError(null);
    if (!newItemName.trim()) {
      setQuickAddError("Please specify a product name.");
      return;
    }
    if (!onAddItem) {
      setQuickAddError("Item registration is currently unavailable.");
      return;
    }

    setIsSubmittingNewItem(true);
    try {
      const added = await onAddItem({
        name: newItemName.trim(),
        section: newItemSection,
        category: newItemCategory,
        unit: newItemUnit.trim() || 'pcs',
        currentStock: parseFloat(newItemStock) || 0,
        minStock: parseFloat(newItemMinStock) || 0,
        unitCost: parseFloat(newItemCost) || 0,
        supplier: newItemSupplier.trim() || 'Central Warehouse'
      });

      if (added) {
        // Automatically select the registered item
        setSelectedSourceTab(newItemSection);
        setSelectedItemId(added.id);
        setItemSearchQuery(added.name);
        
        // Reset form
        setNewItemName('');
        setNewItemUnit('pcs');
        setNewItemStock('50');
        setNewItemCost('0');
        setNewItemMinStock('10');
        setNewItemSupplier('Central Warehouse');
        setIsAddingNewItem(false);
      } else {
        setQuickAddError("Failed to register the supply.");
      }
    } catch (err) {
      console.error(err);
      setQuickAddError("An error occurred during item registration.");
    } finally {
      setIsSubmittingNewItem(false);
    }
  };

  const handleSubmitWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!requestorName.trim()) {
      setFormError("Please enter the name of the requestor.");
      return;
    }

    if (!purpose.trim()) {
      setFormError("Please state a clear purpose for the withdrawal request.");
      return;
    }

    if (draftItems.length === 0) {
      setFormError("Please add at least one stock item to your request.");
      return;
    }

    onCreateWithdrawal({
      purpose: purpose.trim(),
      items: draftItems,
      notes: notes.trim() || undefined,
      createdByName: requestorName.trim(),
      warehouseName: warehouseName.trim() || 'Central Storage Warehouse',
      status: 'completed'
    });

    // Reset Form & Clear Local Draft Storage
    handleClearLocalDraft();
    setIsCreating(false);
  };

  // Print PDF Withdrawal Slip
  const handlePrintWithdrawal = (wd: Withdrawal) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [62, 49, 44]; // #3E312C
      const secondaryColor = [140, 122, 107]; // #8C7A6B

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("MADIGUN HOTEL AND EVENTS", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("PROPERTY & INVENTORY OPERATIONS • WITHDRAWAL CONTROL", 15, 25);

      // Line under header
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      // Title & WD Number
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("WITHDRAWAL SLIP", 15, 37);

      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.text(wd.withdrawalNumber, 195, 37, { align: 'right' });

      // Metadata Grid
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

      doc.text("Date Requested:", 15, 46);
      doc.text("Request Status:", 125, 46);
      doc.text("Requested By:", 15, 52);
      doc.text("Source Tab / Location:", 125, 52);
      doc.text("Purpose / Remarks:", 15, 58);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);

      const dateStr = new Date(wd.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(dateStr, 55, 46);

      doc.setFont("helvetica", "bold");
      const statusText = wd.status.toUpperCase();
      if (statusText === 'COMPLETED') {
        doc.setTextColor(16, 124, 65); // Green
      } else if (statusText === 'PENDING') {
        doc.setTextColor(180, 110, 20); // Orange
      } else {
        doc.setTextColor(190, 30, 30); // Red
      }
      doc.text(statusText, 160, 46);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const truncatedCreatedByName = wd.createdByName.length > 40 ? wd.createdByName.substring(0, 37) + "..." : wd.createdByName;
      doc.text(truncatedCreatedByName, 55, 52);

      const warehouseLabel = wd.warehouseName || "Central Storage Warehouse";
      const truncatedWarehouse = warehouseLabel.length > 35 ? warehouseLabel.substring(0, 32) + "..." : warehouseLabel;
      doc.text(truncatedWarehouse, 160, 52);

      const splitPurpose = doc.splitTextToSize(wd.purpose || "Inventory disbursement", 135);
      doc.text(splitPurpose, 55, 58);

      const tableStartY = 58 + (splitPurpose.length * 4.5) + 4;

      // Table body
      const tableBody = wd.items.map((item, idx) => {
        const liveItem = inventory.find(i => i.id === item.itemId);
        const sectionLabel = getSectionLabel(liveItem?.section);
        return [
          (idx + 1).toString(),
          item.itemName,
          sectionLabel,
          `${item.quantity} ${item.unit}`,
          wd.status === 'completed' ? 'DISBURSED' : 'PENDING'
        ];
      });

      autoTable(doc, {
        startY: tableStartY,
        margin: { left: 15, right: 15 },
        head: [['#', 'Item Name', 'Inventory Section Tab', 'Requested Qty', 'Status']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [62, 49, 44],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 65 },
          2: { cellWidth: 45 },
          3: { cellWidth: 33, halign: 'right' },
          4: { cellWidth: 25, halign: 'center' }
        }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY > 250) {
        doc.addPage();
        finalY = 35;
      }

      // Signature blocks
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.25);

      // Requestor Signature Line
      doc.line(20, finalY + 4, 70, finalY + 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(truncatedCreatedByName, 45, finalY + 3, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("REQUESTED BY STAFF SIGN", 45, finalY + 7, { align: 'center' });

      // Admin Signature Line
      doc.line(140, finalY + 4, 190, finalY + 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(currentUser.name, 165, finalY + 3, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("PROPERTY CUSTODIAN / INCHARGE", 165, finalY + 7, { align: 'center' });

      doc.save(`Withdrawal_Slip_${wd.withdrawalNumber}.pdf`);
    } catch (err) {
      console.error("PDF Withdrawal Slip error:", err);
      window.print();
    }
  };

  const getStatusColor = (status: WithdrawalStatus) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'approved': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6" id="withdrawals-tab-panel">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#FAF9F5] pb-5" id="withdrawals-welcome-header">
        <div>
          <h2 className="font-serif text-3xl font-bold text-[#3E312C] leading-tight flex items-center gap-2">
            <BedDouble className="h-8 w-8 text-[#8C7A6B]" />
            Withdrawal Slip
          </h2>
        </div>

        <div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-5 py-3.5 rounded-full transition-all shadow-xs cursor-pointer"
            id="draft-withdrawal-btn"
          >
            <Plus className="h-4 w-4 text-white" />
            <span className="text-white">{isCreating ? 'View Withdrawal Slips Log' : 'Request Withdrawal Slip'}</span>
          </button>
        </div>
      </div>

      {isCreating ? (
        <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-sm" id="withdrawal-form-container">
          <div className="border-b border-[#F0EFE9] pb-3 mb-5 flex items-center justify-between">
            <h3 className="font-serif text-xl text-[#3E312C]">Draft New Withdrawal Slip</h3>
            <span className="text-[10px] font-mono font-bold bg-[#FAF9F5] border border-[#EBE6DD] px-3 py-1 rounded-full text-[#8C7A6B] uppercase">
              Connected to All Inventory Tabs
            </span>
          </div>

          <form onSubmit={handleSubmitWithdrawal} className="space-y-6">
            
            {isDraftRestored && (
              <div className="bg-[#FAF9F5] border border-[#FFE8A3] text-[#3E312C] text-xs p-3.5 rounded-2xl flex items-center justify-between gap-3 font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#9E6900] shrink-0" />
                  <span><strong>Progress Restored:</strong> Your un-submitted withdrawal slip draft was auto-recovered from browser memory.</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearLocalDraft}
                  className="text-xs font-bold text-[#A65D46] hover:underline shrink-0 cursor-pointer"
                >
                  Clear Draft & Reset
                </button>
              </div>
            )}
            
            {/* SOURCE TAB SELECTOR BAR */}
            <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-3" id="wd-source-tab-selector">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#3E312C] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#8C7A6B]" />
                  1. Choose Source Inventory Tab / Department (Where item is coming from)
                </label>
                <span className="text-[10px] font-mono text-[#8C7A6B]">
                  Filtering {availableTabItems.length} items in selected tab
                </span>
              </div>

              {/* Responsive Tabs Grid */}
              <div className="hidden md:flex flex-wrap gap-1.5">
                {Object.entries(SECTION_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const isSelected = selectedSourceTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTabChange(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#3E312C] text-white shadow-xs' 
                          : 'bg-white border border-[#E6E4DD] text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Fallback Select Dropdown */}
              <div className="block md:hidden">
                <select
                  value={selectedSourceTab}
                  onChange={(e) => handleTabChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-xs font-bold bg-white text-[#3E312C]"
                >
                  {Object.entries(SECTION_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* REQUEST METADATA INPUTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="wd-requestor" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Name of Requestor *</label>
                <input
                  id="wd-requestor"
                  type="text"
                  required
                  value={requestorName}
                  onChange={(e) => setRequestorName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white font-medium"
                  placeholder="e.g. Elena Smith, John Doe"
                />
              </div>

              <div>
                <label htmlFor="wd-purpose" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Purpose / Area / Room No. *</label>
                <input
                  id="wd-purpose"
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white"
                  placeholder="e.g. Restock Room 101, IT Department setup"
                />
              </div>

              <div>
                <label htmlFor="wd-warehouse" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Source Warehouse / Location</label>
                <input
                  id="wd-warehouse"
                  type="text"
                  required
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white font-medium"
                  placeholder="e.g. Central Warehouse, North Storage"
                />
              </div>
            </div>

            {/* ITEM SELECTION BLOCK */}
            <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-3" id="wd-item-picker">
              <h4 className="text-xs font-bold text-[#3E312C] uppercase tracking-wider flex items-center gap-1.5">
                <Shirt className="h-4 w-4 text-[#8C7A6B]" />
                2. Select Item from Selected Tab
              </h4>

              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 min-w-[200px] space-y-2.5">
                  <div>
                    <label htmlFor="wd-search-input" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Search Item Name in Tab</label>
                    <input
                      id="wd-search-input"
                      type="text"
                      value={itemSearchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C]"
                      placeholder={`Search items in ${SECTION_CONFIG[selectedSourceTab]?.label}...`}
                    />
                  </div>

                  <div>
                    <label htmlFor="wd-picker-item" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Or select from list ({filteredPickerItems.length} available)</label>
                    <select
                      id="wd-picker-item"
                      value={selectedItemId}
                      onChange={(e) => handleSelectChange(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C]"
                    >
                      <option value="">-- Choose an item --</option>
                      {filteredPickerItems.map(item => (
                        <option key={item.id} value={item.id}>
                          [{getSectionLabel(item.section)}] {item.name} ({item.currentStock} {item.unit} in stock)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedItemId && currentSelectedProduct && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Selected: <strong>{currentSelectedProduct.name}</strong> ({currentSelectedProduct.currentStock} {currentSelectedProduct.unit} available in {getSectionLabel(currentSelectedProduct.section)})</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAddingNewItem(!isAddingNewItem)}
                    className="text-[10px] text-[#8C7355] hover:text-[#745E44] font-bold mt-1 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    {isAddingNewItem ? 'Close Registration Form' : "Can't find your item? Register New Item"}
                  </button>
                </div>

                <div className="w-full sm:w-28">
                  <label htmlFor="wd-picker-qty" className="block text-[10px] font-mono text-[#8C7A6B] uppercase">Quantity</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="wd-picker-qty"
                      type="number"
                      step="any"
                      min="0.1"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(e.target.value)}
                      className="block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-mono font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C]"
                    />
                    <span className="text-xs text-[#8C7A6B] font-mono">
                      {currentSelectedProduct ? currentSelectedProduct.unit : ''}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItemToDraft}
                  disabled={!selectedItemId}
                  className={`px-5 py-2 border rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    selectedItemId 
                      ? 'bg-[#3E312C] text-white border-[#3E312C] hover:bg-[#2C211F]' 
                      : 'bg-[#FAF9F5] text-[#8C7A6B]/50 border-[#EBE6DD] cursor-not-allowed'
                  }`}
                >
                  Add Item
                </button>
              </div>
            </div>

            {/* QUICK-ADD ITEM FORM */}
            {isAddingNewItem && (
              <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-4 animate-in fade-in duration-200" id="wd-item-quick-add-form">
                <div className="border-b border-[#EBE6DD] pb-2 flex items-center justify-between">
                  <h5 className="text-xs font-bold text-[#3E312C] uppercase tracking-wider">Register New Item across any Inventory Tab</h5>
                  <span className="text-[9px] font-mono bg-[#3E312C] text-white px-2 py-0.5 rounded-full font-bold">New Stock Item</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase">Product Name</label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-lg text-[#3E312C] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#3E312C]"
                      placeholder="e.g. Wi-Fi Router, Executive Pen, Soap..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase">Inventory Tab / Section</label>
                    <select
                      value={newItemSection}
                      onChange={(e) => setNewItemSection(e.target.value as InventorySection)}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-lg text-[#3E312C] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#3E312C] font-semibold"
                    >
                      {Object.entries(SECTION_CONFIG).filter(([k]) => k !== 'ALL').map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-lg text-[#3E312C] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#3E312C]"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase">Measurement Unit</label>
                    <input
                      type="text"
                      required
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-lg text-[#3E312C] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#3E312C]"
                      placeholder="e.g. pcs, unit, box"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase">Initial Stock</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newItemStock}
                      onChange={(e) => setNewItemStock(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-lg text-[#3E312C] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#3E312C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase">Unit Cost (₱)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={newItemCost}
                      onChange={(e) => setNewItemCost(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-lg text-[#3E312C] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#3E312C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase">Supplier / Vendor</label>
                    <input
                      type="text"
                      value={newItemSupplier}
                      onChange={(e) => setNewItemSupplier(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-lg text-[#3E312C] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#3E312C]"
                    />
                  </div>
                </div>

                {quickAddError && (
                  <p className="text-xs text-rose-600 font-semibold">{quickAddError}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleQuickAddSubmit}
                    disabled={isSubmittingNewItem}
                    className="bg-[#3E312C] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#2C211F] cursor-pointer"
                  >
                    {isSubmittingNewItem ? 'Registering...' : 'Save & Select Item'}
                  </button>
                </div>
              </div>
            )}

            {/* DRAFT ITEMS TABLE */}
            <div className="bg-white border border-[#EBE6DD] rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-[#FAF9F5] border-b border-[#EBE6DD]">
                <h4 className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Items listed in this withdrawal slip</h4>
              </div>
              {draftItems.length > 0 ? (
                <table className="min-w-full divide-y divide-[#EBE6DD] text-xs">
                  <thead className="bg-[#FAF9F5]/40 text-[#8C7A6B] uppercase font-mono text-[9px] font-bold">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left">Item Name</th>
                      <th scope="col" className="px-4 py-2.5 text-left">Tab / Section</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Requested Qty</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Live Stock Level</th>
                      <th scope="col" className="px-4 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFE9] text-[#3E312C]">
                    {draftItems.map((item, idx) => {
                      const liveItem = inventory.find(i => i.id === item.itemId);
                      const isLowStock = liveItem ? liveItem.currentStock < item.quantity : false;
                      const sectionLabel = getSectionLabel(liveItem?.section);
                      return (
                        <tr key={item.itemId} className="hover:bg-[#FAF9F5]/30">
                          <td className="px-4 py-3 font-semibold">{item.itemName}</td>
                          <td className="px-4 py-3">
                            <span className="bg-[#FAF9F5] border border-[#EBE6DD] text-[#8C7A6B] px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {sectionLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-3 text-right font-mono">
                            {liveItem ? (
                              <span className={isLowStock ? "text-rose-600 font-bold" : "text-[#8C7A6B]"}>
                                {liveItem.currentStock} {liveItem.unit}
                                {isLowStock && " (Insufficent)"}
                              </span>
                            ) : 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromDraft(idx)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded-full cursor-pointer hover:bg-rose-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-8 text-center text-[#8C7A6B] italic text-xs">
                  No items added yet. Choose an inventory tab above and select items to disburse.
                </div>
              )}
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-rose-700 rounded-xl text-xs font-semibold">
                <AlertCircle className="h-4 w-4" />
                {formError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  handleClearLocalDraft();
                  setIsCreating(false);
                }}
                className="bg-white border border-[#EBE6DD] hover:bg-[#FAF9F5] text-[#3E312C] font-semibold text-xs px-5 py-3 rounded-full transition-colors cursor-pointer"
              >
                Discard / Clear
              </button>
              <button
                type="button"
                onClick={handleSaveAsSystemDraft}
                className="bg-[#FAF9F5] hover:bg-[#F0EFE9] text-[#3E312C] border border-[#EBE6DD] font-bold text-xs px-5 py-3 rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5 text-[#8C7A6B]" />
                Save as Draft
              </button>
              <button
                type="submit"
                className="bg-[#3E312C] hover:bg-[#2C211F] text-white font-bold text-xs px-6 py-3 rounded-full transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Submit & Disburse Stocks
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* List active and previous withdrawal slips */
        <div className="bg-white border border-[#E6E4DD] rounded-[32px] overflow-hidden shadow-sm" id="withdrawals-list">
          <div className="p-5 border-b border-[#F0EFE9] bg-[#FAF9F5] flex justify-between items-center">
            <h3 className="font-serif text-lg text-[#3E312C] font-bold">Withdrawal Slips Log</h3>
            <span className="text-xs text-[#8C7A6B] font-mono">Total Logged: {withdrawals.length}</span>
          </div>

          <div className="divide-y divide-[#F0EFE9]" id="withdrawals-records-container">
            {withdrawals.length > 0 ? (
              withdrawals.map((wd) => {
                const isExpanded = expandedId === wd.id;
                return (
                  <div key={wd.id} className="p-4 sm:p-5 hover:bg-[#FAF9F5]/10 transition-colors">
                    {/* Collapsed Header Summary */}
                    <div 
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none"
                      onClick={() => setExpandedId(isExpanded ? null : wd.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#3E312C]">{wd.withdrawalNumber}</span>
                          <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-full uppercase tracking-wider ${getStatusColor(wd.status)}`}>
                            {wd.status}
                          </span>
                        </div>
                        <p className="text-[#3E312C] text-sm font-semibold">{wd.purpose}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#8C7A6B]">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-[#8C7A6B]/70" />
                            By: {wd.createdByName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-[#8C7A6B]/70" />
                            {new Date(wd.createdAt).toLocaleDateString()}
                          </span>
                          <span className="bg-[#FAF9F5] border border-[#EBE6DD] px-2 py-0.5 rounded-sm font-mono text-[10px] font-bold">
                            {wd.items.length} items
                          </span>
                          <span className="bg-[#3E312C]/5 border border-[#3E312C]/10 text-[#3E312C] px-2 py-0.5 rounded-sm font-semibold text-[10px]">
                            {wd.warehouseName || 'Central Storage'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintWithdrawal(wd);
                          }}
                          className="p-2 border border-[#E6E4DD] rounded-full hover:bg-white text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer transition-colors"
                          title="Print Withdrawal Slip"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-[#8C7A6B]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#8C7A6B]" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail view */}
                    {isExpanded && (
                      <div className="mt-5 pt-4 border-t border-[#F0EFE9] space-y-4 animate-in slide-in-from-top-2 duration-150">
                        {/* Items listed */}
                        <div className="border border-[#EBE6DD] rounded-xl overflow-hidden bg-white">
                          <table className="min-w-full divide-y divide-[#F0EFE9] text-xs">
                            <thead className="bg-[#FAF9F5] text-[#8C7A6B] font-mono text-[9px] font-bold uppercase">
                              <tr>
                                <th scope="col" className="px-4 py-2 text-left">Stock Item Name</th>
                                <th scope="col" className="px-4 py-2 text-left">Inventory Tab</th>
                                <th scope="col" className="px-4 py-2 text-right">Withdrawing Quantity</th>
                                <th scope="col" className="px-4 py-2 text-right">Current Stock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#FAF9F5] text-[#3E312C]">
                              {wd.items.map((item) => {
                                const liveItem = inventory.find(i => i.id === item.itemId);
                                return (
                                  <tr key={item.itemId}>
                                    <td className="px-4 py-2.5 font-medium">{item.itemName}</td>
                                    <td className="px-4 py-2.5 text-[#8C7A6B] text-[11px] font-semibold">
                                      {getSectionLabel(liveItem?.section)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-[#3E312C]">
                                      {item.quantity} {item.unit}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-[#8C7A6B]">
                                      {liveItem ? `${liveItem.currentStock} ${liveItem.unit}` : 'N/A'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {wd.notes && (
                          <div className="text-xs bg-[#FAF9F5] border border-[#EBE6DD] p-3 rounded-xl text-[#3E312C]">
                            <span className="font-bold">Staff Instruction / Note: </span>
                            {wd.notes}
                          </div>
                        )}

                        {/* Audit Trail Details */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#8C7A6B]">
                          <span>Source Location: <strong className="text-[#3E312C]">{wd.warehouseName || 'Central Storage Warehouse'}</strong></span>
                          {wd.createdByName && (
                            <span>Requestor Name: <strong className="text-[#3E312C]">{wd.createdByName}</strong></span>
                          )}
                          {wd.completedByName && (
                            <span>Disbursed by: <strong className="text-[#3E312C]">{wd.completedByName}</strong> ({new Date(wd.completedAt!).toLocaleDateString()})</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                          {wd.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => onUpdateWithdrawalStatus(wd.id, 'completed')}
                              className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-bold text-xs px-5 py-2 rounded-full cursor-pointer shadow-2xs transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Fulfill & Disburse Stocks
                            </button>
                          )}
                          <button
                            onClick={() => setWithdrawalToDelete(wd)}
                            className="flex items-center gap-1.5 bg-white hover:bg-rose-50 border border-[#E6E4DD] text-[#8C7A6B] hover:text-red-700 font-semibold text-xs px-4 py-2 rounded-full cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Slip
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center text-[#8C7A6B]">
                <ClipboardList className="h-12 w-12 mx-auto text-[#D1C4B5] mb-3" />
                <h4 className="font-serif text-lg font-bold text-[#3E312C]">No Active Withdrawal Slips</h4>
                <p className="text-xs text-[#8C7A6B] max-w-sm mx-auto mt-1">Staff can click "Request Withdrawal Slip" in the top right to draft a new disburse slip.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {withdrawalToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-md w-full p-6 shadow-lg relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-serif text-lg text-[#3E312C] font-bold mb-2">Delete Withdrawal Slip?</h3>
            <p className="text-xs text-[#8C7A6B] mb-5">
              This action will remove the withdrawal slip <strong className="text-[#3E312C] font-mono">{withdrawalToDelete.withdrawalNumber}</strong> from active records. This operation is permanent.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setWithdrawalToDelete(null)}
                className="bg-white border border-[#EBE6DD] hover:bg-[#FAF9F5] text-[#3E312C] font-semibold text-xs px-5 py-2.5 rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteWithdrawal(withdrawalToDelete.id);
                  setWithdrawalToDelete(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-5 py-2.5 rounded-full cursor-pointer shadow-xs"
              >
                Delete Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
