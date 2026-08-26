import React, { useMemo, useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  AlertTriangle, 
  ClipboardList, 
  Package, 
  ArrowRight, 
  PlusCircle, 
  History,
  TrendingDown,
  Warehouse,
  Upload,
  Image as ImageIcon,
  Trash2,
  Printer,
  Calendar,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { InventoryItem, Requisition, AuditLog, User, Withdrawal } from '../types';

interface DashboardProps {
  inventory: InventoryItem[];
  requisitions: Requisition[];
  logs: AuditLog[];
  currentUser: User;
  onNavigate: (tab: string) => void;
  onTriggerAutoRequisition: () => void;
  customLogo: string | null;
  onUpdateLogo: (newLogo: string | null) => void;
  withdrawals?: Withdrawal[];
}

const COLORS = ['#3E312C', '#8C7355', '#A67C52', '#8C7A6B', '#DFD9D0', '#5C4E4B', '#C7BDB3'];

export default function Dashboard({ 
  inventory, 
  requisitions, 
  logs, 
  currentUser, 
  onNavigate,
  onTriggerAutoRequisition,
  customLogo,
  onUpdateLogo,
  withdrawals = []
}: DashboardProps) {

  // Category Costing Report Filter States
  const [reportTab, setReportTab] = useState<'inventory' | 'procurement'>('inventory');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [procurementStatusFilter, setProcurementStatusFilter] = useState<'all_active' | 'approved_received' | 'pending'>('all_active');

  // Supply Movement Ledger State & Computations
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [ledgerType, setLedgerType] = useState<'all' | 'additions' | 'deductions'>('all');

  // Memoized extraction of all supply movements (Adds and Deducts)
  const supplyMovements = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      itemId: string;
      itemName: string;
      category: string;
      type: 'Added' | 'Deducted';
      quantity: number;
      unit: string;
      unitCost: number;
      totalCost: number;
      reference: string;
      operator: string;
    }> = [];

    // 1. Extract from Received Requisitions (status === 'received')
    requisitions.forEach(req => {
      if (req.status !== 'received') return;
      const dateStr = req.receivedAt || req.createdAt;
      
      req.items.forEach((item, idx) => {
        const invItem = inventory.find(i => i.id === item.itemId);
        const category = invItem ? invItem.category : 'General Supply';
        const cost = item.quantity * item.unitCost;

        list.push({
          id: `req-${req.id}-${idx}`,
          date: dateStr,
          itemId: item.itemId,
          itemName: item.itemName,
          category,
          type: 'Added',
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost,
          totalCost: cost,
          reference: `${req.requisitionNumber} (Received Requisition)`,
          operator: req.approvedByName || req.createdByName || 'Staff'
        });
      });
    });

    // 2. Extract from manual Stock Restocked & Stock Consumption in logs
    logs.forEach(log => {
      // Manual Stock Restocked
      if (log.action === 'Stock Restocked') {
        const match = log.details.match(/Increased (.*?) stock level by ([\d.]+) ([^.]+)\. \(New Total/);
        if (match) {
          const itemName = match[1].trim();
          const quantity = parseFloat(match[2]);
          const unit = match[3].trim();
          
          const invItem = inventory.find(i => i.name.toLowerCase().trim() === itemName.toLowerCase());
          const category = invItem ? invItem.category : 'General Supply';
          const unitCost = invItem ? invItem.unitCost : 0;
          const cost = quantity * unitCost;

          list.push({
            id: log.id,
            date: log.timestamp,
            itemId: invItem ? invItem.id : '',
            itemName,
            category,
            type: 'Added',
            quantity,
            unit,
            unitCost,
            totalCost: cost,
            reference: 'Manual Restock',
            operator: log.username
          });
        }
      }

      // Manual Stock Consumption
      if (log.action === 'Stock Consumption') {
        const match = log.details.match(/Consumed ([\d.]+) ([^.]+) of (.*?)\. \(New Total/);
        if (match) {
          const quantity = parseFloat(match[1]);
          const unit = match[2].trim();
          const itemName = match[3].trim();

          const invItem = inventory.find(i => i.name.toLowerCase().trim() === itemName.toLowerCase());
          const category = invItem ? invItem.category : 'General Supply';
          const unitCost = invItem ? invItem.unitCost : 0;
          const cost = quantity * unitCost;

          list.push({
            id: log.id,
            date: log.timestamp,
            itemId: invItem ? invItem.id : '',
            itemName,
            category,
            type: 'Deducted',
            quantity,
            unit,
            unitCost,
            totalCost: cost,
            reference: 'Manual Consumption',
            operator: log.username
          });
        }
      }
    });

    // 3. Extract from Completed Warehouse Withdrawals
    withdrawals.forEach(wd => {
      if (wd.status !== 'completed') return;
      const dateStr = wd.completedAt || wd.createdAt;
      
      wd.items.forEach((item, idx) => {
        const invItem = inventory.find(i => i.id === item.itemId);
        const category = invItem ? invItem.category : 'General Supply';
        const unitCost = invItem ? invItem.unitCost : 0;
        const cost = item.quantity * unitCost;

        list.push({
          id: `wd-${wd.id}-${idx}`,
          date: dateStr,
          itemId: item.itemId,
          itemName: item.itemName,
          category,
          type: 'Deducted',
          quantity: item.quantity,
          unit: item.unit,
          unitCost,
          totalCost: cost,
          reference: `${wd.withdrawalNumber} (Completed Withdrawal)`,
          operator: wd.completedByName || wd.approvedByName || 'Staff'
        });
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [requisitions, logs, inventory, withdrawals]);

  // Filter supply movements by date filters & type selection
  const filteredMovements = useMemo(() => {
    return supplyMovements.filter(mov => {
      if (ledgerType === 'additions' && mov.type !== 'Added') return false;
      if (ledgerType === 'deductions' && mov.type !== 'Deducted') return false;

      const movDate = new Date(mov.date);
      if (ledgerStartDate) {
        const start = new Date(ledgerStartDate + 'T00:00:00');
        if (movDate < start) return false;
      }
      if (ledgerEndDate) {
        const end = new Date(ledgerEndDate + 'T23:59:59');
        if (movDate > end) return false;
      }

      return true;
    });
  }, [supplyMovements, ledgerType, ledgerStartDate, ledgerEndDate]);

  // Compute stats of filtered movements
  const movementStats = useMemo(() => {
    let additionsCost = 0;
    let deductionsCost = 0;
    
    filteredMovements.forEach(mov => {
      if (mov.type === 'Added') {
        additionsCost += mov.totalCost;
      } else {
        deductionsCost += mov.totalCost;
      }
    });

    return {
      additionsCost,
      deductionsCost,
      netValue: additionsCost - deductionsCost
    };
  }, [filteredMovements]);

  // Export filtered movements to CSV format
  const handleDownloadCSV = () => {
    try {
      const headers = ['Date', 'Item Name', 'Category', 'Movement Type', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost', 'Reference Source', 'Operator'];
      
      const rows = filteredMovements.map(mov => [
        new Date(mov.date).toLocaleString('en-US'),
        mov.itemName,
        mov.category,
        mov.type,
        mov.quantity,
        mov.unit,
        mov.unitCost.toFixed(2),
        mov.totalCost.toFixed(2),
        mov.reference,
        mov.operator
      ]);

      const csvRows = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ];

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const dateSuffix = `${ledgerStartDate || 'all'}_to_${ledgerEndDate || 'all'}`;
      link.setAttribute("download", `Supply_Movement_Ledger_${dateSuffix}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting CSV:", err);
    }
  };

  // Export filtered movements to PDF report (Landscape)
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
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
      doc.text("HOTEL & KITCHEN SUPPLY MOVEMENT LEDGER", 15, 25);

      // Line under header
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 282, 28);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`SUPPLY MOVEMENT BREAKDOWN (${ledgerType.toUpperCase()})`, 15, 37);

      // Subtitle with dates
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const subtitleStr = `Period: ${ledgerStartDate || 'All Time'} to ${ledgerEndDate || 'All Time'}`;
      doc.text(subtitleStr, 15, 42);

      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 282, 42, { align: 'right' });

      // Build data body
      const tableBody = filteredMovements.map((mov) => [
        new Date(mov.date).toLocaleDateString('en-US', { dateStyle: 'medium' }),
        mov.itemName,
        mov.category,
        mov.type === 'Added' ? 'Added (+)' : 'Deducted (-)',
        `${mov.quantity} ${mov.unit}`,
        mov.unitCost.toFixed(2),
        mov.totalCost.toFixed(2),
        mov.reference,
        mov.operator
      ]);

      autoTable(doc, {
        startY: 47,
        margin: { left: 15, right: 15 },
        head: [['Date', 'Item Name', 'Category', 'Type', 'Qty/Unit', 'Unit Cost (PHP)', 'Total Cost (PHP)', 'Reference Source', 'Operator']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [62, 49, 44],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 45 },
          2: { cellWidth: 30 },
          3: { cellWidth: 20 },
          4: { cellWidth: 22 },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 25, halign: 'right' },
          7: { cellWidth: 45 },
          8: { cellWidth: 30 }
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5
        },
        foot: [[
          { content: `Summary (${filteredMovements.length} transactions):`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } },
          { content: `Additions (PHP): ${movementStats.additionsCost.toFixed(2)}\nDeductions (PHP): ${movementStats.deductionsCost.toFixed(2)}`, colSpan: 2, styles: { halign: 'left', fontStyle: 'bold', fontSize: 8.5 } },
          { content: `Net (PHP): ${movementStats.netValue.toFixed(2)}`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } }
        ]],
        footStyles: {
          fillColor: [244, 242, 235],
          textColor: [62, 49, 44]
        }
      });

      let lastY = (doc as any).lastAutoTable.finalY + 12;
      if (lastY > 185) {
        doc.addPage();
        lastY = 30;
      }
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Report prepared by Back-of-House operations user ${currentUser.name}. Confirmed and verified supply logs.`, 148, lastY, { align: 'center' });

      const dateSuffix = `${ledgerStartDate || 'all'}_to_${ledgerEndDate || 'all'}`;
      doc.save(`Supply_Movement_Breakdown_${dateSuffix}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Error generating PDF. Please export to CSV instead.");
    }
  };

  const handlePrintCategoryReport = () => {
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
      doc.text("HOTEL & KITCHEN CATEGORY COSTING REPORT", 15, 25);

      // Line under header
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const titleText = reportTab === 'inventory' 
        ? "SUPPLY COSTING BY CATEGORY REPORT (CURRENT STOCK)"
        : "PROCUREMENT SPEND BY CATEGORY REPORT";
      doc.text(titleText, 15, 37);

      // Subtitle with date bounds if procurement
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const subtitleStr = reportTab === 'inventory'
        ? "Scope: Whole Hotel & Kitchen Stock Valuation and Asset Allocation"
        : `Period Bounds: ${reportStartDate || 'Anytime'} to ${reportEndDate || 'Anytime'}`;
      doc.text(subtitleStr, 15, 42);

      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 195, 42, { align: 'right' });

      // Build data body
      const totalSum = categoryData.reduce((sum, item) => sum + item.value, 0);
      const tableBody = categoryData.map((item) => [
        item.category,
        reportTab === 'inventory' ? `${item.count} items in-stock` : `${item.count} units ordered`,
        item.value.toFixed(2),
        `${((item.value / (totalSum || 1)) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: 47,
        margin: { left: 15, right: 15 },
        head: [['Supply Category', 'Volume Context', 'Category Valuation (PHP)', 'Portfolio Percentage']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [62, 49, 44], // #3E312C
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 40 },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' }
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3
        },
        foot: [[
          { content: 'Total Portfolio Valuation / Spend (PHP):', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9.5 } },
          { content: `${totalSum.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9.5 } },
          { content: '100.0%', styles: { halign: 'right', fontStyle: 'bold', fontSize: 9.5 } }
        ]],
        footStyles: {
          fillColor: [244, 242, 235],
          textColor: [62, 49, 44]
        }
      });

      // Footer notice
      let lastY = (doc as any).lastAutoTable.finalY + 15;
      if (lastY > 270) {
        doc.addPage();
        lastY = 35;
      }
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Report generated by Back-of-House operations user ${currentUser.name}. Confidential business analytics.`, 105, lastY, { align: 'center' });

      // Save PDF
      doc.save(`Category_Costing_Report_${reportTab}.pdf`);
    } catch (err) {
      console.error("Category Spend PDF error:", err);
      window.print();
    }
  };

  // Logo Upload State
  const [isDragOver, setIsDragOver] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setLogoError(null);
    if (!file.type.startsWith('image/')) {
      setLogoError('Please upload an image file (PNG, JPG, SVG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 240; // Max width/height for a fast, crisp logo
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            try {
              // Try high quality JPEG compression first (very compact)
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
              if (onUpdateLogo) {
                onUpdateLogo(compressedDataUrl);
              }
            } catch (e) {
              // Fallback to standard png
              const fallbackDataUrl = canvas.toDataURL('image/png');
              if (onUpdateLogo) {
                onUpdateLogo(fallbackDataUrl);
              }
            }
          } else {
            if (onUpdateLogo) {
              onUpdateLogo(event.target.result as string);
            }
          }
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  // 1. Calculations for Product Costing and Metrics
  const metrics = useMemo(() => {
    // Total cost of current inventory: Sum of (currentStock * unitCost)
    const totalInventoryValue = inventory.reduce(
      (sum, item) => sum + (item.currentStock * item.unitCost), 
      0
    );

    // Low stock items: items where currentStock <= minStock
    const lowStockItems = inventory.filter(item => item.currentStock <= item.minStock);
    const lowStockCount = lowStockItems.length;

    // Pending requisitions count
    const pendingRequisitionsCount = requisitions.filter(r => r.status === 'pending').length;

    // Total unique items
    const totalItems = inventory.length;

    return {
      totalValue: totalInventoryValue,
      lowStockCount,
      lowStockItems,
      pendingCount: pendingRequisitionsCount,
      totalItems
    };
  }, [inventory, requisitions]);

  // 2. Chart Data: Costing breakdown by Category (with dynamic source and date-filtering)
  const categoryData = useMemo(() => {
    const map: Record<string, { category: string; value: number; count: number }> = {};
    
    if (reportTab === 'inventory') {
      inventory.forEach(item => {
        const cat = item.category?.trim() || item.section || 'Uncategorized';
        const cost = (item.currentStock || 0) * (item.unitCost || 0);
        if (!map[cat]) {
          map[cat] = { category: cat, value: 0, count: 0 };
        }
        map[cat].value += cost;
        map[cat].count += item.currentStock || 0;
      });
    } else {
      // Historical procurement costing based on requisitions
      requisitions.forEach(req => {
        if (req.isDeleted) return;
        if (req.status === 'rejected' || req.status === 'draft') return;
        
        if (procurementStatusFilter === 'approved_received') {
          if (req.status !== 'approved' && req.status !== 'received' && req.status !== 'ordered') return;
        } else if (procurementStatusFilter === 'pending') {
          if (req.status !== 'pending') return;
        }

        const reqDate = new Date(req.createdAt);
        if (reportStartDate) {
          const start = new Date(reportStartDate + 'T00:00:00');
          if (reqDate < start) return;
        }
        if (reportEndDate) {
          const end = new Date(reportEndDate + 'T23:59:59');
          if (reqDate > end) return;
        }

        req.items.forEach(it => {
          // find category from inventory database first
          const invItem = inventory.find(i => i.id === it.itemId);
          let cat = invItem?.category?.trim() || invItem?.section || (it as any).targetTab;
          
          if (!cat) {
            if (req.requestingDept) {
              const deptMap: Record<string, string> = {
                'KITCHEN': 'Kitchen',
                'ROOMS': 'Rooms & Deployed',
                'HOUSEKEEPING': 'Housekeeping & Linens',
                'HOUSEKEEPING_EQUIPMENTS': 'Housekeeping Equipments',
                'HR_EQUIPMENTS': 'HR & Admin',
                'FO_EQUIPMENTS': 'Front Office',
                'FINANCE_EQUIPMENTS': 'Finance',
                'SECURITY_POST_EQUIPMENTS': 'Security',
                'IT_EQUIPMENTS': 'IT & Tech',
                'LINENS': 'Linens',
                'INDUSTRIAL_EQUIPMENTS': 'Maintenance & Engineering'
              };
              cat = deptMap[req.requestingDept] || req.requestingDept;
            } else {
              cat = 'Kitchen';
            }
          }

          const cost = (it.quantity || 0) * (it.unitCost || 0);

          if (!map[cat]) {
            map[cat] = { category: cat, value: 0, count: 0 };
          }
          map[cat].value += cost;
          map[cat].count += it.quantity || 0;
        });
      });
    }

    return Object.values(map)
      .map(item => ({
        ...item,
        value: parseFloat(item.value.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value);
  }, [inventory, requisitions, reportTab, reportStartDate, reportEndDate, procurementStatusFilter]);

  // 3. Low stock alerts
  const lowStockPreview = useMemo(() => {
    return metrics.lowStockItems.slice(0, 4);
  }, [metrics.lowStockItems]);

  return (
    <div className="space-y-6 font-sans" id="dashboard-tab">
      {/* Welcome Banner */}
      <div className="bg-[#F4F2EB] border border-[#EBE6DD] text-[#3E312C] rounded-[32px] p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in" id="welcome-banner">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#3E312C]">Operations & Costing Dashboard</h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('requisitions')}
            className="flex items-center gap-2 bg-[#8C7355] hover:bg-[#745E44] text-white font-semibold text-xs px-5 py-2.5 rounded-full transition-all shadow-xs cursor-pointer"
          >
            <ClipboardList className="h-4 w-4" />
            Requisitions
          </button>
          <button 
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-5 py-2.5 rounded-full transition-all shadow-xs cursor-pointer"
          >
            <Package className="h-4 w-4" />
            Check Inventory
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" id="stats-grid">
        {/* Total Inventory Costing */}
        <div className="bg-white border border-[#E6E4DD] rounded-[24px] p-5 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-slate-100 group-hover:text-slate-200 transition-colors select-none">
            <span className="font-sans font-bold text-6xl -mr-4 -mt-4 opacity-5 rotate-12 text-[#3E312C] block">₱</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Product Costing</span>
            <div className="bg-[#FAF9F5] text-[#3E312C] px-3 py-1 rounded-xl font-bold font-sans text-lg select-none leading-none">
              ₱
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-serif text-[#3E312C] font-bold">₱{metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`border rounded-[24px] p-5 shadow-xs relative overflow-hidden transition-all ${
          metrics.lowStockCount > 0 
            ? 'bg-[#FDF2F0] border-[#F2DED9] ring-2 ring-[#3E312C]/5' 
            : 'bg-white border-[#E6E4DD]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Low-Stock Warnings</span>
            <div className={`p-2 rounded-xl ${
              metrics.lowStockCount > 0 ? 'bg-[#FDF2F0] text-[#3E312C] animate-pulse' : 'bg-[#FAF9F5] text-[#3E312C]'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-3xl font-serif font-bold ${metrics.lowStockCount > 0 ? 'text-[#3E312C]' : 'text-[#3E312C]'}`}>
              {metrics.lowStockCount}
            </span>
            <p className="text-[#8C7A6B] text-xs mt-1 font-medium">
              {metrics.lowStockCount > 0 
                ? `${metrics.lowStockCount} items have reached safety levels`
                : 'All hotel supplies sufficiently stocked'}
            </p>
          </div>
        </div>

        {/* Pending Requisitions */}
        <div className="bg-white border border-[#E6E4DD] rounded-[24px] p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Pending Approvals</span>
            <div className="bg-[#FAF9F5] text-[#3E312C] p-2 rounded-xl">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-serif text-[#3E312C] font-bold">{metrics.pendingCount}</span>
            <p className="text-[#8C7A6B] text-xs mt-1 font-medium">
              Requires administrative sign-off
            </p>
          </div>
        </div>

        {/* Total Unique Supplies */}
        <div className="bg-white border border-[#E6E4DD] rounded-[24px] p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">Supplies Cataloged</span>
            <div className="bg-[#FAF9F5] text-[#3E312C] p-2 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-serif text-[#3E312C] font-bold">{metrics.totalItems}</span>
            <p className="text-[#8C7A6B] text-xs mt-1 font-medium">
              Supplies across {categoryData.length} categories
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-main-layouts">
        
        {/* Left Column wrapper for Chart & Ledger */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Costing Chart Visualization */}
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-sm" id="costing-chart-card">
            <div className="flex flex-col gap-4 border-b border-[#F0EFE9] pb-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-serif text-xl text-[#3E312C]">Supply Costing by Category</h3>
                </div>
                <div className="text-right bg-[#FAF9F5] px-4 py-2 rounded-2xl border border-[#EBE6DD]">
                  <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider font-mono">
                    {reportTab === 'inventory' ? 'Current Assets' : 'Procurement Spend'}
                  </span>
                  <p className="text-lg font-serif font-bold text-[#3E312C]">
                    ₱{categoryData.reduce((sum, item) => sum + item.value, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Selection Tabs & Filter Tools */}
              <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between mt-1">
                <div className="flex bg-[#F4F2EB] p-1 rounded-full border border-[#EBE6DD]">
                  <button
                    type="button"
                    onClick={() => setReportTab('inventory')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      reportTab === 'inventory'
                        ? 'bg-[#3E312C] text-white shadow-xs'
                        : 'text-[#8C7A6B] hover:text-[#3E312C]'
                    }`}
                  >
                    Current Stock Valuation
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTab('procurement')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      reportTab === 'procurement'
                        ? 'bg-[#3E312C] text-white shadow-xs'
                        : 'text-[#8C7A6B] hover:text-[#3E312C]'
                    }`}
                  >
                    Procurement Spend Report
                  </button>
                </div>

                {/* Date Filters & Print Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                  {reportTab === 'procurement' && (
                    <>
                      <div className="flex items-center gap-1.5 bg-[#FAF9F5] p-1.5 rounded-xl border border-[#EBE6DD] text-xs">
                        <span className="text-[#8C7A6B] font-semibold text-[11px] pl-1">Status:</span>
                        <select
                          value={procurementStatusFilter}
                          onChange={(e) => setProcurementStatusFilter(e.target.value as any)}
                          className="bg-transparent border-0 text-[#3E312C] font-bold text-xs focus:ring-0 focus:outline-hidden cursor-pointer"
                        >
                          <option value="all_active">All Active Requisitions</option>
                          <option value="approved_received">Approved / Received Only</option>
                          <option value="pending">Pending Review Only</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 bg-[#FAF9F5] p-1.5 rounded-xl border border-[#EBE6DD] text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-[#8C7A6B]" />
                          <input
                            type="date"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className="bg-transparent border-0 p-0 text-[#3E312C] font-semibold text-xs focus:ring-0 focus:outline-hidden"
                            placeholder="Start Date"
                          />
                        </div>
                        <span className="text-[#8C7A6B] font-bold">to</span>
                        <input
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="bg-transparent border-0 p-0 text-[#3E312C] font-semibold text-xs focus:ring-0 focus:outline-hidden"
                          placeholder="End Date"
                        />
                        {(reportStartDate || reportEndDate) && (
                          <button
                            onClick={() => {
                              setReportStartDate('');
                              setReportEndDate('');
                            }}
                            className="text-[#A65D46] hover:text-red-700 ml-1 font-bold text-[10px] underline cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  
                  <button
                    type="button"
                    onClick={handlePrintCategoryReport}
                    className="flex items-center gap-1.5 bg-[#8C7355] hover:bg-[#745E44] text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-all shadow-2xs shrink-0"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Generate Category Report / PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="h-72 w-full" id="costing-chart-wrapper">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F0" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#8C7A6B" 
                      fontSize={11} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#8C7A6B" 
                      fontSize={11} 
                      tickLine={false}
                      tickFormatter={(value) => `₱${value}`}
                    />
                    <Tooltip 
                      formatter={(value) => [`₱${value}`, reportTab === 'inventory' ? 'Inventory Valuation' : 'Procurement Spend']}
                      contentStyle={{ backgroundColor: '#F4F2EB', borderRadius: '12px', color: '#3E312C', border: '1px solid #EBE6DD' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#8C7A6B] text-xs">
                  No inventory items to display.
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[#F0EFE9] pt-4" id="category-bullets">
              {categoryData.slice(0, 4).map((entry, index) => (
                <div key={entry.category} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-[11px] font-bold text-[#3E312C] truncate">{entry.category}</span>
                  </div>
                  <p className="text-xs font-mono font-bold text-[#8C7A6B] pl-4">₱{entry.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Supply Addition & Deduction Ledger Card */}
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-sm space-y-4" id="supply-ledger-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#F0EFE9] pb-4">
              <div>
                <h3 className="font-serif text-xl text-[#3E312C] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#8C7A6B]" />
                  Supply Movements Ledger & Breakdown
                </h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">
                  Audit trail of all supply additions (purchases) and deductions (consumptions).
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-1.5 bg-[#FAF9F5] hover:bg-[#EBE6DD] text-[#3E312C] border border-[#EBE6DD] text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-all shadow-3xs"
                >
                  <Upload className="h-3.5 w-3.5 rotate-180" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 bg-[#8C7355] hover:bg-[#745E44] text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-all shadow-3xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Download PDF Breakdown
                </button>
              </div>
            </div>

            {/* Filters & Summary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FAF9F5] border border-[#EBE6DD] p-4 rounded-2xl" id="ledger-filters-summary">
              {/* Filter controls */}
              <div className="md:col-span-2 flex flex-wrap gap-3 items-center text-xs">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E6E4DD] w-full sm:w-auto">
                  <span className="text-[#8C7A6B] font-medium shrink-0">From:</span>
                  <input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => setLedgerStartDate(e.target.value)}
                    className="bg-transparent border-0 p-0 text-[#3E312C] font-semibold text-xs focus:ring-0 focus:outline-hidden w-full"
                  />
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E6E4DD] w-full sm:w-auto">
                  <span className="text-[#8C7A6B] font-medium shrink-0">To:</span>
                  <input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => setLedgerEndDate(e.target.value)}
                    className="bg-transparent border-0 p-0 text-[#3E312C] font-semibold text-xs focus:ring-0 focus:outline-hidden w-full"
                  />
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E6E4DD] w-full sm:w-auto">
                  <span className="text-[#8C7A6B] font-medium shrink-0">Type:</span>
                  <select
                    value={ledgerType}
                    onChange={(e) => setLedgerType(e.target.value as any)}
                    className="bg-transparent border-0 p-0 text-[#3E312C] font-semibold text-xs focus:ring-0 focus:outline-hidden pr-8 cursor-pointer"
                  >
                    <option value="all">All Movements</option>
                    <option value="additions">Additions Only (+)</option>
                    <option value="deductions">Deductions Only (-)</option>
                  </select>
                </div>

                {(ledgerStartDate || ledgerEndDate || ledgerType !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerStartDate('');
                      setLedgerEndDate('');
                      setLedgerType('all');
                    }}
                    className="text-[#A65D46] hover:text-red-700 font-bold text-xs underline cursor-pointer px-2"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Quick Summary Numbers */}
              <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-[#EBE6DD] pt-3 md:pt-0 pl-0 md:pl-4 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[#8C7A6B] font-medium">Additions (+):</span>
                  <span className="font-mono font-bold text-emerald-700">₱{movementStats.additionsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8C7A6B] font-medium">Deductions (-):</span>
                  <span className="font-mono font-bold text-amber-700">₱{movementStats.deductionsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#EBE6DD]/60 pt-1">
                  <span className="text-[#3E312C] font-semibold">Net Movement:</span>
                  <span className={`font-mono font-bold ${movementStats.netValue >= 0 ? 'text-emerald-800' : 'text-[#A65D46]'}`}>
                    {movementStats.netValue >= 0 ? '+' : ''}₱{movementStats.netValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Ledger Table */}
            <div className="border border-[#E6E4DD] rounded-2xl overflow-hidden bg-white" id="ledger-table-container">
              <div className="max-h-72 overflow-y-auto" id="ledger-scroller">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-[#FAF9F5] border-b border-[#E6E4DD] text-[#8C7A6B] font-mono uppercase tracking-wider text-[10px] z-10">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Qty / Unit</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total Price</th>
                      <th className="p-3">Reference / Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFE9]">
                    {filteredMovements.length > 0 ? (
                      filteredMovements.map((mov) => (
                        <tr key={mov.id} className="hover:bg-[#FAF9F5]/40 transition-colors">
                          <td className="p-3 text-[#8C7A6B] whitespace-nowrap">
                            {new Date(mov.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3 font-semibold text-[#3E312C]">
                            {mov.itemName}
                            <span className="block text-[10px] text-[#8C7A6B] font-normal">{mov.category}</span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              mov.type === 'Added' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {mov.type}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-[#3E312C]">
                            {mov.quantity} <span className="text-[#8C7A6B] font-normal font-sans text-[10px]">{mov.unit}</span>
                          </td>
                          <td className="p-3 text-right font-mono text-[#8C7A6B]">
                            ₱{mov.unitCost.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-[#3E312C]">
                            ₱{mov.totalCost.toFixed(2)}
                          </td>
                          <td className="p-3 text-[#8C7A6B] leading-normal max-w-[180px] truncate">
                            <span className="font-medium text-[#3E312C]">{mov.reference}</span>
                            <span className="block text-[10px]">by {mov.operator}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#8C7A6B]">
                          No supply movements found matching the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Low Stock Alerts and Quick Reorder Column - 1 Column */}
        <div className="space-y-6" id="dashboard-right-panel">
          
          {/* Automated Alerts Panel */}
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-5 shadow-sm" id="dashboard-low-stock-box">
            <div className="flex items-center justify-between border-b border-[#F0EFE9] pb-3 mb-3">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5 text-[#A65D46]" />
                <h3 className="font-serif text-lg text-[#3E312C]">Low Stock List</h3>
              </div>
              <span className="bg-[#FDF2F0] text-[#A65D46] text-[10px] border border-[#F2DED9] font-mono font-bold px-2.5 py-0.5 rounded-full">
                {metrics.lowStockCount} alert{metrics.lowStockCount !== 1 ? 's' : ''}
              </span>
            </div>

            {metrics.lowStockCount > 0 ? (
              <div className="space-y-3">
                <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1" id="low-stock-scroller">
                  {metrics.lowStockItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F9F9F7] border border-[#E6E4DD] text-xs"
                    >
                      <div className="space-y-0.5 max-w-[65%]">
                        <div className="font-bold text-[#3E312C] truncate">{item.name}</div>
                        <div className="text-[#8C7A6B] font-mono text-[10px]">Min: {item.minStock} {item.unit}</div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="bg-[#FDF2F0] text-[#A65D46] px-2 py-0.5 rounded-md font-bold font-mono text-[10px]">
                          {item.currentStock} {item.unit}
                        </span>
                        <div className="text-[10px] text-[#8C7A6B] italic truncate max-w-[100px]">{item.supplier}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Automated Ordering Trigger */}
                <div className="pt-2" id="auto-order-trigger-box">
                  <button
                    onClick={onTriggerAutoRequisition}
                    className="w-full flex items-center justify-center gap-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs py-2.5 px-4 rounded-full transition-colors cursor-pointer shadow-2xs"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Auto-Generate Restock PR
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[#8C7A6B] text-xs flex flex-col items-center gap-2">
                <Warehouse className="h-8 w-8 text-[#D1C4B5]" />
                <span>All items above minimum stock levels. Efficient ordering active!</span>
              </div>
            )}
          </div>

          {/* Brand Customization Panel */}
          {currentUser.role === 'admin' && (
            <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-5 shadow-sm" id="brand-customization-panel">
              <h3 className="font-serif text-lg text-[#3E312C] mb-3 flex items-center gap-1.5">
                <Upload className="h-4.5 w-4.5 text-[#3E312C]" />
                System Brand Settings
              </h3>

              {logoError && (
                <div className="mb-3 bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200 flex justify-between items-center">
                  <span>{logoError}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setLogoError(null); }} className="font-bold underline text-[10px]">Dismiss</button>
                </div>
              )}

              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                  isDragOver 
                    ? 'border-[#3E312C] bg-[#FAF9F5] scale-[1.02]' 
                    : 'border-[#EBE6DD] hover:border-[#3E312C] bg-[#FAF9F5]/40 hover:bg-[#FAF9F5]'
                }`}
                id="logo-dropzone"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                {customLogo ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="bg-white p-2.5 rounded-xl border border-[#EBE6DD] shadow-2xs">
                      <img 
                        src={customLogo} 
                        alt="Uploaded Logo Preview" 
                        className="h-14 w-14 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs font-semibold text-[#3E312C]">Logo active</span>
                    <span className="text-[10px] text-[#8C7A6B]">Click or drag to replace logo</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 flex flex-col items-center py-2">
                    <div className="bg-white p-2.5 rounded-xl border border-[#EBE6DD] text-[#8C7A6B] shadow-2xs">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-[#3E312C]">Upload Custom Logo</span>
                    <p className="text-[10px] text-[#8C7A6B] max-w-[200px]">
                      Drag & drop or click to browse. Supports SVG, PNG, JPG.
                    </p>
                  </div>
                )}
              </div>

              {customLogo && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUpdateLogo) onUpdateLogo(null);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 bg-[#FDF2F0] hover:bg-[#FDF2F0]/80 text-[#A65D46] border border-[#F2DED9] font-semibold text-xs py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Reset to Madigun Default
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Stats Summary / Active Users */}
          {currentUser.role === 'admin' && (
            <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-5 shadow-sm" id="quick-action-panel">
              <h3 className="font-serif text-lg text-[#3E312C] mb-3 flex items-center gap-1.5">
                <History className="h-4.5 w-4.5 text-[#8C7A6B]" />
                Recent BOH Events
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1" id="recent-logs-list">
                {logs.slice(0, 4).map((log) => (
                  <div key={log.id} className="text-xs border-l-2 border-[#3E312C] pl-3 py-0.5 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-[#8C7A6B]">
                      <span className="font-mono font-bold uppercase">{log.username} ({log.action})</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[#3E312C] font-medium text-xs leading-relaxed">{log.details}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-[#F0EFE9] flex justify-between items-center text-xs">
                <span className="text-[#8C7A6B]">Current Session:</span>
                <span className="bg-[#EBE6DD] text-[#3E312C] px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] border border-[#DFD9D0]">
                  {currentUser.name} ({currentUser.role.toUpperCase()})
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================== */}
      {/* PRINT-ONLY DASHBOARD CATEGORY COSTING REPORT */}
      {/* ========================================== */}
      <div id="category-report-print-sheet" className="print-only">
        <div style={{ fontFamily: 'sans-serif', color: '#111', padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #3E312C', paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#3E312C' }}>MADIGUN HOTEL AND EVENTS</h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#8C7A6B', textTransform: 'uppercase', letterSpacing: '1px' }}>Back-of-House Financial Controls</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#3E312C', fontWeight: 'bold' }}>SUPPLY COSTING BY CATEGORY REPORT</h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '11px', fontWeight: 'bold', color: '#3E312C', textTransform: 'uppercase' }}>
                {reportTab === 'inventory' ? 'Current Stock Valuation' : 'Procurement Spend Report'}
              </p>
              {(reportStartDate || reportEndDate) && (
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#8C7A6B' }}>
                  Range: {reportStartDate || 'Any'} to {reportEndDate || 'Any'}
                </p>
              )}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '30px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAF9F5', textAlign: 'left', borderBottom: '1.5px solid #3E312C', color: '#3E312C' }}>
                <th style={{ padding: '10px 8px', width: '50%' }}>Supply Category</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', width: '25%' }}>Volume (Items/Units Count)</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', width: '25%' }}>Cost Valuation</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #EBE6DD' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#3E312C' }}>{item.category}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#3E312C' }}>{item.count.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#3E312C' }}>₱{item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #3E312C', fontWeight: 'bold', fontSize: '13px', backgroundColor: '#FAF9F5' }}>
                <td style={{ padding: '12px 8px', color: '#3E312C' }}>Total Report Spend / Valuation:</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', color: '#3E312C' }}>
                  {categoryData.reduce((sum, c) => sum + c.count, 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#3E312C' }}>
                  ₱{categoryData.reduce((sum, c) => sum + c.value, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '45%', borderTop: '1px solid #3E312C', paddingTop: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: '#3E312C' }}>{currentUser.name}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#8C7A6B', textTransform: 'uppercase' }}>Report Preparer</p>
            </div>
            <div style={{ width: '45%', borderTop: '1px solid #3E312C', paddingTop: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: '#3E312C' }}>___________________________</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#8C7A6B', textTransform: 'uppercase' }}>Authorized Representative</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
