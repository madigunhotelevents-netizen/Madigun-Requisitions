import React, { useState } from 'react';
import { 
  FoodRequisition, 
  FoodRequisitionItem, 
  FoodRequisitionStatus, 
  User 
} from '../types';
import { 
  Utensils, 
  Plus, 
  Search, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  DollarSign, 
  Trash2, 
  Edit, 
  Printer, 
  Check, 
  X,
  FileCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FoodRequisitionsProps {
  currentUser: User;
  foodRequisitions: FoodRequisition[];
  onAddFoodRequisition: (req: Omit<FoodRequisition, 'id' | 'requisitionNumber' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: FoodRequisitionStatus, signatureDataUrl?: string) => void;
  onVerifyFoodRequisition?: (id: string, signatureDataUrl?: string) => void;
  onDeleteFoodRequisition: (id: string) => void;
  onEditFoodRequisition?: (updated: FoodRequisition) => void;
}

export function FoodRequisitions({
  currentUser,
  foodRequisitions,
  onAddFoodRequisition,
  onUpdateStatus,
  onVerifyFoodRequisition,
  onDeleteFoodRequisition,
  onEditFoodRequisition
}: FoodRequisitionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<FoodRequisition | null>(null);

  // Delete Modal State
  const [reqToDelete, setReqToDelete] = useState<FoodRequisition | null>(null);

  // Form Fields
  const [requestingDept, setRequestingDept] = useState('Kitchen / F&B Operations');
  const [eventOrPurpose, setEventOrPurpose] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [notes, setNotes] = useState('');
  const [formItems, setFormItems] = useState<Array<{ mealName: string; paxOrQty: number; unitPrice: number }>>([
    { mealName: '', paxOrQty: 1, unitPrice: 0 }
  ]);

  // Helper for meal category labels
  const getMealTypeLabel = (type?: string) => {
    if (!type) return 'Meal';
    if (type === 'breakfast') return 'Breakfast';
    if (type === 'lunch') return 'Lunch';
    if (type === 'dinner') return 'Dinner';
    if (type === 'lunch_dinner') return 'Lunch & Dinner';
    if (type === 'snack') return 'Snack / Refreshments';
    if (type === 'banquet') return 'Banquet / Event';
    return type;
  };

  // Calculate totals
  const totalRequisitions = foodRequisitions.length;
  const totalExpenditure = foodRequisitions
    .filter(r => !r.isDeleted)
    .reduce((sum, r) => sum + (r.totalCost || 0), 0);
  const pendingCount = foodRequisitions.filter(r => !r.isDeleted && r.status === 'pending').length;
  const approvedCount = foodRequisitions.filter(r => !r.isDeleted && (r.status === 'approved' || r.status === 'completed')).length;

  // Filtered list
  const filteredList = foodRequisitions.filter(req => {
    if (req.isDeleted) return false;

    // Status filter
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;

    // Meal type filter
    if (mealTypeFilter !== 'all' && req.mealType !== mealTypeFilter) return false;

    // Search term
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const matchNum = req.requisitionNumber.toLowerCase().includes(query);
      const matchDept = (req.requestingDept || '').toLowerCase().includes(query);
      const matchPurpose = req.eventOrPurpose.toLowerCase().includes(query);
      const matchCreator = req.createdByName.toLowerCase().includes(query);
      const matchItem = req.items.some(i => i.mealName.toLowerCase().includes(query) || (i.description || '').toLowerCase().includes(query));
      return matchNum || matchDept || matchPurpose || matchCreator || matchItem;
    }

    return true;
  });

  // Modal open helpers
  const handleOpenNewModal = () => {
    setEditingReq(null);
    setRequestingDept('Kitchen / F&B Operations');
    setEventOrPurpose('');
    setMealType('breakfast');
    setNotes('');
    setFormItems([{ mealName: '', paxOrQty: 1, unitPrice: 0 }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (req: FoodRequisition) => {
    setEditingReq(req);
    setRequestingDept(req.requestingDept || 'Kitchen / F&B Operations');
    setEventOrPurpose(req.eventOrPurpose);
    setMealType(req.mealType || 'breakfast');
    setNotes(req.notes || '');
    setFormItems(
      req.items.length > 0 
        ? req.items.map(i => ({
            mealName: i.mealName,
            paxOrQty: i.paxOrQty || 1,
            unitPrice: i.unitPrice || 0
          }))
        : [{ mealName: '', paxOrQty: 1, unitPrice: 0 }]
    );
    setIsModalOpen(true);
  };

  // Item row operations
  const handleAddItemRow = () => {
    setFormItems([...formItems, { mealName: '', paxOrQty: 1, unitPrice: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  const calculatedFormTotal = formItems.reduce((sum, item) => {
    const qty = Number(item.paxOrQty) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventOrPurpose.trim()) {
      alert('Please enter the event or purpose for this food requisition.');
      return;
    }

    const validItems: FoodRequisitionItem[] = formItems
      .filter(i => i.mealName.trim().length > 0)
      .map((i, idx) => {
        const qty = Math.max(1, Number(i.paxOrQty) || 1);
        const price = Math.max(0, Number(i.unitPrice) || 0);
        return {
          id: `fitem-${Date.now()}-${idx}`,
          mealName: i.mealName.trim(),
          description: '',
          paxOrQty: qty,
          unitPrice: price,
          totalCost: qty * price
        };
      });

    if (validItems.length === 0) {
      alert('Please add at least one meal item with a name.');
      return;
    }

    if (editingReq && onEditFoodRequisition) {
      onEditFoodRequisition({
        ...editingReq,
        requestingDept,
        eventOrPurpose: eventOrPurpose.trim(),
        mealType,
        items: validItems,
        totalCost: calculatedFormTotal,
        notes: notes.trim()
      });
    } else {
      onAddFoodRequisition({
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        requestingDept,
        eventOrPurpose: eventOrPurpose.trim(),
        mealType,
        items: validItems,
        totalCost: calculatedFormTotal,
        status: 'pending',
        notes: notes.trim()
      });
    }

    setIsModalOpen(false);
  };

  // PDF Generation function
  const handlePrintPDF = (req: FoodRequisition) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Background & Header Accent
    doc.setFillColor(62, 49, 44); // #3E312C
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("MADIGUN HOTEL & ELEVEN SUITES", 14, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("FOOD & MEAL REQUISITION VOUCHER", 14, 23);

    // Document info box (Right)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`REQ NO: ${req.requisitionNumber}`, 196, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`DATE: ${new Date(req.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}`, 196, 22, { align: 'right' });

    // Info section
    let y = 42;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("REQUEST DETAILS", 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Left Column
    doc.text(`Requesting Department:`, 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${req.requestingDept || 'Kitchen / F&B Operations'}`, 55, y);

    doc.setFont('helvetica', 'normal');
    doc.text(`Prepared By:`, 14, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${req.createdByName}`, 55, y + 6);

    // Right Column
    doc.setFont('helvetica', 'normal');
    doc.text(`Meal Type / Category:`, 110, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${getMealTypeLabel(req.mealType).toUpperCase()}`, 155, y);

    doc.setFont('helvetica', 'normal');
    doc.text(`Status:`, 110, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${req.status.toUpperCase()}`, 155, y + 6);

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text(`Event / Purpose:`, 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${req.eventOrPurpose}`, 55, y);

    y += 10;

    // Table of Meal Items (without currency symbol inside PDF)
    const tableData = req.items.map((item, index) => [
      index + 1,
      item.mealName,
      item.paxOrQty,
      item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      item.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Meal Item', 'Pax / Servings', 'Unit Cost', 'Total Cost']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [62, 49, 44],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 95 },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });

    // @ts-ignore
    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : y + 40;

    // Grand Total Banner (without currency symbol inside PDF)
    doc.setFillColor(244, 242, 235);
    doc.rect(120, finalY, 76, 12, 'F');
    doc.setDrawColor(223, 217, 208);
    doc.rect(120, finalY, 76, 12, 'S');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(62, 49, 44);
    doc.text("TOTAL MEAL COST:", 124, finalY + 8);
    doc.text(`${req.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, finalY + 8, { align: 'right' });

    finalY += 20;

    // Notes if present
    if (req.notes) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`Special Notes: ${req.notes}`, 14, finalY);
      finalY += 12;
    }

    // Signatures Section - 3 Box Layout: Prepared By, Verified By Purchaser, Approved By
    finalY = Math.max(finalY, 210);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY, 196, finalY);
    finalY += 12;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(62, 49, 44);

    // Signature Box 1: Prepared By
    doc.text("PREPARED BY:", 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(req.createdByName, 14, finalY + 12);
    doc.line(14, finalY + 14, 65, finalY + 14);
    doc.setFontSize(7);
    doc.text("Kitchen / Operations Staff", 14, finalY + 18);

    // Signature Box 2: Verified By Purchaser
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("VERIFIED BY PURCHASER:", 77, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(req.checkedByName || "___________________________", 77, finalY + 12);
    doc.line(77, finalY + 14, 128, finalY + 14);
    doc.setFontSize(7);
    doc.text("Purchaser / Auditor", 77, finalY + 18);

    // Signature Box 3: Approved By
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("APPROVED BY:", 140, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(req.approvedByName || "___________________________", 140, finalY + 12);
    doc.line(140, finalY + 14, 195, finalY + 14);
    doc.setFontSize(7);
    doc.text("Authorized Approver", 140, finalY + 18);

    doc.save(`Food_Requisition_${req.requisitionNumber}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-[#3E312C] to-[#5C4942] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-[#2A211D]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#8C7A6B]/40 text-amber-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-300/30 flex items-center gap-1">
              <Utensils className="h-3 w-3" /> Food & Meal Operations
            </span>
          </div>
          <h1 className="font-serif font-bold text-2xl md:text-3xl tracking-tight">Food & Meal Requisitions</h1>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="flex items-center justify-center gap-2 bg-[#EBE6DD] hover:bg-white text-[#3E312C] font-bold text-xs px-5 py-3 rounded-2xl transition-all cursor-pointer shadow-lg hover:shadow-xl shrink-0"
        >
          <Plus className="h-4 w-4 text-[#3E312C]" />
          <span>New Food Requisition</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F4F2EB] border border-[#DFD9D0] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A6B]">Total Orders</span>
            <div className="p-2 bg-[#EBE6DD] rounded-xl text-[#3E312C]">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#3E312C]">{totalRequisitions}</p>
        </div>

        <div className="bg-[#F4F2EB] border border-[#DFD9D0] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A6B]">Total Cost</span>
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#3E312C]">
            ₱{totalExpenditure.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-[#F4F2EB] border border-[#DFD9D0] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A6B]">Pending Review</span>
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-amber-900">{pendingCount}</p>
        </div>

        <div className="bg-[#F4F2EB] border border-[#DFD9D0] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A6B]">Approved Meals</span>
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-emerald-900">{approvedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#F4F2EB] border border-[#DFD9D0] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7A6B]" />
          <input
            type="text"
            placeholder="Search by REQ #, event purpose, requestor, or meal name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DFD9D0] rounded-xl text-xs text-[#3E312C] focus:outline-none focus:ring-2 focus:ring-[#3E312C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#DFD9D0] rounded-xl text-xs font-bold text-[#3E312C] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Meal Type Filter */}
          <select
            value={mealTypeFilter}
            onChange={(e) => setMealTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#DFD9D0] rounded-xl text-xs font-bold text-[#3E312C] focus:outline-none"
          >
            <option value="all">All Meal Types</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="lunch_dinner">Lunch & Dinner</option>
            <option value="snack">Snack / Refreshments</option>
            <option value="banquet">Banquet / Event</option>
          </select>
        </div>
      </div>

      {/* Requisitions List */}
      {filteredList.length === 0 ? (
        <div className="bg-[#F4F2EB] border border-[#DFD9D0] rounded-2xl p-12 text-center">
          <Utensils className="h-10 w-10 text-[#8C7A6B] mx-auto mb-3 opacity-60" />
          <h3 className="font-serif font-bold text-lg text-[#3E312C]">No Food Requisitions Found</h3>
          <p className="text-xs text-[#8C7A6B] mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' || mealTypeFilter !== 'all' 
              ? 'No meal requisitions match your search filters.' 
              : 'There are no food requisitions yet. Click "New Food Requisition" to create one.'}
          </p>
          <button
            onClick={handleOpenNewModal}
            className="mt-4 inline-flex items-center gap-2 bg-[#3E312C] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#2A211D] transition-all cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Food Requisition</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((req) => {
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved' || req.status === 'completed';
            const isRejected = req.status === 'rejected';

            return (
              <div 
                key={req.id} 
                className="bg-[#F4F2EB] border border-[#DFD9D0] rounded-2xl p-5 shadow-2xs hover:border-[#3E312C]/30 transition-all space-y-4"
              >
                {/* Top Row: Req #, Dept, Purpose, Status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#DFD9D0] pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-[#3E312C] text-white px-2.5 py-1 rounded-lg">
                      {req.requisitionNumber}
                    </span>
                    
                    <span className="text-xs font-bold text-[#3E312C] bg-[#EBE6DD] px-2.5 py-1 rounded-lg border border-[#DFD9D0]">
                      {req.requestingDept || 'Kitchen / F&B Operations'}
                    </span>

                    <span className="text-[11px] uppercase tracking-wider font-bold text-[#8C7A6B] bg-white border border-[#DFD9D0] px-2.5 py-1 rounded-lg">
                      {getMealTypeLabel(req.mealType)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      isPending 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300/60'
                        : isApproved
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300/60'
                        : 'bg-rose-100 text-rose-900 border border-rose-300/60'
                    }`}>
                      {isPending && <Clock className="h-3.5 w-3.5 text-amber-700" />}
                      {isApproved && <CheckCircle className="h-3.5 w-3.5 text-emerald-700" />}
                      {isRejected && <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                      {req.status}
                    </span>

                    {/* Total Cost Display */}
                    <div className="text-right pl-3 border-l border-[#DFD9D0]">
                      <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Total Cost</span>
                      <span className="font-serif font-bold text-lg text-[#3E312C]">
                        ₱{req.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Event / Purpose & Requestor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#8C7A6B] font-bold">Event / Purpose: </span>
                    <strong className="text-[#3E312C] font-semibold">{req.eventOrPurpose}</strong>
                  </div>
                  <div className="md:text-right text-[#8C7A6B]">
                    <span>Requested by </span>
                    <strong className="text-[#3E312C]">{req.createdByName}</strong>
                    <span> on {new Date(req.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>

                {/* Purchaser Verification Status Badge */}
                {req.checkedBy ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-medium">
                    <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Checked & Verified by Purchaser: <strong className="font-bold">{req.checkedByName}</strong> {req.checkedAt && `on ${new Date(req.checkedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-medium">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Pending Purchaser Verification</span>
                  </div>
                )}

                {/* Items Table */}
                <div className="bg-white rounded-xl border border-[#DFD9D0] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EBE6DD] text-[#3E312C] font-bold text-[11px] uppercase tracking-wider border-b border-[#DFD9D0]">
                      <tr>
                        <th className="py-2.5 px-3">Meal Item</th>
                        <th className="py-2.5 px-3 text-center">Pax / Servings</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EBE6DD]">
                      {req.items.map((item, i) => (
                        <tr key={item.id || i} className="hover:bg-[#F4F2EB]/50">
                          <td className="py-2.5 px-3 font-bold text-[#3E312C]">{item.mealName}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-[#3E312C]">{item.paxOrQty}</td>
                          <td className="py-2.5 px-3 text-right text-[#3E312C]">
                            ₱{item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#3E312C]">
                            ₱{item.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Notes if present */}
                {req.notes && (
                  <p className="text-xs text-[#8C7A6B] bg-[#EBE6DD]/60 rounded-xl p-2.5 border border-[#DFD9D0] italic">
                    <strong>Note:</strong> {req.notes}
                  </p>
                )}

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#DFD9D0]">
                  <div className="flex items-center gap-2">
                    {/* Print / Export Voucher Button */}
                    <button
                      onClick={() => handlePrintPDF(req)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#EBE6DD] border border-[#DFD9D0] rounded-xl text-xs font-bold text-[#3E312C] cursor-pointer shadow-2xs transition-all"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#8C7A6B]" />
                      <span>Print Voucher PDF</span>
                    </button>

                    {/* Edit Button */}
                    {(currentUser.role === 'admin' || currentUser.role === 'managing_director' || currentUser.id === req.createdBy) && isPending && (
                      <button
                        onClick={() => handleOpenEditModal(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#EBE6DD] border border-[#DFD9D0] rounded-xl text-xs font-bold text-[#3E312C] cursor-pointer shadow-2xs transition-all"
                      >
                        <Edit className="h-3.5 w-3.5 text-[#8C7A6B]" />
                        <span>Edit</span>
                      </button>
                    )}

                    {/* Delete Button */}
                    {(currentUser.role === 'admin' || currentUser.role === 'managing_director' || currentUser.role === 'purchaser' || currentUser.role === 'staff' || currentUser.role === 'rooms_event_officer' || currentUser.id === req.createdBy) && (
                      <button
                        type="button"
                        onClick={() => setReqToDelete(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 cursor-pointer transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>

                  {/* Approvals Workflow Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Purchaser Verification Button */}
                    {!req.checkedBy && !isRejected && (currentUser.role === 'admin' || currentUser.role === 'managing_director' || currentUser.role === 'purchaser') && (
                      <button
                        onClick={() => {
                          if (onVerifyFoodRequisition) {
                            onVerifyFoodRequisition(req.id);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        <span>Verify / Check Requisition</span>
                      </button>
                    )}

                    {/* State 1: Pending Approval - ONLY Admin & Managing Director can approve or reject */}
                    {isPending && (
                      (currentUser.role === 'admin' || currentUser.role === 'managing_director') ? (
                        <>
                          <button
                            onClick={() => onUpdateStatus(req.id, 'approved')}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Approve Requisition</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm('Reject this food requisition?')) {
                                onUpdateStatus(req.id, 'rejected');
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-800" />
                          {req.checkedBy ? 'Awaiting Admin / Managing Director Approval' : 'Pending Purchaser Verification & Executive Approval'}
                        </span>
                      )
                    )}

                    {req.status === 'approved' && (currentUser.role === 'admin' || currentUser.role === 'managing_director' || currentUser.role === 'staff' || currentUser.role === 'purchaser' || currentUser.role === 'rooms_event_officer') && (
                      <button
                        onClick={() => onUpdateStatus(req.id, 'completed')}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#3E312C] hover:bg-[#2A211D] text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Mark Served / Completed</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT FOOD REQUISITION */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#F4F2EB] rounded-3xl max-w-2xl w-full border border-[#DFD9D0] shadow-2xl overflow-hidden my-8">
            <div className="bg-[#3E312C] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-amber-300" />
                <h3 className="font-serif font-bold text-lg">
                  {editingReq ? `Edit Food Requisition (${editingReq.requisitionNumber})` : 'New Food / Meal Requisition'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#DFD9D0] hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Header Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                    Requesting Department / Section
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kitchen / F&B Operations"
                    value={requestingDept}
                    onChange={(e) => setRequestingDept(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DFD9D0] rounded-xl text-xs text-[#3E312C] font-semibold focus:outline-none focus:ring-2 focus:ring-[#3E312C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                    Meal Category / Service
                  </label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DFD9D0] rounded-xl text-xs text-[#3E312C] font-semibold focus:outline-none focus:ring-2 focus:ring-[#3E312C]"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="lunch_dinner">Lunch & Dinner</option>
                    <option value="snack">Snacks & Refreshments</option>
                    <option value="banquet">Banquet / Event Meal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                  Event / Purpose of Meal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Managing Director Guest Lunch or Duty Night Shift Meals"
                  value={eventOrPurpose}
                  onChange={(e) => setEventOrPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DFD9D0] rounded-xl text-xs text-[#3E312C] focus:outline-none focus:ring-2 focus:ring-[#3E312C]"
                />
              </div>

              {/* Meal Items Section */}
              <div className="border-t border-[#DFD9D0] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-serif font-bold text-sm text-[#3E312C]">Meal Items Breakdown</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1 text-xs font-bold text-[#3E312C] hover:text-[#8C7A6B] bg-[#EBE6DD] px-3 py-1.5 rounded-xl border border-[#DFD9D0] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Meal Line</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-[#DFD9D0] space-y-2 relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">Meal #{idx + 1}</span>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Meal Name (e.g. Pork Tapa with Garlic Rice)"
                          value={item.mealName}
                          onChange={(e) => handleItemChange(idx, 'mealName', e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#F4F2EB] border border-[#DFD9D0] rounded-lg text-xs text-[#3E312C] font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-[#8C7A6B]">Pax / Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.paxOrQty}
                            onChange={(e) => handleItemChange(idx, 'paxOrQty', Number(e.target.value))}
                            className="w-full px-3 py-1 bg-[#F4F2EB] border border-[#DFD9D0] rounded-lg text-xs text-[#3E312C] font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#8C7A6B]">Unit Cost (₱)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full px-3 py-1 bg-[#F4F2EB] border border-[#DFD9D0] rounded-lg text-xs text-[#3E312C] font-bold"
                          />
                        </div>
                        <div className="text-right">
                          <label className="block text-[10px] font-bold text-[#8C7A6B]">Subtotal</label>
                          <span className="font-bold text-sm text-[#3E312C] leading-7 block">
                            ₱{((Number(item.paxOrQty) || 0) * (Number(item.unitPrice) || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Cost Display Banner */}
              <div className="bg-[#EBE6DD] border border-[#DFD9D0] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#8C7A6B] uppercase tracking-wider block">Estimated Total Cost</span>
                </div>
                <span className="font-serif font-bold text-2xl text-[#3E312C]">
                  ₱{calculatedFormTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-xs font-bold text-[#3E312C] uppercase tracking-wider mb-1">
                  Special Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Serve hot at 12:30 PM in Executive Boardroom"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DFD9D0] rounded-xl text-xs text-[#3E312C] focus:outline-none"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DFD9D0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#8C7A6B] hover:bg-[#EBE6DD] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#3E312C] hover:bg-[#2A211D] cursor-pointer shadow-md"
                >
                  {editingReq ? 'Save Changes' : 'Submit Food Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reqToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DFD9D0] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-700 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#3E312C]">Delete Food Requisition</h3>
                <p className="text-xs text-[#8C7A6B] font-medium">{reqToDelete.requisitionNumber}</p>
              </div>
            </div>
            
            <p className="text-xs text-[#52433D] mb-5 leading-relaxed">
              Are you sure you want to delete this food & meal requisition for <strong>{reqToDelete.eventOrPurpose}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DFD9D0]">
              <button
                type="button"
                onClick={() => setReqToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-[#EBE6DD] border border-[#DFD9D0] text-[#3E312C] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteFoodRequisition(reqToDelete.id);
                  setReqToDelete(null);
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                Yes, Delete Requisition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
