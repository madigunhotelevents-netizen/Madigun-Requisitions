import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PackagePlus,
  Plus,
  Trash2,
  Search,
  Printer,
  Eye,
  CheckCircle2,
  Building,
  User,
  Calendar,
  Layers,
  Tag,
  FileText,
  Clock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  X,
  Share2,
  ChevronRight,
  Filter,
  Package
} from 'lucide-react';
import {
  EquipmentIssuance,
  EquipmentIssuanceItem,
  InventoryItem,
  InventorySection,
  User as UserType
} from '../types';
import { ACTIVE_INVENTORY_TABS, getSectionName } from './Inventory';

interface EquipmentIssuanceProps {
  issuances: EquipmentIssuance[];
  inventory: InventoryItem[];
  users: UserType[];
  currentUser: UserType;
  categories?: string[];
  onCreateIssuance: (
    issuanceData: Omit<EquipmentIssuance, 'id' | 'createdAt'>
  ) => Promise<void>;
  onDeleteIssuance?: (issuanceId: string) => Promise<void>;
  onUpdateIssuanceStatus?: (
    issuanceId: string,
    newStatus: EquipmentIssuance['status'],
    remarks?: string
  ) => Promise<void>;
  customLogo?: string | null;
}

const generateAutoTag = (section: InventorySection, index: number = 0): string => {
  const sectionPrefixMap: Record<string, string> = {
    IT_EQUIPMENTS: 'IT',
    HOUSEKEEPING_EQUIPMENTS: 'HK',
    SECURITY_EQUIPMENTS: 'SEC',
    FRONT_DESK_EQUIPMENTS: 'FD',
    MAINTENANCE_EQUIPMENTS: 'MNT',
    KITCHEN_EQUIPMENTS: 'KIT',
    KITCHEN: 'KIT',
    ROOMS: 'RM',
    LINENS: 'LIN',
    BEVERAGES: 'BAR',
    ENGINEERING: 'ENG'
  };
  const code = sectionPrefixMap[section] || 'EQ';
  const year = new Date().getFullYear();
  const timeSuffix = Date.now().toString().slice(-4);
  const rand = Math.floor(100 + Math.random() * 900);
  return `TAG-${code}-${year}-${timeSuffix}${rand + index}`;
};

const STANDARD_CONDITIONS: Array<EquipmentIssuanceItem['condition']> = [
  'Brand New',
  'Good / Operational',
  'Refurbished',
  'Fair'
];

export default function EquipmentIssuanceComponent({
  issuances = [],
  inventory = [],
  users = [],
  currentUser,
  categories = [],
  onCreateIssuance,
  onDeleteIssuance,
  onUpdateIssuanceStatus
}: EquipmentIssuanceProps) {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'managing_director';

  // Modal and views state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIssuance, setSelectedIssuance] = useState<EquipmentIssuance | null>(null);
  const [issuanceToDelete, setIssuanceToDelete] = useState<EquipmentIssuance | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Form states
  const [recipientName, setRecipientName] = useState('');
  const [recipientPosition, setRecipientPosition] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [targetSection, setTargetSection] = useState<InventorySection>('IT_EQUIPMENTS');
  const [purpose, setPurpose] = useState('');
  const [remarks, setRemarks] = useState('');

  // Draft Items inside Form
  const [items, setItems] = useState<Array<Omit<EquipmentIssuanceItem, 'id' | 'totalCost'> & { tempId: string }>>([
    {
      tempId: 'row-1',
      name: '',
      category: 'Equipment',
      quantity: 1,
      unit: 'pcs',
      unitCost: 0,
      serialNumber: generateAutoTag('IT_EQUIPMENTS', 0),
      propertyCode: '',
      brandModel: '',
      condition: 'Brand New',
      specifications: ''
    }
  ]);

  // Generate next voucher number
  const nextIssuanceNumber = useMemo(() => {
    const today = new Date();
    const dateCode = today.toISOString().slice(0, 10).replace(/-/g, '');
    const currentDayIssuances = issuances.filter(i =>
      i.issuanceNumber && i.issuanceNumber.startsWith(`EIR-${dateCode}`)
    );
    const seq = String(currentDayIssuances.length + 1).padStart(3, '0');
    return `EIR-${dateCode}-${seq}`;
  }, [issuances]);

  // Items existing in the currently selected target department inventory (for autocomplete/quick-selection)
  const targetDepartmentItems = useMemo(() => {
    return inventory.filter(item => (item.section || 'KITCHEN') === targetSection);
  }, [inventory, targetSection]);

  // Reset form
  const resetForm = () => {
    setRecipientName('');
    setRecipientPosition('');
    setRecipientContact('');
    setTargetSection('IT_EQUIPMENTS');
    setPurpose('');
    setRemarks('');
    setItems([
      {
        tempId: `row-${Date.now()}`,
        name: '',
        category: 'Equipment',
        quantity: 1,
        unit: 'pcs',
        unitCost: 0,
        serialNumber: generateAutoTag('IT_EQUIPMENTS', 0),
        propertyCode: '',
        brandModel: '',
        condition: 'Brand New',
        specifications: ''
      }
    ]);
    setFormError(null);
  };

  // Section Change Handler - updates auto-generated tags if they haven't been manually overwritten
  const handleSectionChange = (newSection: InventorySection) => {
    setTargetSection(newSection);
    setItems(prev =>
      prev.map((item, idx) => {
        if (!item.serialNumber || item.serialNumber.startsWith('TAG-')) {
          return {
            ...item,
            serialNumber: generateAutoTag(newSection, idx)
          };
        }
        return item;
      })
    );
  };

  // Add Item Row
  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        tempId: `row-${Date.now()}-${Math.random()}`,
        name: '',
        category: categories[0] || 'Equipment',
        quantity: 1,
        unit: 'pcs',
        unitCost: 0,
        serialNumber: generateAutoTag(targetSection, prev.length),
        propertyCode: '',
        brandModel: '',
        condition: 'Brand New',
        specifications: ''
      }
    ]);
  };

  // Remove Item Row
  const handleRemoveItemRow = (tempId: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  // Update Item Row
  const handleUpdateItemRow = (
    tempId: string,
    field: keyof Omit<EquipmentIssuanceItem, 'id' | 'totalCost'>,
    value: any
  ) => {
    setItems(prev =>
      prev.map(row => {
        if (row.tempId === tempId) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  // Quick select an existing inventory item into a row
  const handleSelectExistingItem = (tempId: string, inventoryItemId: string) => {
    const existing = inventory.find(i => i.id === inventoryItemId);
    if (!existing) return;
    setItems(prev =>
      prev.map(row => {
        if (row.tempId === tempId) {
          return {
            ...row,
            name: existing.name,
            category: existing.category || row.category,
            unit: existing.unit || row.unit,
            unitCost: existing.unitCost || row.unitCost,
            existingInventoryId: existing.id
          };
        }
        return row;
      })
    );
  };

  // Calculate Form Grand Total
  const calculatedGrandTotal = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0) * (Number(curr.unitCost) || 0), 0);
  }, [items]);

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!recipientName.trim()) {
      setFormError('Recipient personnel name is required.');
      return;
    }

    if (!purpose.trim()) {
      setFormError('Please state the purpose or stationing location for this equipment issuance.');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name.trim()) {
        setFormError(`Item #${i + 1} is missing a name.`);
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        setFormError(`Item #${i + 1} (${item.name}) must have a quantity of at least 1.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalItems: EquipmentIssuanceItem[] = items.map((row, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        name: row.name.trim(),
        category: row.category || 'Equipment',
        quantity: Number(row.quantity),
        unit: row.unit.trim() || 'pcs',
        unitCost: Number(row.unitCost) || 0,
        totalCost: (Number(row.quantity) || 0) * (Number(row.unitCost) || 0),
        serialNumber: row.serialNumber?.trim() || generateAutoTag(targetSection, idx),
        propertyCode: row.propertyCode?.trim() || undefined,
        brandModel: row.brandModel?.trim() || undefined,
        condition: row.condition || 'Brand New',
        specifications: row.specifications?.trim() || undefined,
        existingInventoryId: row.existingInventoryId
      }));

      const issuanceData: Omit<EquipmentIssuance, 'id' | 'createdAt'> = {
        issuanceNumber: nextIssuanceNumber,
        date: new Date().toISOString(),
        recipientName: recipientName.trim(),
        recipientDepartment: getSectionName(targetSection),
        recipientPosition: recipientPosition.trim() || undefined,
        recipientContact: recipientContact.trim() || undefined,
        targetSection,
        issuedBy: currentUser.id,
        issuedByName: currentUser.name,
        source: 'Direct Issuance',
        purpose: purpose.trim(),
        status: 'ISSUED',
        remarks: remarks.trim() || undefined,
        items: finalItems,
        totalAmount: calculatedGrandTotal,
        autoAddedToInventory: true
      };

      await onCreateIssuance(issuanceData);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error creating equipment issuance:', err);
      setFormError(err.message || 'Failed to issue equipment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Issuance Records
  const filteredIssuances = useMemo(() => {
    return issuances.filter(record => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      if (search) {
        const matchesNumber = record.issuanceNumber?.toLowerCase().includes(search);
        const matchesRecipient = record.recipientName?.toLowerCase().includes(search);
        const matchesSection = getSectionName(record.targetSection).toLowerCase().includes(search);
        const matchesPurpose = record.purpose?.toLowerCase().includes(search);
        const matchesItems = record.items?.some(i =>
          i.name.toLowerCase().includes(search) ||
          (i.serialNumber && i.serialNumber.toLowerCase().includes(search)) ||
          (i.brandModel && i.brandModel.toLowerCase().includes(search))
        );

        if (!matchesNumber && !matchesRecipient && !matchesSection && !matchesPurpose && !matchesItems) {
          return false;
        }
      }

      // Department Filter
      if (departmentFilter !== 'ALL' && record.targetSection !== departmentFilter) {
        return false;
      }

      // Date Filter
      if (dateFilter !== 'ALL') {
        const recordDate = new Date(record.date);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          const isToday =
            recordDate.getDate() === now.getDate() &&
            recordDate.getMonth() === now.getMonth() &&
            recordDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === 'THIS_MONTH') {
          const isThisMonth =
            recordDate.getMonth() === now.getMonth() &&
            recordDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        } else if (dateFilter === 'THIS_YEAR') {
          if (recordDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [issuances, searchTerm, departmentFilter, dateFilter]);

  // High-level summary metrics
  const totalIssuedRecords = issuances.length;
  const totalItemsCount = useMemo(() => {
    return issuances.reduce((acc, curr) => {
      const itemsQty = curr.items ? curr.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
      return acc + itemsQty;
    }, 0);
  }, [issuances]);

  const totalIssuedValuation = useMemo(() => {
    return issuances.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  }, [issuances]);

  const uniqueDepartmentsEquipped = useMemo(() => {
    const depts = new Set(issuances.map(i => i.targetSection));
    return depts.size;
  }, [issuances]);

  // Export Professional PDF Voucher
  const handleExportPDF = (issuance: EquipmentIssuance) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [62, 49, 44]; // #3E312C
      const secondaryColor = [140, 122, 107]; // #8C7A6B

      // Header Banner
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('MADIGUN HOTEL AND EVENTS', 15, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('PROPERTY & INVENTORY CONTROL • EQUIPMENT ISSUANCE & RELEASING VOUCHER', 15, 25);

      // Dividing Line
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      // Title & Reference
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('EQUIPMENT ISSUANCE SLIP', 15, 36);

      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text(issuance.issuanceNumber, 195, 36, { align: 'right' });

      // Metadata Block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

      doc.text('Date & Time:', 15, 45);
      doc.text('Destination Department:', 115, 45);
      doc.text('Issued Personnel:', 15, 51);
      doc.text('Purpose / Station:', 115, 51);
      doc.text('Designation / Position:', 15, 57);
      doc.text('Inventory Status:', 115, 57);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);

      const formattedDate = new Date(issuance.date).toLocaleDateString([], {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(formattedDate, 60, 45);
      doc.text(getSectionName(issuance.targetSection), 155, 45);

      doc.setFont('helvetica', 'bold');
      doc.text(issuance.recipientName, 60, 51);
      doc.setFont('helvetica', 'normal');
      doc.text(issuance.purpose || 'Official deployment', 155, 51);

      doc.text(issuance.recipientPosition || 'Staff', 60, 57);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 124, 65); // green
      doc.text('Credited to Department Inventory', 155, 57);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);

      // Table of Items
      const tableHeaders = [
        ['#', 'Item Name', 'Brand / Model', 'Serial / Tag #', 'Condition', 'Qty', 'Unit Cost (PHP)', 'Total (PHP)']
      ];

      const tableRows = issuance.items.map((it, idx) => [
        idx + 1,
        it.name,
        it.brandModel || '—',
        it.serialNumber || it.propertyCode || '—',
        it.condition || 'Good',
        `${it.quantity} ${it.unit}`,
        `PHP ${it.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `PHP ${it.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 68,
        theme: 'striped',
        headStyles: {
          fillColor: [62, 49, 44],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [40, 40, 40],
          cellPadding: 2.5
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 45 },
          2: { cellWidth: 26 },
          3: { cellWidth: 28 },
          4: { cellWidth: 20 },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 24, halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [247, 245, 240]
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 8;

      // Total Cost Row
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('TOTAL ISSUED VALUATION:', 130, finalY);
      doc.text(
        `PHP ${issuance.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        195,
        finalY,
        { align: 'right' }
      );

      // Remarks if any
      let currentY = finalY + 8;
      if (issuance.remarks) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Remarks: ${issuance.remarks}`, 15, currentY);
        currentY += 12;
      } else {
        currentY += 6;
      }

      // Signatories Block
      const sigY = currentY + 14;
      doc.setLineWidth(0.4);
      doc.setDrawColor(120, 120, 120);

      // 1. Prepared By
      doc.line(15, sigY, 65, sigY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(issuance.issuedByName || 'Property Custodian', 40, sigY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Prepared & Released By', 40, sigY + 8, { align: 'center' });

      // 2. Received By
      doc.line(78, sigY, 132, sigY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(issuance.recipientName, 105, sigY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Received in Good Order by (Personnel)', 105, sigY + 8, { align: 'center' });

      // 3. Approved By
      doc.line(145, sigY, 195, sigY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Management / Dept Head', 170, sigY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Noted & Approved By', 170, sigY + 8, { align: 'center' });

      doc.save(`Equipment_Issuance_${issuance.issuanceNumber}.pdf`);
    } catch (e) {
      console.error('Failed to generate Equipment Issuance PDF:', e);
      alert('Could not export PDF voucher. Please check console for details.');
    }
  };

  return (
    <div className="space-y-6 text-[#3E312C]" id="equipment-issuance-root">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F4F2EB] p-5 rounded-2xl border border-[#EBE6DD] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#3E312C] text-white rounded-xl shadow-xs">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#3E312C]">
                Equipment Issuance & Releasing
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3E312C] text-white text-xs font-bold rounded-xl hover:bg-[#2C231F] transition-all shadow-xs cursor-pointer"
            id="create-equipment-issuance-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Issue Equipment</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8C7A6B]">Total Vouchers</span>
            <FileText className="h-4 w-4 text-[#8C7A6B]" />
          </div>
          <p className="text-2xl font-black mt-2 text-[#3E312C]">{totalIssuedRecords}</p>
        </div>

        <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8C7A6B]">Items Issued</span>
            <Package className="h-4 w-4 text-[#8C7A6B]" />
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-800">{totalItemsCount}</p>
        </div>

        <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8C7A6B]">Equipped Valuation</span>
            <Sparkles className="h-4 w-4 text-amber-700" />
          </div>
          <p className="text-2xl font-black mt-2 text-[#3E312C]">
            ₱{totalIssuedValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8C7A6B]">Active Departments</span>
            <Building className="h-4 w-4 text-[#8C7A6B]" />
          </div>
          <p className="text-2xl font-black mt-2 text-[#3E312C]">{uniqueDepartmentsEquipped}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-xl p-3.5 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C7A6B]" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search voucher #, personnel, item, serial..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DFD9D0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-1 text-xs">
            <Building className="h-3.5 w-3.5 text-[#8C7A6B]" />
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="text-xs bg-white border border-[#DFD9D0] rounded-lg px-2.5 py-1.5 focus:outline-none text-[#3E312C]"
            >
              <option value="ALL">All Departments</option>
              {ACTIVE_INVENTORY_TABS.map(tab => (
                <option key={tab.value} value={tab.value}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#8C7A6B]" />
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="text-xs bg-white border border-[#DFD9D0] rounded-lg px-2.5 py-1.5 focus:outline-none text-[#3E312C]"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Records List */}
      <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-xl overflow-hidden shadow-xs">
        {filteredIssuances.length === 0 ? (
          <div className="p-12 text-center">
            <PackagePlus className="h-10 w-10 text-[#8C7A6B] mx-auto opacity-50 mb-3" />
            <h3 className="text-sm font-bold text-[#3E312C]">No Equipment Issuances Found</h3>
            <p className="text-xs text-[#8C7A6B] mt-1 max-w-sm mx-auto">
              {issuances.length === 0
                ? 'No equipment has been issued yet. Click "Issue Equipment" to release items directly to staff and sync department inventory.'
                : 'No issuance records match your filter criteria.'}
            </p>
            {issuances.length === 0 && (
              <button
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#3E312C] text-white text-xs font-bold rounded-lg hover:bg-[#2C231F] transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Issuance</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EBE6DD] bg-[#EBE6DD]/60 text-[#8C7A6B] font-bold">
                  <th className="py-3 px-4">Issuance #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Recipient Personnel</th>
                  <th className="py-3 px-4">Destination Dept</th>
                  <th className="py-3 px-4">Equipment Issued</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DD]">
                {filteredIssuances.map(record => {
                  const itemsCount = record.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
                  const firstItem = record.items?.[0];
                  const otherItemsCount = (record.items?.length || 0) - 1;

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-white/60 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#3E312C]">
                        {record.issuanceNumber}
                      </td>
                      <td className="py-3.5 px-4 text-[#8C7A6B] whitespace-nowrap">
                        {new Date(record.date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#3E312C]">{record.recipientName}</div>
                        <div className="text-[10px] text-[#8C7A6B]">
                          {record.recipientPosition ? `${record.recipientPosition} • ` : ''}
                          {record.recipientDepartment || getSectionName(record.targetSection)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3E312C] bg-white border border-[#DFD9D0] px-2 py-0.5 rounded-md">
                          <Building className="h-3 w-3 text-[#8C7A6B]" />
                          {getSectionName(record.targetSection)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[#3E312C] font-medium">
                          {firstItem ? (
                            <span>
                              {firstItem.quantity}x {firstItem.name}
                              {firstItem.serialNumber ? ` (SN: ${firstItem.serialNumber})` : ''}
                              {otherItemsCount > 0 && (
                                <span className="text-[#8C7A6B] text-[11px]"> +{otherItemsCount} more</span>
                              )}
                            </span>
                          ) : (
                            '0 items'
                          )}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>{itemsCount} units synced to inventory</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#3E312C] whitespace-nowrap">
                        ₱{record.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedIssuance(record)}
                            className="p-1.5 text-[#3E312C] hover:bg-white rounded-lg border border-transparent hover:border-[#DFD9D0] transition-all cursor-pointer"
                            title="View Voucher Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleExportPDF(record)}
                            className="p-1.5 text-[#3E312C] hover:bg-white rounded-lg border border-transparent hover:border-[#DFD9D0] transition-all cursor-pointer"
                            title="Export & Print PDF"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          {isAdmin && onDeleteIssuance && (
                            <button
                              onClick={() => setIssuanceToDelete(record)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Delete Voucher"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- CREATE ISSUANCE MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-2xl max-w-4xl w-full p-6 shadow-xl my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#3E312C] text-white rounded-xl shadow-xs">
                  <PackagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#3E312C]">Issue Equipment to Personnel</h2>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#EBE6DD] rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-4 space-y-5 pr-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* General Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                    Issuance Voucher #
                  </label>
                  <input
                    type="text"
                    disabled
                    value={nextIssuanceNumber}
                    className="w-full px-3 py-2 text-xs bg-[#EBE6DD] border border-[#DFD9D0] rounded-xl font-mono text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                    Recipient Personnel Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="users-datalist"
                      value={recipientName}
                      onChange={e => setRecipientName(e.target.value)}
                      placeholder="Type personnel full name..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DFD9D0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                      required
                    />
                    <datalist id="users-datalist">
                      {users.map(u => (
                        <option key={u.id} value={u.name}>
                          {u.department ? `${u.department} (${u.role})` : u.role}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                    Designation / Position
                  </label>
                  <input
                    type="text"
                    value={recipientPosition}
                    onChange={e => setRecipientPosition(e.target.value)}
                    placeholder="e.g. Shift Supervisor, Chef, IT Tech"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DFD9D0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                    Target Inventory Section <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetSection}
                    onChange={e => handleSectionChange(e.target.value as InventorySection)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DFD9D0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C] font-semibold"
                  >
                    {ACTIVE_INVENTORY_TABS.map(tab => (
                      <option key={tab.value} value={tab.value}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                    Purpose / Stationing Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="e.g. Workstation deployment, floor equipment stationing"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DFD9D0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                    required
                  />
                </div>
              </div>

              {/* Items Table Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E312C]">
                      List of Equipment / Items to Issue
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EBE6DD] hover:bg-[#DFD9D0] text-[#3E312C] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((row, index) => {
                    const rowTotal = (Number(row.quantity) || 0) * (Number(row.unitCost) || 0);

                    return (
                      <div
                        key={row.tempId}
                        className="bg-white border border-[#DFD9D0] rounded-xl p-3.5 space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-2">
                          <span className="text-xs font-bold text-[#3E312C]">Item #{index + 1}</span>
                          <div className="flex items-center gap-2">
                            {targetDepartmentItems.length > 0 && (
                              <select
                                onChange={e => {
                                  if (e.target.value) {
                                    handleSelectExistingItem(row.tempId, e.target.value);
                                  }
                                }}
                                className="text-[11px] bg-[#F4F2EB] border border-[#DFD9D0] rounded-md px-2 py-1 text-[#8C7A6B]"
                              >
                                <option value="">Pick from {getSectionName(targetSection)}...</option>
                                {targetDepartmentItems.map(invItem => (
                                  <option key={invItem.id} value={invItem.id}>
                                    {invItem.name} (Stock: {invItem.currentStock} {invItem.unit})
                                  </option>
                                ))}
                              </select>
                            )}

                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(row.tempId)}
                                className="p-1 text-rose-500 hover:text-rose-700 rounded-md transition-colors cursor-pointer"
                                title="Remove row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* First Line: Name, Brand/Model, Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-1">
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                              Item Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={row.name}
                              onChange={e => handleUpdateItemRow(row.tempId, 'name', e.target.value)}
                              placeholder="e.g. Vacuum Cleaner, Desktop PC"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DFD9D0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                              Brand / Model
                            </label>
                            <input
                              type="text"
                              value={row.brandModel || ''}
                              onChange={e => handleUpdateItemRow(row.tempId, 'brandModel', e.target.value)}
                              placeholder="e.g. Karcher WD3, Lenovo V50t"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DFD9D0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                              Category
                            </label>
                            <input
                              type="text"
                              list="categories-datalist"
                              value={row.category}
                              onChange={e => handleUpdateItemRow(row.tempId, 'category', e.target.value)}
                              placeholder="Equipment, Linens, etc."
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DFD9D0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                            />
                            <datalist id="categories-datalist">
                              {categories.map(c => (
                                <option key={c} value={c} />
                              ))}
                            </datalist>
                          </div>
                        </div>

                        {/* Second Line: Serial / Property Tag, Condition, Qty, Unit, Unit Cost */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                              Serial / Tag #
                            </label>
                            <input
                              type="text"
                              value={row.serialNumber || ''}
                              onChange={e => handleUpdateItemRow(row.tempId, 'serialNumber', e.target.value)}
                              placeholder="e.g. SN-89412A"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DFD9D0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C] font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                              Condition
                            </label>
                            <select
                              value={row.condition}
                              onChange={e =>
                                handleUpdateItemRow(row.tempId, 'condition', e.target.value as EquipmentIssuanceItem['condition'])
                              }
                              className="w-full px-2 py-1.5 text-xs bg-white border border-[#DFD9D0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                            >
                              {STANDARD_CONDITIONS.map(c => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                              Qty <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={row.quantity}
                              onChange={e => handleUpdateItemRow(row.tempId, 'quantity', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DFD9D0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C] font-bold"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                              Unit
                            </label>
                            <input
                              type="text"
                              value={row.unit}
                              onChange={e => handleUpdateItemRow(row.tempId, 'unit', e.target.value)}
                              placeholder="pcs, sets, units"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DFD9D0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                              Unit Cost (₱)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.unitCost}
                              onChange={e => handleUpdateItemRow(row.tempId, 'unitCost', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DFD9D0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                            />
                          </div>
                        </div>

                        {/* Item Row Summary */}
                        <div className="flex justify-between items-center text-[11px] text-[#8C7A6B] pt-1">
                          <span>
                            Item Subtotal:{' '}
                            <strong className="text-[#3E312C]">
                              ₱{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal & Grand Total */}
                <div className="flex items-center justify-between p-3.5 bg-[#EBE6DD] rounded-xl">
                  <span className="text-xs font-bold text-[#3E312C]">Total Equipment Valuation</span>
                  <span className="text-base font-black text-[#3E312C]">
                    ₱{calculatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                  Additional Notes / Custody Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Optional notes or details for the issuance voucher..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DFD9D0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3E312C] text-[#3E312C]"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-[#EBE6DD] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#EBE6DD] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3E312C] text-white text-xs font-bold rounded-xl hover:bg-[#2C231F] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <span>Issuing & Syncing...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Issue Equipment & Update Inventory</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL / VOUCHER PREVIEW MODAL --- */}
      {selectedIssuance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-2xl max-w-3xl w-full p-6 shadow-xl my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-4 shrink-0">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B] bg-[#EBE6DD] px-2 py-0.5 rounded-md">
                  Voucher #{selectedIssuance.issuanceNumber}
                </span>
                <h2 className="text-lg font-bold text-[#3E312C] mt-1">Equipment Issuance Receipt</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportPDF(selectedIssuance)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3E312C] text-white text-xs font-bold rounded-xl hover:bg-[#2C231F] transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setSelectedIssuance(null)}
                  className="p-1.5 text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#EBE6DD] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-[#DFD9D0] text-xs">
                <div>
                  <span className="text-[10px] text-[#8C7A6B] uppercase font-bold block">Date Issued</span>
                  <span className="font-bold text-[#3E312C]">
                    {new Date(selectedIssuance.date).toLocaleDateString([], {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8C7A6B] uppercase font-bold block">Recipient Personnel</span>
                  <span className="font-bold text-[#3E312C]">{selectedIssuance.recipientName}</span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8C7A6B] uppercase font-bold block">Destination Dept</span>
                  <span className="font-bold text-[#3E312C]">
                    {getSectionName(selectedIssuance.targetSection)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8C7A6B] uppercase font-bold block">Designation</span>
                  <span className="text-[#3E312C]">{selectedIssuance.recipientPosition || 'Staff'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8C7A6B] uppercase font-bold block">Purpose</span>
                  <span className="text-[#3E312C]">{selectedIssuance.purpose}</span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8C7A6B] uppercase font-bold block">Issued By</span>
                  <span className="text-[#3E312C]">{selectedIssuance.issuedByName}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white rounded-xl border border-[#DFD9D0] overflow-hidden text-xs">
                <div className="p-3 bg-[#EBE6DD]/60 border-b border-[#DFD9D0] font-bold text-[#3E312C]">
                  Equipment Included ({selectedIssuance.items.length} items)
                </div>
                <div className="divide-y divide-[#EBE6DD]">
                  {selectedIssuance.items.map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#3E312C]">
                          {it.quantity} {it.unit} • {it.name}
                        </div>
                        <div className="text-[10px] text-[#8C7A6B] flex items-center gap-2 mt-0.5">
                          {it.brandModel && <span>Model: {it.brandModel}</span>}
                          {it.serialNumber && <span>SN: {it.serialNumber}</span>}
                          <span>Condition: {it.condition}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#3E312C]">
                          ₱{it.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-[#8C7A6B]">
                          ₱{it.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {it.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-[#F4F2EB] border-t border-[#DFD9D0] flex items-center justify-between font-bold text-[#3E312C]">
                  <span>Total Value</span>
                  <span className="text-sm">
                    ₱{selectedIssuance.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {selectedIssuance.remarks && (
                <div className="p-3 bg-white rounded-xl border border-[#DFD9D0] text-xs">
                  <span className="text-[10px] text-[#8C7A6B] uppercase font-bold block mb-1">Remarks</span>
                  <p className="text-[#3E312C]">{selectedIssuance.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      {issuanceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#F4F2EB] border border-[#EBE6DD] rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-sm font-bold text-[#3E312C]">Void / Delete Issuance Voucher?</h3>
            </div>
            <p className="text-xs text-[#8C7A6B]">
              Are you sure you want to delete issuance voucher <strong className="text-[#3E312C]">{issuanceToDelete.issuanceNumber}</strong> issued to {issuanceToDelete.recipientName}? This will remove the issuance record.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBE6DD]">
              <button
                onClick={() => setIssuanceToDelete(null)}
                className="px-3 py-1.5 text-xs font-bold text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#EBE6DD] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onDeleteIssuance) {
                    await onDeleteIssuance(issuanceToDelete.id);
                  }
                  setIssuanceToDelete(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
