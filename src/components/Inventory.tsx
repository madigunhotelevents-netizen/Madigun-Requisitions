import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertTriangle, 
  CheckCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PackageCheck,
  PackageOpen,
  X,
  PlusCircle,
  MinusCircle,
  Printer,
  FileText,
  Calendar,
  Tags,
  ChefHat,
  BedDouble,
  Shirt,
  Home,
  Wrench,
  Users,
  Monitor,
  DollarSign,
  Shield,
  Layers,
  Sparkles,
  Building2,
  Tv,
  Info,
  CheckCircle2,
  FolderPlus,
  ArrowRight,
  ArrowRightLeft,
  Package,
  Cpu,
  Copy,
  Eye,
  ShieldAlert,
  ShieldCheck,
  ClipboardList,
  ClipboardCheck,
  Clock
} from 'lucide-react';
import { InventoryItem, User, InventorySection, HotelRoom, DeployedEquipment } from '../types';

interface InventoryProps {
  inventory: InventoryItem[];
  currentUser: User;
  onAddItem: (newItem: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  onUpdateStock: (itemId: string, newStock: number) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  categories: string[];
  onAddCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
  rooms?: HotelRoom[];
  onAddRoom?: (room: Omit<HotelRoom, 'id'>) => void;
  onUpdateRoom?: (room: HotelRoom) => void;
  onDeleteRoom?: (roomId: string) => void;
  onAddDeployedItem?: (roomId: string, item: Omit<DeployedEquipment, 'id'>, deductFromInventory?: boolean) => void;
  onUpdateDeployedItem?: (roomId: string, item: DeployedEquipment) => void;
  onRemoveDeployedItem?: (roomId: string, itemId: string) => void;
  onNavigate?: (tab: string) => void;
}

export const getSectionName = (sec: InventorySection): string => {
  switch (sec) {
    case 'KITCHEN': return 'Kitchen';
    case 'ROOMS': return 'Rooms';
    case 'HOUSEKEEPING': return 'Housekeeping Supplies';
    case 'HOUSEKEEPING_EQUIPMENTS': return 'Housekeeping Equipments';
    case 'HR_EQUIPMENTS': return 'H.R Equipments';
    case 'FO_EQUIPMENTS': return 'F.O Equipments';
    case 'FINANCE_EQUIPMENTS': return 'Finance Equipments';
    case 'SECURITY_POST_EQUIPMENTS': return 'Security Post Equipments';
    case 'IT_EQUIPMENTS': return 'I.T Equipments';
    case 'LINENS': return 'Linens';
    case 'INDUSTRIAL_EQUIPMENTS': return 'Industrial Equipments';
    case 'LUZON': return 'Luzon';
    case 'VISAYAS': return 'Visayas';
    case 'MINDANAO':
    case 'OLD_HR_OFFICE': return 'Old H.R Office';
    default: return sec;
  }
};

export const getSectionDescription = (_sec: InventorySection): string => '';


export const getSectionValuationHeader = (sec: InventorySection): string => {
  switch (sec) {
    case 'KITCHEN': return 'KITCHEN - VALUATION & PRICE BREAKDOWN';
    case 'ROOMS': return 'ROOMS - VALUATION & PRICE BREAKDOWN';
    case 'HOUSEKEEPING': return 'HOUSEKEEPING SUPPLIES - VALUATION & PRICE BREAKDOWN';
    case 'HOUSEKEEPING_EQUIPMENTS': return 'HOUSEKEEPING EQUIPMENTS - VALUATION & PRICE BREAKDOWN';
    case 'HR_EQUIPMENTS': return 'H.R EQUIPMENTS - VALUATION & PRICE BREAKDOWN';
    case 'FO_EQUIPMENTS': return 'F.O EQUIPMENTS - VALUATION & PRICE BREAKDOWN';
    case 'FINANCE_EQUIPMENTS': return 'FINANCE EQUIPMENTS - VALUATION & PRICE BREAKDOWN';
    case 'SECURITY_POST_EQUIPMENTS': return 'SECURITY POST EQUIPMENTS - VALUATION & PRICE BREAKDOWN';
    case 'IT_EQUIPMENTS': return 'I.T EQUIPMENTS - VALUATION & PRICE BREAKDOWN';
    case 'LINENS': return 'LINENS - VALUATION & PRICE BREAKDOWN';
    case 'INDUSTRIAL_EQUIPMENTS': return 'INDUSTRIAL EQUIPMENTS - VALUATION & PRICE BREAKDOWN';
    case 'LUZON': return 'LUZON - VALUATION & PRICE BREAKDOWN';
    case 'VISAYAS': return 'VISAYAS - VALUATION & PRICE BREAKDOWN';
    case 'MINDANAO':
    case 'OLD_HR_OFFICE': return 'OLD H.R OFFICE - VALUATION & PRICE BREAKDOWN';
    default: return `${sec} - VALUATION & PRICE BREAKDOWN`;
  }
};

export default function Inventory({
  inventory,
  currentUser,
  onAddItem,
  onUpdateStock,
  onEditItem,
  onDeleteItem,
  categories: CATEGORIES,
  onAddCategory,
  onRemoveCategory,
  rooms = [],
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onAddDeployedItem,
  onUpdateDeployedItem,
  onRemoveDeployedItem,
  onNavigate
}: InventoryProps) {
  const isAdmin = currentUser.role === 'admin';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState<InventorySection>('KITCHEN');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState<InventoryItem | null>(null);

  // Rooms sub-view & filtering state
  const [roomsSubView, setRoomsSubView] = useState<'deployed' | 'stock'>('deployed');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomFloorFilter, setRoomFloorFilter] = useState('All');
  const [roomTypeFilter, setRoomTypeFilter] = useState('All');
  const [roomGroupingMode, setRoomGroupingMode] = useState<'type' | 'floor' | 'flat'>('type');
  const [collapsedRoomGroups, setCollapsedRoomGroups] = useState<Record<string, boolean>>({});

  // Room Modals state
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<HotelRoom | null>(null);

  // Deployed Item Modals state
  const [deployingToRoom, setDeployingToRoom] = useState<HotelRoom | null>(null);
  const [editingDeployedItem, setEditingDeployedItem] = useState<{ room: HotelRoom; item: DeployedEquipment } | null>(null);
  const [deletingDeployedItem, setDeletingDeployedItem] = useState<{ room: HotelRoom; item: DeployedEquipment } | null>(null);

  // Add Room Form state
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState('Deluxe Rooms');
  const [newRoomFloor, setNewRoomFloor] = useState('1st Floor');
  const [newRoomNotes, setNewRoomNotes] = useState('');
  const [newRoomInspected, setNewRoomInspected] = useState(new Date().toISOString().split('T')[0]);

  // Deploy Item Form state
  const [deployItemName, setDeployItemName] = useState('');
  const [deployItemCategory, setDeployItemCategory] = useState('Electronics');
  const [deployItemQty, setDeployItemQty] = useState('1');
  const [deployItemUnit, setDeployItemUnit] = useState('unit');
  const [deployItemCost, setDeployItemCost] = useState('0');
  const [deployItemCondition, setDeployItemCondition] = useState<'Good / Working' | 'Needs Repair' | 'Replaced' | 'Missing'>('Good / Working');
  const [deployItemSerial, setDeployItemSerial] = useState('');
  const [deployItemDate, setDeployItemDate] = useState(new Date().toISOString().split('T')[0]);
  const [deployItemNotes, setDeployItemNotes] = useState('');
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState('');
  const [autoDeductStock, setAutoDeductStock] = useState(true);

  // Bulk Deploy Item to All Rooms state
  const [isBulkDeployModalOpen, setIsBulkDeployModalOpen] = useState(false);
  const [bulkDeployTargetScope, setBulkDeployTargetScope] = useState<'all' | 'type' | 'floor'>('all');
  const [bulkDeploySelectedType, setBulkDeploySelectedType] = useState<string>('All');
  const [bulkDeploySelectedFloor, setBulkDeploySelectedFloor] = useState<string>('All');
  const [bulkDeployItemName, setBulkDeployItemName] = useState('');
  const [bulkDeployCategory, setBulkDeployCategory] = useState('Electronics');
  const [bulkDeployQtyPerRoom, setBulkDeployQtyPerRoom] = useState('1');
  const [bulkDeployUnit, setBulkDeployUnit] = useState('unit');
  const [bulkDeployUnitCost, setBulkDeployUnitCost] = useState('0');
  const [bulkDeployCondition, setBulkDeployCondition] = useState<'Good / Working' | 'Needs Repair' | 'Replaced' | 'Missing'>('Good / Working');
  const [bulkDeploySerialPrefix, setBulkDeploySerialPrefix] = useState('');
  const [bulkDeployDate, setBulkDeployDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkDeployNotes, setBulkDeployNotes] = useState('Bulk deployed equipment');
  const [bulkSelectedInventoryItemId, setBulkSelectedInventoryItemId] = useState('');
  const [bulkAutoDeductStock, setBulkAutoDeductStock] = useState(true);
  const [bulkDeployError, setBulkDeployError] = useState('');
  const [bulkDeploySuccessMsg, setBulkDeploySuccessMsg] = useState<string | null>(null);

  // Memoized Room Filters & Stats
  const uniqueRoomTypes = useMemo(() => {
    const types = new Set<string>();
    rooms.forEach(r => {
      if (r.roomType && r.roomType.trim()) types.add(r.roomType.trim());
    });
    return Array.from(types).sort();
  }, [rooms]);

  const uniqueFloors = useMemo(() => {
    const floors = new Set<string>();
    rooms.forEach(r => {
      if (r.floor && r.floor.trim()) floors.add(r.floor.trim());
    });
    return Array.from(floors).sort();
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      if (roomFloorFilter !== 'All' && room.floor !== roomFloorFilter) {
        return false;
      }
      if (roomTypeFilter !== 'All' && (room.roomType || '').trim() !== roomTypeFilter) {
        return false;
      }
      if (roomSearch.trim()) {
        const query = roomSearch.toLowerCase().trim();
        const numMatch = room.roomNumber.toLowerCase().includes(query);
        const typeMatch = (room.roomType || '').toLowerCase().includes(query);
        const floorMatch = (room.floor || '').toLowerCase().includes(query);
        const itemMatch = (room.deployedItems || []).some(item => 
          item.name.toLowerCase().includes(query) || 
          (item.serialNumber || '').toLowerCase().includes(query) ||
          (item.category || '').toLowerCase().includes(query)
        );
        return numMatch || typeMatch || floorMatch || itemMatch;
      }
      return true;
    });
  }, [rooms, roomFloorFilter, roomTypeFilter, roomSearch]);

  const groupedRoomsByType = useMemo(() => {
    const groups: Record<string, HotelRoom[]> = {};
    filteredRooms.forEach(room => {
      const typeKey = room.roomType?.trim() || 'Unassigned Room Type';
      if (!groups[typeKey]) groups[typeKey] = [];
      groups[typeKey].push(room);
    });
    return groups;
  }, [filteredRooms]);

  const groupedRoomsByFloor = useMemo(() => {
    const groups: Record<string, HotelRoom[]> = {};
    filteredRooms.forEach(room => {
      const floorKey = room.floor?.trim() || 'Unassigned Floor';
      if (!groups[floorKey]) groups[floorKey] = [];
      groups[floorKey].push(room);
    });
    return groups;
  }, [filteredRooms]);

  const totalDeployedItemsCount = useMemo(() => {
    return rooms.reduce((acc, r) => acc + (r.deployedItems?.reduce((sum, i) => sum + i.quantity, 0) || 0), 0);
  }, [rooms]);

  const totalRoomsValuation = useMemo(() => {
    return rooms.reduce((acc, r) => acc + (r.deployedItems?.reduce((sum, i) => sum + (i.quantity * (i.unitCost || 0)), 0) || 0), 0);
  }, [rooms]);

  // Custom iframe-safe Dialog States
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [sheetCategory, setSheetCategory] = useState('All');

  // Print Single Room Audit PDF
  const handlePrintRoomAudit = (room: HotelRoom) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const primaryColor = [62, 49, 44];
      const secondaryColor = [140, 122, 107];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("MADIGUN HOTEL AND EVENTS", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("ROOM ASSET & DEPLOYED EQUIPMENT AUDIT SHEET", 15, 25);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${room.roomNumber.toUpperCase()} (${room.roomType})`, 15, 37);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Floor/Wing: ${room.floor || 'N/A'} | Status: ${room.status} | Last Inspected: ${room.lastInspected || 'N/A'}`, 15, 42);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 195, 42, { align: 'right' });

      const tableBody = (room.deployedItems || []).map(item => [
        item.name,
        item.category || 'General',
        `${item.quantity} ${item.unit}`,
        item.condition || 'Good / Working',
        item.serialNumber || 'N/A',
        item.unitCost ? `PHP ${item.unitCost.toFixed(2)}` : 'N/A',
        item.unitCost ? `PHP ${(item.quantity * item.unitCost).toFixed(2)}` : 'N/A'
      ]);

      const totalVal = (room.deployedItems || []).reduce((sum, item) => sum + (item.quantity * (item.unitCost || 0)), 0);

      autoTable(doc, {
        startY: 47,
        margin: { left: 15, right: 15 },
        head: [['Equipment / Item', 'Category', 'Quantity', 'Condition', 'Serial / Asset No.', 'Unit Value', 'Total Value']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [62, 49, 44], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        foot: [[
          { content: 'Total Room Assets Estimated Valuation:', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
          { content: `PHP ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
        ]],
        styles: { fontSize: 8, cellPadding: 2.5 }
      });

      // Signatures
      let finalY = (doc as any).lastAutoTable.finalY + 22;
      if (finalY > 250) {
        doc.addPage();
        finalY = 35;
      }
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.25);

      doc.line(15, finalY, 65, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(currentUser.name, 40, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("INSPECTOR / AUDITOR", 40, finalY + 8, { align: 'center' });

      doc.line(80, finalY, 130, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("(Signature over Printed Name)", 105, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("HOUSEKEEPING SUPERVISOR", 105, finalY + 8, { align: 'center' });

      doc.line(145, finalY, 195, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("(Signature over Printed Name)", 170, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("HOTEL MANAGER SIGN-OFF", 170, finalY + 8, { align: 'center' });

      doc.save(`Room_Audit_${room.roomNumber.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error("Room Audit PDF Error:", e);
    }
  };

  // Print Master Rooms Directory Audit PDF
  const handlePrintAllRoomsAudit = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const primaryColor = [62, 49, 44];
      const secondaryColor = [140, 122, 107];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("MADIGUN HOTEL AND EVENTS", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("MASTER HOTEL ROOMS & DEPLOYED EQUIPMENT DIRECTORY AUDIT", 15, 25);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      const tableRows: any[] = [];
      let grandTotalValue = 0;

      (rooms || []).forEach(r => {
        const roomTotal = (r.deployedItems || []).reduce((sum, i) => sum + (i.quantity * (i.unitCost || 0)), 0);
        grandTotalValue += roomTotal;

        const itemsList = (r.deployedItems || []).map(i => `${i.name} (${i.quantity} ${i.unit} - ${i.condition || 'Good'})`).join(', ') || 'No equipment deployed';

        tableRows.push([
          r.roomNumber,
          r.roomType,
          r.floor || '1st Floor',
          (r.deployedItems || []).length,
          itemsList,
          `PHP ${roomTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
      });

      autoTable(doc, {
        startY: 33,
        margin: { left: 15, right: 15 },
        head: [['Room No.', 'Type', 'Floor', 'Total Assets', 'Deployed Equipment Summary', 'Est. Value']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [62, 49, 44], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        foot: [[
          { content: 'Grand Total Estimated Deployed Valuation:', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
          { content: `PHP ${grandTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
        ]],
        styles: { fontSize: 7.5, cellPadding: 2 }
      });

      doc.save(`Hotel_Master_Rooms_Asset_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error("Master Rooms Audit PDF Error:", e);
    }
  };

  const handlePrintCountSheet = () => {
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
      // Line under header
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 25, 195, 25);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("PHYSICAL INVENTORY COUNT SHEET", 15, 37);

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Category: ${sheetCategory === 'All' ? `All ${getSectionName(sectionFilter)} Items` : sheetCategory}`, 15, 42);

      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 195, 42, { align: 'right' });

      // Table body
      const filteredItems = inventory.filter(item => {
        const itemSectionValue = item.section || 'KITCHEN';
        if (itemSectionValue !== sectionFilter) return false;
        return sheetCategory === 'All' || item.category === sheetCategory;
      });
      
      const tableBody = filteredItems.map((item) => [
        item.name,
        item.category,
        `${item.currentStock} ${item.unit}`,
        `_________________ ${item.unit}`,
        item.supplier || 'Warehouse Reserve'
      ]);

      if (sectionFilter === 'ROOMS') {
        filteredAggregatedDeployedItems.forEach((dep) => {
          if (sheetCategory === 'All' || dep.category === sheetCategory) {
            tableBody.push([
              `${dep.name} (Deployed in Rooms)`,
              dep.category,
              `${dep.totalQuantity} ${dep.unit}`,
              `_________________ ${dep.unit}`,
              `Deployed (${dep.roomsCount} Rooms)`
            ]);
          }
        });
      }

      autoTable(doc, {
        startY: 47,
        margin: { left: 15, right: 15 },
        head: [['Product / Item Name', 'Category', 'System Stock', 'Actual Count', 'Supplier']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [62, 49, 44], // #3E312C
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 35, halign: 'center' },
          4: { cellWidth: 30, fontSize: 7 }
        },
        didParseCell: (data) => {
          if (data.section === 'head' || data.section === 'body') {
            if (data.column.index === 2) {
              data.cell.styles.halign = 'right';
            } else if (data.column.index === 3) {
              data.cell.styles.halign = 'center';
            }
          }
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5
        }
      });

      // Signatures row
      let finalY = (doc as any).lastAutoTable.finalY + 22;
      if (finalY > 250) {
        doc.addPage();
        finalY = 35;
      }
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.25);
      
      // Preparer Line
      doc.line(15, finalY, 65, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(currentUser.name, 40, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("AUDITING STAFF / PREPARER", 40, finalY + 8, { align: 'center' });

      // Auditor Line
      doc.line(80, finalY, 130, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("(Signature over Printed Name)", 105, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("AUDITOR / STOCK CONTROLLER", 105, finalY + 8, { align: 'center' });

      // Approver Line
      doc.line(145, finalY, 195, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("(Signature over Printed Name)", 170, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("F&B ADMIN SIGN-OFF", 170, finalY + 8, { align: 'center' });

      // Save PDF
      doc.save(`Inventory_Count_Sheet_${sheetCategory.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Inventory Count Sheet error:", err);
      window.print();
    }
  };

  const handlePrintPriceBreakdown = () => {
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
      doc.text(getSectionValuationHeader(sectionFilter), 15, 25);

      // Line under header
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("INVENTORY PRICING & BREAKDOWN REPORT", 15, 37);

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Category Filter: ${categoryFilter === 'All' ? 'All' : categoryFilter}`, 15, 42);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 195, 42, { align: 'right' });

      // Table body using filteredItems
      let tableBody = filteredItems.map((item) => {
        const itemValue = item.currentStock * item.unitCost;
        return [
          `${item.name} (Reserve Stock)`,
          item.category,
          `${item.currentStock} ${item.unit}`,
          item.unitCost.toFixed(2),
          itemValue.toFixed(2),
          item.supplier || 'Warehouse Reserve'
        ];
      });

      let totalValuation = filteredItems.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0);

      if (sectionFilter === 'ROOMS') {
        filteredAggregatedDeployedItems.forEach((dep) => {
          const itemValue = dep.totalQuantity * dep.unitCost;
          totalValuation += itemValue;
          tableBody.push([
            `${dep.name} (Deployed in Rooms)`,
            dep.category,
            `${dep.totalQuantity} ${dep.unit}`,
            dep.unitCost.toFixed(2),
            itemValue.toFixed(2),
            `Deployed (${dep.roomsCount} Rooms)`
          ]);
        });
      }

      autoTable(doc, {
        startY: 47,
        margin: { left: 15, right: 15 },
        head: [['Product / Item Name', 'Category', 'Current Stock', 'Unit Price (PHP)', 'Total Value (PHP)', 'Supplier']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [62, 49, 44], // #3E312C
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 25, fontSize: 7 }
        },
        didParseCell: (data) => {
          if (data.section === 'head' || data.section === 'body') {
            if (data.column.index === 2 || data.column.index === 3 || data.column.index === 4) {
              data.cell.styles.halign = 'right';
            }
          }
        },
        foot: [[
          { content: 'Total Cost Valuation (PHP):', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
          { content: `${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
          { content: '', styles: {} }
        ]],
        footStyles: {
          fillColor: [244, 242, 235],
          textColor: [62, 49, 44]
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5
        }
      });

      // Signatures row
      let finalY = (doc as any).lastAutoTable.finalY + 22;
      if (finalY > 250) {
        doc.addPage();
        finalY = 35;
      }
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.25);
      
      // Staff In Charge Line (Left)
      doc.line(25, finalY, 85, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(currentUser.name, 55, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("STAFF IN CHARGE", 55, finalY + 8, { align: 'center' });

      // Auditor Line (Right)
      doc.line(125, finalY, 185, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("(Signature over Printed Name)", 155, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("AUDITOR", 155, finalY + 8, { align: 'center' });

      // Save PDF
      doc.save(`Inventory_Price_Breakdown_${sectionFilter.toLowerCase()}_${categoryFilter.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Inventory Price Breakdown error:", err);
      window.print();
    }
  };

  const ALL_INVENTORY_SECTIONS: InventorySection[] = [
    'KITCHEN',
    'HOUSEKEEPING',
    'HOUSEKEEPING_EQUIPMENTS',
    'HR_EQUIPMENTS',
    'FO_EQUIPMENTS',
    'FINANCE_EQUIPMENTS',
    'SECURITY_POST_EQUIPMENTS',
    'IT_EQUIPMENTS',
    'LINENS',
    'INDUSTRIAL_EQUIPMENTS',
    'LUZON',
    'VISAYAS',
    'MINDANAO'
  ];

  // Item Transfer Form States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferItemsList, setTransferItemsList] = useState<Array<{ item: InventoryItem; qty: number }>>([]);
  const [selectedItemToAdd, setSelectedItemToAdd] = useState<InventoryItem | null>(null);
  const [selectedItemQtyToAdd, setSelectedItemQtyToAdd] = useState<string>('1');
  const [transferDestination, setTransferDestination] = useState<string>('HOUSEKEEPING');
  const [customLocation, setCustomLocation] = useState('');
  const [transferSender, setTransferSender] = useState(currentUser.name);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferPurpose, setTransferPurpose] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string | null>(null);

  const generateTransferFormPDF = (
    transferItems: Array<{ item: InventoryItem; qty: number }>,
    fromSection: InventorySection,
    destinationName: string,
    senderName: string,
    recipientName: string,
    purpose: string,
    voucherRef: string
  ) => {
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
      doc.text("OFFICIAL INVENTORY & ASSET MATERIAL TRANSFER SLIP", 15, 25);

      // Line under header
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      // Title & Voucher Reference
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("INVENTORY ITEM TRANSFER FORM", 15, 37);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`VOUCHER REF: ${voucherRef}`, 195, 37, { align: 'right' });

      // Transfer Details Box
      doc.setFillColor(250, 249, 245);
      doc.rect(15, 42, 180, 32, 'F');
      doc.setDrawColor(230, 228, 221);
      doc.setLineWidth(0.3);
      doc.rect(15, 42, 180, 32, 'S');

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Transfer Date:", 18, 48);
      doc.text("Source Department:", 18, 54);
      doc.text("Destination / Location:", 18, 60);
      doc.text("Purpose / Reason:", 18, 66);

      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }), 55, 48);
      doc.text(getSectionName(fromSection), 55, 54);
      doc.text(destinationName, 55, 60);
      doc.text(purpose || 'N/A', 55, 66);

      doc.setFont("helvetica", "bold");
      doc.text("Transferred By (Sender):", 115, 48);
      doc.text("Received By (Recipient):", 115, 54);

      doc.setFont("helvetica", "normal");
      doc.text(senderName, 155, 48);
      doc.text(recipientName, 155, 54);

      // Table body
      let grandTotalValuation = 0;
      const tableBody = transferItems.map(({ item, qty }) => {
        const itemValuation = qty * item.unitCost;
        grandTotalValuation += itemValuation;
        return [
          item.name,
          item.category || 'General',
          `${qty} ${item.unit}`,
          `PHP ${item.unitCost.toFixed(2)}`,
          `PHP ${itemValuation.toFixed(2)}`,
          getSectionName(fromSection),
          destinationName
        ];
      });

      autoTable(doc, {
        startY: 80,
        margin: { left: 15, right: 15 },
        head: [['Item Name', 'Category', 'Qty Transferred', 'Unit Cost', 'Total Value', 'From Section', 'Destination']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [62, 49, 44],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 25 },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 24, halign: 'right' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 20, fontSize: 7 },
          6: { cellWidth: 20, fontSize: 7 }
        },
        foot: [[
          { content: 'Total Transferred Valuation:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
          { content: `PHP ${grandTotalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colSpan: 3, styles: { halign: 'left', fontStyle: 'bold', fontSize: 9 } }
        ]],
        footStyles: {
          fillColor: [244, 242, 235],
          textColor: [62, 49, 44]
        },
        styles: { fontSize: 8, cellPadding: 3 }
      });

      // Signatures
      let finalY = (doc as any).lastAutoTable.finalY + 25;
      if (finalY > 240) {
        doc.addPage();
        finalY = 35;
      }

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.3);

      // Sender Line
      doc.line(15, finalY, 65, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(senderName, 40, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("TRANSFERRED BY (SENDER)", 40, finalY + 8, { align: 'center' });

      // Recipient Line
      doc.line(80, finalY, 130, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(recipientName, 105, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("RECEIVED BY (RECIPIENT)", 105, finalY + 8, { align: 'center' });

      // Approver Line
      doc.line(145, finalY, 195, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("(Signature over Printed Name)", 170, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("APPROVED BY / AUDITOR", 170, finalY + 8, { align: 'center' });

      doc.save(`Item_Transfer_Form_${voucherRef}.pdf`);
    } catch (err) {
      console.error("PDF Transfer Form error:", err);
      window.print();
    }
  };

  const openTransferModal = (initialSelectedItem?: InventoryItem) => {
    const sectionItems = inventory.filter(i => (i.section || 'KITCHEN') === sectionFilter && i.currentStock > 0);
    
    if (initialSelectedItem && initialSelectedItem.currentStock > 0) {
      setTransferItemsList([{ item: initialSelectedItem, qty: 1 }]);
      const remaining = sectionItems.filter(i => i.id !== initialSelectedItem.id);
      setSelectedItemToAdd(remaining[0] || null);
    } else {
      if (sectionItems.length > 0) {
        setTransferItemsList([{ item: sectionItems[0], qty: 1 }]);
        setSelectedItemToAdd(sectionItems[1] || null);
      } else {
        setTransferItemsList([]);
        setSelectedItemToAdd(null);
      }
    }
    
    setSelectedItemQtyToAdd('1');
    setTransferSender(currentUser.name);
    setTransferRecipient('');
    setTransferPurpose('');
    setCustomLocation('');
    setTransferError('');
    
    const defaultDest = ALL_INVENTORY_SECTIONS.find(s => s !== sectionFilter) || 'HOUSEKEEPING';
    setTransferDestination(defaultDest);
    setIsTransferModalOpen(true);
  };

  const handleAddItemToTransferList = () => {
    setTransferError('');
    if (!selectedItemToAdd) {
      setTransferError('Please select an item to add to the transfer list.');
      return;
    }

    const qtyNum = parseFloat(selectedItemQtyToAdd);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setTransferError('Please enter a valid transfer quantity greater than 0.');
      return;
    }

    if (qtyNum > selectedItemToAdd.currentStock) {
      setTransferError(`Transfer quantity (${qtyNum}) exceeds available stock level (${selectedItemToAdd.currentStock} ${selectedItemToAdd.unit}).`);
      return;
    }

    const existingIndex = transferItemsList.findIndex(line => line.item.id === selectedItemToAdd.id);
    if (existingIndex >= 0) {
      const updated = [...transferItemsList];
      const newQty = updated[existingIndex].qty + qtyNum;
      if (newQty > selectedItemToAdd.currentStock) {
        setTransferError(`Total transfer quantity (${newQty}) exceeds available stock level (${selectedItemToAdd.currentStock} ${selectedItemToAdd.unit}).`);
        return;
      }
      updated[existingIndex] = { ...updated[existingIndex], qty: newQty };
      setTransferItemsList(updated);
    } else {
      setTransferItemsList([...transferItemsList, { item: selectedItemToAdd, qty: qtyNum }]);
    }

    // Auto select next available item that isn't added yet
    const sectionItems = inventory.filter(i => (i.section || 'KITCHEN') === sectionFilter && i.currentStock > 0);
    const currentAddedIds = new Set([...transferItemsList.map(l => l.item.id), selectedItemToAdd.id]);
    const nextAvailable = sectionItems.find(i => !currentAddedIds.has(i.id)) || null;
    setSelectedItemToAdd(nextAvailable);
    setSelectedItemQtyToAdd('1');
  };

  const handleRemoveTransferItem = (itemId: string) => {
    setTransferItemsList(prev => prev.filter(line => line.item.id !== itemId));
  };

  const handleUpdateTransferItemQty = (itemId: string, newQty: number) => {
    setTransferItemsList(prev => prev.map(line => {
      if (line.item.id === itemId) {
        const clampedQty = Math.min(Math.max(0.01, newQty), line.item.currentStock);
        return { ...line, qty: clampedQty };
      }
      return line;
    }));
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');

    if (transferItemsList.length === 0) {
      setTransferError('Please add at least one item to transfer.');
      return;
    }

    // Validate quantities for all items
    for (const line of transferItemsList) {
      if (line.qty <= 0) {
        setTransferError(`Transfer quantity for "${line.item.name}" must be greater than 0.`);
        return;
      }
      if (line.qty > line.item.currentStock) {
        setTransferError(`Transfer quantity (${line.qty}) for "${line.item.name}" exceeds available stock (${line.item.currentStock} ${line.item.unit}).`);
        return;
      }
    }

    if (!transferRecipient.trim()) {
      setTransferError('Please enter the name of the recipient / receiving person.');
      return;
    }

    let destDisplayName = '';

    if (transferDestination.startsWith('ROOM:')) {
      const roomId = transferDestination.replace('ROOM:', '');
      const targetRoom = rooms.find(r => r.id === roomId);
      if (!targetRoom) {
        setTransferError('Selected room was not found.');
        return;
      }
      destDisplayName = `Room ${targetRoom.roomNumber} (${targetRoom.roomType})`;

      // Deploy items to room
      transferItemsList.forEach(({ item, qty }) => {
        if (onAddDeployedItem) {
          onAddDeployedItem(
            targetRoom.id,
            {
              name: item.name,
              category: item.category || 'General',
              quantity: qty,
              unit: item.unit,
              unitCost: item.unitCost,
              dateDeployed: new Date().toISOString().split('T')[0],
              notes: `Transferred from ${getSectionName(sectionFilter)}: ${transferPurpose.trim()}`
            },
            false
          );
        }
        onUpdateStock(item.id, item.currentStock - qty);
      });

    } else if (transferDestination === 'OTHER') {
      if (!customLocation.trim()) {
        setTransferError('Please specify the custom destination / location name.');
        return;
      }
      destDisplayName = customLocation.trim();
      
      transferItemsList.forEach(({ item, qty }) => {
        onUpdateStock(item.id, item.currentStock - qty);
      });

    } else {
      // Transfer to another inventory section
      const targetSection = transferDestination as InventorySection;
      destDisplayName = getSectionName(targetSection);

      transferItemsList.forEach(({ item, qty }) => {
        const existingDestItem = inventory.find(
          i => (i.section || 'KITCHEN') === targetSection && i.name.toLowerCase() === item.name.toLowerCase()
        );

        if (existingDestItem) {
          onUpdateStock(existingDestItem.id, existingDestItem.currentStock + qty);
        } else {
          onAddItem({
            name: item.name,
            category: item.category || 'General',
            currentStock: qty,
            unit: item.unit,
            unitCost: item.unitCost,
            minStock: item.minStock,
            supplier: item.supplier,
            section: targetSection
          });
        }

        onUpdateStock(item.id, item.currentStock - qty);
      });
    }

    // Generate voucher reference
    const voucherRef = `TRF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Print Transfer Form PDF
    generateTransferFormPDF(
      transferItemsList,
      sectionFilter,
      destDisplayName,
      transferSender.trim() || currentUser.name,
      transferRecipient.trim(),
      transferPurpose.trim(),
      voucherRef
    );

    const totalQtyTransferred = transferItemsList.reduce((sum, line) => sum + line.qty, 0);
    setTransferSuccessMsg(`Transferred ${transferItemsList.length} item type(s) (${totalQtyTransferred} total units) to ${destDisplayName}. Transfer Form PDF generated!`);
    setIsTransferModalOpen(false);

    // Reset transfer state
    setTransferItemsList([]);
    setSelectedItemToAdd(null);
    setSelectedItemQtyToAdd('1');
    setTransferRecipient('');
    setTransferPurpose('');
    setCustomLocation('');
  };

  // Room Duplication States
  const [duplicatingRoom, setDuplicatingRoom] = useState<HotelRoom | null>(null);
  const [dupMode, setDupMode] = useState<'single' | 'batch'>('single');
  const [dupRoomNumber, setDupRoomNumber] = useState('');
  const [dupBatchNumbers, setDupBatchNumbers] = useState('');
  const [dupRoomType, setDupRoomType] = useState('Deluxe King');
  const [dupFloor, setDupFloor] = useState('1st Floor');
  const [dupStatus, setDupStatus] = useState('Clean');
  const [dupCopyDeployedItems, setDupCopyDeployedItems] = useState(true);
  const [dupCopyNotes, setDupCopyNotes] = useState(true);
  const [dupError, setDupError] = useState('');
  const [dupSuccessMsg, setDupSuccessMsg] = useState<string | null>(null);

  const openDuplicateRoomModal = (room: HotelRoom) => {
    setDuplicatingRoom(room);
    setDupMode('single');
    
    // Auto suggest next room number if possible, e.g. Room 101 -> Room 102
    const numMatch = room.roomNumber.match(/\d+/);
    if (numMatch) {
      const currentNumStr = numMatch[0];
      const nextNum = parseInt(currentNumStr) + 1;
      const suggestedStr = room.roomNumber.replace(currentNumStr, nextNum.toString());
      setDupRoomNumber(suggestedStr);
      setDupBatchNumbers(`${suggestedStr}, ${room.roomNumber.replace(currentNumStr, (nextNum + 1).toString())}, ${room.roomNumber.replace(currentNumStr, (nextNum + 2).toString())}`);
    } else {
      setDupRoomNumber(`${room.roomNumber} (Copy)`);
      setDupBatchNumbers('');
    }
    
    setDupRoomType(room.roomType || 'Standard');
    setDupFloor(room.floor || '1st Floor');
    setDupStatus('Clean');
    setDupCopyDeployedItems(true);
    setDupCopyNotes(true);
    setDupError('');
  };

  const handleExecuteDuplicateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setDupError('');

    if (!duplicatingRoom || !onAddRoom) return;

    let targetRoomNumbers: string[] = [];

    if (dupMode === 'single') {
      const trimmed = dupRoomNumber.trim();
      if (!trimmed) {
        setDupError('Please enter a target room number.');
        return;
      }
      targetRoomNumbers = [trimmed];
    } else {
      const parsed = dupBatchNumbers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (parsed.length === 0) {
        setDupError('Please enter at least one target room number separated by commas.');
        return;
      }
      targetRoomNumbers = parsed;
    }

    // Check for collisions with existing rooms
    const existingNumbers = new Set(rooms.map(r => r.roomNumber.toLowerCase().trim()));
    const conflicting = targetRoomNumbers.filter(num => {
      const formatted = num.toLowerCase().startsWith('room') ? num.toLowerCase().trim() : `room ${num}`.toLowerCase().trim();
      return existingNumbers.has(formatted) || existingNumbers.has(num.toLowerCase().trim());
    });

    if (conflicting.length > 0) {
      setDupError(`Room(s) [${conflicting.join(', ')}] already exist! Please use unique room numbers.`);
      return;
    }

    // Prepare base items
    const baseDeployedItems = duplicatingRoom.deployedItems || [];

    let createdCount = 0;
    targetRoomNumbers.forEach((rawNum) => {
      const finalRoomNumber = (duplicatingRoom.roomNumber.toLowerCase().startsWith('room') && !rawNum.toLowerCase().startsWith('room'))
        ? `Room ${rawNum}`
        : rawNum;

      const clonedItems: DeployedEquipment[] = dupCopyDeployedItems
        ? baseDeployedItems.map((item, idx) => ({
            ...item,
            id: `dep-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            dateDeployed: new Date().toISOString().split('T')[0]
          }))
        : [];

      onAddRoom({
        roomNumber: finalRoomNumber,
        roomType: dupRoomType,
        floor: dupFloor,
        status: dupStatus,
        deployedItems: clonedItems,
        lastInspected: new Date().toISOString().split('T')[0],
        notes: dupCopyNotes ? (duplicatingRoom.notes ? `[Duplicated from ${duplicatingRoom.roomNumber}] ${duplicatingRoom.notes}` : `Duplicated setup from ${duplicatingRoom.roomNumber}`) : ''
      });

      createdCount++;
    });

    const itemCopiedText = dupCopyDeployedItems ? `${baseDeployedItems.length} installed equipment item(s) cloned per room` : 'without equipment items';
    setDupSuccessMsg(`Successfully duplicated ${duplicatingRoom.roomNumber} to ${createdCount} new room(s) (${itemCopiedText})!`);
    setDuplicatingRoom(null);
  };

  // Bulk Deploy Modal Handlers & Computed Targets
  const openBulkDeployModal = (scope: 'all' | 'type' | 'floor' = 'all', filterValue?: string) => {
    setBulkDeployTargetScope(scope);
    if (scope === 'type' && filterValue) {
      setBulkDeploySelectedType(filterValue);
    } else if (uniqueRoomTypes.length > 0) {
      setBulkDeploySelectedType(uniqueRoomTypes[0]);
    } else {
      setBulkDeploySelectedType('All');
    }

    if (scope === 'floor' && filterValue) {
      setBulkDeploySelectedFloor(filterValue);
    } else if (uniqueFloors.length > 0) {
      setBulkDeploySelectedFloor(uniqueFloors[0]);
    } else {
      setBulkDeploySelectedFloor('All');
    }

    setBulkDeployItemName('');
    setBulkDeployCategory('Electronics');
    setBulkDeployQtyPerRoom('1');
    setBulkDeployUnit('unit');
    setBulkDeployUnitCost('0');
    setBulkDeployCondition('Good / Working');
    setBulkDeploySerialPrefix('');
    setBulkDeployDate(new Date().toISOString().split('T')[0]);
    setBulkDeployNotes('Bulk deployed equipment');
    setBulkSelectedInventoryItemId('');
    setBulkAutoDeductStock(true);
    setBulkDeployError('');
    setIsBulkDeployModalOpen(true);
  };

  const targetRoomsForBulkDeploy = useMemo(() => {
    if (bulkDeployTargetScope === 'type') {
      return rooms.filter(r => (r.roomType || '').trim() === bulkDeploySelectedType.trim());
    } else if (bulkDeployTargetScope === 'floor') {
      return rooms.filter(r => (r.floor || '').trim() === bulkDeploySelectedFloor.trim());
    }
    return rooms;
  }, [rooms, bulkDeployTargetScope, bulkDeploySelectedType, bulkDeploySelectedFloor]);

  const handleExecuteBulkDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkDeployError('');

    if (!bulkDeployItemName.trim()) {
      setBulkDeployError('Please enter an item or equipment name.');
      return;
    }

    const qtyPerRoom = parseFloat(bulkDeployQtyPerRoom);
    if (isNaN(qtyPerRoom) || qtyPerRoom <= 0) {
      setBulkDeployError('Please enter a valid quantity per room (greater than 0).');
      return;
    }

    if (targetRoomsForBulkDeploy.length === 0) {
      setBulkDeployError('No rooms found matching the selected target scope.');
      return;
    }

    const totalQtyRequired = targetRoomsForBulkDeploy.length * qtyPerRoom;
    const unitCost = parseFloat(bulkDeployUnitCost) || 0;

    let selectedInvItem: InventoryItem | undefined;
    if (bulkSelectedInventoryItemId && bulkAutoDeductStock) {
      selectedInvItem = inventory.find(i => i.id === bulkSelectedInventoryItemId);
      if (selectedInvItem && selectedInvItem.currentStock < totalQtyRequired) {
        setBulkDeployError(`Insufficient stock level in General Inventory! Required: ${totalQtyRequired} ${bulkDeployUnit}, Available: ${selectedInvItem.currentStock} ${selectedInvItem.unit}. Please adjust stock or uncheck auto-deduction.`);
        return;
      }
    }

    if (!onAddDeployedItem) {
      setBulkDeployError('Room deployment handler is unavailable.');
      return;
    }

    targetRoomsForBulkDeploy.forEach((room) => {
      const serialNum = bulkDeploySerialPrefix.trim()
        ? `${bulkDeploySerialPrefix.trim()}-${room.roomNumber.replace(/\s+/g, '')}`
        : '';

      onAddDeployedItem(
        room.id,
        {
          name: bulkDeployItemName.trim(),
          category: bulkDeployCategory,
          quantity: qtyPerRoom,
          unit: bulkDeployUnit.trim() || 'unit',
          unitCost: unitCost,
          condition: bulkDeployCondition,
          serialNumber: serialNum,
          dateDeployed: bulkDeployDate,
          notes: bulkDeployNotes.trim() || `Bulk deployed across ${targetRoomsForBulkDeploy.length} rooms`
        },
        false
      );
    });

    if (selectedInvItem && bulkAutoDeductStock) {
      const newStock = Math.max(0, selectedInvItem.currentStock - totalQtyRequired);
      onUpdateStock(selectedInvItem.id, newStock);
    }

    setBulkDeploySuccessMsg(
      `Successfully added "${bulkDeployItemName.trim()}" (${qtyPerRoom} ${bulkDeployUnit}/room) to all ${targetRoomsForBulkDeploy.length} room(s)! Total deployed: ${totalQtyRequired} ${bulkDeployUnit} (Valuation: ₱${(totalQtyRequired * unitCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`
    );
    setIsBulkDeployModalOpen(false);
  };

  // Form States
  const [itemName, setItemName] = useState('');
  const [itemStock, setItemStock] = useState('0');
  const [itemUnit, setItemUnit] = useState('kg');
  const [itemCost, setItemCost] = useState('0');
  const [itemMinStock, setItemMinStock] = useState('0');
  const [itemSupplier, setItemSupplier] = useState('');
  const [itemSection, setItemSection] = useState<InventorySection>('KITCHEN');
  const [itemAuditDate, setItemAuditDate] = useState('');
  const [itemAuditRemarks, setItemAuditRemarks] = useState('');

  // Quick Adjustment states
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('1');

  // Audit Feature States
  const [auditFilter, setAuditFilter] = useState<'all' | 'audited' | 'pending'>('all');
  const [auditingItem, setAuditingItem] = useState<InventoryItem | null>(null);
  const [auditDate, setAuditDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [auditedBy, setAuditedBy] = useState<string>(currentUser.name);
  const [auditRemarks, setAuditRemarks] = useState<string>('');
  const [auditCountedStock, setAuditCountedStock] = useState<string>('0');
  const [updateStockOnAudit, setUpdateStockOnAudit] = useState<boolean>(true);
  const [auditSuccessMsg, setAuditSuccessMsg] = useState<string | null>(null);

  // Tab Batch Audit States
  const [isBatchAuditingTab, setIsBatchAuditingTab] = useState<boolean>(false);
  const [batchAuditDate, setBatchAuditDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [batchAuditor, setBatchAuditor] = useState<string>(currentUser.name);
  const [batchGeneralRemarks, setBatchGeneralRemarks] = useState<string>('Periodic inventory audit completed. Physical count and conditions verified.');
  const [batchItemCounts, setBatchItemCounts] = useState<Record<string, { countedStock: number; remarks: string }>>({});

  // Room Deployed Item Audit States
  const [auditingDeployedItem, setAuditingDeployedItem] = useState<{ room: HotelRoom; item: DeployedEquipment } | null>(null);
  const [deployedAuditDate, setDeployedAuditDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deployedAuditRemarks, setDeployedAuditRemarks] = useState<string>('');
  const [deployedAuditedBy, setDeployedAuditedBy] = useState<string>(currentUser.name);

  // Sub-filter for General Rooms Inventory (All vs Reserve vs Deployed)
  const [roomsStockView, setRoomsStockView] = useState<'all' | 'reserve' | 'deployed'>('all');

  // Deployed Item details modal state
  const [viewingDeployedDetails, setViewingDeployedDetails] = useState<{
    name: string;
    category: string;
    unit: string;
    unitCost: number;
    totalQuantity: number;
    roomsCount: number;
    roomList: string[];
    roomBreakdown: Array<{ roomNumber: string; quantity: number; condition: string }>;
    conditionBreakdown: { good: number; repair: number; replaced: number; missing: number };
  } | null>(null);

  // Editing Aggregated Deployed Item Modal state
  const [editingAggregatedDeployedItem, setEditingAggregatedDeployedItem] = useState<{
    name: string;
    category: string;
    unit: string;
    unitCost: number;
    totalQuantity: number;
    roomsCount: number;
  } | null>(null);
  const [editAggName, setEditAggName] = useState('');
  const [editAggCat, setEditAggCat] = useState('');
  const [editAggPrice, setEditAggPrice] = useState('0');
  const [editAggUnit, setEditAggUnit] = useState('unit');

  const openEditAggregatedDeployedItem = (dep: { name: string; category: string; unit: string; unitCost: number; totalQuantity: number; roomsCount: number }) => {
    setEditingAggregatedDeployedItem(dep);
    setEditAggName(dep.name);
    setEditAggCat(dep.category);
    setEditAggPrice(String(dep.unitCost || 0));
    setEditAggUnit(dep.unit || 'unit');
  };

  // Aggregated deployed items across all rooms for General Rooms Inventory Stock
  const aggregatedDeployedItems = useMemo(() => {
    const map = new Map<string, {
      name: string;
      category: string;
      unit: string;
      unitCost: number;
      totalQuantity: number;
      roomsCount: number;
      roomList: string[];
      roomBreakdown: Array<{ roomNumber: string; quantity: number; condition: string }>;
      conditionBreakdown: { good: number; repair: number; replaced: number; missing: number };
    }>();

    (rooms || []).forEach(room => {
      (room.deployedItems || []).forEach(item => {
        const key = item.name.trim().toLowerCase();
        const existing = map.get(key);
        const condition = item.condition || 'Good / Working';

        if (existing) {
          existing.totalQuantity += item.quantity;
          if (!existing.roomList.includes(room.roomNumber)) {
            existing.roomList.push(room.roomNumber);
            existing.roomsCount += 1;
          }
          existing.roomBreakdown.push({
            roomNumber: room.roomNumber,
            quantity: item.quantity,
            condition: condition
          });
          if (item.unitCost && item.unitCost > 0) {
            existing.unitCost = item.unitCost;
          }
          if (condition === 'Good / Working') existing.conditionBreakdown.good += item.quantity;
          else if (condition === 'Needs Repair') existing.conditionBreakdown.repair += item.quantity;
          else if (condition === 'Replaced') existing.conditionBreakdown.replaced += item.quantity;
          else if (condition === 'Missing') existing.conditionBreakdown.missing += item.quantity;
        } else {
          map.set(key, {
            name: item.name,
            category: item.category || 'General',
            unit: item.unit || 'units',
            unitCost: item.unitCost || 0,
            totalQuantity: item.quantity,
            roomsCount: 1,
            roomList: [room.roomNumber],
            roomBreakdown: [{
              roomNumber: room.roomNumber,
              quantity: item.quantity,
              condition: condition
            }],
            conditionBreakdown: {
              good: condition === 'Good / Working' ? item.quantity : 0,
              repair: condition === 'Needs Repair' ? item.quantity : 0,
              replaced: condition === 'Replaced' ? item.quantity : 0,
              missing: condition === 'Missing' ? item.quantity : 0,
            }
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const filteredAggregatedDeployedItems = useMemo(() => {
    return aggregatedDeployedItems.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.roomList.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [aggregatedDeployedItems, searchTerm]);

  // Computed metrics
  const summary = useMemo(() => {
    const sectionItems = inventory.filter(item => (item.section || 'KITCHEN') === sectionFilter);
    let totalCost = sectionItems.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0);
    let totalItems = sectionItems.length;

    if (sectionFilter === 'ROOMS') {
      const deployedValuation = aggregatedDeployedItems.reduce((sum, item) => sum + (item.totalQuantity * item.unitCost), 0);
      totalCost += deployedValuation;
      totalItems += aggregatedDeployedItems.length;
    }

    return { totalCost, totalItems };
  }, [inventory, sectionFilter, aggregatedDeployedItems]);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const itemSectionValue = item.section || 'KITCHEN';
      if (itemSectionValue !== sectionFilter) return false;

      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;

      if (auditFilter === 'audited' && !item.lastAuditDate) return false;
      if (auditFilter === 'pending' && item.lastAuditDate) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(query);
        const supplierMatch = item.supplier.toLowerCase().includes(query);
        const categoryMatch = item.category.toLowerCase().includes(query);
        const remarksMatch = (item.auditRemarks || '').toLowerCase().includes(query);
        return nameMatch || supplierMatch || categoryMatch || remarksMatch;
      }

      return true;
    });
  }, [inventory, searchTerm, sectionFilter, categoryFilter, auditFilter]);

  // Handlers
  const handleExecuteSingleAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditingItem) return;

    const newStock = updateStockOnAudit ? (parseFloat(auditCountedStock) || 0) : auditingItem.currentStock;

    onEditItem({
      ...auditingItem,
      currentStock: newStock,
      lastAuditDate: auditDate,
      auditRemarks: auditRemarks.trim(),
      auditedBy: auditedBy.trim() || currentUser.name,
      lastUpdated: new Date().toISOString()
    });

    setAuditSuccessMsg(`Audit recorded for "${auditingItem.name}"! Audit Date: ${auditDate}.`);
    setAuditingItem(null);
  };

  const handleExecuteBatchAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const itemsInTab = inventory.filter(i => (i.section || 'KITCHEN') === sectionFilter);
    if (itemsInTab.length === 0) return;

    itemsInTab.forEach(item => {
      const override = batchItemCounts[item.id];
      const finalStock = override?.countedStock !== undefined ? override.countedStock : item.currentStock;
      const finalRemarks = override?.remarks?.trim() ? override.remarks.trim() : batchGeneralRemarks.trim();

      onEditItem({
        ...item,
        currentStock: finalStock,
        lastAuditDate: batchAuditDate,
        auditRemarks: finalRemarks,
        auditedBy: batchAuditor.trim() || currentUser.name,
        lastUpdated: new Date().toISOString()
      });
    });

    setAuditSuccessMsg(`Successfully completed batch audit for all ${itemsInTab.length} items in ${getSectionName(sectionFilter)} tab! Audit date: ${batchAuditDate}.`);
    setIsBatchAuditingTab(false);
  };

  const handleExecuteDeployedAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditingDeployedItem || !onUpdateDeployedItem) return;

    const { room, item } = auditingDeployedItem;
    onUpdateDeployedItem(room.id, {
      ...item,
      lastAuditDate: deployedAuditDate,
      auditRemarks: deployedAuditRemarks.trim(),
      auditedBy: deployedAuditedBy.trim() || currentUser.name
    });

    setAuditSuccessMsg(`Audit recorded for deployed equipment "${item.name}" in ${room.roomNumber}!`);
    setAuditingDeployedItem(null);
  };

  // Handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemSupplier.trim()) return;

    const targetSection = itemSection || sectionFilter;

    onAddItem({
      name: itemName.trim(),
      category: 'General',
      currentStock: parseFloat(itemStock) || 0,
      unit: itemUnit,
      unitCost: parseFloat(itemCost) || 0,
      minStock: parseFloat(itemMinStock) || 0,
      supplier: itemSupplier.trim(),
      section: targetSection,
      lastAuditDate: itemAuditDate.trim() || undefined,
      auditRemarks: itemAuditRemarks.trim() || undefined,
      auditedBy: itemAuditDate.trim() ? currentUser.name : undefined
    });

    // Reset Form
    setItemName('');
    setItemStock('0');
    setItemUnit('kg');
    setItemCost('0');
    setItemMinStock('0');
    setItemSupplier('');
    setItemAuditDate('');
    setItemAuditRemarks('');
    setItemSection(sectionFilter);
    setIsAddingItem(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingItem || !isEditingItem.name.trim()) return;

    onEditItem(isEditingItem);
    setIsEditingItem(null);
  };

  const triggerEdit = (item: InventoryItem) => {
    setIsEditingItem({ ...item });
  };

  const handleQuickAdjust = (itemId: string, direction: 'add' | 'subtract') => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const amount = parseFloat(adjustAmount) || 1;
    const modifier = direction === 'add' ? amount : -amount;
    const newStock = Math.max(0, item.currentStock + modifier);

    onUpdateStock(itemId, newStock);
    setAdjustingId(null);
    setAdjustAmount('1');
  };

  return (
    <div className="space-y-6 font-sans text-[#3E312C]" id="inventory-tab">
      
      {/* Success Alert Banner for Inventory Audit */}
      {auditSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200" id="audit-success-banner">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{auditSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setAuditSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Success Alert Banner for Item Transfer */}
      {transferSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200" id="transfer-success-banner">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{transferSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setTransferSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Success Alert Banner for Room Duplication */}
      {dupSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200" id="dup-success-banner">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{dupSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setDupSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Success Alert Banner for Bulk Room Item Deployment */}
      {bulkDeploySuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200" id="bulk-deploy-success-banner">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{bulkDeploySuccessMsg}</span>
          </div>
          <button 
            onClick={() => setBulkDeploySuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Top Banner & Costing Summary */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-sm" id="inventory-summary-header">
        <div>
          <h2 className="font-serif text-2xl text-[#3E312C]">Hotel Inventory & Costing Records</h2>
        </div>

        <div className="flex flex-wrap gap-4 items-center" id="inventory-costing-badges">
          {/* Total Cost Display */}
          <div className="bg-[#FAF9F5] border border-[#EBE6DD] px-4 py-2.5 rounded-[24px] flex items-center gap-3">
            <div className="bg-[#3E312C] text-white px-2.5 py-0.5 rounded-xl font-bold font-sans text-sm select-none leading-none">
              ₱
            </div>
            <div>
              <p className="text-[10px] text-[#8C7A6B] font-bold uppercase tracking-wider font-mono leading-none">Total Inventory Cost</p>
              <p className="text-lg font-serif font-bold text-[#3E312C] mt-0.5">₱{summary.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Total Items Display */}
          <div className="bg-[#FAF9F5] border border-[#EBE6DD] px-4 py-2.5 rounded-[24px] flex items-center gap-3">
            <div className="bg-[#3E312C] text-white p-2 rounded-xl">
              <PackageCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#8C7A6B] font-bold uppercase tracking-wider font-mono leading-none">Total Products Listed</p>
              <p className="text-lg font-serif font-bold text-[#3E312C] mt-0.5">{summary.totalItems} Items</p>
            </div>
          </div>

          {/* Add Item or File Damage Report Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('damage_reports')}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs px-4 py-3 rounded-full transition-all shadow-2xs cursor-pointer"
                id="file-damage-report-btn"
                title="File a damage or incident report for inventory items"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>File Damage Report</span>
              </button>
            )}

            {isAdmin ? (
              <button
                onClick={() => {
                  setItemSection(sectionFilter);
                  setIsAddingItem(true);
                }}
                className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-5 py-3 rounded-full transition-all shadow-xs cursor-pointer"
                id="admin-add-item-btn"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            ) : (
              <div className="text-xs text-[#8C7A6B] border border-[#EBE6DD] px-3.5 py-2.5 rounded-full bg-[#FAF9F5] italic">
                Staff Account
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adding Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="add-item-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-lg w-full p-6 shadow-lg relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setIsAddingItem(false)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-5">
              <h3 className="font-serif text-xl text-[#3E312C]">Add New {getSectionName(itemSection)} Item</h3>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="new-item-name" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Product Name</label>
                  <input
                    id="new-item-name"
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                    placeholder={itemSection === 'KITCHEN' ? "e.g. Fresh Chicken Breast" : "e.g. Luxury Bath Towels"}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="new-item-section" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Target Inventory Tab / Section</label>
                  <select
                    id="new-item-section"
                    value={itemSection}
                    onChange={(e) => setItemSection(e.target.value as InventorySection)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white font-semibold"
                  >
                    <option value="KITCHEN">Kitchen</option>
                    <option value="ROOMS">Rooms</option>
                    <option value="HOUSEKEEPING">Housekeeping Supplies</option>
                    <option value="HOUSEKEEPING_EQUIPMENTS">Housekeeping Equipments</option>
                    <option value="HR_EQUIPMENTS">H.R Equipments</option>
                    <option value="FO_EQUIPMENTS">F.O Equipments</option>
                    <option value="FINANCE_EQUIPMENTS">Finance Equipments</option>
                    <option value="SECURITY_POST_EQUIPMENTS">Security Post Equipments</option>
                    <option value="IT_EQUIPMENTS">I.T Equipments</option>
                    <option value="LINENS">Linens</option>
                    <option value="INDUSTRIAL_EQUIPMENTS">Industrial Equipments</option>
                    <option value="LUZON">Luzon</option>
                    <option value="VISAYAS">Visayas</option>
                    <option value="MINDANAO">Old H.R Office</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-item-unit" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Measurement Unit</label>
                  <input
                    id="new-item-unit"
                    type="text"
                    required
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                    placeholder="e.g. kg, liters, cases"
                  />
                </div>

                <div>
                  <label htmlFor="new-item-stock" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Initial Stock Level</label>
                  <input
                    id="new-item-stock"
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={itemStock}
                    onChange={(e) => setItemStock(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="new-item-cost" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Unit Cost (₱)</label>
                  <input
                    id="new-item-cost"
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="new-item-supplier" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Default Supplier</label>
                  <input
                    id="new-item-supplier"
                    type="text"
                    required
                    value={itemSupplier}
                    onChange={(e) => setItemSupplier(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                    placeholder="e.g. Valley Dairy Farm"
                  />
                </div>

                <div>
                  <label htmlFor="new-item-audit-date" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audit Date (Optional)</label>
                  <input
                    id="new-item-audit-date"
                    type="date"
                    value={itemAuditDate}
                    onChange={(e) => setItemAuditDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="new-item-audit-remarks" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audit Remarks (Optional)</label>
                  <input
                    id="new-item-audit-remarks"
                    type="text"
                    value={itemAuditRemarks}
                    onChange={(e) => setItemAuditRemarks(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                    placeholder="e.g. Initial stock count verified upon arrival."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
                >
                  Save Product Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editing Item Modal */}
      {isEditingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="edit-item-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-lg w-full p-6 shadow-lg relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setIsEditingItem(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-5">
              <h3 className="font-serif text-xl text-[#3E312C]">Edit Inventory Item</h3>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="edit-item-name" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Product Name</label>
                  <input
                    id="edit-item-name"
                    type="text"
                    required
                    value={isEditingItem.name}
                    onChange={(e) => setIsEditingItem({ ...isEditingItem, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="edit-item-section" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Inventory Section</label>
                  <select
                    id="edit-item-section"
                    value={isEditingItem.section || 'KITCHEN'}
                    onChange={(e) => setIsEditingItem({ ...isEditingItem, section: e.target.value as InventorySection })}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white font-semibold"
                  >
                    <option value="KITCHEN">Kitchen</option>
                    <option value="ROOMS">Rooms</option>
                    <option value="HOUSEKEEPING">Housekeeping Supplies</option>
                    <option value="HOUSEKEEPING_EQUIPMENTS">Housekeeping Equipments</option>
                    <option value="HR_EQUIPMENTS">H.R Equipments</option>
                    <option value="FO_EQUIPMENTS">F.O Equipments</option>
                    <option value="FINANCE_EQUIPMENTS">Finance Equipments</option>
                    <option value="SECURITY_POST_EQUIPMENTS">Security Post Equipments</option>
                    <option value="IT_EQUIPMENTS">I.T Equipments</option>
                    <option value="LINENS">Linens</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-item-unit" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Measurement Unit</label>
                  <input
                    id="edit-item-unit"
                    type="text"
                    required
                    value={isEditingItem.unit}
                    onChange={(e) => setIsEditingItem({ ...isEditingItem, unit: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="edit-item-stock" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Current Stock</label>
                  <input
                    id="edit-item-stock"
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={isEditingItem.currentStock}
                    onChange={(e) => setIsEditingItem({ ...isEditingItem, currentStock: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="edit-item-cost" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Unit Cost (₱)</label>
                  <input
                    id="edit-item-cost"
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={isEditingItem.unitCost}
                    onChange={(e) => setIsEditingItem({ ...isEditingItem, unitCost: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="edit-item-supplier" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Default Supplier</label>
                  <input
                    id="edit-item-supplier"
                    type="text"
                    required
                    value={isEditingItem.supplier}
                    onChange={(e) => setIsEditingItem({ ...isEditingItem, supplier: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="edit-item-audit-date" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Last Audit Date</label>
                  <input
                    id="edit-item-audit-date"
                    type="date"
                    value={isEditingItem.lastAuditDate || ''}
                    onChange={(e) => setIsEditingItem({ ...isEditingItem, lastAuditDate: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="edit-item-audit-remarks" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audit Remarks</label>
                  <input
                    id="edit-item-audit-remarks"
                    type="text"
                    value={isEditingItem.auditRemarks || ''}
                    onChange={(e) => setIsEditingItem({ ...isEditingItem, auditRemarks: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] text-sm bg-white"
                    placeholder="e.g. Stock count verified. Good condition."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setIsEditingItem(null)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Item Audit Modal */}
      {auditingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="single-item-audit-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              type="button"
              onClick={() => setAuditingItem(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-5 flex items-center gap-2">
              <div className="p-2 bg-[#3E312C] text-white rounded-xl">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#3E312C]">Audit Inventory Item</h3>
                <p className="text-xs text-[#8C7A6B]">Record audit inspection date and physical remarks for {auditingItem.name}</p>
              </div>
            </div>

            <form onSubmit={handleExecuteSingleAudit} className="space-y-4">
              <div className="bg-[#FAF9F5] border border-[#EBE6DD] p-3.5 rounded-2xl space-y-1">
                <p className="text-xs font-bold text-[#3E312C]">{auditingItem.name}</p>
                <div className="flex flex-wrap justify-between text-xs text-[#8C7A6B]">
                  <span>Section: <strong className="text-[#3E312C]">{getSectionName(auditingItem.section || 'KITCHEN')}</strong></span>
                  <span>System Stock: <strong className="text-[#3E312C] font-mono">{auditingItem.currentStock} {auditingItem.unit}</strong></span>
                  <span>Unit Cost: <strong className="text-[#3E312C] font-mono">₱{auditingItem.unitCost.toFixed(2)}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="audit-date-input" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audit Date *</label>
                  <input
                    id="audit-date-input"
                    type="date"
                    required
                    value={auditDate}
                    onChange={(e) => setAuditDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] text-sm bg-white font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="auditor-name-input" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audited By *</label>
                  <input
                    id="auditor-name-input"
                    type="text"
                    required
                    value={auditedBy}
                    onChange={(e) => setAuditedBy(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] text-sm bg-white font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="counted-stock-input" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Physical Counted Stock ({auditingItem.unit})</label>
                    <label className="flex items-center gap-1.5 text-xs text-[#3E312C] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateStockOnAudit}
                        onChange={(e) => setUpdateStockOnAudit(e.target.checked)}
                        className="rounded border-[#E6E4DD] text-[#3E312C] focus:ring-[#3E312C]"
                      />
                      <span>Update system stock level</span>
                    </label>
                  </div>
                  <input
                    id="counted-stock-input"
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={auditCountedStock}
                    onChange={(e) => setAuditCountedStock(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] text-sm bg-white font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="audit-remarks-textarea" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audit Remarks & Notes *</label>
                  <textarea
                    id="audit-remarks-textarea"
                    required
                    rows={3}
                    value={auditRemarks}
                    onChange={(e) => setAuditRemarks(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] text-sm bg-white"
                    placeholder="e.g. Physical count matches system record. All stock in good condition."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setAuditingItem(null)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-bold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Save Audit Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Batch Audit Modal */}
      {isBatchAuditingTab && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="batch-tab-audit-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-3xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <button 
              type="button"
              onClick={() => setIsBatchAuditingTab(false)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-4 flex items-center gap-3">
              <div className="p-2.5 bg-[#3E312C] text-white rounded-2xl">
                <ClipboardList className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#3E312C]">{getSectionName(sectionFilter)} Section Batch Audit</h3>
                <p className="text-xs text-[#8C7A6B]">Conduct a complete audit for all items in the {getSectionName(sectionFilter)} tab</p>
              </div>
            </div>

            <form onSubmit={handleExecuteBatchAudit} className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Batch Audit Date *</label>
                  <input
                    type="date"
                    required
                    value={batchAuditDate}
                    onChange={(e) => setBatchAuditDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-sm bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audited By *</label>
                  <input
                    type="text"
                    required
                    value={batchAuditor}
                    onChange={(e) => setBatchAuditor(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-sm bg-white font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Default Remarks for All Items *</label>
                  <input
                    type="text"
                    required
                    value={batchGeneralRemarks}
                    onChange={(e) => setBatchGeneralRemarks(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-sm bg-white"
                  />
                </div>
              </div>

              {/* Items List Table inside Batch Audit Modal */}
              <div className="flex-1 overflow-y-auto border border-[#E6E4DD] rounded-2xl my-2">
                <table className="min-w-full divide-y divide-[#F0EFE9] text-xs">
                  <thead className="bg-[#FAF9F5] sticky top-0 font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">
                    <tr>
                      <th className="px-3 py-2 text-left">Item Name</th>
                      <th className="px-3 py-2 text-center">System Stock</th>
                      <th className="px-3 py-2 text-center">Counted Stock</th>
                      <th className="px-3 py-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFE9] bg-white">
                    {inventory.filter(i => (i.section || 'KITCHEN') === sectionFilter).map(item => {
                      const currentOverride = batchItemCounts[item.id] || { countedStock: item.currentStock, remarks: '' };

                      return (
                        <tr key={item.id} className="hover:bg-[#FAF9F5]">
                          <td className="px-3 py-2.5 font-bold text-[#3E312C]">
                            {item.name}
                            <span className="block text-[10px] text-[#8C7A6B] font-mono">{item.unit} • ₱{item.unitCost.toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-[#3E312C]">
                            {item.currentStock} {item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={currentOverride.countedStock}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setBatchItemCounts(prev => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], countedStock: val, remarks: prev[item.id]?.remarks || '' }
                                }));
                              }}
                              className="w-20 text-center px-2 py-1 border border-[#E6E4DD] rounded-lg font-mono font-bold bg-white text-[#3E312C]"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              placeholder={batchGeneralRemarks || "Optional custom note"}
                              value={currentOverride.remarks}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchItemCounts(prev => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], countedStock: prev[item.id]?.countedStock ?? item.currentStock, remarks: val }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-[#E6E4DD] rounded-lg bg-white text-[#3E312C]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#F0EFE9]">
                <span className="text-xs text-[#8C7A6B] font-semibold">
                  Auditing {inventory.filter(i => (i.section || 'KITCHEN') === sectionFilter).length} items in {getSectionName(sectionFilter)}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBatchAuditingTab(false)}
                    className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-bold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
                  >
                    <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                    <span>Complete Tab Batch Audit</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deployed Equipment Audit Modal */}
      {auditingDeployedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="deployed-item-audit-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              type="button"
              onClick={() => setAuditingDeployedItem(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-5 flex items-center gap-2">
              <div className="p-2 bg-[#3E312C] text-white rounded-xl">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#3E312C]">Audit Deployed Asset</h3>
                <p className="text-xs text-[#8C7A6B]">Record inspection for {auditingDeployedItem.item.name} in {auditingDeployedItem.room.roomNumber}</p>
              </div>
            </div>

            <form onSubmit={handleExecuteDeployedAudit} className="space-y-4">
              <div className="bg-[#FAF9F5] border border-[#EBE6DD] p-3.5 rounded-2xl space-y-1 text-xs">
                <p className="font-bold text-[#3E312C]">{auditingDeployedItem.item.name} ({auditingDeployedItem.item.quantity} {auditingDeployedItem.item.unit})</p>
                <p className="text-[#8C7A6B]">Installed in: <strong className="text-[#3E312C]">{auditingDeployedItem.room.roomNumber} ({auditingDeployedItem.room.roomType})</strong></p>
                {auditingDeployedItem.item.serialNumber && (
                  <p className="text-[#8C7A6B] font-mono">Serial / Asset Tag: {auditingDeployedItem.item.serialNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dep-audit-date" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audit Date *</label>
                  <input
                    id="dep-audit-date"
                    type="date"
                    required
                    value={deployedAuditDate}
                    onChange={(e) => setDeployedAuditDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-sm bg-white font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="dep-auditor-name" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audited By *</label>
                  <input
                    id="dep-auditor-name"
                    type="text"
                    required
                    value={deployedAuditedBy}
                    onChange={(e) => setDeployedAuditedBy(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-sm bg-white font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="dep-audit-remarks" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Audit Remarks & Condition *</label>
                  <textarea
                    id="dep-audit-remarks"
                    required
                    rows={3}
                    value={deployedAuditRemarks}
                    onChange={(e) => setDeployedAuditRemarks(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-sm bg-white"
                    placeholder="e.g. Asset inspected in room. Fully functional and in good working condition."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setAuditingDeployedItem(null)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-bold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Save Asset Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section Tab Switcher */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start" id="section-selector-tabs">
        <div className="flex flex-wrap p-1 bg-[#FAF9F5] border border-[#EBE6DD] rounded-[24px] shadow-2xs gap-1">
          {[
            { value: 'KITCHEN', label: 'Kitchen', icon: <ChefHat className="h-4.5 w-4.5" /> },
            { value: 'ROOMS', label: 'Rooms', icon: <Home className="h-4.5 w-4.5" /> },
            { value: 'HOUSEKEEPING', label: 'Housekeeping Supplies', icon: <BedDouble className="h-4.5 w-4.5" /> },
            { value: 'HOUSEKEEPING_EQUIPMENTS', label: 'Housekeeping Equipments', icon: <Wrench className="h-4.5 w-4.5" /> },
            { value: 'HR_EQUIPMENTS', label: 'H.R Equipments', icon: <Users className="h-4.5 w-4.5" /> },
            { value: 'FO_EQUIPMENTS', label: 'F.O Equipments', icon: <Monitor className="h-4.5 w-4.5" /> },
            { value: 'FINANCE_EQUIPMENTS', label: 'Finance Equipments', icon: <DollarSign className="h-4.5 w-4.5" /> },
            { value: 'SECURITY_POST_EQUIPMENTS', label: 'Security Post Equipments', icon: <Shield className="h-4.5 w-4.5" /> },
            { value: 'IT_EQUIPMENTS', label: 'I.T Equipments', icon: <Cpu className="h-4.5 w-4.5" /> },
            { value: 'LINENS', label: 'Linens', icon: <Shirt className="h-4.5 w-4.5" /> },
            { value: 'INDUSTRIAL_EQUIPMENTS', label: 'Industrial Equipments', icon: <Building2 className="h-4.5 w-4.5" /> },
            { value: 'LUZON', label: 'Luzon', icon: <Layers className="h-4.5 w-4.5" /> },
            { value: 'VISAYAS', label: 'Visayas', icon: <Layers className="h-4.5 w-4.5" /> },
            { value: 'MINDANAO', label: 'Old H.R Office', icon: <Layers className="h-4.5 w-4.5" /> },
          ].map((sec) => (
            <button
              key={sec.value}
              onClick={() => {
                setSectionFilter(sec.value as InventorySection);
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-[18px] text-xs font-bold transition-all cursor-pointer ${
                sectionFilter === sec.value
                  ? 'bg-[#3E312C] text-white shadow-xs'
                  : 'text-[#8C7A6B] hover:text-[#3E312C]'
              }`}
            >
              {sec.icon}
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Sub-View Switcher */}
      {sectionFilter === 'ROOMS' && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-[#F4F2EB] p-2.5 rounded-[22px] border border-[#E6E4DD] shadow-2xs gap-3" id="rooms-subnav-bar">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setRoomsSubView('deployed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                roomsSubView === 'deployed'
                  ? 'bg-[#3E312C] text-white shadow-xs'
                  : 'text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#EBE6DD]'
              }`}
            >
              <BedDouble className="h-4 w-4" />
              Per-Room Deployed Equipment ({rooms.length} Rooms)
            </button>
            <button
              type="button"
              onClick={() => setRoomsSubView('stock')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                roomsSubView === 'stock'
                  ? 'bg-[#3E312C] text-white shadow-xs'
                  : 'text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#EBE6DD]'
              }`}
            >
              <Package className="h-4 w-4" />
              General Rooms Inventory Stock
            </button>
          </div>

          {roomsSubView === 'deployed' && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {rooms.length > 0 && (
                <button
                  type="button"
                  onClick={() => openDuplicateRoomModal(rooms[0])}
                  className="flex items-center gap-1.5 bg-white border border-[#E6E4DD] hover:bg-[#FAF9F5] text-[#3E312C] font-semibold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-colors shadow-2xs"
                  title="Duplicate an existing room setup to create new identical rooms"
                >
                  <Copy className="h-4 w-4 text-[#8C7355]" />
                  Duplicate Room
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setNewRoomNumber('');
                  setNewRoomType('Deluxe Rooms');
                  setNewRoomFloor('1st Floor');
                  setNewRoomNotes('');
                  setIsAddingRoom(true);
                }}
                className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="h-4 w-4" />
                Add Room
              </button>
              <button
                type="button"
                onClick={() => openBulkDeployModal('all')}
                className="flex items-center gap-1.5 bg-[#8C7355] hover:bg-[#745E44] text-white font-semibold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-colors shadow-2xs"
                title="Add equipment or amenity item to all rooms at once"
                id="add-item-to-all-rooms-btn"
              >
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-white font-semibold">Add Item to All Rooms</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (rooms.length === 0) return;
                  setDeployingToRoom(rooms[0]);
                  setDeployItemName('');
                  setDeployItemQty('1');
                  setDeployItemCost('0');
                  setDeployItemSerial('');
                }}
                className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-colors shadow-2xs"
              >
                <FolderPlus className="h-4 w-4 text-white" />
                <span className="text-white font-semibold">Deploy Equipment</span>
              </button>
              <button
                type="button"
                onClick={handlePrintAllRoomsAudit}
                className="flex items-center gap-1.5 bg-white border border-[#E6E4DD] hover:bg-[#FAF9F5] text-[#3E312C] font-semibold text-xs px-3 py-2 rounded-xl cursor-pointer transition-colors"
                title="Export Master Rooms Audit Sheet in PDF"
              >
                <Printer className="h-3.5 w-3.5" />
                Master PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conditional Rendering: Per-Room Management vs General Inventory Table */}
      {sectionFilter === 'ROOMS' && roomsSubView === 'deployed' ? (
        <div className="space-y-6" id="per-room-management-container">
          {/* Top KPI Metrics for Rooms */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-[#E6E4DD] p-4 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Total Hotel Rooms</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-[#3E312C] font-mono">{rooms.length}</span>
                <span className="text-xs text-[#8C7A6B]">Registered</span>
              </div>
            </div>

            <div className="bg-white border border-[#E6E4DD] p-4 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Deployed Equipment Items</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-[#3E312C] font-mono">{totalDeployedItemsCount}</span>
                <span className="text-xs text-[#8C7A6B]">In-use Assets</span>
              </div>
            </div>

            <div className="bg-white border border-[#E6E4DD] p-4 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Total Room Assets Value</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-800 font-mono">₱{totalRoomsValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="bg-white border border-[#E6E4DD] p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Avg Assets per Room</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-[#3E312C] font-mono">
                  {rooms.length > 0 ? (totalDeployedItemsCount / rooms.length).toFixed(1) : 0}
                </span>
                <span className="text-xs text-[#8C7A6B]">items / room</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar for Rooms */}
          <div className="bg-white border border-[#E6E4DD] rounded-[24px] p-4 shadow-2xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#8C7A6B]" />
              </div>
              <input
                type="text"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search room number, group/type, floor, or equipment..."
                className="block w-full pl-9 pr-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] bg-white placeholder-[#8C7A6B]/60 focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] text-xs font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Room Group / Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#8C7A6B] uppercase font-mono">Type:</span>
                <select
                  value={roomTypeFilter}
                  onChange={(e) => setRoomTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                >
                  <option value="All">All Room Types ({uniqueRoomTypes.length})</option>
                  {uniqueRoomTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Floor Filter */}
              {uniqueFloors.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#8C7A6B] uppercase font-mono">Floor:</span>
                  <select
                    value={roomFloorFilter}
                    onChange={(e) => setRoomFloorFilter(e.target.value)}
                    className="px-2.5 py-1.5 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  >
                    <option value="All">All Floors</option>
                    {uniqueFloors.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Grouping View Switcher */}
              <div className="flex items-center bg-[#F4F2EB] p-0.5 border border-[#E6E4DD] rounded-xl">
                <button
                  type="button"
                  onClick={() => setRoomGroupingMode('type')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    roomGroupingMode === 'type'
                      ? 'bg-[#3E312C] text-white shadow-2xs'
                      : 'text-[#8C7A6B] hover:text-[#3E312C]'
                  }`}
                  title="Group rooms by Room Type / Category"
                >
                  Group by Type
                </button>
                <button
                  type="button"
                  onClick={() => setRoomGroupingMode('floor')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    roomGroupingMode === 'floor'
                      ? 'bg-[#3E312C] text-white shadow-2xs'
                      : 'text-[#8C7A6B] hover:text-[#3E312C]'
                  }`}
                  title="Group rooms by Floor"
                >
                  By Floor
                </button>
                <button
                  type="button"
                  onClick={() => setRoomGroupingMode('flat')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    roomGroupingMode === 'flat'
                      ? 'bg-[#3E312C] text-white shadow-2xs'
                      : 'text-[#8C7A6B] hover:text-[#3E312C]'
                  }`}
                  title="View all rooms in a single flat list"
                >
                  All List
                </button>
              </div>

              {(roomSearch || roomFloorFilter !== 'All' || roomTypeFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setRoomSearch('');
                    setRoomFloorFilter('All');
                    setRoomTypeFilter('All');
                  }}
                  className="text-xs text-[#8C7A6B] hover:text-[#3E312C] px-2.5 py-1.5 border border-[#E6E4DD] rounded-xl font-semibold hover:bg-[#FAF9F5]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Room Cards List / Grouped Views */}
          {filteredRooms.length > 0 ? (
            <div className="space-y-6">
              {roomGroupingMode === 'type' && (
                (Object.entries(groupedRoomsByType) as [string, HotelRoom[]][]).map(([groupType, groupRooms]) => {
                  const isCollapsed = !!collapsedRoomGroups[`type-${groupType}`];
                  const groupDeployedCount = groupRooms.reduce((acc, r) => acc + (r.deployedItems?.reduce((s, i) => s + i.quantity, 0) || 0), 0);
                  const groupValuation = groupRooms.reduce((acc, r) => acc + (r.deployedItems?.reduce((s, i) => s + (i.quantity * (i.unitCost || 0)), 0) || 0), 0);

                  return (
                    <div key={groupType} className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-[28px] p-4 sm:p-5 shadow-2xs space-y-4">
                      {/* Group Header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E4DD] pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-[#8C7355] text-white rounded-2xl shadow-2xs">
                            <Layers className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-serif text-base sm:text-lg font-bold text-[#3E312C]">{groupType}</h3>
                              <span className="text-xs font-bold text-[#3E312C] bg-white border border-[#E6E4DD] px-2.5 py-0.5 rounded-full font-mono">
                                {groupRooms.length} {groupRooms.length === 1 ? 'Room' : 'Rooms'}
                              </span>
                            </div>
                            <p className="text-xs text-[#8C7A6B] mt-0.5">
                              Room Group • {groupDeployedCount} Assets Deployed • Total Valuation: ₱{groupValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => openBulkDeployModal('type', groupType)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-2xs"
                            title={`Add item to all ${groupRooms.length} rooms in ${groupType}`}
                          >
                            <Plus className="h-3.5 w-3.5 text-white" />
                            <span className="text-white font-semibold">Deploy to Group ({groupRooms.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCollapsedRoomGroups(prev => ({ ...prev, [`type-${groupType}`]: !prev[`type-${groupType}`] }))}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6E4DD] hover:bg-[#F4F2EB] text-[#3E312C] font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                          >
                            {isCollapsed ? (
                              <>
                                <ChevronDown className="h-4 w-4 text-[#8C7A6B]" />
                                <span>Expand Group</span>
                              </>
                            ) : (
                              <>
                                <ChevronUp className="h-4 w-4 text-[#8C7A6B]" />
                                <span>Collapse Group</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Group Rooms Content */}
                      {!isCollapsed && (
                        <div className="space-y-4 pt-1">
                          {groupRooms.map(room => {
                            const roomValuation = (room.deployedItems || []).reduce((sum, item) => sum + (item.quantity * (item.unitCost || 0)), 0);

                            return (
                              <div key={room.id} className="bg-white border border-[#E6E4DD] rounded-[28px] shadow-sm overflow-hidden hover:border-[#8C7A6B]/40 transition-all">
                                {/* Room Header Banner */}
                                <div className="bg-[#FAF9F5] p-4 sm:p-5 border-b border-[#F0EFE9] flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="p-3 bg-[#3E312C] text-white rounded-2xl shadow-2xs">
                                      <BedDouble className="h-6 w-6" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-serif text-lg font-bold text-[#3E312C]">{room.roomNumber}</h3>
                                        <span className="text-xs font-bold text-[#3E312C] bg-[#EBE6DD] border border-[#DCD5C9] px-2.5 py-0.5 rounded-full">
                                          {room.roomType || 'Unassigned'}
                                        </span>
                                        {room.floor && (
                                          <span className="text-[10px] font-mono text-[#8C7A6B] bg-white border border-[#E6E4DD] px-2 py-0.5 rounded-md font-semibold">
                                            {room.floor}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[#8C7A6B] mt-0.5">
                                        {room.notes || 'No room notes'} {room.lastInspected ? `• Inspected: ${room.lastInspected}` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Equipment Action Controls */}
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <div className="px-3 py-1.5 bg-[#F4F2EB] border border-[#EBE6DD] rounded-xl text-xs font-bold text-[#3E312C] font-mono">
                                      {(room.deployedItems || []).length} Items • ₱{roomValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeployingToRoom(room);
                                        setDeployItemName('');
                                        setDeployItemQty('1');
                                        setDeployItemCost('0');
                                        setDeployItemSerial('');
                                      }}
                                      className="flex items-center gap-1 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                                      title="Deploy equipment into this room"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Deploy Item
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openDuplicateRoomModal(room)}
                                      className="flex items-center gap-1 bg-white border border-[#E6E4DD] hover:bg-[#FAF9F5] text-[#3E312C] font-semibold text-xs px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors shadow-2xs"
                                      title="Duplicate room setup & equipment"
                                    >
                                      <Copy className="h-3.5 w-3.5 text-[#8C7355]" />
                                      <span>Duplicate</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setEditingRoom(room)}
                                      className="p-1.5 border border-[#E6E4DD] text-[#8C7A6B] hover:text-[#3E312C] hover:bg-white rounded-xl transition-colors cursor-pointer"
                                      title="Edit Room details"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handlePrintRoomAudit(room)}
                                      className="p-1.5 border border-[#E6E4DD] text-[#8C7A6B] hover:text-[#3E312C] hover:bg-white rounded-xl transition-colors cursor-pointer"
                                      title="Print Room Audit Sheet PDF"
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                    </button>

                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => setDeletingRoom(room)}
                                        className="p-1.5 border border-[#E6E4DD] text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                        title="Delete Room"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Deployed Equipment Table */}
                                <div className="p-4 sm:p-5">
                                  {(room.deployedItems || []).length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-[#F0EFE9]">
                                        <thead>
                                          <tr className="text-left text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono bg-[#F9F9F7]">
                                            <th className="px-3 py-2 rounded-l-lg">Equipment / Asset</th>
                                            <th className="px-3 py-2">Category</th>
                                            <th className="px-3 py-2">Quantity</th>
                                            <th className="px-3 py-2">Condition</th>
                                            <th className="px-3 py-2">Serial / Asset Tag</th>
                                            <th className="px-3 py-2">Date Deployed</th>
                                            <th className="px-3 py-2 text-right">Est. Unit Price</th>
                                            <th className="px-3 py-2 text-right">Total Value</th>
                                            <th className="px-3 py-2 text-right rounded-r-lg">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F0EFE9] text-xs">
                                          {room.deployedItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-[#FAF9F5] transition-colors">
                                              <td className="px-3 py-2.5 font-bold text-[#3E312C]">
                                                {item.name}
                                                {item.notes && (
                                                  <span className="block text-[10px] font-normal text-[#8C7A6B]">{item.notes}</span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2.5 text-[#8C7A6B]">{item.category || 'General'}</td>
                                              <td className="px-3 py-2.5 font-mono font-bold text-[#3E312C]">
                                                {item.quantity} {item.unit}
                                              </td>
                                              <td className="px-3 py-2.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                  item.condition === 'Good / Working' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                                  item.condition === 'Needs Repair' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                                  item.condition === 'Replaced' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                                  'bg-red-50 text-red-800 border-red-200'
                                                }`}>
                                                  {item.condition || 'Good / Working'}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2.5 font-mono text-[11px] text-[#8C7A6B]">
                                                {item.serialNumber || '—'}
                                              </td>
                                              <td className="px-3 py-2.5 font-mono text-[11px] text-[#8C7A6B]">
                                                {item.dateDeployed || '—'}
                                              </td>
                                              <td className="px-3 py-2.5 font-mono text-right text-[#3E312C]">
                                                {item.unitCost ? `₱${item.unitCost.toFixed(2)}` : '—'}
                                              </td>
                                              <td className="px-3 py-2.5 font-mono font-bold text-right text-[#3E312C]">
                                                {item.unitCost ? `₱${(item.quantity * item.unitCost).toFixed(2)}` : '—'}
                                              </td>
                                              <td className="px-3 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditingDeployedItem({ room, item })}
                                                    className="p-1 text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#F4F2EB] rounded-lg cursor-pointer"
                                                    title="Edit equipment item"
                                                  >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setDeletingDeployedItem({ room, item })}
                                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg cursor-pointer"
                                                    title="Remove equipment item"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-center py-6 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E4DD]">
                                      <Tv className="h-8 w-8 text-[#8C7A6B]/50 mx-auto mb-2" />
                                      <p className="text-xs font-semibold text-[#8C7A6B]">No deployed equipment or assets listed in {room.roomNumber}.</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeployingToRoom(room);
                                          setDeployItemName('');
                                          setDeployItemQty('1');
                                          setDeployItemCost('0');
                                          setDeployItemSerial('');
                                        }}
                                        className="mt-2 text-xs text-[#3E312C] font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <Plus className="h-3.5 w-3.5" /> Deploy first equipment item
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {roomGroupingMode === 'floor' && (
                (Object.entries(groupedRoomsByFloor) as [string, HotelRoom[]][]).map(([groupFloor, groupRooms]) => {
                  const isCollapsed = !!collapsedRoomGroups[`floor-${groupFloor}`];
                  const groupDeployedCount = groupRooms.reduce((acc, r) => acc + (r.deployedItems?.reduce((s, i) => s + i.quantity, 0) || 0), 0);
                  const groupValuation = groupRooms.reduce((acc, r) => acc + (r.deployedItems?.reduce((s, i) => s + (i.quantity * (i.unitCost || 0)), 0) || 0), 0);

                  return (
                    <div key={groupFloor} className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-[28px] p-4 sm:p-5 shadow-2xs space-y-4">
                      {/* Group Header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E4DD] pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-[#3E312C] text-white rounded-2xl shadow-2xs">
                            <Home className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-serif text-base sm:text-lg font-bold text-[#3E312C]">{groupFloor}</h3>
                              <span className="text-xs font-bold text-[#3E312C] bg-white border border-[#E6E4DD] px-2.5 py-0.5 rounded-full font-mono">
                                {groupRooms.length} {groupRooms.length === 1 ? 'Room' : 'Rooms'}
                              </span>
                            </div>
                            <p className="text-xs text-[#8C7A6B] mt-0.5">
                              Floor Group • {groupDeployedCount} Assets Deployed • Total Valuation: ₱{groupValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => openBulkDeployModal('floor', groupFloor)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-2xs"
                            title={`Add item to all ${groupRooms.length} rooms on ${groupFloor}`}
                          >
                            <Plus className="h-3.5 w-3.5 text-white" />
                            <span className="text-white font-semibold">Deploy to Floor ({groupRooms.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCollapsedRoomGroups(prev => ({ ...prev, [`floor-${groupFloor}`]: !prev[`floor-${groupFloor}`] }))}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6E4DD] hover:bg-[#F4F2EB] text-[#3E312C] font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                          >
                            {isCollapsed ? (
                              <>
                                <ChevronDown className="h-4 w-4 text-[#8C7A6B]" />
                                <span>Expand Floor</span>
                              </>
                            ) : (
                              <>
                                <ChevronUp className="h-4 w-4 text-[#8C7A6B]" />
                                <span>Collapse Floor</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Group Rooms Content */}
                      {!isCollapsed && (
                        <div className="space-y-4 pt-1">
                          {groupRooms.map(room => {
                            const roomValuation = (room.deployedItems || []).reduce((sum, item) => sum + (item.quantity * (item.unitCost || 0)), 0);

                            return (
                              <div key={room.id} className="bg-white border border-[#E6E4DD] rounded-[28px] shadow-sm overflow-hidden hover:border-[#8C7A6B]/40 transition-all">
                                {/* Room Header Banner */}
                                <div className="bg-[#FAF9F5] p-4 sm:p-5 border-b border-[#F0EFE9] flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="p-3 bg-[#3E312C] text-white rounded-2xl shadow-2xs">
                                      <BedDouble className="h-6 w-6" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-serif text-lg font-bold text-[#3E312C]">{room.roomNumber}</h3>
                                        <span className="text-xs font-bold text-[#3E312C] bg-[#EBE6DD] border border-[#DCD5C9] px-2.5 py-0.5 rounded-full">
                                          {room.roomType || 'Unassigned'}
                                        </span>
                                        {room.floor && (
                                          <span className="text-[10px] font-mono text-[#8C7A6B] bg-white border border-[#E6E4DD] px-2 py-0.5 rounded-md font-semibold">
                                            {room.floor}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[#8C7A6B] mt-0.5">
                                        {room.notes || 'No room notes'} {room.lastInspected ? `• Inspected: ${room.lastInspected}` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Action Controls */}
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <div className="px-3 py-1.5 bg-[#F4F2EB] border border-[#EBE6DD] rounded-xl text-xs font-bold text-[#3E312C] font-mono">
                                      {(room.deployedItems || []).length} Items • ₱{roomValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeployingToRoom(room);
                                        setDeployItemName('');
                                        setDeployItemQty('1');
                                        setDeployItemCost('0');
                                        setDeployItemSerial('');
                                      }}
                                      className="flex items-center gap-1 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                                      title="Deploy equipment into this room"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Deploy Item
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openDuplicateRoomModal(room)}
                                      className="flex items-center gap-1 bg-white border border-[#E6E4DD] hover:bg-[#FAF9F5] text-[#3E312C] font-semibold text-xs px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors shadow-2xs"
                                      title="Duplicate room setup & equipment"
                                    >
                                      <Copy className="h-3.5 w-3.5 text-[#8C7355]" />
                                      <span>Duplicate</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setEditingRoom(room)}
                                      className="p-1.5 border border-[#E6E4DD] text-[#8C7A6B] hover:text-[#3E312C] hover:bg-white rounded-xl transition-colors cursor-pointer"
                                      title="Edit Room details"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handlePrintRoomAudit(room)}
                                      className="p-1.5 border border-[#E6E4DD] text-[#8C7A6B] hover:text-[#3E312C] hover:bg-white rounded-xl transition-colors cursor-pointer"
                                      title="Print Room Audit Sheet PDF"
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                    </button>

                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => setDeletingRoom(room)}
                                        className="p-1.5 border border-[#E6E4DD] text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                        title="Delete Room"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Deployed Equipment Table */}
                                <div className="p-4 sm:p-5">
                                  {(room.deployedItems || []).length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-[#F0EFE9]">
                                        <thead>
                                          <tr className="text-left text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono bg-[#F9F9F7]">
                                            <th className="px-3 py-2 rounded-l-lg">Equipment / Asset</th>
                                            <th className="px-3 py-2">Category</th>
                                            <th className="px-3 py-2">Quantity</th>
                                            <th className="px-3 py-2">Condition</th>
                                            <th className="px-3 py-2">Serial / Asset Tag</th>
                                            <th className="px-3 py-2">Date Deployed</th>
                                            <th className="px-3 py-2 text-right">Est. Unit Price</th>
                                            <th className="px-3 py-2 text-right">Total Value</th>
                                            <th className="px-3 py-2 text-right rounded-r-lg">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F0EFE9] text-xs">
                                          {room.deployedItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-[#FAF9F5] transition-colors">
                                              <td className="px-3 py-2.5 font-bold text-[#3E312C]">
                                                {item.name}
                                                {item.notes && (
                                                  <span className="block text-[10px] font-normal text-[#8C7A6B]">{item.notes}</span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2.5 text-[#8C7A6B]">{item.category || 'General'}</td>
                                              <td className="px-3 py-2.5 font-mono font-bold text-[#3E312C]">
                                                {item.quantity} {item.unit}
                                              </td>
                                              <td className="px-3 py-2.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                  item.condition === 'Good / Working' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                                  item.condition === 'Needs Repair' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                                  item.condition === 'Replaced' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                                  'bg-red-50 text-red-800 border-red-200'
                                                }`}>
                                                  {item.condition || 'Good / Working'}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2.5 font-mono text-[11px] text-[#8C7A6B]">
                                                {item.serialNumber || '—'}
                                              </td>
                                              <td className="px-3 py-2.5 font-mono text-[11px] text-[#8C7A6B]">
                                                {item.dateDeployed || '—'}
                                              </td>
                                              <td className="px-3 py-2.5 font-mono text-right text-[#3E312C]">
                                                {item.unitCost ? `₱${item.unitCost.toFixed(2)}` : '—'}
                                              </td>
                                              <td className="px-3 py-2.5 font-mono font-bold text-right text-[#3E312C]">
                                                {item.unitCost ? `₱${(item.quantity * item.unitCost).toFixed(2)}` : '—'}
                                              </td>
                                              <td className="px-3 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditingDeployedItem({ room, item })}
                                                    className="p-1 text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#F4F2EB] rounded-lg cursor-pointer"
                                                    title="Edit equipment item"
                                                  >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setDeletingDeployedItem({ room, item })}
                                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg cursor-pointer"
                                                    title="Remove equipment item"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-center py-6 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E4DD]">
                                      <Tv className="h-8 w-8 text-[#8C7A6B]/50 mx-auto mb-2" />
                                      <p className="text-xs font-semibold text-[#8C7A6B]">No deployed equipment or assets listed in {room.roomNumber}.</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeployingToRoom(room);
                                          setDeployItemName('');
                                          setDeployItemQty('1');
                                          setDeployItemCost('0');
                                          setDeployItemSerial('');
                                        }}
                                        className="mt-2 text-xs text-[#3E312C] font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <Plus className="h-3.5 w-3.5" /> Deploy first equipment item
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {roomGroupingMode === 'flat' && (
                <div className="space-y-4">
                  {filteredRooms.map(room => {
                    const roomValuation = (room.deployedItems || []).reduce((sum, item) => sum + (item.quantity * (item.unitCost || 0)), 0);

                    return (
                      <div key={room.id} className="bg-white border border-[#E6E4DD] rounded-[28px] shadow-sm overflow-hidden hover:border-[#8C7A6B]/40 transition-all">
                        {/* Room Header Banner */}
                        <div className="bg-[#FAF9F5] p-4 sm:p-5 border-b border-[#F0EFE9] flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-[#3E312C] text-white rounded-2xl shadow-2xs">
                              <BedDouble className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-serif text-lg font-bold text-[#3E312C]">{room.roomNumber}</h3>
                                <span className="text-xs font-bold text-[#3E312C] bg-[#EBE6DD] border border-[#DCD5C9] px-2.5 py-0.5 rounded-full">
                                  {room.roomType || 'Unassigned'}
                                </span>
                                {room.floor && (
                                  <span className="text-[10px] font-mono text-[#8C7A6B] bg-white border border-[#E6E4DD] px-2 py-0.5 rounded-md font-semibold">
                                    {room.floor}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#8C7A6B] mt-0.5">
                                {room.notes || 'No room notes'} {room.lastInspected ? `• Inspected: ${room.lastInspected}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Equipment Action Controls */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="px-3 py-1.5 bg-[#F4F2EB] border border-[#EBE6DD] rounded-xl text-xs font-bold text-[#3E312C] font-mono">
                              {(room.deployedItems || []).length} Items • ₱{roomValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setDeployingToRoom(room);
                                setDeployItemName('');
                                setDeployItemQty('1');
                                setDeployItemCost('0');
                                setDeployItemSerial('');
                              }}
                              className="flex items-center gap-1 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                              title="Deploy equipment into this room"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Deploy Item
                            </button>

                            <button
                              type="button"
                              onClick={() => openDuplicateRoomModal(room)}
                              className="flex items-center gap-1 bg-white border border-[#E6E4DD] hover:bg-[#FAF9F5] text-[#3E312C] font-semibold text-xs px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors shadow-2xs"
                              title="Duplicate room setup & equipment"
                            >
                              <Copy className="h-3.5 w-3.5 text-[#8C7355]" />
                              <span>Duplicate</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingRoom(room)}
                              className="p-1.5 border border-[#E6E4DD] text-[#8C7A6B] hover:text-[#3E312C] hover:bg-white rounded-xl transition-colors cursor-pointer"
                              title="Edit Room details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePrintRoomAudit(room)}
                              className="p-1.5 border border-[#E6E4DD] text-[#8C7A6B] hover:text-[#3E312C] hover:bg-white rounded-xl transition-colors cursor-pointer"
                              title="Print Room Audit Sheet PDF"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeletingRoom(room)}
                                className="p-1.5 border border-[#E6E4DD] text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                title="Delete Room"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Deployed Equipment Table inside Room */}
                        <div className="p-4 sm:p-5">
                          {(room.deployedItems || []).length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-[#F0EFE9]">
                                <thead>
                                  <tr className="text-left text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono bg-[#F9F9F7]">
                                    <th className="px-3 py-2 rounded-l-lg">Equipment / Asset</th>
                                    <th className="px-3 py-2">Category</th>
                                    <th className="px-3 py-2">Quantity</th>
                                    <th className="px-3 py-2">Condition</th>
                                    <th className="px-3 py-2">Serial / Asset Tag</th>
                                    <th className="px-3 py-2">Date Deployed</th>
                                    <th className="px-3 py-2 text-right">Est. Unit Price</th>
                                    <th className="px-3 py-2 text-right">Total Value</th>
                                    <th className="px-3 py-2 text-right rounded-r-lg">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F0EFE9] text-xs">
                                  {room.deployedItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-[#FAF9F5] transition-colors">
                                      <td className="px-3 py-2.5 font-bold text-[#3E312C]">
                                        {item.name}
                                        {item.notes && (
                                          <span className="block text-[10px] font-normal text-[#8C7A6B]">{item.notes}</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 text-[#8C7A6B]">{item.category || 'General'}</td>
                                      <td className="px-3 py-2.5 font-mono font-bold text-[#3E312C]">
                                        {item.quantity} {item.unit}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                          item.condition === 'Good / Working' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                          item.condition === 'Needs Repair' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                          item.condition === 'Replaced' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                          'bg-red-50 text-red-800 border-red-200'
                                        }`}>
                                          {item.condition || 'Good / Working'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-[11px] text-[#8C7A6B]">
                                        {item.serialNumber || '—'}
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-[11px] text-[#8C7A6B]">
                                        {item.dateDeployed || '—'}
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-right text-[#3E312C]">
                                        {item.unitCost ? `₱${item.unitCost.toFixed(2)}` : '—'}
                                      </td>
                                      <td className="px-3 py-2.5 font-mono font-bold text-right text-[#3E312C]">
                                        {item.unitCost ? `₱${(item.quantity * item.unitCost).toFixed(2)}` : '—'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => setEditingDeployedItem({ room, item })}
                                            className="p-1 text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#F4F2EB] rounded-lg cursor-pointer"
                                            title="Edit equipment item"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeletingDeployedItem({ room, item })}
                                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg cursor-pointer"
                                            title="Remove equipment item"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E4DD]">
                              <Tv className="h-8 w-8 text-[#8C7A6B]/50 mx-auto mb-2" />
                              <p className="text-xs font-semibold text-[#8C7A6B]">No deployed equipment or assets listed in {room.roomNumber}.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeployingToRoom(room);
                                  setDeployItemName('');
                                  setDeployItemQty('1');
                                  setDeployItemCost('0');
                                  setDeployItemSerial('');
                                }}
                                className="mt-2 text-xs text-[#3E312C] font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" /> Deploy first equipment item
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#E6E4DD] rounded-[28px] p-12 text-center shadow-2xs">
              <Home className="h-10 w-10 text-[#8C7A6B]/50 mx-auto mb-3" />
              <h3 className="font-serif text-base font-bold text-[#3E312C]">No matching rooms found</h3>
              <p className="text-xs text-[#8C7A6B] mt-1">Try adjusting your filter or create a new room.</p>
              <button
                type="button"
                onClick={() => {
                  setNewRoomNumber('');
                  setNewRoomType('Deluxe Double');
                  setNewRoomFloor('1st Floor');
                  setNewRoomNotes('');
                  setIsAddingRoom(true);
                }}
                className="mt-4 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add New Room
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Filters & Table Card for General Inventory */
        <div className="bg-white border border-[#E6E4DD] rounded-[32px] shadow-sm overflow-hidden" id="inventory-list-container">
        {/* Filters Panel */}
        <div className="p-5 border-b border-[#F0EFE9] bg-[#FAF9F5] flex flex-col md:flex-row justify-between gap-4" id="inventory-filters-panel">
          
          {/* Search */}
          <div className="relative flex-1" id="search-input-box">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#8C7A6B]" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] bg-white placeholder-[#8C7A6B]/60 focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] sm:text-sm"
              placeholder="Search by product name or supplier..."
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center" id="filters-controls-box">
            {/* Audit Filter Selector */}
            <select
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value as 'all' | 'audited' | 'pending')}
              className="text-xs text-[#3E312C] font-semibold border border-[#E6E4DD] bg-white px-3 py-1.5 rounded-full focus:outline-hidden cursor-pointer hover:border-[#3E312C]"
              title="Filter inventory items by audit status"
            >
              <option value="all">Audit Filter: All Items</option>
              <option value="audited font-bold">✓ Audited Only</option>
              <option value="pending font-bold">⏳ Pending Audit</option>
            </select>

            {/* Batch Tab Audit Button */}
            <button
              onClick={() => {
                setBatchAuditDate(new Date().toISOString().split('T')[0]);
                setBatchAuditor(currentUser.name);
                setBatchGeneralRemarks('Periodic inventory audit completed. Physical count and conditions verified.');
                setBatchItemCounts({});
                setIsBatchAuditingTab(true);
              }}
              className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-4 py-1.5 rounded-full cursor-pointer transition-colors shadow-2xs"
              id="batch-audit-tab-btn"
              title={`Conduct batch audit for all items in ${getSectionName(sectionFilter)} tab`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-white">Audit Tab Items</span>
            </button>

            {/* Rooms Stock View Switcher */}
            {sectionFilter === 'ROOMS' && (
              <div className="flex items-center bg-[#EBE8DF] p-1 rounded-full text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRoomsStockView('all')}
                  className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${roomsStockView === 'all' ? 'bg-[#3E312C] text-white shadow-2xs font-bold' : 'text-[#8C7A6B] hover:text-[#3E312C]'}`}
                >
                  All ({filteredItems.length + filteredAggregatedDeployedItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoomsStockView('reserve')}
                  className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${roomsStockView === 'reserve' ? 'bg-[#3E312C] text-white shadow-2xs font-bold' : 'text-[#8C7A6B] hover:text-[#3E312C]'}`}
                >
                  Reserve ({filteredItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoomsStockView('deployed')}
                  className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${roomsStockView === 'deployed' ? 'bg-[#3E312C] text-white shadow-2xs font-bold' : 'text-[#8C7A6B] hover:text-[#3E312C]'}`}
                >
                  Deployed ({filteredAggregatedDeployedItems.length})
                </button>
              </div>
            )}

            {/* Generate Count Sheet PDF Button */}
            <button
              onClick={() => {
                setIsGeneratingSheet(true);
              }}
              className="flex items-center gap-1.5 bg-[#8C7355] hover:bg-[#745E44] text-white font-semibold text-xs px-4 py-1.5 rounded-full cursor-pointer transition-colors shadow-2xs"
              id="generate-count-sheet-btn"
              title="Generate printable PDF Count Sheet for physical stocktaking"
            >
              <Printer className="h-3.5 w-3.5 text-white" />
              <span className="text-white">Count Sheet PDF</span>
            </button>

            {/* Generate Price Breakdown PDF Button */}
            <button
              onClick={handlePrintPriceBreakdown}
              className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-4 py-1.5 rounded-full cursor-pointer transition-colors shadow-2xs"
              id="generate-price-breakdown-btn"
              title={`Generate PDF of listed ${getSectionName(sectionFilter)} inventories with prices and valuation`}
            >
              <FileText className="h-3.5 w-3.5 text-white" />
              <span className="text-white">{getSectionName(sectionFilter)} Valuation PDF</span>
            </button>

            {/* Transfer Item Button (for all tabs except ROOMS) */}
            {sectionFilter !== 'ROOMS' && (
              <button
                onClick={() => openTransferModal()}
                className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-4 py-1.5 rounded-full cursor-pointer transition-colors shadow-2xs"
                id="open-transfer-modal-btn"
                title="Transfer inventory items to another section or room and print transfer form"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-white" />
                <span className="text-white">Transfer Item</span>
              </button>
            )}

            {/* Clear filters shortcut */}
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                }}
                className="text-xs text-[#8C7A6B] hover:text-[#424235] font-semibold border border-[#E6E4DD] bg-white hover:bg-[#F9F9F7] px-4 py-1.5 rounded-full cursor-pointer transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Inventory Data Table */}
        <div className="overflow-x-auto" id="inventory-table-wrapper">
          {(filteredItems.length > 0 || (sectionFilter === 'ROOMS' && filteredAggregatedDeployedItems.length > 0)) ? (
            <table className="min-w-full divide-y divide-[#F0EFE9]">
              <thead className="bg-[#F9F9F7]">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Supply / Equipment Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Qty</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Unit Cost</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Cost Valuation</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Last Audit & Remarks</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Supplier / Allocation</th>
                  <th scope="col" className="px-6 py-3 text-right text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono animate-fade-in">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#F0EFE9] text-sm">
                {/* Reserve / Unassigned Stock Items */}
                {(sectionFilter !== 'ROOMS' || roomsStockView !== 'deployed') && filteredItems.map((item) => {
                  const itemValue = item.currentStock * item.unitCost;
                  const isAdjusting = adjustingId === item.id;

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-[#FAF9F5] transition-colors"
                    >
                      {/* Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#3E312C]">{item.name}</span>
                          {sectionFilter === 'ROOMS' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4F2EB] text-[#8C7A6B] border border-[#EBE6DD]">
                              Warehouse Reserve
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-[#8C7A6B]">ID: {item.id}</span>
                      </td>

                      {/* Qty */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-base text-[#3E312C]">
                            {item.currentStock}
                          </span>
                          <span className="text-xs text-[#8C7A6B] font-mono">{item.unit}</span>
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-[#3E312C] font-bold">
                        ₱{item.unitCost.toFixed(2)}
                      </td>

                      {/* Cost Valuation */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-[#3E312C] font-bold bg-[#FAF9F5]/40">
                        ₱{itemValue.toFixed(2)}
                      </td>

                      {/* Last Audit & Remarks */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {item.lastAuditDate ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                              {item.lastAuditDate}
                            </span>
                            {item.auditRemarks && (
                              <p className="text-[11px] text-[#3E312C] font-medium truncate max-w-[180px]" title={item.auditRemarks}>
                                {item.auditRemarks}
                              </p>
                            )}
                            {item.auditedBy && (
                              <p className="text-[10px] text-[#8C7A6B] italic font-sans">
                                By: {item.auditedBy}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                            <Clock className="h-3 w-3 text-amber-700" />
                            Pending Audit
                          </span>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-[#8C7A6B] truncate max-w-[150px]">
                        {item.supplier || 'Warehouse Reserve'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Audit Action Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAuditingItem(item);
                              setAuditDate(item.lastAuditDate || new Date().toISOString().split('T')[0]);
                              setAuditedBy(item.auditedBy || currentUser.name);
                              setAuditRemarks(item.auditRemarks || '');
                              setAuditCountedStock(String(item.currentStock));
                              setUpdateStockOnAudit(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-full cursor-pointer transition-colors shadow-2xs"
                            title="Audit this item"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                            <span>Audit</span>
                          </button>
                          
                          {/* Quick Adjust Quantity panel */}
                          {isAdjusting ? (
                            <div className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#E6E4DD] p-1.5 rounded-xl animate-in slide-in-from-right-3 duration-100">
                              <input
                                type="number"
                                step="any"
                                value={adjustAmount}
                                onChange={(e) => setAdjustAmount(e.target.value)}
                                className="w-12 text-center bg-white border border-[#EBE6DD] rounded-lg py-0.5 px-1 font-mono text-xs font-bold text-[#3E312C]"
                              />
                              <button
                                onClick={() => handleQuickAdjust(item.id, 'add')}
                                className="p-1 bg-[#F4F2EB] text-[#3E312C] hover:bg-[#FAF9F5] rounded-md cursor-pointer transition-colors"
                                title="Add stock"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(item.id, 'subtract')}
                                className="p-1 bg-[#FDF2F0] text-[#3E312C] hover:bg-[#FCDFD9] rounded-md cursor-pointer transition-colors"
                                title="Consume stock"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setAdjustingId(null)}
                                className="p-1 hover:bg-[#FAF9F5] text-[#8C7A6B] rounded-md cursor-pointer transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAdjustingId(item.id);
                                setAdjustAmount('1');
                              }}
                              className="text-xs text-[#3E312C] border border-[#E6E4DD] bg-white hover:bg-[#FAF9F5] px-3 py-1.5 rounded-full font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-2xs"
                            >
                              <RefreshCw className="h-3 w-3 shrink-0" />
                              Adjust Stock
                            </button>
                          )}

                          {/* Transfer action button (for all tabs except ROOMS) */}
                          {sectionFilter !== 'ROOMS' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTransferModal(item);
                              }}
                              className="text-xs text-[#3E312C] border border-[#E6E4DD] bg-white hover:bg-[#FAF9F5] px-3 py-1.5 rounded-full font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-2xs"
                              title="Transfer this item to another section or room and print transfer form"
                            >
                              <ArrowRightLeft className="h-3 w-3 shrink-0" />
                              Transfer
                            </button>
                          )}

                          {/* Edit Actions for Inventory Stock */}
                          {(isAdmin || sectionFilter === 'ROOMS' || currentUser.role === 'rooms_event_officer' || currentUser.role === 'purchaser') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerEdit(item);
                              }}
                              className="text-[#8C7A6B] hover:text-[#3E312C] p-1.5 border border-[#E6E4DD] rounded-xl hover:bg-[#FAF9F5] cursor-pointer transition-colors"
                              title="Edit Item Details & Price"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingItem(item);
                              }}
                              className="text-[#3E312C] hover:text-red-700 p-1.5 border border-[#F2DED9] rounded-xl hover:bg-[#FDF2F0] cursor-pointer transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Aggregated Deployed Equipment Items in Rooms */}
                {sectionFilter === 'ROOMS' && (roomsStockView === 'all' || roomsStockView === 'deployed') && filteredAggregatedDeployedItems.map((dep, index) => {
                  const itemValue = dep.totalQuantity * dep.unitCost;

                  return (
                    <tr 
                      key={`deployed-${index}-${dep.name}`} 
                      className="hover:bg-[#F0F4FD] transition-colors bg-[#FAF9F5]/40"
                    >
                      {/* Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#3E312C]">{dep.name}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] flex items-center gap-1">
                            <Home className="h-3 w-3" /> Deployed in Rooms
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#8C7A6B]">Installed across {dep.roomsCount} room(s)</span>
                      </td>

                      {/* Qty */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-base text-[#1A73E8]">
                            {dep.totalQuantity}
                          </span>
                          <span className="text-xs text-[#8C7A6B] font-mono">{dep.unit}</span>
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-[#3E312C] font-bold">
                        ₱{dep.unitCost.toFixed(2)}
                      </td>

                      {/* Cost Valuation */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-[#3E312C] font-bold bg-[#E8F0FE]/20">
                        ₱{itemValue.toFixed(2)}
                      </td>

                      {/* Supplier / Deployed info */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-[#8C7A6B]">
                        <span className="font-semibold text-[#3E312C]">Deployed in {dep.roomsCount} Rooms</span>
                        <div className="text-[10px] text-[#8C7A6B]">Good: {dep.conditionBreakdown.good} | Repair: {dep.conditionBreakdown.repair}</div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditAggregatedDeployedItem(dep)}
                            className="text-xs bg-[#3E312C] hover:bg-[#2C211F] text-white px-3 py-1.5 rounded-full font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-2xs"
                            title="Edit Unit Price, Name & Category across all rooms"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-white" />
                            Edit Price & Info
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingDeployedDetails(dep)}
                            className="text-xs bg-[#1A73E8] hover:bg-[#1557B0] text-white px-3 py-1.5 rounded-full font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-white" />
                            View Room Locations
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-[#8C7A6B]">
              <PackageOpen className="h-12 w-12 mx-auto text-[#D1C4B5] mb-3" />
              <p className="font-semibold text-[#3E312C]">No {getSectionName(sectionFilter).toLowerCase()} items found</p>
              <p className="text-xs text-[#8C7A6B] mt-1">Try relaxing your search terms or filters.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ========================================== */}
      {/* MODAL: PHYSICAL STOCKTAKING GENERATOR      */}
      {/* ========================================== */}
      {isGeneratingSheet && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="count-sheet-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-2xl w-full p-6 shadow-lg relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setIsGeneratingSheet(false)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-4">
              <h3 className="font-serif text-xl text-[#3E312C]">Generate Physical {getSectionName(sectionFilter)} Count Sheet</h3>
              <p className="text-xs text-[#8C7A6B] mt-1">Export a custom print-friendly count sheet for manual BOH inventory audits.</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE6DD]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8C7A6B] font-bold uppercase tracking-wider font-mono">Category Filter:</span>
                  <select
                    value={sheetCategory}
                    onChange={(e) => setSheetCategory(e.target.value)}
                    className="px-3 py-1.5 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-[#8C7A6B] font-semibold">
                  Items to print: <span className="text-[#3E312C] font-bold">{inventory.filter(item => ((item.section || 'KITCHEN') === sectionFilter) && (sheetCategory === 'All' || item.category === sheetCategory)).length} products</span>
                </div>
              </div>

              {/* Sheet Live Preview */}
              <div className="border border-[#EBE6DD] rounded-2xl overflow-hidden">
                <div className="bg-[#F4F2EB] px-4 py-2 border-b border-[#EBE6DD] flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Count Sheet Preview</span>
                  <span className="text-[10px] text-[#8C7A6B] italic">Includes actual count lines for staff checklists</span>
                </div>
                <div className="max-h-60 overflow-y-auto p-4 space-y-2 bg-white text-xs">
                  {inventory
                    .filter(item => ((item.section || 'KITCHEN') === sectionFilter) && (sheetCategory === 'All' || item.category === sheetCategory))
                    .map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-1 border-b border-[#FAF9F5]">
                        <span className="font-semibold text-[#3E312C]">{item.name}</span>
                        <div className="flex items-center gap-6 text-[#8C7A6B]">
                          <span>Sys: {item.currentStock} {item.unit}</span>
                          <span className="font-mono bg-[#FAF9F5] px-2 py-0.5 border border-[#EBE6DD] rounded-md text-[10px]">
                            Qty: _________ {item.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  {inventory.filter(item => ((item.section || 'KITCHEN') === sectionFilter) && (sheetCategory === 'All' || item.category === sheetCategory)).length === 0 && (
                    <div className="text-center py-6 text-xs text-[#8C7A6B] italic">No items found matching category.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setIsGeneratingSheet(false)}
                  className="px-5 py-2.5 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrintCountSheet}
                  disabled={inventory.filter(item => sheetCategory === 'All' || item.category === sheetCategory).length === 0}
                  className="px-5 py-2.5 bg-[#3E312C] disabled:opacity-50 hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Generate / Save PDF Count Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: PREMIUM IFRAME-SAFE DELETE DIALOG   */}
      {/* ========================================== */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="delete-confirmation-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-md w-full p-6 shadow-lg relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setDeletingItem(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center pt-2 space-y-3">
              <div className="mx-auto bg-[#FDF2F0] text-[#A65D46] border border-[#F2DED9] h-12 w-12 rounded-full flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#3E312C] font-semibold">Confirm Supply Deletion</h3>
                <p className="text-xs text-[#8C7A6B] mt-1.5 leading-relaxed">
                  Are you absolutely sure you want to permanently purge <span className="font-bold text-[#3E312C]">"{deletingItem.name}"</span> from the kitchen supplies? This action is irreversible and will wipe out all stocking values.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2.5 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteItem(deletingItem.id);
                  setDeletingItem(null);
                }}
                className="flex-1 py-2.5 bg-[#A65D46] hover:bg-red-800 text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PRINT-ONLY PHYSICAL INVENTORY COUNT SHEET */}
      {/* ========================================== */}
      <div id="inventory-count-sheet" className="print-only">
        <div style={{ fontFamily: 'sans-serif', color: '#111', padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #3E312C', paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#3E312C' }}>MADIGUN HOTEL AND EVENTS</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#3E312C', fontWeight: 'bold' }}>PHYSICAL INVENTORY COUNT SHEET</h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '11px', fontWeight: 'bold', color: '#3E312C', textTransform: 'uppercase' }}>
                Category: {sheetCategory === 'All' ? `All ${getSectionName(sectionFilter)} Items` : sheetCategory}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#8C7A6B' }}>
                Generated on: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '30px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAF9F5', textAlign: 'left', borderBottom: '1.5px solid #3E312C', color: '#3E312C' }}>
                <th style={{ padding: '10px 8px', width: '35%' }}>Product / Item Name</th>
                <th style={{ padding: '10px 8px', width: '15%' }}>Category</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', width: '15%' }}>System Stock</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', width: '20%' }}>Actual Count</th>
                <th style={{ padding: '10px 8px', width: '15%' }}>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {inventory
                .filter(item => (item.section || 'KITCHEN') === sectionFilter && (sheetCategory === 'All' || item.category === sheetCategory))
                .map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #EBE6DD' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#3E312C' }}>{item.name}</td>
                    <td style={{ padding: '10px 8px', color: '#8C7A6B' }}>{item.category}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#3E312C' }}>
                      {item.currentStock} {item.unit}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{ color: '#8C7A6B' }}>_________________ {item.unit}</span>
                    </td>
                    <td style={{ padding: '10px 8px', color: '#8C7A6B', fontSize: '10px' }}>{item.supplier}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <div style={{ width: '30%', borderTop: '1px solid #3E312C', paddingTop: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#3E312C' }}>{currentUser.name}</p>
              <p style={{ margin: '2px 0 0 0', color: '#8C7A6B', textTransform: 'uppercase' }}>Auditing Staff / Preparer</p>
            </div>
            <div style={{ width: '30%', borderTop: '1px solid #3E312C', paddingTop: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#3E312C' }}>___________________________</p>
              <p style={{ margin: '2px 0 0 0', color: '#8C7A6B', textTransform: 'uppercase' }}>Auditor / Stock Controller</p>
            </div>
            <div style={{ width: '30%', borderTop: '1px solid #3E312C', paddingTop: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#3E312C' }}>___________________________</p>
              <p style={{ margin: '2px 0 0 0', color: '#8C7A6B', textTransform: 'uppercase' }}>F&B Admin Sign-Off</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: ADD ROOM                            */}
      {/* ========================================== */}
      {isAddingRoom && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsAddingRoom(false)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-4">
              <h3 className="font-serif text-xl text-[#3E312C]">Add Hotel Room</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">Register a new room for asset & equipment tracking.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newRoomNumber.trim()) return;
                if (onAddRoom) {
                  onAddRoom({
                    roomNumber: newRoomNumber.trim(),
                    roomType: newRoomType,
                    floor: newRoomFloor,
                    notes: newRoomNotes,
                    lastInspected: new Date().toISOString().split('T')[0],
                    deployedItems: []
                  });
                }
                setIsAddingRoom(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 101, Villa 4, Suite A"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E6E4DD] rounded-xl text-sm font-semibold bg-white text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Room Type</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  >
                    <option value="Junior Suite">Junior Suite</option>
                    <option value="Deluxe Rooms">Deluxe Rooms</option>
                    <option value="Standard Rooms">Standard Rooms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Floor / Wing</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Floor, West Wing"
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Notes / Special Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Connecting room with 102, Jacuzzi bath"
                  value={newRoomNotes}
                  onChange={(e) => setNewRoomNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setIsAddingRoom(false)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs"
                >
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT ROOM                           */}
      {/* ========================================== */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditingRoom(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-4">
              <h3 className="font-serif text-xl text-[#3E312C]">Edit Room {editingRoom.roomNumber}</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">Update room profile details.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onUpdateRoom) {
                  onUpdateRoom(editingRoom);
                }
                setEditingRoom(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  value={editingRoom.roomNumber}
                  onChange={(e) => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                  className="w-full px-3.5 py-2 border border-[#E6E4DD] rounded-xl text-sm font-semibold bg-white text-[#3E312C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Room Type</label>
                  <select
                    value={editingRoom.roomType}
                    onChange={(e) => setEditingRoom({ ...editingRoom, roomType: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  >
                    <option value="Junior Suite">Junior Suite</option>
                    <option value="Deluxe Rooms">Deluxe Rooms</option>
                    <option value="Standard Rooms">Standard Rooms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Floor / Wing</label>
                  <input
                    type="text"
                    value={editingRoom.floor || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editingRoom.notes || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: DELETE ROOM CONFIRMATION            */}
      {/* ========================================== */}
      {deletingRoom && (
        <div className="fixed inset-0 z-50 bg-[#3E312C]/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-sm w-full p-6 shadow-2xl relative text-[#3E312C]">
            <h3 className="font-serif text-lg text-[#3E312C] font-bold">Delete {deletingRoom.roomNumber}?</h3>
            <p className="text-xs text-[#8C7A6B] mt-2 leading-relaxed">
              Are you sure you want to delete <strong className="text-[#3E312C]">{deletingRoom.roomNumber}</strong>? This will also remove all deployed equipment tracking for this room.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingRoom(null)}
                className="flex-1 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRoom(deletingRoom.id);
                  setDeletingRoom(null);
                }}
                className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white font-semibold text-xs rounded-full cursor-pointer"
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: DEPLOY EQUIPMENT TO ROOM            */}
      {/* ========================================== */}
      {deployingToRoom && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setDeployingToRoom(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-4">
              <h3 className="font-serif text-xl text-[#3E312C]">Deploy Equipment</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">Assign asset or equipment into <strong className="text-[#3E312C]">{deployingToRoom.roomNumber}</strong> ({deployingToRoom.roomType}).</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!deployItemName.trim()) return;

                const qtyNum = parseFloat(deployItemQty) || 1;
                const costNum = parseFloat(deployItemCost) || 0;

                const newItem: DeployedEquipment = {
                  id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  name: deployItemName.trim(),
                  category: deployItemCategory,
                  quantity: qtyNum,
                  unit: deployItemUnit,
                  condition: deployItemCondition,
                  serialNumber: deployItemSerial.trim() || undefined,
                  dateDeployed: deployItemDate || new Date().toISOString().split('T')[0],
                  unitCost: costNum,
                  notes: deployItemNotes.trim() || undefined,
                  inventoryItemId: selectedInventoryItemId || undefined
                };

                onAddDeployedItem(
                  deployingToRoom.id,
                  newItem,
                  selectedInventoryItemId ? autoDeductStock : false
                );

                setDeployingToRoom(null);
              }}
              className="space-y-4"
            >
              {/* Optional Pick from General Inventory */}
              <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#EBE6DD]">
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Select from Rooms / General Inventory Stock (Optional)</label>
                <select
                  value={selectedInventoryItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedInventoryItemId(id);
                    if (id) {
                      const found = inventory.find(i => i.id === id);
                      if (found) {
                        setDeployItemName(found.name);
                        setDeployItemCategory(found.category || 'General');
                        setDeployItemUnit(found.unit || 'unit');
                        setDeployItemCost(found.unitCost.toString());
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                >
                  <option value="">-- Manual Entry or Select Stock Item --</option>
                  {inventory
                    .filter(i => (i.section || 'KITCHEN') === 'ROOMS' || (i.section || 'KITCHEN') === 'HOUSEKEEPING_EQUIPMENTS')
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.currentStock} {item.unit} available • ₱{item.unitCost.toFixed(2)})
                      </option>
                    ))}
                </select>

                {selectedInventoryItemId && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="autoDeductCheck"
                      checked={autoDeductStock}
                      onChange={(e) => setAutoDeductStock(e.target.checked)}
                      className="rounded border-[#E6E4DD] text-[#3E312C] focus:ring-[#3E312C]"
                    />
                    <label htmlFor="autoDeductCheck" className="text-xs font-medium text-[#3E312C] cursor-pointer">
                      Auto-deduct deployed quantity from inventory stock
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Equipment / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart LED TV 55&quot;, Mini Fridge, Safe Box"
                  value={deployItemName}
                  onChange={(e) => setDeployItemName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E6E4DD] rounded-xl text-sm font-semibold bg-white text-[#3E312C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={deployItemCategory}
                    onChange={(e) => setDeployItemCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Linens">Linens</option>
                    <option value="Amenities">Amenities</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Condition</label>
                  <select
                    value={deployItemCondition}
                    onChange={(e) => setDeployItemCondition(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  >
                    <option value="Good / Working">Good / Working</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Replaced">Replaced</option>
                    <option value="Missing">Missing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={deployItemQty}
                    onChange={(e) => setDeployItemQty(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-bold font-mono bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Unit</label>
                  <input
                    type="text"
                    value={deployItemUnit}
                    onChange={(e) => setDeployItemUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Unit Price (₱)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={deployItemCost}
                    onChange={(e) => setDeployItemCost(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-bold font-mono bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Serial No. / Tag ID</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-TV-8821"
                    value={deployItemSerial}
                    onChange={(e) => setDeployItemSerial(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-mono bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Deployment Date</label>
                  <input
                    type="date"
                    value={deployItemDate}
                    onChange={(e) => setDeployItemDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Notes / Placement</label>
                <input
                  type="text"
                  placeholder="e.g. Wall mounted near desk, inside vanity cabinet"
                  value={deployItemNotes}
                  onChange={(e) => setDeployItemNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setDeployingToRoom(null)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs"
                >
                  Deploy Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT DEPLOYED EQUIPMENT             */}
      {/* ========================================== */}
      {editingDeployedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditingDeployedItem(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-4">
              <h3 className="font-serif text-xl text-[#3E312C]">Edit Deployed Equipment</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">In room <strong className="text-[#3E312C]">{editingDeployedItem.room.roomNumber}</strong>.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateDeployedItem(editingDeployedItem.room.id, editingDeployedItem.item);
                setEditingDeployedItem(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={editingDeployedItem.item.name}
                  onChange={(e) => setEditingDeployedItem({
                    ...editingDeployedItem,
                    item: { ...editingDeployedItem.item, name: e.target.value }
                  })}
                  className="w-full px-3.5 py-2 border border-[#E6E4DD] rounded-xl text-sm font-semibold bg-white text-[#3E312C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Category</label>
                  <input
                    type="text"
                    value={editingDeployedItem.item.category || ''}
                    onChange={(e) => setEditingDeployedItem({
                      ...editingDeployedItem,
                      item: { ...editingDeployedItem.item, category: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Condition</label>
                  <select
                    value={editingDeployedItem.item.condition || 'Good / Working'}
                    onChange={(e) => setEditingDeployedItem({
                      ...editingDeployedItem,
                      item: { ...editingDeployedItem.item, condition: e.target.value as any }
                    })}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  >
                    <option value="Good / Working">Good / Working</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Replaced">Replaced</option>
                    <option value="Missing">Missing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={editingDeployedItem.item.quantity}
                    onChange={(e) => setEditingDeployedItem({
                      ...editingDeployedItem,
                      item: { ...editingDeployedItem.item, quantity: parseFloat(e.target.value) || 1 }
                    })}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-bold font-mono bg-[#white] text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingDeployedItem.item.unit}
                    onChange={(e) => setEditingDeployedItem({
                      ...editingDeployedItem,
                      item: { ...editingDeployedItem.item, unit: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Unit Price (₱)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editingDeployedItem.item.unitCost || 0}
                    onChange={(e) => setEditingDeployedItem({
                      ...editingDeployedItem,
                      item: { ...editingDeployedItem.item, unitCost: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-bold font-mono bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Serial No.</label>
                  <input
                    type="text"
                    value={editingDeployedItem.item.serialNumber || ''}
                    onChange={(e) => setEditingDeployedItem({
                      ...editingDeployedItem,
                      item: { ...editingDeployedItem.item, serialNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-mono bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Deployment Date</label>
                  <input
                    type="date"
                    value={editingDeployedItem.item.dateDeployed || ''}
                    onChange={(e) => setEditingDeployedItem({
                      ...editingDeployedItem,
                      item: { ...editingDeployedItem.item, dateDeployed: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Notes</label>
                <input
                  type="text"
                  value={editingDeployedItem.item.notes || ''}
                  onChange={(e) => setEditingDeployedItem({
                    ...editingDeployedItem,
                    item: { ...editingDeployedItem.item, notes: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setEditingDeployedItem(null)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs"
                >
                  Save Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: DELETE DEPLOYED EQUIPMENT           */}
      {/* ========================================== */}
      {deletingDeployedItem && (
        <div className="fixed inset-0 z-50 bg-[#3E312C]/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-sm w-full p-6 shadow-2xl relative text-[#3E312C]">
            <h3 className="font-serif text-lg text-[#3E312C] font-bold">Remove Equipment?</h3>
            <p className="text-xs text-[#8C7A6B] mt-2 leading-relaxed">
              Remove <strong className="text-[#3E312C]">{deletingDeployedItem.item.name}</strong> from <strong className="text-[#3E312C]">{deletingDeployedItem.room.roomNumber}</strong>?
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingDeployedItem(null)}
                className="flex-1 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveDeployedItem(deletingDeployedItem.room.id, deletingDeployedItem.item.id);
                  setDeletingDeployedItem(null);
                }}
                className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white font-semibold text-xs rounded-full cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: INVENTORY ITEM TRANSFER FORM       */}
      {/* ========================================== */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="transfer-item-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-2xl w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setIsTransferModalOpen(false)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-[#8C7355]" />
                <h3 className="font-serif text-xl text-[#3E312C]">Batch Inventory Transfer</h3>
              </div>
              <p className="text-xs text-[#8C7A6B] mt-1">
                Select one or multiple items to transfer to another department, room, or custom location in a single transaction and generate a consolidated Material Transfer Form PDF.
              </p>
            </div>

            {transferError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              
              {/* Transfer Metadata Section */}
              <div className="bg-[#FAF9F5] border border-[#EBE6DD] p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Source Section (Readonly) */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">From Section (Source)</label>
                    <input
                      type="text"
                      disabled
                      value={getSectionName(sectionFilter)}
                      className="w-full px-3 py-1.5 border border-[#E6E4DD] rounded-xl text-xs font-bold bg-[#F4F2EB] text-[#3E312C]"
                    />
                  </div>

                  {/* Destination Section / Room */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Transfer Destination *</label>
                    <select
                      value={transferDestination}
                      onChange={(e) => setTransferDestination(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                    >
                      <optgroup label="Inventory Sections">
                        {ALL_INVENTORY_SECTIONS.filter(s => s !== sectionFilter).map(sec => (
                          <option key={sec} value={sec}>{getSectionName(sec)}</option>
                        ))}
                      </optgroup>
                      {rooms.length > 0 && (
                        <optgroup label="Hotel Guest Rooms">
                          {rooms.map(room => (
                            <option key={room.id} value={`ROOM:${room.id}`}>
                              Room {room.roomNumber} ({room.roomType})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="External / Custom">
                        <option value="OTHER">Other / Custom Location...</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Custom Location (if OTHER selected) */}
                  {transferDestination === 'OTHER' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Custom Destination Name *</label>
                      <input
                        type="text"
                        required
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        placeholder="e.g. Main Banquet Hall, Maintenance Shop, Executive Lounge"
                        className="w-full px-3 py-1.5 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                      />
                    </div>
                  )}

                  {/* Transferred By (Sender) */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Transferred By (Sender) *</label>
                    <input
                      type="text"
                      required
                      value={transferSender}
                      onChange={(e) => setTransferSender(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                    />
                  </div>

                  {/* Received By (Recipient) */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Received By (Recipient) *</label>
                    <input
                      type="text"
                      required
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      placeholder="e.g. Maria Santos (Housekeeping Supervisor)"
                      className="w-full px-3 py-1.5 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                    />
                  </div>

                </div>

                {/* Purpose / Reason */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Purpose / Transfer Notes</label>
                  <input
                    type="text"
                    value={transferPurpose}
                    onChange={(e) => setTransferPurpose(e.target.value)}
                    placeholder="e.g. Reallocated for special event banquet preparation..."
                    className="w-full px-3 py-1.5 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              {/* Add Items to Transfer Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#3E312C] uppercase tracking-wider">
                    Add Items to Transfer List ({transferItemsList.length})
                  </label>
                  <span className="text-[10px] text-[#8C7A6B]">
                    Items from {getSectionName(sectionFilter)} with stock &gt; 0
                  </span>
                </div>

                {/* Item Picker Row */}
                <div className="bg-white border border-[#EBE6DD] p-3 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <select
                      value={selectedItemToAdd?.id || ''}
                      onChange={(e) => {
                        const found = inventory.find(i => i.id === e.target.value);
                        setSelectedItemToAdd(found || null);
                      }}
                      className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                    >
                      {inventory.filter(i => (i.section || 'KITCHEN') === sectionFilter && i.currentStock > 0).length === 0 ? (
                        <option value="">No stock available in {getSectionName(sectionFilter)}</option>
                      ) : (
                        inventory
                          .filter(i => (i.section || 'KITCHEN') === sectionFilter && i.currentStock > 0)
                          .map(i => {
                            const isAdded = transferItemsList.some(l => l.item.id === i.id);
                            return (
                              <option key={i.id} value={i.id}>
                                {i.name} ({i.currentStock} {i.unit} avail • ₱{i.unitCost.toFixed(2)}){isAdded ? ' ✓ Added' : ''}
                              </option>
                            );
                          })
                      )}
                    </select>
                  </div>

                  <div className="w-full sm:w-28 relative">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      max={selectedItemToAdd ? selectedItemToAdd.currentStock : undefined}
                      value={selectedItemQtyToAdd}
                      onChange={(e) => setSelectedItemQtyToAdd(e.target.value)}
                      placeholder="Qty"
                      className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-bold bg-white text-[#3E312C]"
                    />
                    {selectedItemToAdd && (
                      <span className="absolute right-2.5 top-2 text-[10px] font-mono text-[#8C7A6B] pointer-events-none">
                        {selectedItemToAdd.unit}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToTransferList}
                    disabled={!selectedItemToAdd || selectedItemToAdd.currentStock <= 0}
                    className="px-4 py-2 bg-[#8C7355] hover:bg-[#745E44] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shrink-0 flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Table / List of Added Items */}
                <div className="border border-[#EBE6DD] rounded-2xl overflow-hidden bg-white">
                  <div className="bg-[#F4F2EB] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-[#8C7A6B] font-bold flex justify-between items-center border-b border-[#EBE6DD]">
                    <span>Items to Transfer Batch</span>
                    <span>Total Valuation</span>
                  </div>

                  {transferItemsList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#8C7A6B] italic">
                      No items added to this transfer batch yet. Select an item above and click "Add Item".
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F0EFE9] max-h-56 overflow-y-auto">
                      {transferItemsList.map(({ item, qty }) => {
                        const lineValuation = qty * item.unitCost;
                        return (
                          <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#FAF9F5] transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-[#3E312C] truncate">{item.name}</div>
                              <div className="text-[10px] text-[#8C7A6B]">
                                {item.category || 'General'} • ₱{item.unitCost.toFixed(2)} / {item.unit} • Max avail: {item.currentStock} {item.unit}
                              </div>
                            </div>

                            {/* Quantity Editor */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <label className="text-[10px] text-[#8C7A6B] font-bold">Qty:</label>
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                max={item.currentStock}
                                value={qty}
                                onChange={(e) => handleUpdateTransferItemQty(item.id, parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 border border-[#E6E4DD] rounded-lg text-xs font-bold text-center font-mono text-[#3E312C]"
                              />
                              <span className="text-[10px] font-mono text-[#8C7A6B]">{item.unit}</span>
                            </div>

                            {/* Line Valuation */}
                            <div className="text-right font-mono font-bold text-[#3E312C] w-24 shrink-0">
                              ₱{lineValuation.toFixed(2)}
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveTransferItem(item.id)}
                              className="p-1.5 text-[#8C7A6B] hover:text-red-700 hover:bg-[#FDF2F0] rounded-lg cursor-pointer transition-colors shrink-0"
                              title="Remove from batch"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary Bar */}
                  {transferItemsList.length > 0 && (
                    <div className="bg-[#FAF9F5] px-4 py-2.5 border-t border-[#EBE6DD] flex justify-between items-center text-xs font-bold text-[#3E312C]">
                      <span>
                        {transferItemsList.length} Item Type(s) • Total Quantity: {transferItemsList.reduce((acc, curr) => acc + curr.qty, 0)}
                      </span>
                      <span className="font-mono text-sm text-[#3E312C]">
                        Total Valuation: ₱{transferItemsList.reduce((acc, curr) => acc + (curr.qty * curr.item.unitCost), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferItemsList.length === 0}
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] disabled:bg-gray-300 text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Execute Transfer ({transferItemsList.length} items) &amp; Print PDF</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: DUPLICATE ROOM SETUP               */}
      {/* ========================================== */}
      {duplicatingRoom && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="duplicate-room-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-xl w-full p-6 shadow-lg relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setDuplicatingRoom(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-[#8C7355]" />
                <h3 className="font-serif text-xl text-[#3E312C]">Duplicate Room Setup ({duplicatingRoom.roomNumber})</h3>
              </div>
              <p className="text-xs text-[#8C7A6B] mt-1">Copy room configuration and all installed equipment/assets to create identical hotel rooms quickly.</p>
            </div>

            {/* Source Room Overview Card */}
            <div className="bg-[#FAF9F5] border border-[#EBE6DD] p-3.5 rounded-2xl mb-4 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-[#3E312C]">
                <span>Source: {duplicatingRoom.roomNumber} ({duplicatingRoom.roomType})</span>
                <span className="text-[#8C7A6B] font-mono">{duplicatingRoom.floor || 'No floor'}</span>
              </div>
              <p className="text-[#8C7A6B]">
                Installed Equipment to Clone: <span className="font-bold text-[#3E312C]">{(duplicatingRoom.deployedItems || []).length} items</span>
              </p>
              {(duplicatingRoom.deployedItems || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-[#EBE6DD]">
                  {(duplicatingRoom.deployedItems || []).map((item, idx) => (
                    <span key={idx} className="bg-white border border-[#E6E4DD] px-2 py-0.5 rounded-md text-[10px] text-[#3E312C] font-semibold">
                      {item.quantity}x {item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {dupError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{dupError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteDuplicateRoom} className="space-y-4">
              
              {/* Duplication Mode Tabs */}
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1.5">Duplication Mode</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setDupMode('single')}
                    className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
                      dupMode === 'single' ? 'bg-[#3E312C] text-white shadow-xs' : 'text-[#8C7A6B] hover:text-[#3E312C]'
                    }`}
                  >
                    Single Room Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => setDupMode('batch')}
                    className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
                      dupMode === 'batch' ? 'bg-[#3E312C] text-white shadow-xs' : 'text-[#8C7A6B] hover:text-[#3E312C]'
                    }`}
                  >
                    Batch Multi-Room Duplicate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Single or Batch Inputs */}
                {dupMode === 'single' ? (
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">New Room Number *</label>
                    <input
                      type="text"
                      required
                      value={dupRoomNumber}
                      onChange={(e) => setDupRoomNumber(e.target.value)}
                      placeholder="e.g. Room 102"
                      className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-bold bg-white text-[#3E312C]"
                    />
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                      New Room Numbers (Comma Separated) *
                    </label>
                    <input
                      type="text"
                      required
                      value={dupBatchNumbers}
                      onChange={(e) => setDupBatchNumbers(e.target.value)}
                      placeholder="e.g. 102, 103, 104, 105, 106"
                      className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-bold bg-white text-[#3E312C]"
                    />
                    <p className="text-[10px] text-[#8C7A6B] mt-1">Separate multiple room numbers with commas to create several identical rooms at once.</p>
                  </div>
                )}

                {/* Room Type */}
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Room Type *</label>
                  <select
                    required
                    value={dupRoomType}
                    onChange={(e) => setDupRoomType(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C] font-semibold"
                  >
                    <option value="Junior Suite">Junior Suite</option>
                    <option value="Deluxe Rooms">Deluxe Rooms</option>
                    <option value="Standard Rooms">Standard Rooms</option>
                  </select>
                </div>

                {/* Floor / Wing */}
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Floor / Wing *</label>
                  <input
                    type="text"
                    required
                    value={dupFloor}
                    onChange={(e) => setDupFloor(e.target.value)}
                    placeholder="e.g. 1st Floor, East Wing"
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                  />
                </div>

                {/* Initial Status */}
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Initial Room Status *</label>
                  <select
                    value={dupStatus}
                    onChange={(e) => setDupStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C] font-semibold"
                  >
                    <option value="Clean">Clean</option>
                    <option value="Vacant">Vacant</option>
                    <option value="Dirty">Dirty</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                  </select>
                </div>

              </div>

              {/* Options Checkboxes */}
              <div className="pt-2 border-t border-[#F0EFE9] space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#3E312C] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dupCopyDeployedItems}
                    onChange={(e) => setDupCopyDeployedItems(e.target.checked)}
                    className="rounded border-[#E6E4DD] text-[#3E312C] focus:ring-[#3E312C]"
                  />
                  <span>Copy all {(duplicatingRoom.deployedItems || []).length} installed equipment / assets from {duplicatingRoom.roomNumber}</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#3E312C] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dupCopyNotes}
                    onChange={(e) => setDupCopyNotes(e.target.checked)}
                    className="rounded border-[#E6E4DD] text-[#3E312C] focus:ring-[#3E312C]"
                  />
                  <span>Include notes and room comments from source room</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setDuplicatingRoom(null)}
                  className="px-5 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Execute Room Duplication</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: DEPLOYED ITEM ROOM BREAKDOWN DETAILS */}
      {/* ========================================== */}
      {viewingDeployedDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-2xl w-full p-6 shadow-lg relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setViewingDeployedDetails(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#F0EFE9] pb-4 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center font-bold">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-[#3E312C]">{viewingDeployedDetails.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]">
                    Deployed Equipment
                  </span>
                </div>
                <p className="text-xs text-[#8C7A6B]">Category: {viewingDeployedDetails.category} • Total Deployed: {viewingDeployedDetails.totalQuantity} {viewingDeployedDetails.unit} across {viewingDeployedDetails.roomsCount} room(s)</p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
                <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Total Deployed</p>
                <p className="text-base font-bold text-[#3E312C] font-mono mt-0.5">{viewingDeployedDetails.totalQuantity} <span className="text-xs text-[#8C7A6B] font-normal">{viewingDeployedDetails.unit}</span></p>
              </div>
              <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
                <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Deployed Rooms</p>
                <p className="text-base font-bold text-[#3E312C] font-mono mt-0.5">{viewingDeployedDetails.roomsCount} <span className="text-xs text-[#8C7A6B] font-normal">rooms</span></p>
              </div>
              <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
                <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Unit Cost</p>
                <p className="text-base font-bold text-[#3E312C] font-mono mt-0.5">₱{viewingDeployedDetails.unitCost.toFixed(2)}</p>
              </div>
              <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl p-3 text-center">
                <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Total Valuation</p>
                <p className="text-base font-bold text-[#3E312C] font-mono mt-0.5">₱{(viewingDeployedDetails.totalQuantity * viewingDeployedDetails.unitCost).toFixed(2)}</p>
              </div>
            </div>

            {/* Condition Status breakdown */}
            <div className="bg-[#F9F9F7] border border-[#E6E4DD] rounded-2xl p-3.5 mb-5 flex flex-wrap gap-4 items-center justify-around text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-[#8C7A6B] font-medium">Good / Working:</span>
                <span className="font-bold font-mono text-[#3E312C]">{viewingDeployedDetails.conditionBreakdown.good}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                <span className="text-[#8C7A6B] font-medium">Needs Repair:</span>
                <span className="font-bold font-mono text-[#3E312C]">{viewingDeployedDetails.conditionBreakdown.repair}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                <span className="text-[#8C7A6B] font-medium">Replaced:</span>
                <span className="font-bold font-mono text-[#3E312C]">{viewingDeployedDetails.conditionBreakdown.replaced}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                <span className="text-[#8C7A6B] font-medium">Missing:</span>
                <span className="font-bold font-mono text-[#3E312C]">{viewingDeployedDetails.conditionBreakdown.missing}</span>
              </div>
            </div>

            {/* Room breakdown list */}
            <h4 className="text-xs font-bold text-[#8C7A6B] uppercase tracking-wider font-mono mb-2">Deployed Room Locations & Condition</h4>
            <div className="max-h-60 overflow-y-auto border border-[#E6E4DD] rounded-2xl divide-y divide-[#F0EFE9]">
              {viewingDeployedDetails.roomBreakdown.map((rb, idx) => (
                <div key={idx} className="p-3 bg-white hover:bg-[#FAF9F5] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#3E312C]">Room {rb.roomNumber}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#3E312C] font-semibold">{rb.quantity} {viewingDeployedDetails.unit}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rb.condition === 'Good / Working' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      rb.condition === 'Needs Repair' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      rb.condition === 'Replaced' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {rb.condition}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-[#F0EFE9]">
              <button
                onClick={() => setViewingDeployedDetails(null)}
                className="px-5 py-2 bg-[#3E312C] text-white font-semibold text-xs rounded-full cursor-pointer hover:bg-[#2C211F] transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT AGGREGATED DEPLOYED EQUIPMENT  */}
      {/* ========================================== */}
      {editingAggregatedDeployedItem && (
        <div className="fixed inset-0 z-50 bg-[#3E312C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E4DD] rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <button
              type="button"
              onClick={() => setEditingAggregatedDeployedItem(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-[#FAF9F5] text-[#8C7A6B] hover:text-[#3E312C]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-[#F0EFE9] pb-3">
              <h3 className="font-serif text-xl font-bold text-[#3E312C]">Modify General Rooms Equipment</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">
                Editing <strong className="text-[#3E312C]">{editingAggregatedDeployedItem.name}</strong> deployed across <strong>{editingAggregatedDeployedItem.roomsCount} room(s)</strong>. Updates will automatically recalculate total room valuations!
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const targetName = editingAggregatedDeployedItem.name.trim().toLowerCase();
                const newName = editAggName.trim();
                const newCategory = editAggCat.trim();
                const newPrice = parseFloat(editAggPrice) || 0;
                const newUnit = editAggUnit.trim() || 'unit';

                const updatedRooms = rooms.map(room => {
                  const hasMatch = (room.deployedItems || []).some(item => item.name.trim().toLowerCase() === targetName);
                  if (!hasMatch) return room;

                  const updatedItems = (room.deployedItems || []).map(item => {
                    if (item.name.trim().toLowerCase() === targetName) {
                      return {
                        ...item,
                        name: newName,
                        category: newCategory,
                        unitCost: newPrice,
                        unit: newUnit
                      };
                    }
                    return item;
                  });

                  return { ...room, deployedItems: updatedItems };
                });

                if (onUpdateRoom) {
                  for (const r of updatedRooms) {
                    const original = rooms.find(orig => orig.id === r.id);
                    if (original && JSON.stringify(original.deployedItems) !== JSON.stringify(r.deployedItems)) {
                      await onUpdateRoom(r);
                    }
                  }
                }

                setEditingAggregatedDeployedItem(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Equipment / Asset Name *</label>
                <input
                  type="text"
                  required
                  value={editAggName}
                  onChange={(e) => setEditAggName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E6E4DD] rounded-xl text-sm font-semibold bg-white text-[#3E312C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Category</label>
                  <input
                    type="text"
                    value={editAggCat}
                    onChange={(e) => setEditAggCat(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Unit Tag</label>
                  <input
                    type="text"
                    value={editAggUnit}
                    onChange={(e) => setEditAggUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Unit Cost / Price (₱) *</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editAggPrice}
                  onChange={(e) => setEditAggPrice(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E6E4DD] rounded-xl text-sm font-bold font-mono bg-white text-[#3E312C]"
                />
                <p className="text-[11px] text-[#8C7A6B] mt-1 italic">
                  Updating unit price will automatically recompute the total valuation inside every room card where this equipment is deployed.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setEditingAggregatedDeployedItem(null)}
                  className="px-4 py-2 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-bold text-xs rounded-full cursor-pointer shadow-xs"
                >
                  Save & Update All Rooms
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isBulkDeployModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/40 flex items-center justify-center p-4 backdrop-blur-xs" id="bulk-deploy-rooms-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-xl w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 my-8">
            <button
              onClick={() => setIsBulkDeployModalOpen(false)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer p-1 rounded-full hover:bg-[#FAF9F5]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-[#F0EFE9] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#3E312C] text-white rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#3E312C]">Add Item / Equipment to Rooms</h3>
                  <p className="text-xs text-[#8C7A6B]">Batch deploy equipment or supplies across all rooms or selected groups.</p>
                </div>
              </div>
            </div>

            {bulkDeployError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{bulkDeployError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteBulkDeploy} className="space-y-4">
              {/* Target Scope Selection */}
              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE6DD] space-y-3">
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Target Room Selection Scope
                </label>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkDeployTargetScope('all')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      bulkDeployTargetScope === 'all'
                        ? 'bg-[#3E312C] text-white border-[#3E312C] shadow-xs'
                        : 'bg-white text-[#3E312C] border-[#E6E4DD] hover:bg-[#F4F2EB]'
                    }`}
                  >
                    All Rooms ({rooms.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBulkDeployTargetScope('type');
                      if (uniqueRoomTypes.length > 0 && bulkDeploySelectedType === 'All') {
                        setBulkDeploySelectedType(uniqueRoomTypes[0]);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      bulkDeployTargetScope === 'type'
                        ? 'bg-[#3E312C] text-white border-[#3E312C] shadow-xs'
                        : 'bg-white text-[#3E312C] border-[#E6E4DD] hover:bg-[#F4F2EB]'
                    }`}
                  >
                    By Room Type
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBulkDeployTargetScope('floor');
                      if (uniqueFloors.length > 0 && bulkDeploySelectedFloor === 'All') {
                        setBulkDeploySelectedFloor(uniqueFloors[0]);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      bulkDeployTargetScope === 'floor'
                        ? 'bg-[#3E312C] text-white border-[#3E312C] shadow-xs'
                        : 'bg-white text-[#3E312C] border-[#E6E4DD] hover:bg-[#F4F2EB]'
                    }`}
                  >
                    By Floor
                  </button>
                </div>

                {bulkDeployTargetScope === 'type' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C7A6B] uppercase mb-1">Select Room Type</label>
                    <select
                      value={bulkDeploySelectedType}
                      onChange={(e) => setBulkDeploySelectedType(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                    >
                      {uniqueRoomTypes.map(t => (
                        <option key={t} value={t}>{t} ({rooms.filter(r => (r.roomType || '').trim() === t).length} Rooms)</option>
                      ))}
                    </select>
                  </div>
                )}

                {bulkDeployTargetScope === 'floor' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C7A6B] uppercase mb-1">Select Floor</label>
                    <select
                      value={bulkDeploySelectedFloor}
                      onChange={(e) => setBulkDeploySelectedFloor(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                    >
                      {uniqueFloors.map(f => (
                        <option key={f} value={f}>{f} ({rooms.filter(r => (r.floor || '').trim() === f).length} Rooms)</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Scope Target Summary Badge */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#E6E4DD]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span className="text-xs text-[#3E312C] font-medium">
                    Will add item to <strong className="font-bold underline">{targetRoomsForBulkDeploy.length} room(s)</strong>
                    {targetRoomsForBulkDeploy.length > 0 && (
                      <span className="text-[#8C7A6B] text-[11px]"> ({targetRoomsForBulkDeploy.slice(0, 5).map(r => r.roomNumber).join(', ')}{targetRoomsForBulkDeploy.length > 5 ? `, +${targetRoomsForBulkDeploy.length - 5} more` : ''})</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Optional Pick from General Inventory Stock */}
              <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#EBE6DD]">
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Select from General Inventory Stock (Optional)</label>
                <select
                  value={bulkSelectedInventoryItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setBulkSelectedInventoryItemId(id);
                    if (id) {
                      const found = inventory.find(i => i.id === id);
                      if (found) {
                        setBulkDeployItemName(found.name);
                        setBulkDeployCategory(found.category || 'General');
                        setBulkDeployUnit(found.unit || 'unit');
                        setBulkDeployUnitCost(found.unitCost.toString());
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                >
                  <option value="">-- Manual Entry or Select Stock Item --</option>
                  {inventory
                    .filter(i => (i.section || 'KITCHEN') === 'ROOMS' || (i.section || 'KITCHEN') === 'HOUSEKEEPING_EQUIPMENTS' || (i.section || 'KITCHEN') === 'HOUSEKEEPING')
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.currentStock} {item.unit} available • ₱{item.unitCost.toFixed(2)})
                      </option>
                    ))}
                </select>

                {bulkSelectedInventoryItemId && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="bulkAutoDeductCheck"
                      checked={bulkAutoDeductStock}
                      onChange={(e) => setBulkAutoDeductStock(e.target.checked)}
                      className="rounded border-[#E6E4DD] text-[#3E312C] focus:ring-[#3E312C]"
                    />
                    <label htmlFor="bulkAutoDeductCheck" className="text-xs font-medium text-[#3E312C] cursor-pointer">
                      Auto-deduct total required stock ({targetRoomsForBulkDeploy.length * (parseFloat(bulkDeployQtyPerRoom) || 1)} units) from inventory
                    </label>
                  </div>
                )}
              </div>

              {/* Item Details Fields */}
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Equipment / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memory Foam Pillow, Electric Kettle, Welcome Bath Kit"
                  value={bulkDeployItemName}
                  onChange={(e) => setBulkDeployItemName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E6E4DD] rounded-xl text-sm font-semibold bg-white text-[#3E312C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={bulkDeployCategory}
                    onChange={(e) => setBulkDeployCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Linens">Linens</option>
                    <option value="Amenities">Amenities</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Condition</label>
                  <select
                    value={bulkDeployCondition}
                    onChange={(e) => setBulkDeployCondition(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  >
                    <option value="Good / Working">Good / Working</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Replaced">Replaced</option>
                    <option value="Missing">Missing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Qty / Room *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={bulkDeployQtyPerRoom}
                    onChange={(e) => setBulkDeployQtyPerRoom(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-bold font-mono bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Unit</label>
                  <input
                    type="text"
                    value={bulkDeployUnit}
                    onChange={(e) => setBulkDeployUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-semibold bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Unit Price (₱)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={bulkDeployUnitCost}
                    onChange={(e) => setBulkDeployUnitCost(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-bold font-mono bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Serial / Asset Prefix</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-TEL (auto-appends room #)"
                    value={bulkDeploySerialPrefix}
                    onChange={(e) => setBulkDeploySerialPrefix(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs font-mono bg-white text-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Deployment Date</label>
                  <input
                    type="date"
                    value={bulkDeployDate}
                    onChange={(e) => setBulkDeployDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">Batch Deployment Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Standard room amenity setup rollout"
                  value={bulkDeployNotes}
                  onChange={(e) => setBulkDeployNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-xs bg-white text-[#3E312C]"
                />
              </div>

              {/* Batch Summary Box */}
              <div className="bg-[#3E312C] text-white p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] text-[#DCD5C9] uppercase font-mono font-bold tracking-wider">Deployment Summary</span>
                  <p className="text-sm font-bold mt-0.5">
                    {bulkDeployItemName.trim() || 'Item'} • {(parseFloat(bulkDeployQtyPerRoom) || 1) * targetRoomsForBulkDeploy.length} Total Units Needed
                  </p>
                  <p className="text-xs text-[#DCD5C9]">
                    ({bulkDeployQtyPerRoom} {bulkDeployUnit}/room across {targetRoomsForBulkDeploy.length} rooms)
                  </p>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-[10px] text-[#DCD5C9] uppercase font-mono font-bold tracking-wider">Total Valuation</span>
                  <p className="text-lg font-mono font-bold text-emerald-300">
                    ₱{((parseFloat(bulkDeployQtyPerRoom) || 1) * targetRoomsForBulkDeploy.length * (parseFloat(bulkDeployUnitCost) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setIsBulkDeployModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-bold text-xs rounded-full cursor-pointer shadow-sm transition-all"
                >
                  <PackageCheck className="h-4 w-4" />
                  <span>Deploy to {targetRoomsForBulkDeploy.length} Room(s)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
