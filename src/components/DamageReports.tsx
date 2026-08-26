import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  ShoppingBag, 
  DollarSign, 
  Send,
  ShieldAlert,
  Wrench,
  Archive,
  RefreshCw,
  FileText,
  Calendar,
  Filter,
  Download,
  UserCheck,
  User as UserIcon
} from 'lucide-react';
import { DamageReport, DamageReportItem, DamageSeverity, DamageStatus, InventoryItem, User as UserType, HotelRoom } from '../types';

export const INVENTORY_TABS = [
  { key: 'KITCHEN', name: 'Kitchen' },
  { key: 'ROOMS', name: 'Rooms' },
  { key: 'HOUSEKEEPING', name: 'Housekeeping Supplies' },
  { key: 'HOUSEKEEPING_EQUIPMENTS', name: 'Housekeeping Equipments' },
  { key: 'HR_EQUIPMENTS', name: 'H.R Equipments' },
  { key: 'FO_EQUIPMENTS', name: 'F.O Equipments' },
  { key: 'FINANCE_EQUIPMENTS', name: 'Finance Equipments' },
  { key: 'SECURITY_POST_EQUIPMENTS', name: 'Security Post Equipments' },
  { key: 'IT_EQUIPMENTS', name: 'I.T Equipments' },
  { key: 'LINENS', name: 'Linens' },
  { key: 'INDUSTRIAL_EQUIPMENTS', name: 'Industrial Equipments' },
  { key: 'LUZON', name: 'Luzon' },
  { key: 'VISAYAS', name: 'Visayas' },
  { key: 'MINDANAO', name: 'Mindanao' }
];

export interface FormDamageItem {
  id: string;
  category: string;
  selectedInventoryId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  deductFromStock: boolean;
  roomNumber?: string;
}

interface DamageReportsProps {
  reports: DamageReport[];
  inventory: InventoryItem[];
  rooms?: HotelRoom[];
  currentUser: UserType;
  users?: UserType[];
  onCreateReport: (report: any) => void;
  onUpdateReportStatus: (reportId: string, newStatus: DamageStatus, actionNotes?: string) => void;
  onDeleteReport: (reportId: string) => void;
  onRequestReplacementPR: (item: { itemId?: string; itemName: string; quantity: number; unit: string; unitCost?: number; reason: string }) => void;
}

export default function DamageReports({
  reports,
  inventory,
  rooms = [],
  currentUser,
  users = [],
  onCreateReport,
  onUpdateReportStatus,
  onDeleteReport,
  onRequestReplacementPR
}: DamageReportsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const [isCreating, setIsCreating] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<DamageReport | null>(null);

  // Overall PDF Report Modal state
  const [isOverallReportModalOpen, setIsOverallReportModalOpen] = useState(false);
  const [overallTimeframe, setOverallTimeframe] = useState<'this_week' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [overallCategoryFilter, setOverallCategoryFilter] = useState<string>('all');
  const [overallSeverityFilter, setOverallSeverityFilter] = useState<string>('all');
  const [overallStatusFilter, setOverallStatusFilter] = useState<string>('all');

  // Form states for multi-item creation
  const createDefaultItem = (): FormDamageItem => ({
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    category: 'Kitchen',
    selectedInventoryId: '',
    itemName: '',
    quantity: 1,
    unit: 'pcs',
    unitCost: 0,
    deductFromStock: true
  });

  const [itemsList, setItemsList] = useState<FormDamageItem[]>([createDefaultItem()]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('Kitchen');
  const [severity, setSeverity] = useState<DamageSeverity>('beyond_repair');
  const [incidentDate, setIncidentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Reported By State
  const [reporterMode, setReporterMode] = useState<'logged_user' | 'user_directory' | 'custom'>('logged_user');
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<string>('');
  const [customReporterName, setCustomReporterName] = useState<string>('');
  const [customReporterDept, setCustomReporterDept] = useState<string>('Housekeeping');

  // Local draft auto-recovery for Damage Reports
  const DAMAGE_DRAFT_KEY = 'madigun_damage_report_multi_draft';
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DAMAGE_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.itemsList && parsed.itemsList.length > 0) {
          setItemsList(parsed.itemsList);
          if (parsed.severity) setSeverity(parsed.severity);
          if (parsed.incidentDate) setIncidentDate(parsed.incidentDate);
          if (parsed.description) setDescription(parsed.description);
          if (parsed.notes) setNotes(parsed.notes);
          if (parsed.reporterMode) setReporterMode(parsed.reporterMode);
          if (parsed.selectedStaffUserId) setSelectedStaffUserId(parsed.selectedStaffUserId);
          if (parsed.customReporterName) setCustomReporterName(parsed.customReporterName);
          if (parsed.customReporterDept) setCustomReporterDept(parsed.customReporterDept);
          setIsDraftRestored(true);
        }
      }
    } catch (err) {
      console.error("Error restoring damage report draft", err);
    }
  }, []);

  useEffect(() => {
    if (itemsList.some(i => i.itemName.trim() || i.selectedInventoryId) || description.trim() || customReporterName.trim()) {
      try {
        localStorage.setItem(DAMAGE_DRAFT_KEY, JSON.stringify({
          itemsList,
          severity,
          incidentDate,
          description,
          notes,
          reporterMode,
          selectedStaffUserId,
          customReporterName,
          customReporterDept,
          savedAt: new Date().toISOString()
        }));
      } catch (err) {
        console.error("Error saving damage draft", err);
      }
    } else {
      localStorage.removeItem(DAMAGE_DRAFT_KEY);
    }
  }, [itemsList, severity, incidentDate, description, notes, reporterMode, selectedStaffUserId, customReporterName, customReporterDept]);

  const handleClearLocalDraft = () => {
    setItemsList([createDefaultItem()]);
    setSeverity('beyond_repair');
    setIncidentDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setNotes('');
    setReporterMode('logged_user');
    setSelectedStaffUserId('');
    setCustomReporterName('');
    setCustomReporterDept('Housekeeping');
    localStorage.removeItem(DAMAGE_DRAFT_KEY);
    setIsDraftRestored(false);
  };

  // Helper: Filter inventory options per category, including deployed equipment for Rooms
  const getInventoryForCategory = (catName: string, selectedRoomNum?: string) => {
    if (!catName) return inventory;
    const targetTab = INVENTORY_TABS.find(
      t => t.name.toLowerCase() === catName.toLowerCase() || t.key.toLowerCase() === catName.toLowerCase()
    );
    if (!targetTab) return inventory;

    const matchedInventory = inventory.filter(inv => {
      const itemSec = (inv.section || 'KITCHEN').toUpperCase();
      return (
        itemSec === targetTab.key ||
        (inv.category && inv.category.toLowerCase() === targetTab.name.toLowerCase())
      );
    });

    if (targetTab.key === 'ROOMS') {
      const deployedItemsOptions: Array<{
        id: string;
        name: string;
        category: string;
        unit: string;
        unitCost: number;
        currentStock: number;
        roomNumber: string;
        isDeployed: boolean;
      }> = [];

      (rooms || []).forEach(room => {
        if (selectedRoomNum && room.roomNumber !== selectedRoomNum) return;
        (room.deployedItems || []).forEach(dep => {
          deployedItemsOptions.push({
            id: `deployed_${room.id}_${dep.id}`,
            name: `${dep.name} (Room ${room.roomNumber})`,
            category: 'Rooms',
            unit: dep.unit || 'pcs',
            unitCost: dep.unitCost || 0,
            currentStock: dep.quantity || 1,
            roomNumber: room.roomNumber,
            isDeployed: true
          });
        });
      });

      return [...deployedItemsOptions, ...matchedInventory];
    }

    return matchedInventory;
  };

  // Multi-item form management
  const handleAddItem = (categoryOverride?: string) => {
    const targetCategory = categoryOverride || (itemsList.length > 0 ? itemsList[itemsList.length - 1].category : selectedCategoryTab || 'Kitchen');
    setItemsList(prev => [...prev, {
      ...createDefaultItem(),
      category: targetCategory
    }]);
  };

  const handleSetAllCategories = (targetCat: string) => {
    setSelectedCategoryTab(targetCat);
    setItemsList(prev => prev.map(item => ({
      ...item,
      category: targetCat,
      selectedInventoryId: item.category === targetCat ? item.selectedInventoryId : '',
      itemName: item.category === targetCat ? item.itemName : ''
    })));
  };

  const handleRemoveItem = (index: number) => {
    if (itemsList.length <= 1) return;
    setItemsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, updates: Partial<FormDamageItem>) => {
    setItemsList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const handleCategoryChange = (index: number, newCategory: string) => {
    handleUpdateItem(index, {
      category: newCategory,
      selectedInventoryId: '',
      itemName: ''
    });
  };

  const handleSelectInventoryItem = (index: number, itemId: string) => {
    if (!itemId) {
      handleUpdateItem(index, { selectedInventoryId: '' });
      return;
    }

    const currentItem = itemsList[index];
    const categoryItems = getInventoryForCategory(currentItem?.category || 'Kitchen', currentItem?.roomNumber);
    const found = categoryItems.find(i => i.id === itemId);

    if (found) {
      let cleanName = found.name;
      const detectedRoomNum = (found as any).roomNumber || currentItem?.roomNumber;

      if (cleanName.includes(' (Room ')) {
        cleanName = cleanName.split(' (Room ')[0];
      }

      handleUpdateItem(index, {
        selectedInventoryId: itemId,
        itemName: cleanName,
        unit: found.unit || 'pcs',
        unitCost: found.unitCost || 0,
        roomNumber: detectedRoomNum,
        deductFromStock: !((found as any).isDeployed)
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate items
    for (let i = 0; i < itemsList.length; i++) {
      const item = itemsList[i];
      if (!item.itemName.trim()) {
        setFormError(`Please select or specify item name for Item #${i + 1}.`);
        return;
      }
      if (item.quantity <= 0) {
        setFormError(`Quantity for Item #${i + 1} ("${item.itemName}") must be greater than 0.`);
        return;
      }
    }

    if (!description.trim()) {
      setFormError('Please provide a brief description / cause of the incident.');
      return;
    }

    // Determine Reported By
    let finalReporterName = currentUser.name;
    if (reporterMode === 'user_directory') {
      if (!selectedStaffUserId) {
        setFormError('Please select a registered staff member from the employee list.');
        return;
      }
      const foundUser = users.find(u => u.id === selectedStaffUserId);
      if (foundUser) {
        const roleLabel = foundUser.role === 'admin' ? 'Property Custodian' : foundUser.role === 'managing_director' ? 'Managing Director' : 'Staff';
        finalReporterName = `${foundUser.name} (${roleLabel})`;
      } else {
        finalReporterName = selectedStaffUserId;
      }
    } else if (reporterMode === 'custom') {
      if (!customReporterName.trim()) {
        setFormError('Please enter the name of the person who reported the damage.');
        return;
      }
      finalReporterName = `${customReporterName.trim()}${customReporterDept.trim() ? ` (${customReporterDept.trim()})` : ''}`;
    } else {
      const roleLabel = currentUser.role === 'admin' ? 'Property Custodian' : currentUser.role === 'managing_director' ? 'Managing Director' : 'Staff';
      finalReporterName = `${currentUser.name} (${roleLabel})`;
    }

    const formattedItems = itemsList.map(item => ({
      itemId: item.selectedInventoryId || undefined,
      itemName: item.itemName.trim(),
      category: item.category,
      quantity: item.quantity,
      unit: item.unit || 'pcs',
      unitCost: item.unitCost,
      totalCost: item.quantity * item.unitCost,
      deductFromStock: item.deductFromStock,
      roomNumber: item.roomNumber || undefined
    }));

    const primaryRoomNumber = formattedItems.find(i => i.roomNumber)?.roomNumber;

    onCreateReport({
      items: formattedItems,
      roomNumber: primaryRoomNumber,
      location: primaryRoomNumber ? `Room ${primaryRoomNumber}` : undefined,
      severity,
      status: 'reported',
      incidentDate,
      reportedByName: finalReporterName,
      description: description.trim(),
      notes: notes.trim() || undefined
    });

    handleClearLocalDraft();
    setIsCreating(false);
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalReports = reports.length;
    const totalValueLost = reports.reduce((sum, r) => sum + (r.totalCost || (r.quantity * (r.unitCost || 0))), 0);
    const pendingReview = reports.filter(r => r.status === 'reported' || r.status === 'under_review').length;
    const writtenOffCount = reports.filter(r => r.status === 'written_off' || r.severity === 'beyond_repair').length;

    return { totalReports, totalValueLost, pendingReview, writtenOffCount };
  }, [reports]);

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const itemsText = (r.items || []).map(i => i.itemName).join(' ');
      const matchQuery = 
        r.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        itemsText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reportedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSeverity = selectedSeverity === 'all' || r.severity === selectedSeverity;
      const matchStatus = selectedStatus === 'all' || r.status === selectedStatus;
      const matchCategory = selectedCategoryFilter === 'all' || (r.category || '').toLowerCase().includes(selectedCategoryFilter.toLowerCase());

      return matchQuery && matchSeverity && matchStatus && matchCategory;
    });
  }, [reports, searchQuery, selectedSeverity, selectedStatus, selectedCategoryFilter]);

  // Normalize report items helper
  const getReportItems = (report: DamageReport): DamageReportItem[] => {
    if (report.items && report.items.length > 0) {
      return report.items;
    }
    return [{
      id: '1',
      itemId: report.itemId,
      itemName: report.itemName,
      category: report.category || 'General',
      quantity: report.quantity,
      unit: report.unit,
      unitCost: report.unitCost || 0,
      totalCost: report.totalCost || (report.quantity * (report.unitCost || 0)),
      deductFromStock: report.deductedFromStock
    }];
  };

  // Printable PDF Generator for Single Damage Report Slip
  const handlePrintPDF = (report: DamageReport) => {
    const doc = new jsPDF();
    const reportItems = getReportItems(report);

    // Brand Header
    doc.setFillColor(62, 49, 44);
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("MADIGUN HOTEL ELEVEN", 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("PROPERTY DAMAGE & INCIDENT REPORT SLIP", 14, 23);

    doc.setFontSize(9);
    doc.text(`DATE: ${new Date(report.reportedAt).toLocaleDateString()}`, 150, 15);
    doc.text(`REF #: ${report.reportNumber}`, 150, 23);

    // Section 1: Overview
    doc.setTextColor(62, 49, 44);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("INCIDENT OVERVIEW", 14, 42);

    autoTable(doc, {
      startY: 46,
      head: [['Field', 'Information']],
      body: [
        ['Report Number', report.reportNumber],
        ['Reported By', `${report.reportedByName} (${report.reportedBy})`],
        ['Incident Date', report.incidentDate],
        ['Room / Location', report.roomNumber ? `Room ${report.roomNumber}` : (report.location || 'General Facility')],
        ['Total Items Damaged', `${reportItems.length} item(s)`],
        ['Damage Severity', report.severity.toUpperCase().replace('_', ' ')],
        ['Current Status', report.status.toUpperCase().replace('_', ' ')],
        ['Total Estimated Loss', `PHP ${(report.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [62, 49, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    // Section 2: Itemized Damaged Property Table
    const itemTableY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("ITEMIZED DAMAGED / BROKEN PROPERTY LIST:", 14, itemTableY);

    const tableRows = reportItems.map((item, idx) => [
      idx + 1,
      item.itemName,
      item.roomNumber ? `Room ${item.roomNumber}` : report.roomNumber ? `Room ${report.roomNumber}` : (report.location || '-'),
      item.category || 'General',
      `${item.quantity} ${item.unit}`,
      `PHP ${(item.unitCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `PHP ${(item.totalCost || (item.quantity * (item.unitCost || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      item.deductFromStock ? 'YES' : 'NO'
    ]);

    autoTable(doc, {
      startY: itemTableY + 4,
      head: [['#', 'Item Name', 'Room / Location', 'Category Tab', 'Qty & Unit', 'Unit Cost', 'Total Loss', 'Deducted']],
      body: tableRows,
      foot: [['', 'TOTAL ESTIMATED FINANCIAL IMPACT', '', '', '', `PHP ${(report.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, '']],
      theme: 'striped',
      headStyles: { fillColor: [166, 93, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [240, 239, 233], textColor: [62, 49, 44], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5 }
    });

    // Cause & Description
    const currentY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("CAUSE & DESCRIPTION OF INCIDENT:", 14, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitDesc = doc.splitTextToSize(report.description, 180);
    doc.text(splitDesc, 14, currentY + 5);

    if (report.notes) {
      const notesY = currentY + 5 + (splitDesc.length * 4.5) + 5;
      doc.setFont('helvetica', 'bold');
      doc.text("ACTION TAKEN / REMARKS:", 14, notesY);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(report.notes, 180);
      doc.text(splitNotes, 14, notesY + 5);
    }

    // Signatures
    const sigY = 245;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(14, sigY, 70, sigY);
    doc.line(80, sigY, 130, sigY);
    doc.line(140, sigY, 195, sigY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("REPORTED BY", 14, sigY + 5);
    doc.text(report.reportedByName, 14, sigY + 9);

    doc.text("VERIFIED / REVIEWED BY", 80, sigY + 5);
    doc.text(report.reviewedByName || "Property Custodian", 80, sigY + 9);

    doc.text("APPROVED BY", 140, sigY + 5);
    doc.text("Managing Director", 140, sigY + 9);

    doc.save(`Damage_Report_${report.reportNumber}.pdf`);
  };

  // Generate Overall Incidents & Damage Summary PDF Report
  const handleGenerateOverallSummaryPDF = () => {
    let startDateStr = '';
    let endDateStr = '';
    const now = new Date();

    if (overallTimeframe === 'this_week') {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.setDate(diffToMon));
      const end = new Date();
      startDateStr = start.toISOString().split('T')[0];
      endDateStr = end.toISOString().split('T')[0];
    } else if (overallTimeframe === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      startDateStr = start.toISOString().split('T')[0];
      endDateStr = new Date().toISOString().split('T')[0];
    } else if (overallTimeframe === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      startDateStr = start.toISOString().split('T')[0];
      endDateStr = end.toISOString().split('T')[0];
    } else {
      startDateStr = customStartDate;
      endDateStr = customEndDate;
    }

    // Filter reports in range
    const filteredForPDF = reports.filter(r => {
      const rDate = r.incidentDate || r.reportedAt.split('T')[0];
      const matchRange = rDate >= startDateStr && rDate <= endDateStr;
      const matchCategory = overallCategoryFilter === 'all' || (r.category || '').toLowerCase().includes(overallCategoryFilter.toLowerCase());
      const matchSeverity = overallSeverityFilter === 'all' || r.severity === overallSeverityFilter;
      const matchStatus = overallStatusFilter === 'all' || r.status === overallStatusFilter;
      return matchRange && matchCategory && matchSeverity && matchStatus;
    });

    const doc = new jsPDF();

    // Brand Header
    doc.setFillColor(62, 49, 44);
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("MADIGUN HOTEL ELEVEN", 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("OVERALL INCIDENTS & DAMAGE SUMMARY REPORT", 14, 25);

    doc.setFontSize(8.5);
    doc.text(`DATE GENERATED: ${new Date().toLocaleDateString()}`, 140, 16);
    doc.text(`COVERAGE: ${startDateStr} to ${endDateStr}`, 140, 23);
    doc.text(`PREPARED BY: ${currentUser.name}`, 140, 30);

    // KPI Metrics Calculation
    let totalItemsDamagedCount = 0;
    let totalLossVal = 0;
    const categoryTotals: Record<string, { count: number; loss: number }> = {};

    filteredForPDF.forEach(r => {
      const items = getReportItems(r);
      items.forEach(i => {
        totalItemsDamagedCount += i.quantity;
        const loss = i.totalCost || (i.quantity * (i.unitCost || 0));
        totalLossVal += loss;

        const catKey = i.category || r.category || 'General';
        if (!categoryTotals[catKey]) categoryTotals[catKey] = { count: 0, loss: 0 };
        categoryTotals[catKey].count += i.quantity;
        categoryTotals[catKey].loss += loss;
      });
    });

    // Executive Summary Box
    doc.setTextColor(62, 49, 44);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("EXECUTIVE SUMMARY", 14, 46);

    autoTable(doc, {
      startY: 50,
      head: [['Total Incident Reports', 'Total Item Units Damaged', 'Total Estimated Loss (PHP)', 'Period Covered']],
      body: [[
        filteredForPDF.length.toString(),
        totalItemsDamagedCount.toString(),
        `PHP ${totalLossVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${startDateStr} to ${endDateStr}`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [62, 49, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, halign: 'center', cellPadding: 3 }
    });

    // Category Breakdown Table
    const catY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("CATEGORY & DEPARTMENTS BREAKDOWN:", 14, catY);

    const catRows = Object.entries(categoryTotals).map(([catName, data]) => [
      catName,
      `${data.count} units`,
      `PHP ${data.loss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: catY + 4,
      head: [['Inventory Category / Tab', 'Quantity Damaged', 'Subtotal Financial Loss']],
      body: catRows.length > 0 ? catRows : [['No incidents recorded in this timeframe', '0', 'PHP 0.00']],
      theme: 'striped',
      headStyles: { fillColor: [166, 93, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5 }
    });

    // Detailed Log Table
    const logY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("DETAILED INCIDENT LOGS:", 14, logY);

    const logRows = filteredForPDF.map(r => {
      const items = getReportItems(r);
      const itemsSummary = items.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ');
      const reportLoss = r.totalCost || (r.quantity * (r.unitCost || 0));

      return [
        r.reportNumber,
        r.incidentDate,
        itemsSummary,
        r.category || 'General',
        r.severity.toUpperCase().replace('_', ' '),
        r.status.toUpperCase().replace('_', ' '),
        r.reportedByName,
        `PHP ${reportLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: logY + 4,
      head: [['Ref #', 'Date', 'Damaged Item(s)', 'Category', 'Severity', 'Status', 'Reporter', 'Loss']],
      body: logRows.length > 0 ? logRows : [['-', '-', 'No incident reports found matching criteria', '-', '-', '-', '-', 'PHP 0.00']],
      foot: [['', '', '', '', '', '', 'GRAND TOTAL:', `PHP ${totalLossVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
      theme: 'grid',
      headStyles: { fillColor: [62, 49, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [240, 239, 233], textColor: [62, 49, 44], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 }
    });

    // Signatures
    const finalY = Math.max((doc as any).lastAutoTable.finalY + 20, 240);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(14, finalY, 70, finalY);
    doc.line(80, finalY, 130, finalY);
    doc.line(140, finalY, 195, finalY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("PREPARED BY", 14, finalY + 5);
    doc.text(currentUser.name, 14, finalY + 9);

    doc.text("REVIEWED BY (ACCOUNTING)", 80, finalY + 5);
    doc.text("Finance Manager", 80, finalY + 9);

    doc.text("APPROVED BY", 140, finalY + 5);
    doc.text("Managing Director", 140, finalY + 9);

    doc.save(`Madigun_Damage_Summary_${startDateStr}_to_${endDateStr}.pdf`);
    setIsOverallReportModalOpen(false);
  };

  const getSeverityBadge = (sev: DamageSeverity) => {
    switch (sev) {
      case 'minor':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Minor</span>;
      case 'moderate':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Moderate</span>;
      case 'severe':
        return <span className="bg-orange-50 text-orange-800 border border-orange-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Severe</span>;
      case 'beyond_repair':
        return <span className="bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Beyond Repair</span>;
      case 'missing':
        return <span className="bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Missing / Stolen</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{sev}</span>;
    }
  };

  const getStatusBadge = (st: DamageStatus) => {
    switch (st) {
      case 'reported':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><Clock className="h-3 w-3" /> Reported</span>;
      case 'under_review':
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><Wrench className="h-3 w-3" /> Under Review</span>;
      case 'repaired':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Repaired</span>;
      case 'written_off':
        return <span className="bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><Archive className="h-3 w-3" /> Written Off</span>;
      case 'replaced':
        return <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Replaced</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#A65D46] font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldAlert className="h-4 w-4" />
            <span>Hotel Property & Equipment Management</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#3E312C]">Damaged Items & Incident Reports</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsOverallReportModalOpen(true)}
            className="bg-white border border-[#EBE6DD] hover:bg-[#FAF9F5] text-[#3E312C] text-xs font-bold px-4 py-3 rounded-2xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <FileText className="h-4 w-4 text-[#A65D46]" />
            Export Overall PDF Report
          </button>

          <button
            onClick={() => setIsCreating(true)}
            className="bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            File Damage Report
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EBE6DD] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-[#8C7A6B]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Incident Reports</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-[#3E312C] mt-2">{metrics.totalReports}</p>
        </div>

        <div className="bg-white border border-[#EBE6DD] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-[#8C7A6B]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Value Lost</span>
            <DollarSign className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">
            ₱{metrics.totalValueLost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white border border-[#EBE6DD] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-[#8C7A6B]">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Action</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-[#3E312C] mt-2">{metrics.pendingReview}</p>
        </div>

        <div className="bg-white border border-[#EBE6DD] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-[#8C7A6B]">
            <span className="text-xs font-bold uppercase tracking-wider">Written Off / Scrapped</span>
            <Archive className="h-4 w-4 text-slate-600" />
          </div>
          <p className="text-2xl font-bold text-[#3E312C] mt-2">{metrics.writtenOffCount}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7A6B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report #, item, category, reporter..."
            className="w-full bg-[#FAF9F5] border border-[#EBE6DD] pl-10 pr-4 py-2 rounded-xl text-xs text-[#3E312C] focus:outline-hidden focus:border-[#3E312C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="bg-[#FAF9F5] border border-[#EBE6DD] text-xs font-semibold text-[#3E312C] rounded-xl px-3 py-2 cursor-pointer focus:outline-hidden"
          >
            <option value="all">All Categories / Tabs</option>
            {INVENTORY_TABS.map(tab => (
              <option key={tab.key} value={tab.name}>{tab.name}</option>
            ))}
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-[#FAF9F5] border border-[#EBE6DD] text-xs font-semibold text-[#3E312C] rounded-xl px-3 py-2 cursor-pointer focus:outline-hidden"
          >
            <option value="all">All Severities</option>
            <option value="minor">Minor</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
            <option value="beyond_repair">Beyond Repair</option>
            <option value="missing">Missing / Stolen</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#FAF9F5] border border-[#EBE6DD] text-xs font-semibold text-[#3E312C] rounded-xl px-3 py-2 cursor-pointer focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="reported">Reported</option>
            <option value="under_review">Under Review</option>
            <option value="repaired">Repaired</option>
            <option value="written_off">Written Off</option>
            <option value="replaced">Replaced</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#EBE6DD] rounded-2xl shadow-2xs overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-[#8C7A6B]">
            <AlertTriangle className="h-10 w-10 mx-auto text-[#8C7A6B]/50 mb-3" />
            <p className="font-serif text-base font-bold text-[#3E312C]">No Damage Reports Found</p>
            <p className="text-xs mt-1">There are no damage incident reports matching your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#EBE6DD] text-[#8C7A6B] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Report #</th>
                  <th className="py-3 px-4">Damaged Items</th>
                  <th className="py-3 px-4">Category / Tab</th>
                  <th className="py-3 px-4 text-center">Items Count</th>
                  <th className="py-3 px-4 text-right">Total Est. Loss</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reported By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFE9]">
                {filteredReports.map((report) => {
                  const reportItems = getReportItems(report);
                  const estLoss = report.totalCost || (report.quantity * (report.unitCost || 0));
                  return (
                    <tr key={report.id} className="hover:bg-[#FAF9F5] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#3E312C]">
                        {report.reportNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#3E312C]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {report.roomNumber && (
                            <span className="px-2 py-0.5 rounded-md bg-[#3E312C] text-white text-[10px] font-mono font-bold">
                              Room {report.roomNumber}
                            </span>
                          )}
                          <span>{report.itemName}</span>
                        </div>
                        {reportItems.length > 0 && (
                          <div className="text-[10px] text-[#8C7A6B] font-normal mt-1 space-y-0.5">
                            {reportItems.map((i, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                {i.roomNumber && <span className="font-mono font-bold text-[#3E312C]">[Room {i.roomNumber}]</span>}
                                <span>{i.itemName} ({i.quantity} {i.unit})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#3E312C] font-semibold">
                        <span className="inline-block bg-[#FAF9F5] border border-[#EBE6DD] text-[#3E312C] px-2.5 py-1 rounded-lg text-[11px]">
                          {report.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#3E312C]">
                        {reportItems.length} <span className="font-normal text-[#8C7A6B]">item(s)</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-700">
                        ₱{estLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        {getSeverityBadge(report.severity)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#3E312C]">{report.reportedByName}</p>
                        <p className="text-[10px] text-[#8C7A6B]">{new Date(report.reportedAt).toLocaleDateString()}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePrintPDF(report)}
                            className="p-1.5 rounded-lg border border-[#EBE6DD] bg-white hover:bg-[#FAF9F5] text-[#3E312C] cursor-pointer"
                            title="Print PDF Damage Slip"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              const firstItem = reportItems[0];
                              onRequestReplacementPR({
                                itemId: firstItem?.itemId || report.itemId,
                                itemName: report.itemName,
                                quantity: report.quantity,
                                unit: report.unit,
                                unitCost: report.unitCost,
                                reason: `Replacement for damaged items in ${report.category || 'Inventory'} (${report.reportNumber}): ${report.description}`
                              });
                            }}
                            className="px-2.5 py-1 bg-[#3E312C] hover:bg-[#2C211F] text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                            title="Create a Purchase Requisition draft for replacement"
                          >
                            <ShoppingBag className="h-3 w-3" />
                            Replace
                          </button>

                          {currentUser.role !== 'staff' && (
                            <select
                              value={report.status}
                              onChange={(e) => onUpdateReportStatus(report.id, e.target.value as DamageStatus)}
                              className="bg-[#FAF9F5] border border-[#EBE6DD] text-[10px] font-bold text-[#3E312C] rounded-lg px-2 py-1 cursor-pointer focus:outline-hidden"
                            >
                              <option value="reported">Reported</option>
                              <option value="under_review">Under Review</option>
                              <option value="repaired">Repaired</option>
                              <option value="written_off">Written Off</option>
                              <option value="replaced">Replaced</option>
                            </select>
                          )}

                          {(currentUser.role === 'admin' || currentUser.role === 'managing_director') && (
                            <button
                              onClick={() => setReportToDelete(report)}
                              className="p-1.5 text-[#8C7A6B] hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Delete Damage Report"
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

      {/* --- CREATE MULTI-ITEM DAMAGE REPORT MODAL --- */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#EBE6DD] rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#F0EFE9] pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 rounded-xl text-rose-700">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#3E312C]">File Item Damage Report</h3>
                  <p className="text-xs text-[#8C7A6B]">Add single or multiple broken/damaged items under their respective inventory tabs</p>
                </div>
              </div>

              <button
                onClick={() => {
                  handleClearLocalDraft();
                  setIsCreating(false);
                }}
                className="text-[#8C7A6B] hover:text-[#3E312C] p-1.5 rounded-xl hover:bg-[#FAF9F5] cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {isDraftRestored && (
              <div className="bg-[#FAF9F5] border border-[#FFE8A3] text-[#3E312C] text-xs p-3.5 rounded-2xl flex items-center justify-between gap-3 font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#9E6900] shrink-0" />
                  <span><strong>Draft Auto-Recovered:</strong> Unsubmitted multi-item progress was restored.</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearLocalDraft}
                  className="text-xs font-bold text-[#A65D46] hover:underline cursor-pointer"
                >
                  Clear Draft
                </button>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-5">
              {/* Category Tab Selector & Items List Section */}
              <div className="space-y-4">
                {/* Active Category Tab Bar */}
                <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3E312C] flex items-center gap-1.5">
                      <span>Category Tab for Damaged Items</span>
                    </label>
                    {itemsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleSetAllCategories(selectedCategoryTab)}
                        className="text-[10px] font-bold text-[#A65D46] hover:underline cursor-pointer"
                      >
                        Set all items to "{selectedCategoryTab}"
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {INVENTORY_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryTab(tab.name);
                          if (itemsList.length === 1 && !itemsList[0].itemName && !itemsList[0].selectedInventoryId) {
                            handleCategoryChange(0, tab.name);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedCategoryTab === tab.name
                            ? 'bg-[#3E312C] text-white shadow-xs'
                            : 'bg-white border border-[#EBE6DD] text-[#3E312C] hover:bg-[#F0EFE9]'
                        }`}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#3E312C] flex items-center gap-1.5">
                    <span>Damaged Items List</span>
                    <span className="bg-[#3E312C] text-white text-[10px] px-2 py-0.5 rounded-full">{itemsList.length}</span>
                  </h4>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItem(selectedCategoryTab)}
                      className="text-xs font-bold text-[#3E312C] hover:text-black flex items-center gap-1 cursor-pointer bg-[#EBE6DD] border border-[#DFD9D0] px-3 py-1.5 rounded-xl hover:bg-[#DFD9D0] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item under "{selectedCategoryTab}"
                    </button>
                  </div>
                </div>

                {itemsList.map((item, idx) => {
                  const filteredInv = getInventoryForCategory(item.category, item.roomNumber);
                  const isRoomsCategory = item.category.toLowerCase() === 'rooms' || item.category.toLowerCase() === 'rooms inventory';

                  return (
                    <div key={item.id} className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-3 relative">
                      <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-2">
                        <span className="text-xs font-bold text-[#3E312C]">Item #{idx + 1}</span>
                        {itemsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Remove this item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className={`grid grid-cols-1 ${isRoomsCategory ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
                        {/* Category Dropdown */}
                        <div>
                          <label className="block text-[11px] font-bold text-[#3E312C] mb-1">
                            Category Tab <span className="text-rose-600">*</span>
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) => handleCategoryChange(idx, e.target.value)}
                            className="w-full bg-white border border-[#EBE6DD] rounded-xl px-3 py-2 text-xs font-bold text-[#3E312C] focus:outline-hidden"
                          >
                            {INVENTORY_TABS.map((tab) => (
                              <option key={tab.key} value={tab.name}>
                                {tab.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Specific Room Number Selector for Rooms Category */}
                        {isRoomsCategory && (
                          <div>
                            <label className="block text-[11px] font-bold text-[#3E312C] mb-1">
                              Specific Room Number <span className="text-rose-600">*</span>
                            </label>
                            <select
                              value={item.roomNumber || ''}
                              onChange={(e) => {
                                const rNum = e.target.value;
                                handleUpdateItem(idx, { roomNumber: rNum, selectedInventoryId: '' });
                              }}
                              className="w-full bg-white border border-[#EBE6DD] rounded-xl px-3 py-2 text-xs font-bold text-[#3E312C] focus:outline-hidden cursor-pointer"
                            >
                              <option value="">-- All Rooms / General Reserve --</option>
                              {rooms.map((r) => (
                                <option key={r.id} value={r.roomNumber}>
                                  Room {r.roomNumber} ({r.roomType})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Select from Inventory */}
                        <div>
                          <label className="block text-[11px] font-bold text-[#3E312C] mb-1">
                            Select Item from {item.category} Inventory
                          </label>
                          <select
                            value={item.selectedInventoryId}
                            onChange={(e) => handleSelectInventoryItem(idx, e.target.value)}
                            className="w-full bg-white border border-[#EBE6DD] rounded-xl px-3 py-2 text-xs text-[#3E312C] focus:outline-hidden cursor-pointer"
                          >
                            <option value="">-- Custom Item or Non-Inventory Equipment --</option>
                            {filteredInv.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} (Qty: {inv.currentStock} {inv.unit} | ₱{inv.unitCost})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Damaged Item Name Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#3E312C] mb-1">
                          Item Name / Description <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={item.itemName}
                          onChange={(e) => handleUpdateItem(idx, { itemName: e.target.value })}
                          placeholder="e.g. Executive Desk, Porcelain Plate, White Bed Sheet"
                          className="w-full bg-white border border-[#EBE6DD] rounded-xl px-3 py-1.5 text-xs text-[#3E312C] focus:outline-hidden"
                        />
                      </div>

                      {/* Qty, Unit, Cost, Stock Deduct */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-[#EBE6DD] items-center">
                        <div>
                          <label className="block text-[10px] font-bold text-[#3E312C] mb-1">Qty Damaged</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-lg px-2.5 py-1 text-xs font-bold text-[#3E312C]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#3E312C] mb-1">Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(idx, { unit: e.target.value })}
                            placeholder="pcs / set"
                            className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-lg px-2.5 py-1 text-xs text-[#3E312C]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#3E312C] mb-1">Unit Cost (₱)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => handleUpdateItem(idx, { unitCost: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-lg px-2.5 py-1 text-xs font-bold text-[#3E312C]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#3E312C] mb-1">Subtotal Loss</label>
                          <div className="text-xs font-bold text-rose-700 pt-1">
                            ₱{(item.quantity * item.unitCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {item.selectedInventoryId && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`deduct-${item.id}`}
                            checked={item.deductFromStock}
                            onChange={(e) => handleUpdateItem(idx, { deductFromStock: e.target.checked })}
                            className="h-3.5 w-3.5 rounded-md text-[#3E312C] cursor-pointer"
                          />
                          <label htmlFor={`deduct-${item.id}`} className="text-[11px] text-[#3E312C] font-semibold cursor-pointer select-none">
                            Deduct {item.quantity} {item.unit} from current inventory stock immediately
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Estimated Combined Loss Banner */}
              <div className="bg-[#3E312C] text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#EBE6DD]">Total Combined Financial Loss</p>
                  <p className="text-xs text-[#EBE6DD]/80">{itemsList.length} item entry(s) in this damage report</p>
                </div>
                <div className="text-xl font-bold text-emerald-300">
                  ₱{itemsList.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Incident Details: Severity & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#3E312C] mb-1">Overall Damage Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as DamageSeverity)}
                    className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl px-3.5 py-2 text-xs text-[#3E312C] focus:outline-hidden cursor-pointer"
                  >
                    <option value="minor">Minor (Cosmetic)</option>
                    <option value="moderate">Moderate (Needs Repair)</option>
                    <option value="severe">Severe (Inoperable)</option>
                    <option value="beyond_repair">Beyond Repair (Scrapped)</option>
                    <option value="missing">Missing / Stolen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3E312C] mb-1">Incident Date</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl px-3.5 py-2 text-xs text-[#3E312C] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Reported By Section */}
              <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#3E312C] flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-[#A65D46]" />
                    <span>Reported By Section</span> <span className="text-rose-600">*</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReporterMode('logged_user')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                      reporterMode === 'logged_user'
                        ? 'bg-[#3E312C] text-white border-[#3E312C] shadow-xs'
                        : 'bg-white text-[#3E312C] border-[#EBE6DD] hover:bg-[#F0EFE9]'
                    }`}
                  >
                    <div className="text-[10px] opacity-80 font-normal">Logged-in User</div>
                    <div className="truncate">{currentUser.name}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReporterMode('user_directory')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                      reporterMode === 'user_directory'
                        ? 'bg-[#3E312C] text-white border-[#3E312C] shadow-xs'
                        : 'bg-white text-[#3E312C] border-[#EBE6DD] hover:bg-[#F0EFE9]'
                    }`}
                  >
                    <div className="text-[10px] opacity-80 font-normal">Staff Directory</div>
                    <div>Select Staff</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReporterMode('custom')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                      reporterMode === 'custom'
                        ? 'bg-[#3E312C] text-white border-[#3E312C] shadow-xs'
                        : 'bg-white text-[#3E312C] border-[#EBE6DD] hover:bg-[#F0EFE9]'
                    }`}
                  >
                    <div className="text-[10px] opacity-80 font-normal">Custom Personnel</div>
                    <div>Manual Entry</div>
                  </button>
                </div>

                {reporterMode === 'user_directory' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-[#3E312C] mb-1">Select Staff Member</label>
                    <select
                      value={selectedStaffUserId}
                      onChange={(e) => setSelectedStaffUserId(e.target.value)}
                      className="w-full bg-white border border-[#EBE6DD] rounded-xl px-3 py-2 text-xs text-[#3E312C] font-semibold focus:outline-hidden cursor-pointer"
                    >
                      <option value="">-- Choose Staff from Directory --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'admin' ? 'Property Custodian' : u.role === 'managing_director' ? 'Managing Director' : 'Staff'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {reporterMode === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#3E312C] mb-1">Reporter Full Name <span className="text-rose-600">*</span></label>
                      <input
                        type="text"
                        required
                        value={customReporterName}
                        onChange={(e) => setCustomReporterName(e.target.value)}
                        placeholder="e.g. Maria Clara Santos"
                        className="w-full bg-white border border-[#EBE6DD] rounded-xl px-3 py-2 text-xs text-[#3E312C] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#3E312C] mb-1">Department / Designation</label>
                      <input
                        type="text"
                        value={customReporterDept}
                        onChange={(e) => setCustomReporterDept(e.target.value)}
                        placeholder="e.g. Housekeeping, Front Desk, Engineering"
                        className="w-full bg-white border border-[#EBE6DD] rounded-xl px-3 py-2 text-xs text-[#3E312C] focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cause / Description */}
              <div>
                <label className="block text-xs font-bold text-[#3E312C] mb-1">
                  Cause & Description of Damage Incident <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide clear details on how the damage or loss occurred..."
                  className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl p-3 text-xs text-[#3E312C] focus:outline-hidden"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-[#3E312C] mb-1">Action Taken / Remarks (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Scrapped, Sent to engineering for repair, Pending replacement"
                  className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl px-3.5 py-2 text-xs text-[#3E312C] focus:outline-hidden"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => {
                    handleClearLocalDraft();
                    setIsCreating(false);
                  }}
                  className="px-5 py-2.5 border border-[#EBE6DD] text-[#8C7A6B] hover:bg-[#FAF9F5] text-xs font-bold rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-bold rounded-full transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  File Damage Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- OVERALL SUMMARY PDF REPORT MODAL --- */}
      {isOverallReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EBE6DD] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#F0EFE9] pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl text-[#3E312C]">
                  <FileText className="h-5 w-5 text-[#A65D46]" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#3E312C]">Generate Overall Damage PDF Report</h3>
                  <p className="text-xs text-[#8C7A6B]">Select date range and filters for overall periodic summary</p>
                </div>
              </div>

              <button
                onClick={() => setIsOverallReportModalOpen(false)}
                className="text-[#8C7A6B] hover:text-[#3E312C] p-1.5 rounded-xl hover:bg-[#FAF9F5] cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Timeframe Selector */}
              <div>
                <label className="block text-xs font-bold text-[#3E312C] mb-1">Timeframe Period</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'this_week', label: 'This Week' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'last_month', label: 'Last Month' },
                    { id: 'custom', label: 'Custom Date Range' }
                  ].map(tf => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setOverallTimeframe(tf.id as any)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                        overallTimeframe === tf.id
                          ? 'bg-[#3E312C] text-white border-[#3E312C]'
                          : 'bg-[#FAF9F5] text-[#3E312C] border-[#EBE6DD] hover:bg-[#F0EFE9]'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Pickers */}
              {overallTimeframe === 'custom' && (
                <div className="grid grid-cols-2 gap-3 bg-[#FAF9F5] p-3 rounded-2xl border border-[#EBE6DD]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#3E312C] mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full bg-white border border-[#EBE6DD] rounded-xl px-3 py-1.5 text-xs text-[#3E312C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3E312C] mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full bg-white border border-[#EBE6DD] rounded-xl px-3 py-1.5 text-xs text-[#3E312C]"
                    />
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#3E312C] mb-1">Filter by Category Tab</label>
                  <select
                    value={overallCategoryFilter}
                    onChange={(e) => setOverallCategoryFilter(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl px-3 py-2 text-xs text-[#3E312C]"
                  >
                    <option value="all">All Categories / Departments</option>
                    {INVENTORY_TABS.map(tab => (
                      <option key={tab.key} value={tab.name}>{tab.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#3E312C] mb-1">Filter Severity</label>
                    <select
                      value={overallSeverityFilter}
                      onChange={(e) => setOverallSeverityFilter(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl px-3 py-2 text-xs text-[#3E312C]"
                    >
                      <option value="all">All Severities</option>
                      <option value="minor">Minor</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                      <option value="beyond_repair">Beyond Repair</option>
                      <option value="missing">Missing / Stolen</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3E312C] mb-1">Filter Status</label>
                    <select
                      value={overallStatusFilter}
                      onChange={(e) => setOverallStatusFilter(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl px-3 py-2 text-xs text-[#3E312C]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="reported">Reported</option>
                      <option value="under_review">Under Review</option>
                      <option value="repaired">Repaired</option>
                      <option value="written_off">Written Off</option>
                      <option value="replaced">Replaced</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F0EFE9]">
              <button
                type="button"
                onClick={() => setIsOverallReportModalOpen(false)}
                className="px-4 py-2 border border-[#EBE6DD] text-[#8C7A6B] text-xs font-bold rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateOverallSummaryPDF}
                className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-bold rounded-full shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EBE6DD] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-[#3E312C]">Delete Damage Report?</h3>
            <p className="text-xs text-[#8C7A6B]">
              Are you sure you want to permanently remove damage report <strong>{reportToDelete.reportNumber}</strong> for "{reportToDelete.itemName}"?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 border border-[#EBE6DD] text-[#3E312C] text-xs font-bold rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteReport(reportToDelete.id);
                  setReportToDelete(null);
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-full cursor-pointer shadow-xs"
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
