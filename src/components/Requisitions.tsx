import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Truck, 
  PackageCheck, 
  ArrowRight, 
  AlertCircle,
  FileSpreadsheet,
  FileCheck,
  ChevronDown,
  ChevronUp,
  User,
  ShoppingBag,
  RefreshCw,
  Printer,
  Calendar,
  FileEdit,
  Save,
  Send,
  FileText,
  Paperclip,
  Upload,
  Eye,
  Search,
  RotateCcw,
  RotateCw,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { Requisition, InventoryItem, User as UserType, RequisitionItem, RequisitionStatus } from '../types';

interface RequisitionsProps {
  requisitions: Requisition[];
  inventory: InventoryItem[];
  currentUser: UserType;
  users: UserType[];
  draftAutoItems: Omit<RequisitionItem, 'itemName' | 'unitCost' | 'unit'>[] | null;
  onClearDraftAuto: () => void;
  onCreateRequisition: (requisition: Omit<Requisition, 'id' | 'requisitionNumber' | 'createdBy' | 'createdByName' | 'createdAt' | 'totalCost'>) => void;
  onUpdateRequisition?: (requisitionId: string, updatedFields: Partial<Requisition>) => void;
  onUpdateStatus: (
    requisitionId: string, 
    newStatus: RequisitionStatus, 
    signatureDataUrl?: string, 
    specificReceivedItems?: RequisitionItem[], 
    receivedNotes?: string
  ) => void;
  onCheckRequisition?: (requisitionId: string, signatureDataUrl?: string) => void;
  onReverseStatus: (requisitionId: string) => void;
  onDeleteRequisition: (requisitionId: string) => void;
  onRestoreRequisition?: (requisitionId: string) => void;
  onPurgeRequisition?: (requisitionId: string) => void;
}

interface SignaturePadModalProps {
  isOpen: boolean;
  onSave: (signatureDataUrl: string) => Promise<void> | void;
  onCancel: () => void;
  title: string;
  subtitle: string;
  signerName: string;
  signerRole: string;
  rememberLabel?: string;
  confirmLabel?: string;
}

// Helper to compress and optimize signature canvas to a crisp, lightweight image
function optimizeSignatureCanvas(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  // Create an offscreen compact canvas (320x114) for fast transmission and PDF rendering
  const exportCanvas = document.createElement('canvas');
  const targetWidth = 320;
  const targetHeight = 114;
  exportCanvas.width = targetWidth;
  exportCanvas.height = targetHeight;
  const exportCtx = exportCanvas.getContext('2d');
  if (exportCtx) {
    exportCtx.fillStyle = '#FFFFFF';
    exportCtx.fillRect(0, 0, targetWidth, targetHeight);
    exportCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    return exportCanvas.toDataURL('image/jpeg', 0.82);
  }
  return canvas.toDataURL('image/png');
}

function SignaturePadModal({
  isOpen,
  onSave,
  onCancel,
  title,
  subtitle,
  signerName,
  signerRole,
  rememberLabel,
  confirmLabel
}: SignaturePadModalProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [savedDefaultSig, setSavedDefaultSig] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem(`madigun_default_sig_${signerName}`);
      if (stored) {
        setSavedDefaultSig(stored);
      }
    } catch (e) {
      // ignore
    }
  }, [isOpen, signerName]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#E6E4DD';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasSignature(false);
    setSyncError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#E6E4DD';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    setHasSignature(false);
    setSyncError(null);
  };

  const loadSavedSignature = () => {
    if (!savedDefaultSig) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasSignature(true);
    };
    img.src = savedDefaultSig;
  };

  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature || isSubmitting) return;

    setIsSubmitting(true);
    setSyncError(null);

    try {
      const dataUrl = optimizeSignatureCanvas(canvas);

      if (saveAsDefault) {
        try {
          localStorage.setItem(`madigun_default_sig_${signerName}`, dataUrl);
        } catch (e) {
          // ignore
        }
      }

      await onSave(dataUrl);
    } catch (err: any) {
      console.error("Signature authorization submission error:", err);
      setSyncError(err?.message || 'Failed to sync with cloud server. Please retry.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#FAF9F5] border border-[#E6E4DD] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#3E312C] text-white p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-base tracking-wide text-white">{title}</h3>
            </div>
            <p className="text-xs text-[#E6E4DD] mt-0.5">{subtitle}</p>
          </div>
          <button 
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* Signer Info Badge */}
          <div className="flex items-center justify-between bg-white border border-[#E6E4DD] p-3 rounded-xl">
            <div>
              <p className="text-[10px] text-[#8C7A6B] font-bold uppercase tracking-wider">Signing Authority</p>
              <p className="text-sm font-bold text-[#3E312C]">{signerName}</p>
            </div>
            <span className="text-xs font-bold text-[#3E312C] bg-[#F4F2EB] px-3 py-1 rounded-full border border-[#E6E4DD]">
              {signerRole}
            </span>
          </div>

          {/* Canvas Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#3E312C]">Draw Digital Signature Below:</label>
              <div className="flex items-center gap-3">
                {savedDefaultSig && !isSubmitting && (
                  <button
                    type="button"
                    onClick={loadSavedSignature}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Use Saved Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearCanvas}
                  disabled={isSubmitting}
                  className="text-[11px] font-bold text-red-600 hover:text-red-800 underline cursor-pointer disabled:opacity-40"
                >
                  Clear Pad
                </button>
              </div>
            </div>

            <div className="border-2 border-dashed border-[#3E312C]/30 bg-white rounded-xl overflow-hidden shadow-inner touch-none relative">
              <canvas
                ref={canvasRef}
                width={450}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 cursor-crosshair block"
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <p className="text-xs text-[#8C7A6B]/50 font-medium italic">Sign inside box using mouse, touch, or stylus</p>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="save-default-sig"
              checked={saveAsDefault}
              disabled={isSubmitting}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              className="rounded border-[#E6E4DD] text-[#3E312C] focus:ring-[#3E312C] cursor-pointer"
            />
            <label htmlFor="save-default-sig" className="text-xs text-[#3E312C] font-medium cursor-pointer">
              {rememberLabel || "Remember & save this signature for future PR signing"}
            </label>
          </div>

          {/* Error message */}
          {syncError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {syncError}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#F4F2EB] border-t border-[#E6E4DD] p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white text-[#3E312C] border border-[#E6E4DD] hover:bg-gray-50 rounded-full text-xs font-bold cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasSignature || isSubmitting}
            className="px-5 py-2 bg-[#3E312C] hover:bg-[#2C211F] disabled:opacity-50 text-white rounded-full text-xs font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <RotateCw className="h-4 w-4 text-emerald-400 animate-spin" />
                <span>Authorizing & Syncing to Cloud...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>{confirmLabel || "Confirm & Embed Signature"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Requisitions({
  requisitions,
  inventory,
  currentUser,
  users,
  draftAutoItems,
  onClearDraftAuto,
  onCreateRequisition,
  onUpdateRequisition,
  onUpdateStatus,
  onCheckRequisition,
  onReverseStatus,
  onDeleteRequisition,
  onRestoreRequisition,
  onPurgeRequisition
}: RequisitionsProps) {
  const isAdmin = currentUser.role === 'admin';

  // Toggle create form
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [reversingReqId, setReversingReqId] = useState<string | null>(null);
  const [requisitionToDelete, setRequisitionToDelete] = useState<Requisition | null>(null);
  const [purgingReqId, setPurgingReqId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'active' | 'deleted'>('active');

  // Helper for human-friendly preparer role display
  const getPreparerRoleLabel = (role?: string) => {
    switch (role) {
      case 'rooms_event_officer':
        return 'Rooms & Events Officer';
      case 'purchaser':
        return 'Hotel Purchaser';
      case 'admin':
        return 'Property Custodian / Admin';
      case 'managing_director':
        return 'Hotel Managing Director';
      case 'kitchen':
        return 'Kitchen Staff';
      default:
        return 'Requisition Preparer';
    }
  };

  // Signature Modal State
  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean;
    reqId?: string;
    reqNumber?: string;
    action: 'draft' | 'submit' | 'submit_existing' | 'check' | 'approve';
    title: string;
    subtitle: string;
    confirmLabel?: string;
    rememberLabel?: string;
    draftData?: Omit<Requisition, 'id' | 'requisitionNumber' | 'createdBy' | 'createdByName' | 'createdAt' | 'totalCost'>;
  } | null>(null);

  // Print Requisition
  const [activePrintReq, setActivePrintReq] = useState<Requisition | null>(null);

  // Received Items Selection Modal state
  const [receivingModalReq, setReceivingModalReq] = useState<Requisition | null>(null);
  const [receivingItemsState, setReceivingItemsState] = useState<Array<{
    itemId: string;
    itemName: string;
    requestedQty: number;
    receivedQty: number;
    requestedUnitCost: number;
    actualUnitCost: number;
    unit: string;
    targetTab?: string;
    allocatedLocation?: string;
    category?: string;
    isSelected: boolean;
  }>>([]);
  const [receivingNotes, setReceivingNotes] = useState('');
  const [isConfirmingEmptyReceive, setIsConfirmingEmptyReceive] = useState(false);

  const handleOpenReceiveModal = (req: Requisition) => {
    setReceivingModalReq(req);
    setReceivingNotes('');
    setIsConfirmingEmptyReceive(false);
    setReceivingItemsState(
      (req.items || []).map(it => {
        const cost = it.unitCost || 0;
        return {
          itemId: it.itemId,
          itemName: it.itemName,
          requestedQty: it.quantity || 0,
          receivedQty: it.quantity || 0,
          requestedUnitCost: cost,
          actualUnitCost: cost,
          unit: it.unit || 'pcs',
          targetTab: it.targetTab,
          allocatedLocation: it.allocatedLocation,
          category: it.category,
          isSelected: true
        };
      })
    );
  };

  const handleToggleItemSelection = (index: number) => {
    setIsConfirmingEmptyReceive(false);
    setReceivingItemsState(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const nextSelected = !item.isSelected;
      return {
        ...item,
        isSelected: nextSelected,
        receivedQty: nextSelected && item.receivedQty === 0 ? item.requestedQty : item.receivedQty
      };
    }));
  };

  const handleSetItemReceivedQty = (index: number, val: number) => {
    setIsConfirmingEmptyReceive(false);
    const safeQty = Math.max(0, isNaN(val) ? 0 : val);
    setReceivingItemsState(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        receivedQty: safeQty,
        isSelected: safeQty > 0
      };
    }));
  };

  const handleSetItemActualCost = (index: number, val: number) => {
    setIsConfirmingEmptyReceive(false);
    const safeCost = Math.max(0, isNaN(val) ? 0 : val);
    setReceivingItemsState(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        actualUnitCost: safeCost
      };
    }));
  };

  const handleResetItemCost = (index: number) => {
    setReceivingItemsState(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        actualUnitCost: item.requestedUnitCost
      };
    }));
  };

  const handleSelectAllReceiving = (selected: boolean) => {
    setIsConfirmingEmptyReceive(false);
    setReceivingItemsState(prev => prev.map(item => ({
      ...item,
      isSelected: selected,
      receivedQty: selected ? (item.receivedQty > 0 ? item.receivedQty : item.requestedQty) : 0
    })));
  };

  const handleResetReceivingToRequested = () => {
    setIsConfirmingEmptyReceive(false);
    setReceivingItemsState(prev => prev.map(item => ({
      ...item,
      isSelected: true,
      receivedQty: item.requestedQty,
      actualUnitCost: item.requestedUnitCost
    })));
  };

  const handleConfirmReceived = () => {
    if (!receivingModalReq) return;

    // Filter items that are selected AND have receivedQty > 0
    const purchasedItems: RequisitionItem[] = receivingItemsState
      .filter(it => it.isSelected && it.receivedQty > 0)
      .map(it => ({
        itemId: it.itemId,
        itemName: it.itemName,
        quantity: it.receivedQty,
        unit: it.unit,
        unitCost: it.actualUnitCost, // Actual bought price passed into unitCost for inventory restock
        actualUnitCost: it.actualUnitCost,
        requestedUnitCost: it.requestedUnitCost,
        targetTab: it.targetTab,
        allocatedLocation: it.allocatedLocation,
        category: it.category
      }));

    if (purchasedItems.length === 0 && !isConfirmingEmptyReceive) {
      setIsConfirmingEmptyReceive(true);
      return;
    }

    onUpdateStatus(
      receivingModalReq.id, 
      'received', 
      undefined, 
      purchasedItems, 
      receivingNotes.trim() || undefined
    );
    setReceivingModalReq(null);
    setIsConfirmingEmptyReceive(false);
  };

  // Search & Filter state for back tracing
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const activeRequisitions = useMemo(() => requisitions.filter(r => !r.isDeleted), [requisitions]);
  const deletedRequisitions = useMemo(() => requisitions.filter(r => r.isDeleted), [requisitions]);

  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    requisitions.forEach(r => {
      if (r.requestingDept) depts.add(r.requestingDept.trim());
    });
    ['KITCHEN', 'ROOMS', 'EVENTS', 'HOUSEKEEPING', 'ENGINEERING'].forEach(d => depts.add(d));
    return Array.from(depts).sort();
  }, [requisitions]);

  const displayedRequisitions = useMemo(() => {
    const baseList = subTab === 'active' ? activeRequisitions : deletedRequisitions;
    const query = searchQuery.trim().toLowerCase();

    return baseList.filter(req => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'verified') {
          if (!req.checkedBy) return false;
        } else if (req.status !== statusFilter) {
          return false;
        }
      }

      // Dept filter
      if (deptFilter !== 'all') {
        const reqDept = (req.requestingDept || 'KITCHEN').toUpperCase();
        if (reqDept !== deptFilter.toUpperCase()) {
          return false;
        }
      }

      // Search Query back-tracing (PR Title / Purpose, PR Number, items, requestor, dept, location, notes, vendor)
      if (query) {
        const matchesTitle = req.purpose?.toLowerCase().includes(query);
        const matchesReqNum = req.requisitionNumber?.toLowerCase().includes(query);
        const matchesCreator = req.createdByName?.toLowerCase().includes(query);
        const matchesDept = req.requestingDept?.toLowerCase().includes(query);
        const matchesLocation = req.allocatedLocation?.toLowerCase().includes(query);
        const matchesVendor = req.quotationVendor?.toLowerCase().includes(query);
        const matchesNotes = req.notes?.toLowerCase().includes(query);
        const matchesItems = req.items?.some(item => 
          item.itemName?.toLowerCase().includes(query) || 
          item.notes?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
        );

        return Boolean(matchesTitle || matchesReqNum || matchesCreator || matchesDept || matchesLocation || matchesVendor || matchesNotes || matchesItems);
      }

      return true;
    });
  }, [subTab, activeRequisitions, deletedRequisitions, searchQuery, statusFilter, deptFilter]);

  // Report Generator Modal State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportFilterType, setReportFilterType] = useState<'month' | 'dateRange'>('month');
  const [reportMonth, setReportMonth] = useState('All'); // e.g. "2026-07" or "All"
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Individual Requisition print handler
  const handlePrintRequisition = (req: Requisition) => {
    setActivePrintReq(req);
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [62, 49, 44]; // #3E312C
      const secondaryColor = [140, 122, 107]; // #8C7A6B

      // Fonts & Styles
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("MADIGUN HOTEL AND EVENTS", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("KITCHEN OPERATIONS & BACK-OF-HOUSE SUPPLIES", 15, 25);

      // Line under header
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      // Title & PR Number
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("PURCHASE REQUISITION SLIP", 15, 37);

      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.text(req.requisitionNumber, 195, 37, { align: 'right' });

      // Metadata info grid
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      
      doc.text("Date Drafted:", 15, 46);
      doc.text("Request Status:", 125, 46);
      doc.text("Requested By:", 15, 51);
      doc.text("Priority Level:", 125, 51);
      doc.text("Requesting Dept:", 15, 56);
      doc.text("Allocated Location:", 125, 56);
      doc.text("Purpose / Event:", 15, 61);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      
      const dateStr = new Date(req.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(dateStr, 55, 46);
      
      doc.setFont("helvetica", "bold");
      const reqStatusText = req.status.toUpperCase();
      if (reqStatusText === 'COMPLETED' || reqStatusText === 'APPROVED' || reqStatusText === 'RECEIVED') {
        doc.setTextColor(16, 124, 65);
      } else if (reqStatusText === 'PENDING') {
        doc.setTextColor(180, 110, 20);
      } else {
        doc.setTextColor(190, 30, 30);
      }
      doc.text(reqStatusText, 160, 46);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const truncatedCreatedByName = req.createdByName.length > 40 ? req.createdByName.substring(0, 37) + "..." : req.createdByName;
      doc.text(truncatedCreatedByName, 55, 51);
      
      doc.setFont("helvetica", "bold");
      const priorityText = req.priority.toUpperCase();
      if (priorityText === 'HIGH' || priorityText === 'URGENT') {
        doc.setTextColor(190, 30, 30);
      } else if (priorityText === 'MEDIUM') {
        doc.setTextColor(180, 110, 20);
      } else {
        doc.setTextColor(60, 60, 60);
      }
      doc.text(priorityText, 160, 51);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(62, 49, 44);
      doc.text(req.requestingDept || 'KITCHEN', 55, 56);
      doc.text(req.allocatedLocation || 'General Allocation', 160, 56);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      // Handle multi-line purpose text
      const splitPurpose = doc.splitTextToSize(req.purpose || 'Replenishment of kitchen supplies', 135);
      doc.text(splitPurpose, 55, 61);

      // Calculate Y coordinate for notes/table
      let notesY = 61 + (splitPurpose.length * 4.5);
      if (req.notes) {
        doc.setFont("helvetica", "bold");
        doc.text("Special Notes:", 15, notesY + 1.5);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(req.notes, 135);
        doc.text(splitNotes, 55, notesY + 1.5);
        notesY += (splitNotes.length * 4.5) + 3.5;
      } else {
        notesY += 3.5;
      }

      // Line above items table
      doc.setDrawColor(220, 220, 215);
      doc.setLineWidth(0.2);
      doc.line(15, notesY, 195, notesY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Requested Items", 15, notesY + 6);

      // Supply Items Table
      const tableBody = req.items.map((it) => {
        const subtotal = it.quantity * it.unitCost;
        return [
          it.itemName,
          `${it.quantity} ${it.unit}`,
          `${it.unitCost.toFixed(2)}`,
          `${subtotal.toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: notesY + 9,
        margin: { left: 15, right: 15 },
        head: [['Supply Product / Material', 'Quantity', 'Unit Price (PHP)', 'Subtotal (PHP)']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [62, 49, 44], // #3E312C
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 85 },
          1: { cellWidth: 25, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' }
        },
        didParseCell: (data) => {
          if ((data.section === 'head' || data.section === 'body') && (data.column.index === 1 || data.column.index === 2 || data.column.index === 3)) {
            data.cell.styles.halign = 'right';
          }
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        foot: [[
          { content: 'Total Cost Valuation (PHP):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
          { content: `${req.totalCost.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
        ]],
        footStyles: {
          fillColor: [244, 242, 235],
          textColor: [62, 49, 44]
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
      
      // Look up creator role
      const creatorUser = users?.find(u => u.id === req.createdBy || u.name === req.createdByName);
      const creatorRole = creatorUser?.role || 'staff';
      const preparerRoleLabel = creatorRole === 'rooms_event_officer' 
        ? 'ROOMS & EVENTS' 
        : creatorRole === 'purchaser' 
        ? 'PURCHASER' 
        : creatorRole === 'admin' 
        ? 'PROPERTY CUSTODIAN' 
        : 'KITCHEN STAFF';

      // 1. Preparer Signature & Line
      if (req.preparerSignature) {
        try {
          doc.addImage(req.preparerSignature, 'PNG', 22, finalY - 16, 36, 15);
        } catch (e) {
          console.error("Error adding preparer signature to PDF:", e);
        }
      }
      doc.line(15, finalY, 65, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(truncatedCreatedByName, 40, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`PREPARER: ${preparerRoleLabel}`, 40, finalY + 8, { align: 'center' });

      // 2. Purchaser / Checked By Signature & Line
      if (req.checkedSignature) {
        try {
          doc.addImage(req.checkedSignature, 'PNG', 87, finalY - 16, 36, 15);
        } catch (e) {
          console.error("Error adding checked signature to PDF:", e);
        }
      }
      doc.line(80, finalY, 130, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const auditorNameLabel = req.checkedByName ? (req.checkedByName.length > 25 ? req.checkedByName.substring(0, 22) + "..." : req.checkedByName) : "(Signature over Name)";
      doc.text(auditorNameLabel, 105, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("CHECK BY: PURCHASER", 105, finalY + 8, { align: 'center' });

      // 3. Approver / Approved By Signature & Line
      if (req.approvedSignature) {
        try {
          doc.addImage(req.approvedSignature, 'PNG', 152, finalY - 16, 36, 15);
        } catch (e) {
          console.error("Error adding approved signature to PDF:", e);
        }
      }
      doc.line(145, finalY, 195, finalY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const approverNameLabel = req.approvedByName ? (req.approvedByName.length > 25 ? req.approvedByName.substring(0, 22) + "..." : req.approvedByName) : "Rome Garcia";
      doc.text(approverNameLabel, 170, finalY + 4, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("HOTEL MANAGING DIRECTOR", 170, finalY + 8, { align: 'center' });

      // Save PDF
      doc.save(`PR-${req.requisitionNumber}.pdf`);
    } catch (err) {
      console.error("PDF Generation error:", err);
      // Fallback
      window.print();
    }
  };

  const handlePrintSummaryReport = () => {
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
      doc.text("BOH COSTING CONTROL & REQUISITIONS AUDIT", 15, 25);

      // Line under header
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("PURCHASE REQUISITIONS SUMMARY REPORT", 15, 37);

      // Subtitle with date details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const subtitleStr = reportFilterType === 'month' 
        ? `Month Filter: ${reportMonth === 'All' ? 'All Months (Entire History)' : reportMonth}` 
        : `Period Range: ${reportStartDate || 'Any'} to ${reportEndDate || 'Any'}`;
      doc.text(subtitleStr, 15, 42);

      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 195, 42, { align: 'right' });

      // Overview Stats Table using autotable
      const statsHeaders = [['Total Requisitions', 'Pending', 'Approved', 'Received', 'Rejected', 'High Priority', 'Sum Valuation (PHP)']];
      const statsBody = [[
        reportSummary.count.toString(),
        reportSummary.pendingCount.toString(),
        reportSummary.approvedCount.toString(),
        reportSummary.receivedCount.toString(),
        reportSummary.rejectedCount.toString(),
        reportSummary.highPriorityCount.toString(),
        `${reportSummary.totalCost.toFixed(2)}`
      ]];

      autoTable(doc, {
        startY: 47,
        margin: { left: 15, right: 15 },
        head: statsHeaders,
        body: statsBody,
        theme: 'plain',
        headStyles: {
          fillColor: [244, 242, 235],
          textColor: [62, 49, 44],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [230, 228, 221]
        },
        bodyStyles: {
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center',
          textColor: [62, 49, 44],
          lineWidth: 0.1,
          lineColor: [230, 228, 221]
        },
        styles: {
          cellPadding: 2.5
        }
      });

      // Item Consumption Breakdowns Table
      const nextY = (doc as any).lastAutoTable.finalY + 9;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Supply Procurement Cost Rankings (Aggregated)", 15, nextY);

      const itemsBody = reportSummary.aggregatedItems.map((it) => [
        it.name,
        `${it.unitCost.toFixed(2)}`,
        `${it.quantity} ${it.unit}`,
        `${it.totalCost.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: nextY + 3,
        margin: { left: 15, right: 15 },
        head: [['Material / Item Name', 'Unit Cost (PHP)', 'Aggregated Volume', 'Aggregated Cost (PHP)']],
        body: itemsBody,
        theme: 'striped',
        headStyles: {
          fillColor: [62, 49, 44], // #3E312C
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' }
        },
        didParseCell: (data) => {
          if ((data.section === 'head' || data.section === 'body') && (data.column.index === 1 || data.column.index === 2 || data.column.index === 3)) {
            data.cell.styles.halign = 'right';
          }
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5
        },
        foot: [[
          { content: 'Combined Summary Spend (PHP):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
          { content: `${reportSummary.totalCost.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
        ]],
        footStyles: {
          fillColor: [244, 242, 235],
          textColor: [62, 49, 44]
        }
      });

      // Footer notice
      let lastY = (doc as any).lastAutoTable.finalY + 15;
      if (lastY > 275) {
        doc.addPage();
        lastY = 35;
      }
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Madigun Back-Of-House procurement summary generated automatically by terminal user ${currentUser.name}.`, 105, lastY, { align: 'center' });

      // Save PDF
      doc.save(`PR_Summary_Report_${reportFilterType === 'month' ? reportMonth : 'Custom'}.pdf`);
    } catch (err) {
      console.error("PDF Summary Report error:", err);
      window.print();
    }
  };

  // Unique months present in requisitions list
  const uniqueMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    requisitions.forEach(req => {
      try {
        const date = new Date(req.createdAt);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        monthsSet.add(`${yyyy}-${mm}`);
      } catch (e) {
        // Safe check
      }
    });
    return Array.from(monthsSet).sort().reverse(); // Show recent months first
  }, [requisitions]);

  // Filtered requisitions for report
  const filteredReportRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      const reqDate = new Date(req.createdAt);
      if (reportFilterType === 'month') {
        if (reportMonth === 'All') return true;
        const yyyy = reqDate.getFullYear();
        const mm = String(reqDate.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}` === reportMonth;
      } else {
        // Date range filtering
        const start = reportStartDate ? new Date(reportStartDate + 'T00:00:00') : null;
        const end = reportEndDate ? new Date(reportEndDate + 'T23:59:59') : null;
        
        if (start && reqDate < start) return false;
        if (end && reqDate > end) return false;
        return true;
      }
    });
  }, [requisitions, reportFilterType, reportMonth, reportStartDate, reportEndDate]);

  // Aggregated costing and stats for summary report
  const reportSummary = useMemo(() => {
    let totalCost = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let receivedCount = 0;
    let rejectedCount = 0;
    let highPriorityCount = 0;

    // Aggregated item line lists
    const itemsMap: Record<string, { name: string; unit: string; quantity: number; unitCost: number; totalCost: number }> = {};

    filteredReportRequisitions.forEach(req => {
      totalCost += req.totalCost;
      if (req.status === 'pending') pendingCount++;
      else if (req.status === 'approved') approvedCount++;
      else if (req.status === 'received') receivedCount++;
      else if (req.status === 'rejected') rejectedCount++;

      if (req.priority === 'high') highPriorityCount++;

      req.items.forEach(it => {
        if (!itemsMap[it.itemId]) {
          itemsMap[it.itemId] = {
            name: it.itemName,
            unit: it.unit,
            quantity: 0,
            unitCost: it.unitCost,
            totalCost: 0
          };
        }
        itemsMap[it.itemId].quantity += it.quantity;
        itemsMap[it.itemId].totalCost += it.quantity * it.unitCost;
      });
    });

    return {
      totalCost,
      count: filteredReportRequisitions.length,
      pendingCount,
      approvedCount,
      receivedCount,
      rejectedCount,
      highPriorityCount,
      aggregatedItems: Object.values(itemsMap).sort((a, b) => b.totalCost - a.totalCost)
    };
  }, [filteredReportRequisitions]);

  // Form states for creating a Requisition
  const [purpose, setPurpose] = useState('');
  const [requestingDept, setRequestingDept] = useState<string>('KITCHEN');
  const [allocatedLocation, setAllocatedLocation] = useState<string>('Main Kitchen Prep Station');
  const [stockFilterSection, setStockFilterSection] = useState<string>('ALL');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');
  const [reqItems, setReqItems] = useState<RequisitionItem[]>([]);

  // Custom Item Mode States for Draft Requisition
  const [addItemMode, setAddItemMode] = useState<'stock' | 'custom'>('stock');
  const [customItemName, setCustomItemName] = useState('');
  const [customUnit, setCustomUnit] = useState('pcs');
  const [customUnitCost, setCustomUnitCost] = useState('0');
  const [customQty, setCustomQty] = useState('1');

  // Quotations attachment states
  const [draftQuotations, setDraftQuotations] = useState<string[]>([]);
  const [editingQuotations, setEditingQuotations] = useState<string[]>([]);
  const [isUploadingQuotation, setIsUploadingQuotation] = useState(false);
  const [previewQuotationUrl, setPreviewQuotationUrl] = useState<string | null>(null);

  // Helper to process & compress quotation image files with fast downscaling
  const processQuotationFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File must be an image (PNG, JPG, WEBP)'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          reject(new Error('Failed to read image file'));
          return;
        }
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 640;
          let w = img.width;
          let h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = Math.round((h * MAX_DIM) / w);
              w = MAX_DIM;
            } else {
              w = Math.round((w * MAX_DIM) / h);
              h = MAX_DIM;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.60));
          } else {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Draft persistence states
  const PR_DRAFT_KEY = 'madigun_pr_creation_draft';
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Auto-restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PR_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.purpose || parsed.notes || (parsed.reqItems && parsed.reqItems.length > 0) || (parsed.draftQuotations && parsed.draftQuotations.length > 0)) {
          if (parsed.purpose) setPurpose(parsed.purpose);
          if (parsed.requestingDept) setRequestingDept(parsed.requestingDept);
          if (parsed.allocatedLocation) setAllocatedLocation(parsed.allocatedLocation);
          if (parsed.priority) setPriority(parsed.priority);
          if (parsed.notes) setNotes(parsed.notes);
          if (parsed.reqItems) setReqItems(parsed.reqItems);
          if (parsed.draftQuotations) setDraftQuotations(parsed.draftQuotations);
          setIsDraftRestored(true);
        }
      }
    } catch (err) {
      console.error("Error loading PR draft from localStorage", err);
    }
  }, []);

  // Auto-save draft on form changes so progress is never lost on crash/close
  useEffect(() => {
    if (purpose.trim() || notes.trim() || reqItems.length > 0 || draftQuotations.length > 0) {
      try {
        localStorage.setItem(PR_DRAFT_KEY, JSON.stringify({
          purpose,
          requestingDept,
          allocatedLocation,
          priority,
          notes,
          reqItems,
          draftQuotations,
          savedAt: new Date().toISOString()
        }));
      } catch (err) {
        console.error("Error saving PR draft to localStorage", err);
      }
    } else {
      localStorage.removeItem(PR_DRAFT_KEY);
    }
  }, [purpose, requestingDept, allocatedLocation, priority, notes, reqItems, draftQuotations]);

  const handleClearLocalDraft = () => {
    setPurpose('');
    setRequestingDept('KITCHEN');
    setAllocatedLocation('Main Kitchen Prep Station');
    setPriority('medium');
    setNotes('');
    setReqItems([]);
    setDraftQuotations([]);
    setCustomItemName('');
    setCustomUnit('pcs');
    setCustomUnitCost('0');
    setCustomQty('1');
    setAddItemMode('stock');
    localStorage.removeItem(PR_DRAFT_KEY);
    setIsDraftRestored(false);
  };

  const handleSaveAsSystemDraft = () => {
    setFormError(null);
    if (compiledDraftItems.length === 0 && !purpose.trim()) {
      setFormError('Please add at least one item or state a purpose to save as draft.');
      return;
    }

    setSignatureModal({
      isOpen: true,
      action: 'draft',
      reqNumber: 'New Draft PR',
      title: 'Requisition Preparer Digital Signature',
      subtitle: `Sign below as preparer to authorize and save this purchase requisition draft (${compiledDraftItems.length} item${compiledDraftItems.length !== 1 ? 's' : ''}, est. ₱${draftTotalCost.toFixed(2)}).`,
      confirmLabel: 'Confirm & Save Draft',
      rememberLabel: 'Remember & save this signature for future PR drafting',
      draftData: {
        items: compiledDraftItems,
        purpose: purpose.trim() || 'Untitled Draft Requisition',
        requestingDept,
        allocatedLocation: allocatedLocation.trim(),
        priority,
        status: 'draft',
        notes: notes.trim(),
        quotations: draftQuotations
      }
    });
  };

  // Search bar state for creating requisitions
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Edit requisition states
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<RequisitionItem[]>([]);
  const [editingPurpose, setEditingPurpose] = useState('');
  const [editingRequestingDept, setEditingRequestingDept] = useState<string>('KITCHEN');
  const [editingAllocatedLocation, setEditingAllocatedLocation] = useState<string>('');
  const [editingPriority, setEditingPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editingNotes, setEditingNotes] = useState('');
  
  // Custom Item Mode States for Edit Requisition
  const [editAddItemMode, setEditAddItemMode] = useState<'stock' | 'custom'>('stock');
  const [editCustomItemName, setEditCustomItemName] = useState('');
  const [editCustomUnit, setEditCustomUnit] = useState('pcs');
  const [editCustomUnitCost, setEditCustomUnitCost] = useState('0');
  const [editCustomQty, setEditCustomQty] = useState('1');

  // Item selector states for edit mode
  const [editSelectedItemId, setEditSelectedItemId] = useState('');
  const [editSelectedQty, setEditSelectedQty] = useState('1');
  const [editItemSearchQuery, setEditItemSearchQuery] = useState('');
  const [isEditSearchDropdownOpen, setIsEditSearchDropdownOpen] = useState(false);
  
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Item selector states (for building the list of items inside the form)
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQty, setSelectedQty] = useState('1');

  // Handle auto-populated items from dashboard "Auto-Generate PR" button
  useEffect(() => {
    if (draftAutoItems && draftAutoItems.length > 0) {
      setReqItems(draftAutoItems.map(it => {
        const dbItem = inventory.find(i => i.id === it.itemId);
        return {
          itemId: it.itemId,
          itemName: dbItem ? dbItem.name : 'Low Stock Replenishment Item',
          quantity: it.quantity,
          unit: dbItem ? dbItem.unit : 'pcs',
          unitCost: dbItem ? dbItem.unitCost : 0
        };
      }));
      setPurpose('Automated replenishment of critical low-stock supplies');
      setPriority('high');
      setIsCreating(true);
      onClearDraftAuto(); // Reset back in parent
    }
  }, [draftAutoItems, onClearDraftAuto, inventory]);

  // Helper: map selected item details
  const currentSelectedProduct = useMemo(() => {
    return inventory.find(p => p.id === selectedItemId);
  }, [selectedItemId, inventory]);

  const handleAddItemToDraft = () => {
    if (addItemMode === 'stock') {
      if (!selectedItemId) return;
      const invItem = inventory.find(i => i.id === selectedItemId);
      if (!invItem) return;
      const qty = parseFloat(selectedQty) || 1;
      if (qty <= 0) return;

      // Check if already exists in list
      const existingIndex = reqItems.findIndex(i => i.itemId === selectedItemId);
      if (existingIndex > -1) {
        const updated = [...reqItems];
        updated[existingIndex].quantity += qty;
        setReqItems(updated);
      } else {
        setReqItems([...reqItems, {
          itemId: invItem.id,
          itemName: invItem.name,
          quantity: qty,
          unit: invItem.unit,
          unitCost: invItem.unitCost
        }]);
      }

      // Reset item selector
      setSelectedItemId('');
      setSelectedQty('1');
      setItemSearchQuery('');
    } else {
      // Custom item mode
      if (!customItemName.trim()) return;
      const qty = parseFloat(customQty) || 1;
      if (qty <= 0) return;

      const newItem: RequisitionItem = {
        itemId: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemName: customItemName.trim(),
        quantity: qty,
        unit: customUnit.trim() || 'pcs',
        unitCost: parseFloat(customUnitCost) || 0
      };

      setReqItems([...reqItems, newItem]);

      setCustomItemName('');
      setCustomUnit('pcs');
      setCustomUnitCost('0');
      setCustomQty('1');
    }
  };

  const handleRemoveItemFromDraft = (index: number) => {
    const updated = [...reqItems];
    updated.splice(index, 1);
    setReqItems(updated);
  };

  // Compile final items with accurate costing captured at requisition draft time
  const compiledDraftItems = useMemo(() => {
    return reqItems.map(item => {
      const dbItem = inventory.find(i => i.id === item.itemId);
      return {
        itemId: item.itemId,
        itemName: item.itemName || (dbItem ? dbItem.name : 'Custom Item'),
        quantity: item.quantity,
        unit: item.unit || (dbItem ? dbItem.unit : 'pcs'),
        unitCost: item.unitCost !== undefined ? item.unitCost : (dbItem ? dbItem.unitCost : 0)
      };
    });
  }, [reqItems, inventory]);

  const draftTotalCost = useMemo(() => {
    return compiledDraftItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  }, [compiledDraftItems]);

  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (compiledDraftItems.length === 0) {
      setFormError('Please add at least one item to this purchase requisition.');
      return;
    }
    if (!purpose.trim()) {
      setFormError('Please fill in the purpose of this requisition.');
      return;
    }

    setSignatureModal({
      isOpen: true,
      action: 'submit',
      reqNumber: 'New PR',
      title: 'Requisition Preparer Digital Signature',
      subtitle: `Sign below as preparer to authorize and submit this purchase requisition for verification and approval (${compiledDraftItems.length} item${compiledDraftItems.length !== 1 ? 's' : ''}, Total: ₱${draftTotalCost.toFixed(2)}).`,
      confirmLabel: 'Confirm Signature & Submit PR',
      rememberLabel: 'Remember & save this signature for future PR drafting',
      draftData: {
        items: compiledDraftItems,
        purpose: purpose.trim(),
        requestingDept,
        allocatedLocation: allocatedLocation.trim(),
        priority,
        status: 'pending',
        notes: notes.trim(),
        quotations: draftQuotations
      }
    });
  };

  // Filter inventory for creation form search input with tab section filtering
  const filteredInventoryForCreate = useMemo(() => {
    let list = inventory;
    if (stockFilterSection !== 'ALL') {
      list = list.filter(item => (item.section || 'KITCHEN') === stockFilterSection);
    }
    if (!itemSearchQuery.trim()) return list;
    const q = itemSearchQuery.toLowerCase();
    return list.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q)
    );
  }, [inventory, itemSearchQuery, stockFilterSection]);

  // Filter inventory for edit form search input
  const filteredInventoryForEdit = useMemo(() => {
    if (!editItemSearchQuery.trim()) return inventory;
    const q = editItemSearchQuery.toLowerCase();
    return inventory.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q)
    );
  }, [inventory, editItemSearchQuery]);

  // Compile items currently being edited with real-time costs
  const compiledEditingItems = useMemo(() => {
    return editingItems.map(item => {
      const dbItem = inventory.find(i => i.id === item.itemId);
      return {
        itemId: item.itemId,
        itemName: item.itemName || (dbItem ? dbItem.name : 'Custom Item'),
        quantity: item.quantity,
        unit: item.unit || (dbItem ? dbItem.unit : 'pcs'),
        unitCost: item.unitCost !== undefined ? item.unitCost : (dbItem ? dbItem.unitCost : 0)
      };
    });
  }, [editingItems, inventory]);

  const editingTotalCost = useMemo(() => {
    return compiledEditingItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  }, [compiledEditingItems]);

  // Start editing a pending requisition
  const handleStartEditing = (req: Requisition) => {
    setEditingReqId(req.id);
    setEditingItems(req.items.map(it => ({
      itemId: it.itemId,
      itemName: it.itemName,
      quantity: it.quantity,
      unit: it.unit,
      unitCost: it.unitCost
    })));
    setEditingPurpose(req.purpose);
    setEditingRequestingDept(req.requestingDept || 'KITCHEN');
    setEditingAllocatedLocation(req.allocatedLocation || '');
    setEditingPriority(req.priority);
    setEditingNotes(req.notes || '');
    setEditingQuotations(req.quotations || []);
    setEditSelectedItemId('');
    setEditSelectedQty('1');
    setEditItemSearchQuery('');
    setEditCustomItemName('');
    setEditCustomUnit('pcs');
    setEditCustomUnitCost('0');
    setEditCustomQty('1');
    setEditAddItemMode('stock');
    setEditFormError(null);
  };

  // Add item inside edit mode
  const handleAddItemToEdit = () => {
    if (editAddItemMode === 'stock') {
      if (!editSelectedItemId) return;
      const invItem = inventory.find(i => i.id === editSelectedItemId);
      if (!invItem) return;
      const qty = parseFloat(editSelectedQty) || 1;
      if (qty <= 0) return;

      const existingIdx = editingItems.findIndex(it => it.itemId === editSelectedItemId);
      if (existingIdx > -1) {
        const updated = [...editingItems];
        updated[existingIdx].quantity += qty;
        setEditingItems(updated);
      } else {
        setEditingItems([...editingItems, {
          itemId: invItem.id,
          itemName: invItem.name,
          quantity: qty,
          unit: invItem.unit,
          unitCost: invItem.unitCost
        }]);
      }

      setEditSelectedItemId('');
      setEditSelectedQty('1');
      setEditItemSearchQuery('');
    } else {
      if (!editCustomItemName.trim()) return;
      const qty = parseFloat(editCustomQty) || 1;
      if (qty <= 0) return;

      const newItem: RequisitionItem = {
        itemId: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemName: editCustomItemName.trim(),
        quantity: qty,
        unit: editCustomUnit.trim() || 'pcs',
        unitCost: parseFloat(editCustomUnitCost) || 0
      };

      setEditingItems([...editingItems, newItem]);

      setEditCustomItemName('');
      setEditCustomUnit('pcs');
      setEditCustomUnitCost('0');
      setEditCustomQty('1');
    }
  };

  // Remove/Deduct item inside edit mode
  const handleRemoveItemFromEdit = (index: number) => {
    const updated = [...editingItems];
    updated.splice(index, 1);
    setEditingItems(updated);
  };

  // Update item quantity directly in the edit list
  const handleUpdateItemQtyInEdit = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...editingItems];
    updated[index].quantity = newQty;
    setEditingItems(updated);
  };

  // Save edited requisition
  const handleSaveEditedRequisition = (reqId: string) => {
    setEditFormError(null);
    if (compiledEditingItems.length === 0) {
      setEditFormError('Please add at least one item to this purchase requisition.');
      return;
    }
    if (!editingPurpose.trim()) {
      setEditFormError('Please fill in the purpose of this requisition.');
      return;
    }

    if (onUpdateRequisition) {
      onUpdateRequisition(reqId, {
        items: compiledEditingItems,
        purpose: editingPurpose.trim(),
        requestingDept: editingRequestingDept,
        allocatedLocation: editingAllocatedLocation.trim(),
        priority: editingPriority,
        notes: editingNotes.trim(),
        quotations: editingQuotations
      });
    }

    setEditingReqId(null);
  };

  const getStatusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'draft':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider font-mono">Draft</span>;
      case 'pending':
        return <span className="bg-[#FFF8E7] text-[#9E6900] border border-[#FFE8A3] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider font-mono">Pending</span>;
      case 'approved':
        return <span className="bg-[#FAF9F5] text-[#3E312C] border border-[#EBE6DD] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider font-mono">Approved</span>;
      case 'ordered':
        return <span className="bg-[#F4F2EB] text-[#3E312C] border border-[#EBE6DD] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider font-mono">Ordered</span>;
      case 'received':
        return <span className="bg-[#FAF9F5] text-[#3E312C] border border-[#EBE6DD] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider font-mono">Received</span>;
      case 'rejected':
        return <span className="bg-[#FDF2F0] text-[#3E312C] border border-[#F2DED9] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider font-mono">Rejected</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (prio: 'low' | 'medium' | 'high') => {
    switch (prio) {
      case 'high':
        return <span className="bg-[#FDF2F0] text-[#3E312C] border border-[#F2DED9] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">High</span>;
      case 'medium':
        return <span className="bg-[#FAF9F5] text-[#3E312C] border border-[#E6E4DD] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Medium</span>;
      case 'low':
        return <span className="bg-[#FAF9F5] text-[#8C7A6B] border border-[#E6E4DD] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Low</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans text-[#3E312C]" id="requisitions-tab">
      
      {/* Requisitions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-sm" id="req-header-panel">
        <div>
          <h2 className="font-serif text-2xl text-[#3E312C]">Purchase Requisitions Hub</h2>
        </div>

        <div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs px-5 py-3.5 rounded-full transition-all shadow-xs cursor-pointer"
            id="draft-requisition-btn"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? 'View Requisition List' : 'Draft Requisition'}
          </button>
        </div>
      </div>

      {/* Draft Requisition Form Panel */}
      {isCreating ? (
        <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-sm" id="req-form-container">
          <div className="border-b border-[#F0EFE9] pb-3 mb-5">
            <h3 className="font-serif text-xl text-[#3E312C]">Draft New Purchase Requisition</h3>
          </div>

          <form onSubmit={handleSubmitRequisition} className="space-y-6">
            
            {isDraftRestored && (
              <div className="bg-[#FAF9F5] border border-[#FFE8A3] text-[#3E312C] text-xs p-3.5 rounded-2xl flex items-center justify-between gap-3 font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#9E6900] shrink-0" />
                  <span><strong>Progress Restored:</strong> Your un-submitted requisition draft was auto-recovered from browser memory.</span>
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
            
            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="req-meta-form">
              <div className="lg:col-span-2">
                <label htmlFor="req-purpose" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Purpose / Event</label>
                <input
                  id="req-purpose"
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white font-medium"
                  placeholder="e.g. Replenish kitchen ingredients, Room 101 maintenance, or Event banquet"
                />
              </div>

              <div>
                <label htmlFor="req-dept" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Requesting Dept / Tab</label>
                <select
                  id="req-dept"
                  value={requestingDept}
                  onChange={(e) => setRequestingDept(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white font-semibold"
                >
                  <option value="KITCHEN">Kitchen Supplies & Food</option>
                  <option value="ROOMS">Rooms & Deployed Inventory</option>
                  <option value="HOUSEKEEPING">Housekeeping Supplies</option>
                  <option value="HOUSEKEEPING_EQUIPMENTS">Housekeeping Equipments</option>
                  <option value="HR_EQUIPMENTS">HR Department Equipments</option>
                  <option value="FO_EQUIPMENTS">Front Office Equipments</option>
                  <option value="FINANCE_EQUIPMENTS">Finance Department Equipments</option>
                  <option value="SECURITY_POST_EQUIPMENTS">Security Post Equipments</option>
                  <option value="IT_EQUIPMENTS">I.T. Department Equipments</option>
                  <option value="LINENS">Linens & Towels</option>
                  <option value="INDUSTRIAL_EQUIPMENTS">Industrial Equipments</option>
                  <option value="LUZON">Luzon</option>
                  <option value="VISAYAS">Visayas</option>
                  <option value="MINDANAO">Old H.R Office</option>
                </select>
              </div>

              <div>
                <label htmlFor="req-priority" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Priority Level</label>
                <select
                  id="req-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white font-medium"
                >
                  <option value="low">Low (Standard restock)</option>
                  <option value="medium">Medium (Regular service)</option>
                  <option value="high">High (Urgent shortages)</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="req-allocation" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Allocated / Assigned Destination</label>
                <input
                  id="req-allocation"
                  type="text"
                  value={allocatedLocation}
                  onChange={(e) => setAllocatedLocation(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white font-medium"
                  placeholder="e.g. Room 101, Junior Suite 201, Main Kitchen, Front Desk Counter, Server Room"
                />
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="req-stock-tab-filter" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Filter Stock Picker by Tab</label>
                <select
                  id="req-stock-tab-filter"
                  value={stockFilterSection}
                  onChange={(e) => setStockFilterSection(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-mono font-bold bg-[#FAF9F5] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C]"
                >
                  <option value="ALL">Show Items From All Inventory Tabs</option>
                  <option value="KITCHEN">Kitchen Tab Items Only</option>
                  <option value="ROOMS">Rooms Tab Items Only</option>
                  <option value="HOUSEKEEPING">Housekeeping Supplies Tab</option>
                  <option value="HOUSEKEEPING_EQUIPMENTS">Housekeeping Equipments Tab</option>
                  <option value="HR_EQUIPMENTS">HR Equipments Tab</option>
                  <option value="FO_EQUIPMENTS">Front Office Equipments Tab</option>
                  <option value="FINANCE_EQUIPMENTS">Finance Equipments Tab</option>
                  <option value="SECURITY_POST_EQUIPMENTS">Security Post Tab</option>
                  <option value="IT_EQUIPMENTS">I.T. Equipments Tab</option>
                  <option value="LINENS">Linens & Towels Tab</option>
                  <option value="INDUSTRIAL_EQUIPMENTS">Industrial Equipments Tab</option>
                  <option value="LUZON">Luzon Tab</option>
                  <option value="VISAYAS">Visayas Tab</option>
                  <option value="MINDANAO">Old H.R Office Tab</option>
                </select>
              </div>
            </div>

            {/* Product Selector Block */}
            <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-3 relative" id="req-product-picker">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-[#3E312C] uppercase tracking-wider">Add Item to Requisition</h4>
                
                {/* Mode Selector Toggle */}
                <div className="flex items-center bg-[#EBE6DD]/60 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAddItemMode('stock')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      addItemMode === 'stock'
                        ? 'bg-[#3E312C] text-white shadow-xs'
                        : 'text-[#8C7A6B] hover:text-[#3E312C]'
                    }`}
                  >
                    📦 Pick from Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddItemMode('custom')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      addItemMode === 'custom'
                        ? 'bg-[#3E312C] text-white shadow-xs'
                        : 'text-[#8C7A6B] hover:text-[#3E312C]'
                    }`}
                  >
                    ✨ Custom / Freeform Item
                  </button>
                </div>
              </div>

              {addItemMode === 'stock' ? (
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  {/* Searchable Product Selection */}
                  <div className="flex-1 min-w-[200px] relative">
                    <label htmlFor="picker-item-search" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Search Stock Item</label>
                    <div className="relative mt-1">
                      <input
                        id="picker-item-search"
                        type="text"
                        placeholder="Type to search stock (e.g., Tomato, Linen, Soap)..."
                        value={itemSearchQuery}
                        onChange={(e) => {
                          setItemSearchQuery(e.target.value);
                          setIsSearchDropdownOpen(true);
                          const match = inventory.find(i => i.name.toLowerCase() === e.target.value.toLowerCase());
                          if (match) {
                            setSelectedItemId(match.id);
                          } else {
                            setSelectedItemId('');
                          }
                        }}
                        onFocus={() => setIsSearchDropdownOpen(true)}
                        onBlur={() => {
                          setTimeout(() => setIsSearchDropdownOpen(false), 200);
                        }}
                        className="block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] pr-8"
                      />
                      {itemSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setItemSearchQuery('');
                            setSelectedItemId('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
                          title="Clear search selection"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Suggestions Dropdown */}
                    {isSearchDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#EBE6DD] rounded-xl shadow-lg z-50 divide-y divide-[#F0EFE9] scrollbar-thin">
                        {filteredInventoryForCreate.length > 0 ? (
                          filteredInventoryForCreate.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onMouseDown={() => {
                                setSelectedItemId(item.id);
                                setItemSearchQuery(item.name);
                                setIsSearchDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-[#FAF9F5] flex flex-col gap-0.5 ${
                                selectedItemId === item.id ? 'bg-[#F5F4EE] font-bold' : ''
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-semibold text-[#3E312C]">{item.name}</span>
                                <span className="text-[10px] bg-[#FAF9F5] border border-[#EBE6DD] px-1.5 py-0.5 rounded text-[#8C7A6B] font-mono capitalize">
                                  {item.category}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-[#8C7A6B] mt-0.5 w-full">
                                <span>Stock level: <strong className="text-[#3E312C]">{item.currentStock} {item.unit}</strong></span>
                                <span className="font-mono font-bold text-[#3E312C]">₱{item.unitCost.toFixed(2)} / {item.unit}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-xs text-center text-[#8C7A6B]">
                            No matching stock items found
                          </div>
                        )}

                        {itemSearchQuery.trim() && (
                          <button
                            type="button"
                            onMouseDown={() => {
                              setAddItemMode('custom');
                              setCustomItemName(itemSearchQuery);
                              setIsSearchDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2.5 text-xs bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-bold border-t border-amber-200/60 flex items-center gap-2 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                            <span>Add &quot;<strong>{itemSearchQuery}</strong>&quot; as a Custom / Unlisted Item</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="w-full sm:w-28">
                    <label htmlFor="picker-qty" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Quantity</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        id="picker-qty"
                        type="number"
                        step="any"
                        min="0.1"
                        value={selectedQty}
                        onChange={(e) => setSelectedQty(e.target.value)}
                        className="block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-mono font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C]"
                      />
                      <span className="text-xs text-[#8C7A6B] font-mono font-semibold">
                        {currentSelectedProduct ? currentSelectedProduct.unit : ''}
                      </span>
                    </div>
                  </div>

                  {/* Add Button */}
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
              ) : (
                /* FREEFORM / CUSTOM ITEM INPUT MODE */
                <div className="space-y-3 bg-white p-3.5 rounded-xl border border-[#EBE6DD]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    {/* Item Name */}
                    <div className="sm:col-span-2 md:col-span-1">
                      <label htmlFor="custom-item-name" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Item Name *</label>
                      <input
                        id="custom-item-name"
                        type="text"
                        placeholder="e.g. Special Banquet Table, Custom Signage..."
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-semibold bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label htmlFor="custom-item-qty" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Quantity *</label>
                      <input
                        id="custom-item-qty"
                        type="number"
                        step="any"
                        min="0.1"
                        value={customQty}
                        onChange={(e) => setCustomQty(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-mono font-bold bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label htmlFor="custom-item-unit" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Unit / Measure</label>
                      <input
                        id="custom-item-unit"
                        type="text"
                        placeholder="e.g. pcs, kg, box, set, pack, roll..."
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                      />
                    </div>

                    {/* Unit Cost */}
                    <div>
                      <label htmlFor="custom-item-cost" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Est. Rate / Unit Cost (₱)</label>
                      <input
                        id="custom-item-cost"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={customUnitCost}
                        onChange={(e) => setCustomUnitCost(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-mono font-bold bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                      />
                    </div>
                  </div>

                  {/* Quick Unit Presets & Submit */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-[#8C7A6B] font-mono font-bold">Quick Units:</span>
                      {['pcs', 'kg', 'box', 'set', 'pack', 'bottle', 'roll', 'liter', 'bag'].map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setCustomUnit(u)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-colors ${
                            customUnit === u 
                              ? 'bg-[#3E312C] text-white border-[#3E312C]' 
                              : 'bg-[#FAF9F5] text-[#8C7A6B] border-[#EBE6DD] hover:border-[#3E312C]'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItemToDraft}
                      disabled={!customItemName.trim()}
                      className={`px-5 py-2 border rounded-full text-xs font-semibold cursor-pointer transition-colors shrink-0 ${
                        customItemName.trim()
                          ? 'bg-[#3E312C] text-white border-[#3E312C] hover:bg-[#2C211F]'
                          : 'bg-[#FAF9F5] text-[#8C7A6B]/50 border-[#EBE6DD] cursor-not-allowed'
                      }`}
                    >
                      Add Custom Item
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List of items in draft */}
            <div className="border border-[#EBE6DD] rounded-2xl overflow-hidden bg-white" id="req-draft-items-list">
              <div className="px-4 py-2.5 bg-[#FAF9F5] border-b border-[#EBE6DD] flex justify-between items-center">
                <span className="text-xs font-bold text-[#3E312C]">Selected Products Checklist ({compiledDraftItems.length})</span>
                <span className="text-xs text-[#8C7A6B] font-bold uppercase tracking-wider font-mono">Captured Costing Summary</span>
              </div>

              {compiledDraftItems.length > 0 ? (
                <div className="divide-y divide-[#F0EFE9]">
                  {compiledDraftItems.map((item, index) => {
                    const lineCost = item.quantity * item.unitCost;
                    return (
                      <div key={item.itemId} className="px-4 py-3 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#3E312C]">{item.itemName}</p>
                          <div className="text-[#8C7A6B] font-mono text-[10px] flex items-center gap-1.5">
                            <span>Qty: <strong className="text-[#3E312C]">{item.quantity} {item.unit}</strong></span>
                            <span>•</span>
                            <span>Rate: ₱{item.unitCost.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 font-mono">
                          <span className="font-bold text-[#3E312C]">₱{lineCost.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromDraft(index)}
                            className="text-[#3E312C] hover:text-[#A65D46] p-1.5 rounded-lg hover:bg-[#FDF2F0] cursor-pointer transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Total row */}
                  <div className="px-4 py-3.5 bg-[#FAF9F5] flex justify-between items-center text-sm font-bold text-[#3E312C] border-t border-[#EBE6DD]">
                    <span>Estimated Cost Summary:</span>
                    <span className="text-base font-serif font-extrabold text-[#3E312C] font-mono">₱{draftTotalCost.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-[#8C7A6B] text-xs flex flex-col items-center gap-2">
                  <ShoppingBag className="h-8 w-8 text-[#D1C4B5]" />
                  <span>No products added yet. Pick from the dropdown menu above.</span>
                </div>
              )}
            </div>

            {/* Note block */}
            <div>
              <label htmlFor="req-notes" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Internal Notes / Delivery Instructions</label>
              <textarea
                id="req-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white"
                placeholder="e.g. Deliver to main receiving area. Contact supplier distributor on arrival."
              />
            </div>

            {/* Supplier Quotation Images Attachment Block */}
            <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-3" id="req-draft-quotations-block">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[#3E312C] uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-[#8C7A6B]" />
                    Supplier Quotations & Price Quotes
                  </h4>
                  <p className="text-[11px] text-[#8C7A6B]">Upload supplier price quotes or item quotations for approval verification.</p>
                </div>
                <label className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-2xs">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isUploadingQuotation ? 'Uploading...' : 'Upload Quotations'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploadingQuotation}
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setIsUploadingQuotation(true);
                      try {
                        const fileList = Array.from(files) as File[];
                        const results = await Promise.all(
                          fileList.map(file => processQuotationFile(file).catch(err => {
                            console.error("Error loading quotation image:", err);
                            return null;
                          }))
                        );
                        const newQuotes = results.filter((r): r is string => !!r);
                        if (newQuotes.length > 0) {
                          setDraftQuotations(prev => [...prev, ...newQuotes]);
                        }
                      } finally {
                        setIsUploadingQuotation(false);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {draftQuotations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                  {draftQuotations.map((imgUrl, idx) => (
                    <div key={idx} className="relative group rounded-xl border border-[#EBE6DD] overflow-hidden bg-white aspect-square shadow-xs">
                      <img src={imgUrl} alt={`Quotation ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-[#3E312C]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                        <button
                          type="button"
                          onClick={() => setPreviewQuotationUrl(imgUrl)}
                          className="p-1.5 bg-white text-[#3E312C] rounded-lg hover:bg-[#FAF9F5] cursor-pointer shadow-xs"
                          title="Inspect full image"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraftQuotations(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer shadow-xs"
                          title="Remove quotation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-dashed border-[#D1C4B5] rounded-xl text-center text-[#8C7A6B] text-xs">
                  No supplier quotation attached yet. Click 'Upload Quotations' to attach price quotes.
                </div>
              )}
            </div>

            {formError && (
              <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form actions */}
            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-[#F0EFE9]">
              <button
                type="button"
                onClick={() => {
                  handleClearLocalDraft();
                  setIsCreating(false);
                }}
                className="px-5 py-2.5 border border-[#EBE6DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
              >
                Discard / Clear
              </button>
              <button
                type="button"
                onClick={handleSaveAsSystemDraft}
                className="px-5 py-2.5 bg-[#FAF9F5] hover:bg-[#F0EFE9] text-[#3E312C] border border-[#EBE6DD] font-bold text-xs rounded-full cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5 text-[#8C7A6B]" />
                Save as Draft
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-bold text-xs rounded-full cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Requisition
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* Requisitions History List */
        <div className="bg-white border border-[#EBE6DD] rounded-[32px] shadow-sm overflow-hidden" id="req-history-container">
          <div className="p-5 border-b border-[#F0EFE9] bg-[#FAF9F5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-extrabold text-[#8C7A6B] uppercase tracking-wider font-mono">All Requisitions Log</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReportOpen(true);
                }}
                className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-bold px-4 py-2 rounded-full cursor-pointer transition-all shadow-2xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
                Generate Summary Report
              </button>
              <span className="text-[10px] text-[#8C7A6B] bg-white border border-[#EBE6DD] px-3 py-2 rounded-full font-mono font-bold">
                PR Count: {subTab === 'active' ? activeRequisitions.length : deletedRequisitions.length}
              </span>
            </div>
          </div>

          {/* Sub Tab Switcher & Status Log Header */}
          <div className="px-6 py-3 border-b border-[#F0EFE9] bg-[#FAF9F5]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex bg-[#F4F2EB] p-1 rounded-full border border-[#EBE6DD] w-full sm:w-auto" id="requisition-sub-tabs">
              <button
                type="button"
                onClick={() => {
                  setSubTab('active');
                  setExpandedId(null);
                }}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all text-center ${
                  subTab === 'active'
                    ? 'bg-[#3E312C] text-white shadow-xs'
                    : 'text-[#8C7A6B] hover:text-[#3E312C]'
                }`}
              >
                Active ({activeRequisitions.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubTab('deleted');
                  setExpandedId(null);
                }}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all text-center ${
                  subTab === 'deleted'
                    ? 'bg-[#3E312C] text-white shadow-xs'
                    : 'text-[#8C7A6B] hover:text-[#3E312C]'
                }`}
              >
                Recycle Bin ({deletedRequisitions.length})
              </button>
            </div>
            
            <div className="text-[10px] text-[#8C7A6B] font-medium font-mono text-right shrink-0">
              {subTab === 'active' ? (
                <span>ACTIVE PROCESS BOARD</span>
              ) : (
                <span className="text-red-700 font-bold bg-red-50 border border-red-200/50 px-2.5 py-1 rounded-md">DELETED LOGS & RECOVERY BIN</span>
              )}
            </div>
          </div>

          {/* Search & Filter Toolbar for Back Tracing */}
          <div className="p-4 border-b border-[#F0EFE9] bg-[#FAF9F5]/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3" id="pr-search-toolbar">
            {/* Search Input Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7A6B] pointer-events-none" />
              <input
                id="pr-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PR title / purpose, PR #, item name, requestor, dept..."
                className="w-full bg-white border border-[#EBE6DD] rounded-xl pl-10 pr-9 py-2 text-xs font-medium text-[#3E312C] placeholder-[#8C7A6B]/70 focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="pr-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8C7A6B] hover:text-[#3E312C] hover:bg-[#EBE6DD] rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-[#EBE6DD] rounded-xl px-2.5 py-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-[#8C7A6B] uppercase font-mono">Status:</span>
                <select
                  id="pr-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#3E312C] focus:outline-hidden cursor-pointer pr-1"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified by Purchaser</option>
                  <option value="approved">Approved</option>
                  <option value="received">Completed / Received</option>
                  <option value="rejected">Rejected</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-[#EBE6DD] rounded-xl px-2.5 py-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-[#8C7A6B] uppercase font-mono">Dept:</span>
                <select
                  id="pr-dept-filter"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#3E312C] focus:outline-hidden cursor-pointer pr-1"
                >
                  <option value="all">All Depts</option>
                  {availableDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Reset Filters button if any active */}
              {(searchQuery || statusFilter !== 'all' || deptFilter !== 'all') && (
                <button
                  type="button"
                  id="pr-reset-filters-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setDeptFilter('all');
                  }}
                  className="text-xs font-bold text-[#8C7A6B] hover:text-[#3E312C] bg-[#EBE6DD]/60 hover:bg-[#EBE6DD] px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {displayedRequisitions.length > 0 ? (
            <div className="divide-y divide-[#F0EFE9]" id="requisitions-accordion-list">
              {displayedRequisitions.map((req) => {
                const isExpanded = expandedId === req.id;
                const formattedDate = new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <div key={req.id} className="border-l-4 border-l-[#3E312C]">
                    {/* Collapsed Header */}
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAF9F5] transition-colors cursor-pointer select-none"
                    >
                      {/* Main Details */}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono font-extrabold text-[#3E312C] text-sm bg-[#FAF9F5] px-2.5 py-0.5 rounded-lg border border-[#EBE6DD]">{req.requisitionNumber}</span>
                          <span className="text-[#3E312C] font-serif text-base truncate max-w-xs">{req.purpose}</span>
                          {getPriorityBadge(req.priority)}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#8C7A6B] flex-wrap mt-1">
                          <span className="font-semibold text-[#3E312C]">{req.createdByName}</span>
                          <span>•</span>
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>{req.items.length} supply line{req.items.length !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span className="bg-[#FAF9F5] border border-[#EBE6DD] text-[#3E312C] px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                            DEPT: {req.requestingDept || 'KITCHEN'}
                          </span>
                          {req.allocatedLocation && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                              ALLOCATED: {req.allocatedLocation}
                            </span>
                          )}
                          {req.checkedBy && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300/80 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold flex items-center gap-1">
                              <FileCheck className="h-3 w-3 text-emerald-600" />
                              VERIFIED BY PURCHASER ({req.checkedByName})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                        <div className="text-right space-y-0.5">
                          <p className="text-[10px] text-[#8C7A6B] font-mono leading-none">Total cost</p>
                          <span className="font-mono font-bold text-sm text-[#3E312C]">₱{req.totalCost.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          {getStatusBadge(req.status)}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-[#8C7A6B]" /> : <ChevronDown className="h-4 w-4 text-[#8C7A6B]" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Drawer Area */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 bg-[#FAF9F5] border-t border-[#F0EFE9] animate-in fade-in slide-in-from-top-1 duration-100 space-y-4" id={`expanded-req-${req.id}`}>
                        
                        {editingReqId === req.id ? (
                          /* EDITING MODE FOR PENDING REQUISITIONS */
                          <div className="bg-white border border-[#EBE6DD] rounded-2xl p-5 space-y-4 shadow-xs" id={`editing-container-${req.id}`} onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center border-b border-[#F0EFE9] pb-3">
                              <h3 className="text-xs font-extrabold text-[#3E312C] uppercase tracking-wider font-mono flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
                                Editing Requisition Draft: {req.requisitionNumber}
                              </h3>
                              <span className="text-[10px] text-[#8C7A6B] font-bold font-mono">STATUS: PENDING APPROVED</span>
                            </div>

                            {/* Form inputs: Purpose, Requesting Dept, Allocated Location, Priority */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="lg:col-span-2">
                                <label className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Purpose / Remarks</label>
                                <input
                                  type="text"
                                  value={editingPurpose}
                                  onChange={(e) => setEditingPurpose(e.target.value)}
                                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white font-medium"
                                  placeholder="Purpose of this purchase requisition"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Requesting Dept / Tab</label>
                                <select
                                  value={editingRequestingDept}
                                  onChange={(e) => setEditingRequestingDept(e.target.value)}
                                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white font-semibold"
                                >
                                  <option value="KITCHEN">Kitchen Supplies & Food</option>
                                  <option value="ROOMS">Rooms & Deployed Inventory</option>
                                  <option value="HOUSEKEEPING">Housekeeping Supplies</option>
                                  <option value="HOUSEKEEPING_EQUIPMENTS">Housekeeping Equipments</option>
                                  <option value="HR_EQUIPMENTS">HR Department Equipments</option>
                                  <option value="FO_EQUIPMENTS">Front Office Equipments</option>
                                  <option value="FINANCE_EQUIPMENTS">Finance Department Equipments</option>
                                  <option value="SECURITY_POST_EQUIPMENTS">Security Post Equipments</option>
                                  <option value="IT_EQUIPMENTS">I.T. Department Equipments</option>
                                  <option value="LINENS">Linens & Towels</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Priority Level</label>
                                <select
                                  value={editingPriority}
                                  onChange={(e) => setEditingPriority(e.target.value as any)}
                                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white"
                                >
                                  <option value="low">Low (Standard restock)</option>
                                  <option value="medium">Medium (Regular service)</option>
                                  <option value="high">High (Urgent shortages)</option>
                                </select>
                              </div>
                              <div className="lg:col-span-4">
                                <label className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Allocated / Assigned Destination</label>
                                <input
                                  type="text"
                                  value={editingAllocatedLocation}
                                  onChange={(e) => setEditingAllocatedLocation(e.target.value)}
                                  className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white font-medium"
                                  placeholder="e.g. Room 101, Main Kitchen, Front Office Counter"
                                />
                              </div>
                            </div>

                            {/* Item Selection Block (Search-and-Select autocomplete) */}
                            <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-3 relative" id="edit-product-picker">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4 className="text-xs font-bold text-[#3E312C] uppercase tracking-wider">Add Supply to Draft</h4>
                                
                                {/* Mode Selector Toggle */}
                                <div className="flex items-center bg-[#EBE6DD]/60 p-1 rounded-xl text-[11px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => setEditAddItemMode('stock')}
                                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                      editAddItemMode === 'stock'
                                        ? 'bg-[#3E312C] text-white shadow-xs'
                                        : 'text-[#8C7A6B] hover:text-[#3E312C]'
                                    }`}
                                  >
                                    📦 Pick from Stock
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditAddItemMode('custom')}
                                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                      editAddItemMode === 'custom'
                                        ? 'bg-[#3E312C] text-white shadow-xs'
                                        : 'text-[#8C7A6B] hover:text-[#3E312C]'
                                    }`}
                                  >
                                    ✨ Custom / Freeform Item
                                  </button>
                                </div>
                              </div>
                              
                              {editAddItemMode === 'stock' ? (
                                <div className="flex flex-col sm:flex-row gap-3 items-end">
                                  {/* Search Input */}
                                  <div className="flex-1 min-w-[200px] relative">
                                    <label htmlFor="edit-item-search" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Search Stock Item</label>
                                    <div className="relative mt-1">
                                      <input
                                        id="edit-item-search"
                                        type="text"
                                        placeholder="Type to search (e.g. Tomato, Linen)..."
                                        value={editItemSearchQuery}
                                        onChange={(e) => {
                                          setEditItemSearchQuery(e.target.value);
                                          setIsEditSearchDropdownOpen(true);
                                          const match = inventory.find(i => i.name.toLowerCase() === e.target.value.toLowerCase());
                                          if (match) {
                                            setEditSelectedItemId(match.id);
                                          } else {
                                            setEditSelectedItemId('');
                                          }
                                        }}
                                        onFocus={() => setIsEditSearchDropdownOpen(true)}
                                        onBlur={() => {
                                          setTimeout(() => setIsEditSearchDropdownOpen(false), 200);
                                        }}
                                        className="block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] pr-8"
                                      />
                                      {editItemSearchQuery && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditItemSearchQuery('');
                                            setEditSelectedItemId('');
                                          }}
                                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>

                                    {/* Autocomplete Dropdown */}
                                    {isEditSearchDropdownOpen && (
                                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[#EBE6DD] rounded-xl shadow-lg z-50 divide-y divide-[#F0EFE9] scrollbar-thin">
                                        {filteredInventoryForEdit.length > 0 ? (
                                          filteredInventoryForEdit.map(item => (
                                            <button
                                              key={item.id}
                                              type="button"
                                              onMouseDown={() => {
                                                setEditSelectedItemId(item.id);
                                                setEditItemSearchQuery(item.name);
                                                setIsEditSearchDropdownOpen(false);
                                              }}
                                              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#FAF9F5] flex flex-col gap-0.5 ${
                                                editSelectedItemId === item.id ? 'bg-[#F5F4EE] font-bold' : ''
                                              }`}
                                            >
                                              <div className="flex justify-between items-center w-full">
                                                <span className="font-semibold text-[#3E312C]">{item.name}</span>
                                                <span className="text-[10px] text-[#8C7A6B] font-mono">{item.category}</span>
                                              </div>
                                              <div className="flex justify-between items-center text-[10px] text-[#8C7A6B] w-full">
                                                <span>Stock: {item.currentStock} {item.unit}</span>
                                                <span className="font-mono">₱{item.unitCost.toFixed(2)} / {item.unit}</span>
                                              </div>
                                            </button>
                                          ))
                                        ) : (
                                          <div className="px-3 py-3 text-xs text-center text-[#8C7A6B]">
                                            No matching items found
                                          </div>
                                        )}

                                        {editItemSearchQuery.trim() && (
                                          <button
                                            type="button"
                                            onMouseDown={() => {
                                              setEditAddItemMode('custom');
                                              setEditCustomItemName(editItemSearchQuery);
                                              setIsEditSearchDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-bold border-t border-amber-200/60 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Plus className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                                            <span>Add &quot;<strong>{editItemSearchQuery}</strong>&quot; as a Custom / Unlisted Item</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Quantity */}
                                  <div className="w-full sm:w-24">
                                    <label className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Quantity</label>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0.1"
                                        value={editSelectedQty}
                                        onChange={(e) => setEditSelectedQty(e.target.value)}
                                        className="block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-mono font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C]"
                                      />
                                    </div>
                                  </div>

                                  {/* Add Button */}
                                  <button
                                    type="button"
                                    onClick={handleAddItemToEdit}
                                    disabled={!editSelectedItemId}
                                    className={`px-4 py-2 border rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                                      editSelectedItemId 
                                        ? 'bg-[#3E312C] text-white border-[#3E312C] hover:bg-[#2C211F]' 
                                        : 'bg-[#FAF9F5] text-[#8C7A6B]/50 border-[#EBE6DD] cursor-not-allowed'
                                    }`}
                                  >
                                    Add Item
                                  </button>
                                </div>
                              ) : (
                                /* FREEFORM / CUSTOM ITEM INPUT MODE FOR EDIT */
                                <div className="space-y-3 bg-white p-3.5 rounded-xl border border-[#EBE6DD]">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                                    {/* Item Name */}
                                    <div className="sm:col-span-2 md:col-span-1">
                                      <label htmlFor="edit-custom-item-name" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Item Name *</label>
                                      <input
                                        id="edit-custom-item-name"
                                        type="text"
                                        placeholder="e.g. Special Banquet Table, Custom Signage..."
                                        value={editCustomItemName}
                                        onChange={(e) => setEditCustomItemName(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-semibold bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                                      />
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                      <label htmlFor="edit-custom-item-qty" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Quantity *</label>
                                      <input
                                        id="edit-custom-item-qty"
                                        type="number"
                                        step="any"
                                        min="0.1"
                                        value={editCustomQty}
                                        onChange={(e) => setEditCustomQty(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-mono font-bold bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                                      />
                                    </div>

                                    {/* Unit */}
                                    <div>
                                      <label htmlFor="edit-custom-item-unit" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Unit / Measure</label>
                                      <input
                                        id="edit-custom-item-unit"
                                        type="text"
                                        placeholder="e.g. pcs, kg, box, set, pack..."
                                        value={editCustomUnit}
                                        onChange={(e) => setEditCustomUnit(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                                      />
                                    </div>

                                    {/* Unit Cost */}
                                    <div>
                                      <label htmlFor="edit-custom-item-cost" className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Est. Rate / Unit Cost (₱)</label>
                                      <input
                                        id="edit-custom-item-cost"
                                        type="number"
                                        step="any"
                                        min="0"
                                        placeholder="0.00"
                                        value={editCustomUnitCost}
                                        onChange={(e) => setEditCustomUnitCost(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs font-mono font-bold bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                                      />
                                    </div>
                                  </div>

                                  {/* Quick Unit Presets & Submit */}
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] text-[#8C7A6B] font-mono font-bold">Quick Units:</span>
                                      {['pcs', 'kg', 'box', 'set', 'pack', 'bottle', 'roll', 'liter', 'bag'].map(u => (
                                        <button
                                          key={u}
                                          type="button"
                                          onClick={() => setEditCustomUnit(u)}
                                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-colors ${
                                            editCustomUnit === u 
                                              ? 'bg-[#3E312C] text-white border-[#3E312C]' 
                                              : 'bg-[#FAF9F5] text-[#8C7A6B] border-[#EBE6DD] hover:border-[#3E312C]'
                                          }`}
                                        >
                                          {u}
                                        </button>
                                      ))}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={handleAddItemToEdit}
                                      disabled={!editCustomItemName.trim()}
                                      className={`px-5 py-2 border rounded-full text-xs font-semibold cursor-pointer transition-colors shrink-0 ${
                                        editCustomItemName.trim()
                                          ? 'bg-[#3E312C] text-white border-[#3E312C] hover:bg-[#2C211F]'
                                          : 'bg-[#FAF9F5] text-[#8C7A6B]/50 border-[#EBE6DD] cursor-not-allowed'
                                      }`}
                                    >
                                      Add Custom Item
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* List of items in editing items list */}
                            <div className="border border-[#EBE6DD] rounded-2xl overflow-hidden bg-white">
                              <div className="px-4 py-2 bg-[#FAF9F5] border-b border-[#EBE6DD] flex justify-between items-center">
                                <span className="text-xs font-bold text-[#3E312C]">Selected Items ({compiledEditingItems.length})</span>
                                <span className="text-xs text-[#8C7A6B] font-bold font-mono">Captured Costs</span>
                              </div>

                              {compiledEditingItems.length > 0 ? (
                                <div className="divide-y divide-[#F0EFE9]">
                                  {compiledEditingItems.map((item, index) => {
                                    const lineCost = item.quantity * item.unitCost;
                                    return (
                                      <div key={item.itemId} className="px-4 py-2.5 flex items-center justify-between text-xs">
                                        <div className="flex-1 space-y-0.5">
                                          <span className="font-bold text-[#3E312C]">{item.itemName}</span>
                                          <div className="flex items-center gap-2 text-[10px] text-[#8C7A6B] font-mono">
                                            <span>Rate: ₱{item.unitCost.toFixed(2)}</span>
                                            <span>•</span>
                                            <span>Unit: {item.unit}</span>
                                          </div>
                                        </div>

                                        {/* Direct Quantity editing inside the list */}
                                        <div className="flex items-center gap-4">
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateItemQtyInEdit(index, Math.max(0.1, item.quantity - 1))}
                                              className="w-6 h-6 rounded-full border border-[#EBE6DD] flex items-center justify-center font-bold text-xs hover:bg-[#FAF9F5] cursor-pointer"
                                            >
                                              -
                                            </button>
                                            <input
                                              type="number"
                                              step="any"
                                              min="0.1"
                                              value={item.quantity}
                                              onChange={(e) => handleUpdateItemQtyInEdit(index, parseFloat(e.target.value) || 0.1)}
                                              className="w-12 text-center font-bold text-xs border border-[#EBE6DD] rounded-md py-0.5 font-mono"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateItemQtyInEdit(index, item.quantity + 1)}
                                              className="w-6 h-6 rounded-full border border-[#EBE6DD] flex items-center justify-center font-bold text-xs hover:bg-[#FAF9F5] cursor-pointer"
                                            >
                                              +
                                            </button>
                                          </div>

                                          <span className="font-mono font-bold text-[#3E312C] w-16 text-right">₱{lineCost.toFixed(2)}</span>

                                          <button
                                            type="button"
                                            onClick={() => handleRemoveItemFromEdit(index)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-md cursor-pointer transition-colors"
                                            title="Deduct/Remove item"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {/* Total row */}
                                  <div className="px-4 py-3 bg-[#FAF9F5] flex justify-between items-center text-xs font-bold text-[#3E312C] border-t border-[#EBE6DD]">
                                    <span>Total Valuation:</span>
                                    <span className="text-sm font-extrabold text-[#3E312C] font-mono">₱{editingTotalCost.toFixed(2)}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-8 text-center text-[#8C7A6B] text-xs">
                                  No items added. Use the item search box above to add supplies.
                                </div>
                              )}
                            </div>

                            {/* Notes */}
                            <div>
                              <label className="block text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">Delivery notes / Instructions</label>
                              <textarea
                                rows={2}
                                value={editingNotes}
                                onChange={(e) => setEditingNotes(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-[#3E312C] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C] bg-white"
                                placeholder="Delivery details"
                              />
                            </div>

                            {/* Supplier Quotation Attachments Block in Edit Mode */}
                            <div className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-3" id="req-edit-quotations-block">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <h4 className="text-xs font-bold text-[#3E312C] uppercase tracking-wider flex items-center gap-1.5">
                                    <Paperclip className="h-4 w-4 text-[#8C7A6B]" />
                                    Supplier Quotations & Price Quotes
                                  </h4>
                                  <p className="text-[11px] text-[#8C7A6B]">Manage attached supplier quotations or price estimates.</p>
                                </div>
                                <label className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-2xs">
                                  <Upload className="h-3.5 w-3.5" />
                                  <span>{isUploadingQuotation ? 'Uploading...' : 'Upload Quotations'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={isUploadingQuotation}
                                    onChange={async (e) => {
                                      const files = e.target.files;
                                      if (!files || files.length === 0) return;
                                      setIsUploadingQuotation(true);
                                      try {
                                        const fileList = Array.from(files) as File[];
                                        const results = await Promise.all(
                                          fileList.map(file => processQuotationFile(file).catch(err => {
                                            console.error("Error loading quotation image:", err);
                                            return null;
                                          }))
                                        );
                                        const newQuotes = results.filter((r): r is string => !!r);
                                        if (newQuotes.length > 0) {
                                          setEditingQuotations(prev => [...prev, ...newQuotes]);
                                        }
                                      } finally {
                                        setIsUploadingQuotation(false);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              {editingQuotations.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                                  {editingQuotations.map((imgUrl, idx) => (
                                    <div key={idx} className="relative group rounded-xl border border-[#EBE6DD] overflow-hidden bg-white aspect-square shadow-xs">
                                      <img src={imgUrl} alt={`Quotation ${idx + 1}`} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-[#3E312C]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewQuotationUrl(imgUrl)}
                                          className="p-1.5 bg-white text-[#3E312C] rounded-lg hover:bg-[#FAF9F5] cursor-pointer shadow-xs"
                                          title="Inspect full image"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingQuotations(prev => prev.filter((_, i) => i !== idx))}
                                          className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer shadow-xs"
                                          title="Remove quotation"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 border border-dashed border-[#D1C4B5] rounded-xl text-center text-[#8C7A6B] text-xs">
                                  No supplier quotation attached yet. Click 'Upload Quotations' to attach price quotes.
                                </div>
                              )}
                            </div>

                            {editFormError && (
                              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                                {editFormError}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 border-t border-[#F0EFE9] pt-3">
                              <button
                                type="button"
                                onClick={() => setEditingReqId(null)}
                                className="px-4 py-2 border border-[#EBE6DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedRequisition(req.id)}
                                className="px-4 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* READ ONLY VIEW MODE */
                          <>
                            {/* Table of items */}
                            <div className="border border-[#EBE6DD] rounded-2xl bg-white overflow-hidden" id="expanded-items-grid">
                              <table className="min-w-full divide-y divide-[#F0EFE9] text-xs text-[#3E312C]">
                                <thead className="bg-[#FAF9F5] font-bold text-[#8C7A6B] text-[10px] uppercase font-mono">
                                  <tr>
                                    <th scope="col" className="px-4 py-2.5 text-left">Product Item</th>
                                    <th scope="col" className="px-4 py-2.5 text-left">Quantity Requested</th>
                                    {req.status === 'received' && (
                                      <th scope="col" className="px-4 py-2.5 text-left">Purchased & Restocked</th>
                                    )}
                                    <th scope="col" className="px-4 py-2.5 text-left">Rate</th>
                                    <th scope="col" className="px-4 py-2.5 text-right">Extended Value</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F0EFE9]">
                                  {req.items.map((it) => {
                                    const ext = it.quantity * it.unitCost;
                                    const receivedItem = req.receivedItems?.find(ri => 
                                      (ri.itemId && ri.itemId === it.itemId) || 
                                      (ri.itemName && ri.itemName.trim().toLowerCase() === it.itemName.trim().toLowerCase())
                                    );
                                    const isPurchased = req.status === 'received' 
                                      ? (req.receivedItems !== undefined ? (receivedItem && (receivedItem.quantity || 0) > 0) : true) 
                                      : false;
                                    const actualQty = receivedItem ? receivedItem.quantity : it.quantity;
                                    const actualPrice = receivedItem 
                                      ? (typeof receivedItem.actualUnitCost === 'number' ? receivedItem.actualUnitCost : (typeof receivedItem.unitCost === 'number' ? receivedItem.unitCost : it.unitCost))
                                      : it.unitCost;
                                    const actualExt = actualQty * actualPrice;
                                    const priceDiff = actualPrice - it.unitCost;
                                    const hasPriceChange = Math.abs(priceDiff) > 0.009;

                                    return (
                                      <tr key={it.itemId} className={req.status === 'received' && !isPurchased ? 'bg-stone-50/60 opacity-75' : ''}>
                                        <td className="px-4 py-3 font-semibold text-[#3E312C]">
                                          <div>{it.itemName}</div>
                                          {req.status === 'received' && !isPurchased && (
                                            <span className="text-[10px] font-bold text-[#8C7A6B] bg-stone-200/70 px-1.5 py-0.5 rounded">Not Purchased (Excluded from inventory)</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 font-mono font-bold">{it.quantity} {it.unit}</td>
                                        {req.status === 'received' && (
                                          <td className="px-4 py-3">
                                            {isPurchased ? (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                                <Check className="h-3 w-3" /> {actualQty} {it.unit} Restocked
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded-full">
                                                <X className="h-3 w-3" /> 0 {it.unit} (Skipped)
                                              </span>
                                            )}
                                          </td>
                                        )}
                                        <td className="px-4 py-3 font-mono">
                                          {req.status === 'received' && isPurchased ? (
                                            <div>
                                              <div className="font-bold text-emerald-900">₱{actualPrice.toFixed(2)}</div>
                                              {hasPriceChange ? (
                                                <div className="text-[10px] flex items-center gap-1 mt-0.5 flex-wrap">
                                                  <span className="text-[#8C7A6B] line-through">₱{it.unitCost.toFixed(2)}</span>
                                                  <span className={`font-semibold px-1 py-0.2 rounded text-[9px] ${
                                                    priceDiff > 0 ? 'text-amber-800 bg-amber-100' : 'text-emerald-800 bg-emerald-100'
                                                  }`}>
                                                    {priceDiff > 0 ? `+₱${priceDiff.toFixed(2)}` : `-₱${Math.abs(priceDiff).toFixed(2)}`}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-[10px] text-[#8C7A6B]">(Matched PR)</span>
                                              )}
                                            </div>
                                          ) : (
                                            <span>₱{it.unitCost.toFixed(2)}</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold">
                                          {req.status === 'received' && isPurchased ? (
                                            <div>
                                              <div className="text-emerald-900">₱{actualExt.toFixed(2)}</div>
                                              {(Math.abs(actualExt - ext) > 0.009) && (
                                                <div className="text-[10px] text-[#8C7A6B] font-normal line-through">₱{ext.toFixed(2)}</div>
                                              )}
                                            </div>
                                          ) : (
                                            <span>₱{ext.toFixed(2)}</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {/* Summary */}
                                  <tr className="bg-[#FAF9F5] font-bold text-[#3E312C]">
                                    <td colSpan={req.status === 'received' ? 4 : 3} className="px-4 py-3 text-right">Requested PR Valuation:</td>
                                    <td className="px-4 py-3 text-right font-mono text-base font-extrabold text-[#3E312C]">₱{req.totalCost.toFixed(2)}</td>
                                  </tr>
                                  {req.status === 'received' && req.receivedItems !== undefined && (
                                    <tr className="bg-emerald-50/70 font-bold text-emerald-950 border-t border-emerald-200">
                                      <td colSpan={4} className="px-4 py-3 text-right text-xs">
                                        <span className="inline-flex items-center gap-1.5">
                                          <PackageCheck className="h-4 w-4 text-emerald-700" />
                                          Actual Inventory Restock Valuation ({req.receivedItems.filter(i => (i.quantity || 0) > 0).length} of {req.items.length} items purchased):
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-base font-extrabold text-emerald-800">
                                        ₱{req.receivedItems.reduce((sum, it) => sum + ((it.quantity || 0) * (typeof it.actualUnitCost === 'number' ? it.actualUnitCost : (it.unitCost || 0))), 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Audit Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" id="expanded-meta-details">
                              <div className="space-y-3">
                                <div className="p-4 bg-white border border-[#EBE6DD] rounded-2xl space-y-2">
                                  <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold tracking-wider">Department & Allocation Target</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-[10px] text-[#8C7A6B] font-mono block uppercase">Requesting Dept</span>
                                      <span className="font-bold text-[#3E312C]">{req.requestingDept || 'KITCHEN'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-[#8C7A6B] font-mono block uppercase">Allocated Destination</span>
                                      <span className="font-bold text-[#3E312C]">{req.allocatedLocation || 'General Allocation'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold tracking-wider">Internal Staff Notes</p>
                                  <p className="p-4 bg-white border border-[#EBE6DD] rounded-2xl text-[#3E312C] leading-relaxed font-medium">
                                    {req.notes || 'No notes specified.'}
                                  </p>
                                </div>

                                {/* Quotation Attachments Gallery in Read-Only View */}
                                {req.quotations && req.quotations.length > 0 && (
                                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 space-y-2" id={`quotations-gallery-${req.id}`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <Paperclip className="h-4 w-4 text-[#8C7A6B]" />
                                        <span className="text-xs font-bold text-[#3E312C] uppercase tracking-wider">Attached Supplier Quotations ({req.quotations.length})</span>
                                      </div>
                                      <span className="text-[10px] text-[#8C7A6B] font-mono">Click to enlarge quotation image</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2.5 pt-1">
                                      {req.quotations.map((imgUrl, qIdx) => (
                                        <div
                                          key={qIdx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewQuotationUrl(imgUrl);
                                          }}
                                          className="relative group w-20 h-20 rounded-xl border border-[#EBE6DD] overflow-hidden bg-[#FAF9F5] cursor-pointer shadow-2xs hover:border-[#3E312C] transition-all"
                                        >
                                          <img src={imgUrl} alt={`Quotation ${qIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                          <div className="absolute inset-0 bg-[#3E312C]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                            <Eye className="h-4 w-4" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2 bg-white border border-[#EBE6DD] rounded-2xl p-4 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold tracking-wider leading-none">Workflow Log History</p>
                                  <div className="text-[#3E312C] space-y-1.5 text-xs mt-3">
                                    <p className="flex items-center justify-between flex-wrap gap-1">
                                      <span>• Drafted by: <span className="font-semibold text-[#3E312C]">{req.createdByName}</span></span>
                                      {req.preparerSignature && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                          <FileCheck className="h-3 w-3 text-emerald-600" /> Signed by Preparer
                                        </span>
                                      )}
                                    </p>
                                    {req.checkedBy && (
                                      <p className="text-emerald-700 font-semibold flex items-center justify-between flex-wrap gap-1">
                                        <span className="flex items-center gap-1">
                                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                          <span>Checked & Verified by Purchaser: <span className="font-bold">{req.checkedByName}</span> {req.checkedAt && `on ${new Date(req.checkedAt).toLocaleString()}`}</span>
                                        </span>
                                        {req.checkedSignature && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            <FileCheck className="h-3 w-3 text-emerald-600" /> Signed by Purchaser
                                          </span>
                                        )}
                                      </p>
                                    )}
                                    {req.approvedBy && (
                                      <p className="text-[#3E312C] flex items-center justify-between flex-wrap gap-1">
                                        <span>• Approved by: <span className="font-semibold">{req.approvedByName}</span></span>
                                        {req.approvedSignature && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            <FileCheck className="h-3 w-3 text-emerald-600" /> Signed by Approver
                                          </span>
                                        )}
                                      </p>
                                    )}
                                    {req.receivedAt && (
                                      <div className="space-y-1 text-xs">
                                        <p className="text-emerald-800 font-bold flex items-center gap-1">
                                          <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                                          <span>Received by: <span className="text-[#3E312C]">{req.receivedByName || 'Purchaser'}</span> on {new Date(req.receivedAt).toLocaleString()}</span>
                                        </p>
                                        {req.receivedItems !== undefined ? (
                                          <p className="text-[11px] text-[#6E5D4F] pl-4.5">
                                            • Inventory Added: <span className="font-bold text-[#3E312C]">{req.receivedItems.filter(i => (i.quantity || 0) > 0).length} of {req.items.length} requested item(s)</span> restocked into warehouse inventory.
                                          </p>
                                        ) : (
                                          <p className="text-[11px] text-[#6E5D4F] pl-4.5">• Stock Synced: Received into warehouse active stock</p>
                                        )}
                                        {req.receivedNotes && (
                                          <p className="text-[11px] text-[#6E5D4F] pl-4.5 italic bg-[#FAF9F5] p-2 rounded-xl border border-[#EBE6DD] mt-1">
                                            Notes: "{req.receivedNotes}"
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {req.rejectedAt && (
                                      <p className="text-[#A65D46] font-semibold">• Rejected by: {req.rejectedByName}</p>
                                    )}
                                  </div>

                                  {/* 3-Party Digital Signatures & Authorization Block */}
                                  <div className="mt-4 pt-3 border-t border-[#F0EFE9]">
                                    <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold tracking-wider mb-2">
                                      PR Digital Signatures & Authorization
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      {/* Box 1: Preparer */}
                                      <div className="p-2 bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl text-center space-y-1 flex flex-col justify-between min-h-[92px]">
                                        <div>
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B]">1. Prepared By</p>
                                          <p className="text-xs font-bold text-[#3E312C] truncate" title={req.createdByName}>{req.createdByName}</p>
                                        </div>
                                        <div className="h-8 flex items-center justify-center">
                                          {req.preparerSignature ? (
                                            <img src={req.preparerSignature} alt="Preparer Signature" className="h-7 max-w-[110px] object-contain" />
                                          ) : (
                                            <span className="text-[10px] text-[#8C7A6B] italic font-mono">No signature</span>
                                          )}
                                        </div>
                                        <p className="text-[9px] text-[#8C7A6B]">{new Date(req.createdAt).toLocaleDateString()}</p>
                                      </div>

                                      {/* Box 2: Purchaser Verification */}
                                      <div className="p-2 bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl text-center space-y-1 flex flex-col justify-between min-h-[92px]">
                                        <div>
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B]">2. Checked By</p>
                                          <p className="text-xs font-bold text-[#3E312C] truncate" title={req.checkedByName || 'Pending'}>{req.checkedByName || 'Pending Purchaser'}</p>
                                        </div>
                                        <div className="h-8 flex items-center justify-center">
                                          {req.checkedSignature ? (
                                            <img src={req.checkedSignature} alt="Purchaser Signature" className="h-7 max-w-[110px] object-contain" />
                                          ) : (
                                            <span className="text-[10px] text-[#8C7A6B] italic font-mono">{req.checkedBy ? 'Verified' : 'Pending Verification'}</span>
                                          )}
                                        </div>
                                        <p className="text-[9px] text-[#8C7A6B]">{req.checkedAt ? new Date(req.checkedAt).toLocaleDateString() : '—'}</p>
                                      </div>

                                      {/* Box 3: Executive Approver */}
                                      <div className="p-2 bg-[#FAF9F5] border border-[#EBE6DD] rounded-xl text-center space-y-1 flex flex-col justify-between min-h-[92px]">
                                        <div>
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B]">3. Approved By</p>
                                          <p className="text-xs font-bold text-[#3E312C] truncate" title={req.approvedByName || 'Rome Garcia'}>{req.approvedByName || (req.status === 'approved' ? 'Rome Garcia' : 'Pending Approver')}</p>
                                        </div>
                                        <div className="h-8 flex items-center justify-center">
                                          {req.approvedSignature ? (
                                            <img src={req.approvedSignature} alt="Approver Signature" className="h-7 max-w-[110px] object-contain" />
                                          ) : (
                                            <span className="text-[10px] text-[#8C7A6B] italic font-mono">{req.status === 'approved' ? 'Approved' : 'Pending Approval'}</span>
                                          )}
                                        </div>
                                        <p className="text-[9px] text-[#8C7A6B]">{req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '—'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions bar */}
                                {subTab === 'deleted' ? (
                                  <div className="pt-4 mt-3 border-t border-[#F0EFE9] flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center w-full">
                                    <div className="text-xs text-[#8C7A6B] space-y-1">
                                      <p>• Deleted on: <span className="font-semibold text-[#3E312C]">{req.deletedAt ? new Date(req.deletedAt).toLocaleString() : 'N/A'}</span></p>
                                      <p>• Deleted by: <span className="font-semibold text-[#3E312C]">{req.deletedByName || 'N/A'}</span></p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto mt-2 sm:mt-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onRestoreRequisition) onRestoreRequisition(req.id);
                                        }}
                                        className="flex items-center gap-1.5 bg-[#FAF9F5] text-green-700 border border-green-300 hover:bg-green-50 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-2xs transition-all"
                                        title="Restore this deleted requisition record"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '4s' }} /> Restore Record
                                      </button>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPurgingReqId(req.id);
                                          }}
                                          className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-2xs transition-all"
                                          title="Permanently purge record and delete its logs"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" /> Purge Permanently
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="pt-4 mt-3 border-t border-[#F0EFE9] flex flex-wrap gap-3 justify-between items-center w-full">
                                    
                                    {/* Print Requisition Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrintRequisition(req);
                                      }}
                                      className="flex items-center gap-1.5 bg-white border border-[#EBE6DD] hover:bg-[#FAF9F5] text-[#3E312C] px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-2xs transition-all"
                                      title="Print this requisition individually as a formal BOH PDF"
                                    >
                                      <Printer className="h-3.5 w-3.5 text-[#3E312C]" /> Print Requisition / PDF
                                    </button>

                                    {/* Submit Draft Requisition Button */}
                                    {req.status === 'draft' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSignatureModal({
                                            isOpen: true,
                                            reqId: req.id,
                                            reqNumber: req.requisitionNumber,
                                            action: 'submit_existing',
                                            title: 'Requisition Preparer Digital Signature',
                                            subtitle: `Sign below as preparer to submit Requisition ${req.requisitionNumber} for purchaser verification and executive approval (Total: ₱${req.totalCost.toFixed(2)}).`,
                                            confirmLabel: 'Confirm Signature & Submit PR',
                                            rememberLabel: 'Remember & save this signature for future PR drafting'
                                          });
                                        }}
                                        className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-2xs transition-all"
                                        title="Submit this draft requisition for verification and approval"
                                      >
                                        <Send className="h-3.5 w-3.5" /> Submit Requisition
                                      </button>
                                    )}

                                    {/* Edit Requisition Button (For Pending or Draft requisitions) */}
                                    {(req.status === 'pending' || req.status === 'draft') && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEditing(req);
                                        }}
                                        className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-2xs transition-all"
                                        title="Edit details, add or deduct items from this draft"
                                      >
                                        <FileEdit className="h-3.5 w-3.5 text-amber-600" /> Edit Requisition
                                      </button>
                                    )}

                                    {/* Delete Button (all user or staff have the authority to delete active requisitions) */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRequisitionToDelete(req);
                                      }}
                                      className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-2xs transition-all"
                                      title="Delete this requisition"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </button>

                                 {/* Admin, Managing Director or Purchaser Workflow controls */}
                                {(isAdmin || currentUser.role === 'purchaser' || currentUser.role === 'managing_director') ? (
                                  <div className="flex flex-wrap gap-2 items-center" id="workflow-admin-controls">
                                     {/* State 1: Pending -> Check & Verify / Approve / Reject */}
                                    {req.status === 'pending' && (
                                      <>
                                        {!req.checkedBy ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSignatureModal({
                                                isOpen: true,
                                                reqId: req.id,
                                                reqNumber: req.requisitionNumber,
                                                action: 'check',
                                                title: 'Purchaser PR Verification & Digital Signature',
                                                subtitle: `Sign below to verify specifications and pricing for Requisition ${req.requisitionNumber} (Total: ₱${req.totalCost.toFixed(2)})`,
                                                confirmLabel: 'Confirm Signature & Verify PR',
                                                rememberLabel: 'Remember & save this signature for future PR verifications'
                                              });
                                            }}
                                            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-full text-xs font-bold cursor-pointer shadow-2xs transition-all mr-1"
                                          >
                                            <FileCheck className="h-3.5 w-3.5" /> Check & Verify PR
                                          </button>
                                        ) : (
                                          <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold font-mono mr-1">
                                            <FileCheck className="h-3.5 w-3.5 text-emerald-700" /> Verified by {req.checkedByName}
                                          </span>
                                        )}

                                        {/* Only Managing Director (and Primary Admin) have the power to Approve or Reject PR */}
                                        {(isAdmin || currentUser.role === 'managing_director') ? (
                                          <>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSignatureModal({
                                                  isOpen: true,
                                                  reqId: req.id,
                                                  reqNumber: req.requisitionNumber,
                                                  action: 'approve',
                                                  title: 'Executive PR Approval & Digital Signature',
                                                  subtitle: `Sign below to approve Requisition ${req.requisitionNumber} (Total: ₱${req.totalCost.toFixed(2)})`,
                                                  confirmLabel: 'Confirm Signature & Approve PR',
                                                  rememberLabel: 'Remember & save this signature for future PR approvals'
                                                });
                                              }}
                                              className="flex items-center gap-1 bg-[#3E312C] hover:bg-[#2C211F] text-white px-4 py-2 rounded-full text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                                            >
                                              <Check className="h-3.5 w-3.5" /> Approve PR
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateStatus(req.id, 'rejected');
                                              }}
                                              className="flex items-center gap-1 bg-[#FAF9F5] text-[#3E312C] border border-[#EBE6DD] hover:bg-[#FAF9F5]/80 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                                            >
                                              <X className="h-3.5 w-3.5" /> Reject PR
                                            </button>
                                          </>
                                        ) : (
                                          <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-full flex items-center gap-1">
                                            <AlertCircle className="h-3.5 w-3.5 text-amber-800" /> Awaiting Managing Director Approval
                                          </span>
                                        )}
                                      </>
                                    )}

                                    {/* State 2: Approved -> Receive with item confirmation */}
                                    {req.status === 'approved' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenReceiveModal(req);
                                        }}
                                        className="flex items-center gap-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                                      >
                                        <PackageCheck className="h-3.5 w-3.5" /> Mark Received (Select Purchased Items)
                                      </button>
                                    )}

                                    {/* State 4: Terminal received / rejected -> show lock status */}
                                    {(req.status === 'received' || req.status === 'rejected') && (
                                      <span className="text-[10px] text-[#8C7A6B] font-bold font-mono bg-[#FAF9F5] border border-[#EBE6DD] px-3 py-1.5 rounded-full uppercase">
                                        Requisition Process Closed
                                      </span>
                                    )}

                                    {/* ALL non-pending states allow administrative Reversal */}
                                    {req.status !== 'pending' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setReversingReqId(req.id);
                                        }}
                                        className="flex items-center gap-1 bg-[#FAF9F5] text-[#3E312C] border border-amber-500/20 hover:bg-[#FAF9F5]/80 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                                        title="Reverse Request Status to Pending"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5 text-amber-600" /> Reverse
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  /* STAFF NOTIFICATION */
                                  req.status === 'pending' && (
                                    <div className="p-3 bg-[#FFF8E7] border border-[#FFE8A3] text-[#9E6900] rounded-xl text-xs flex gap-1.5 items-center mt-0">
                                      <AlertCircle className="h-4 w-4 shrink-0 text-[#9E6900]" />
                                      <span>Pending approval. Managing Director will review and approve soon.</span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          ) : (
            <div className="py-16 text-center text-[#8C7A6B]">
              {searchQuery || statusFilter !== 'all' || deptFilter !== 'all' ? (
                <>
                  <Search className="h-12 w-12 mx-auto text-[#D1C4B5] mb-3" />
                  <p className="font-semibold text-[#3E312C] text-base">No matching requisitions found</p>
                  <p className="text-xs text-[#8C7A6B] mt-1 max-w-md mx-auto">
                    {searchQuery ? `No PR found matching "${searchQuery}".` : 'No requisitions matching the selected status or department filter.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setDeptFilter('all');
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3E312C] text-white text-xs font-bold hover:bg-[#2C211F] transition-all cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Search & Filters
                  </button>
                </>
              ) : (
                <>
                  <ClipboardList className="h-12 w-12 mx-auto text-[#D1C4B5] mb-3" />
                  <p className="font-semibold text-[#3E312C]">No requisitions recorded yet</p>
                  <p className="text-xs text-[#8C7A6B] mt-1">Submit your first supply restock requisition today.</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* PRINT-ONLY INDIVIDUAL REQUISITION SHEET */}
      {/* ========================================== */}
      {activePrintReq && (
        <div id="requisition-print-sheet" className="print-only">
          <div style={{ fontFamily: 'sans-serif', color: '#111', padding: '10px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.5px' }}>MADIGUN HOTEL AND EVENTS</h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Kitchen Operations & Back-of-House Supplies</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#333' }}>PURCHASE REQUISITION</h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '13px', fontWeight: 'bold', color: '#111', fontFamily: 'monospace' }}>{activePrintReq.requisitionNumber}</p>
              </div>
            </div>

            {/* Metadata Grid */}
            <table style={{ width: '100%', marginBottom: '25px', fontSize: '12px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold', width: '15%' }}>Date Drafted:</td>
                  <td style={{ padding: '6px 0', width: '35%' }}>{new Date(activePrintReq.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '6px 0', fontWeight: 'bold', width: '15%' }}>Request Status:</td>
                  <td style={{ padding: '6px 0', width: '35%', textTransform: 'uppercase', fontWeight: 'bold' }}>{activePrintReq.status}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Requested By:</td>
                  <td>{activePrintReq.createdByName}</td>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Priority:</td>
                  <td style={{ padding: '6px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>{activePrintReq.priority}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Purpose:</td>
                  <td colSpan={3}>{activePrintReq.purpose}</td>
                </tr>
              </tbody>
            </table>

            {/* Supply Items Table */}
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
              {activePrintReq.status === 'received' ? 'Purchased & Restocked Supply Items' : 'Requested Items'}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '30px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left', borderBottom: '1.5px solid #333' }}>
                  <th style={{ padding: '8px' }}>Supply Product / Material</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Requested</th>
                  {activePrintReq.status === 'received' && (
                    <th style={{ padding: '8px', textAlign: 'right' }}>Purchased & Restocked</th>
                  )}
                  <th style={{ padding: '8px', textAlign: 'right' }}>Unit Rate</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {activePrintReq.items.map((it, idx) => {
                  const receivedItem = activePrintReq.receivedItems?.find(ri => 
                    (ri.itemId && ri.itemId === it.itemId) || 
                    (ri.itemName && ri.itemName.trim().toLowerCase() === it.itemName.trim().toLowerCase())
                  );
                  const isPurchased = activePrintReq.status === 'received' 
                    ? (activePrintReq.receivedItems !== undefined ? (receivedItem && (receivedItem.quantity || 0) > 0) : true) 
                    : false;
                  const actualQty = receivedItem ? receivedItem.quantity : it.quantity;
                  const actualPrice = receivedItem 
                    ? (typeof receivedItem.actualUnitCost === 'number' ? receivedItem.actualUnitCost : (typeof receivedItem.unitCost === 'number' ? receivedItem.unitCost : it.unitCost))
                    : it.unitCost;
                  const lineTotal = activePrintReq.status === 'received'
                    ? (isPurchased ? actualQty * actualPrice : 0)
                    : it.quantity * it.unitCost;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', color: activePrintReq.status === 'received' && !isPurchased ? '#999' : '#111' }}>
                      <td style={{ padding: '8px' }}>
                        {it.itemName}
                        {activePrintReq.status === 'received' && !isPurchased && (
                          <span style={{ fontSize: '10px', marginLeft: '6px', color: '#888' }}>(Not Purchased)</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{it.quantity} {it.unit}</td>
                      {activePrintReq.status === 'received' && (
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: isPurchased ? '#166534' : '#666' }}>
                          {isPurchased ? `${actualQty} ${it.unit}` : '0 (Skipped)'}
                        </td>
                      )}
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {activePrintReq.status === 'received' && isPurchased && Math.abs(actualPrice - it.unitCost) > 0.009 ? (
                          <>
                            <strong>₱{actualPrice.toFixed(2)}</strong> <span style={{ fontSize: '10px', color: '#888' }}>(PR: ₱{it.unitCost.toFixed(2)})</span>
                          </>
                        ) : (
                          `₱${(activePrintReq.status === 'received' && isPurchased ? actualPrice : it.unitCost).toFixed(2)}`
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₱{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold', fontSize: '13px' }}>
                  <td colSpan={activePrintReq.status === 'received' ? 4 : 3} style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {activePrintReq.status === 'received' && activePrintReq.receivedItems !== undefined 
                      ? 'Actual Inventory Restock Total:' 
                      : 'Total Estimated Valuation:'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                    ₱{(activePrintReq.status === 'received' && activePrintReq.receivedItems !== undefined
                      ? activePrintReq.receivedItems.reduce((sum, it) => sum + ((it.quantity || 0) * (typeof it.actualUnitCost === 'number' ? it.actualUnitCost : (it.unitCost || 0))), 0)
                      : activePrintReq.totalCost
                    ).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Notes Section */}
            {activePrintReq.notes && (
              <div style={{ marginBottom: '35px', padding: '10px', backgroundColor: '#f9f9f9', borderLeft: '3px solid #666', fontSize: '11px' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Administrative Notes / Delivery Directives:</p>
                <p style={{ margin: 0, lineHeight: '1.4' }}>{activePrintReq.notes}</p>
              </div>
            )}

            {/* Signatures Panel */}
            {(() => {
              const creatorUser = users?.find(u => u.id === activePrintReq.createdBy || u.name === activePrintReq.createdByName);
              const creatorRole = creatorUser?.role || 'staff';
              const preparerRoleLabel = creatorRole === 'rooms_event_officer' 
                ? 'ROOMS & EVENTS' 
                : creatorRole === 'purchaser' 
                ? 'PURCHASER' 
                : creatorRole === 'admin' 
                ? 'PROPERTY CUSTODIAN' 
                : 'KITCHEN STAFF';
              return (
                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ width: '30%', borderTop: '1px solid #111', paddingTop: '8px', textAlign: 'center', position: 'relative' }}>
                    {activePrintReq.preparerSignature ? (
                      <img src={activePrintReq.preparerSignature} alt="Preparer Signature" style={{ height: '36px', maxWidth: '120px', display: 'block', margin: '0 auto 4px auto', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ height: '36px' }} />
                    )}
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>{activePrintReq.createdByName}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>PREPARER: {preparerRoleLabel}</p>
                  </div>
                  <div style={{ width: '30%', borderTop: '1px solid #111', paddingTop: '8px', textAlign: 'center', position: 'relative' }}>
                    {activePrintReq.checkedSignature ? (
                      <img src={activePrintReq.checkedSignature} alt="Purchaser Signature" style={{ height: '36px', maxWidth: '120px', display: 'block', margin: '0 auto 4px auto', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ height: '36px' }} />
                    )}
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>{activePrintReq.checkedByName || '___________________________'}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>CHECK BY: PURCHASER</p>
                  </div>
                  <div style={{ width: '30%', borderTop: '1px solid #111', paddingTop: '8px', textAlign: 'center', position: 'relative' }}>
                    {activePrintReq.approvedSignature ? (
                      <img src={activePrintReq.approvedSignature} alt="Approver Signature" style={{ height: '36px', maxWidth: '120px', display: 'block', margin: '0 auto 4px auto', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ height: '36px' }} />
                    )}
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>{activePrintReq.approvedByName || 'Rome Garcia'}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>HOTEL MANAGING DIRECTOR</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PRINT-ONLY SUMMARY REPORT SHEET */}
      {/* ========================================== */}
      {isReportOpen && (
        <div id="summary-report-print-sheet" className="print-only">
          <div style={{ fontFamily: 'sans-serif', color: '#111', padding: '10px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>MADIGUN HOTEL AND EVENTS</h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>BOH Costing Control & Requisitions Audit</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, fontSize: '16px', color: '#333' }}>PURCHASE REQUISITIONS SUMMARY</h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', fontWeight: 'bold', color: '#111', textTransform: 'uppercase' }}>
                  {reportFilterType === 'month' ? `Month: ${reportMonth}` : `Period: ${reportStartDate || 'Any'} to ${reportEndDate || 'Any'}`}
                </p>
              </div>
            </div>

            {/* Statistics Row */}
            <table style={{ width: '100%', marginBottom: '25px', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Total Requisitions</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Pending Review</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Approved</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Received (Restocked)</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Rejected</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>High Priority</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Sum Valuation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{reportSummary.count}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{reportSummary.pendingCount}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{reportSummary.approvedCount}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{reportSummary.receivedCount}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{reportSummary.rejectedCount}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{reportSummary.highPriorityCount}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>₱{reportSummary.totalCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Aggregated Cost Ranking Table */}
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>Supply Procurement Cost Rankings (Aggregated)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left', borderBottom: '1.5px solid #333' }}>
                  <th style={{ padding: '8px', width: '45%' }}>Material / Item Name</th>
                  <th style={{ padding: '8px', textAlign: 'right', width: '15%' }}>Unit Cost</th>
                  <th style={{ padding: '8px', textAlign: 'right', width: '20%' }}>Aggregated Volume</th>
                  <th style={{ padding: '8px', textAlign: 'right', width: '20%' }}>Aggregated Cost Valuation</th>
                </tr>
              </thead>
              <tbody>
                {reportSummary.aggregatedItems.length > 0 ? (
                  reportSummary.aggregatedItems.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{it.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>₱{it.unitCost.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{it.quantity} {it.unit}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₱{it.totalCost.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '15px', textAlign: 'center', color: '#666' }}>No supply purchases recorded for this selected range.</td>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold', fontSize: '13px' }}>
                  <td colSpan={3} style={{ padding: '10px 8px', textAlign: 'right' }}>Combined Summary Spend:</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>₱{reportSummary.totalCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '60px', fontSize: '10px', color: '#666', textAlign: 'center', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
              <p>Madigun Back-Of-House procurement summary generated automatically on {new Date().toLocaleDateString()} by terminal user {currentUser.name}.</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* REPORT GENERATOR MODAL INTERFACE */}
      {/* ========================================== */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-[#3E312C]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="report-generator-modal">
          <div className="bg-white rounded-[32px] border border-[#EBE6DD] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-[#F0EFE9] bg-[#FAF9F5] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#3E312C]" />
                <div>
                  <h2 className="font-serif text-lg text-[#3E312C] font-semibold">Summary Costing Report</h2>
                  <p className="text-[11px] text-[#8C7A6B]">Aggregate purchase requisitions & costing profiles by month or custom dates.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReportOpen(false)}
                className="p-2 hover:bg-[#EBE6DD]/60 rounded-full cursor-pointer transition-colors"
              >
                <X className="h-5 w-5 text-[#3E312C]" />
              </button>
            </div>

            {/* Filter controls and preview */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left controls panel */}
                <div className="md:col-span-4 bg-[#FAF9F5] border border-[#EBE6DD] p-4 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B]">Filter Configuration</h3>
                  
                  {/* Filter Type Toggle */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-[#8C7A6B] font-mono block">Filter Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReportFilterType('month')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          reportFilterType === 'month' 
                            ? 'bg-[#3E312C] text-white' 
                            : 'bg-white text-[#3E312C] border border-[#EBE6DD] hover:bg-[#FAF9F5]'
                        }`}
                      >
                        By Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportFilterType('dateRange')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          reportFilterType === 'dateRange' 
                            ? 'bg-[#3E312C] text-white' 
                            : 'bg-white text-[#3E312C] border border-[#EBE6DD] hover:bg-[#FAF9F5]'
                        }`}
                      >
                        Date Range
                      </button>
                    </div>
                  </div>

                  {/* Month Selection Input */}
                  {reportFilterType === 'month' ? (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-[#8C7A6B] font-mono block">Select Month</label>
                      <select
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-[#EBE6DD] rounded-xl p-2.5 focus:outline-none focus:border-[#3E312C]"
                      >
                        <option value="All">All Months (Entire History)</option>
                        {uniqueMonths.map(mon => (
                          <option key={mon} value={mon}>{mon}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    /* Date Range Inputs */
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-[#8C7A6B] font-mono block">Start Date</label>
                        <input
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-[#EBE6DD] rounded-xl p-2.5 focus:outline-none focus:border-[#3E312C]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-[#8C7A6B] font-mono block">End Date</label>
                        <input
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-[#EBE6DD] rounded-xl p-2.5 focus:outline-none focus:border-[#3E312C]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Helper Alert */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-[#3E312C] text-[10px] rounded-xl space-y-1 leading-relaxed">
                    <p className="font-bold">✓ Direct PDF Printing Enabled</p>
                    <p className="text-[#8C7A6B]">You can print this custom summary report to physical paper or digital PDF using the BOH terminal actions.</p>
                  </div>
                </div>

                {/* Right live preview panel */}
                <div className="md:col-span-8 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B] flex items-center justify-between">
                    <span>Live Costing Preview</span>
                    <span className="text-[10px] bg-[#EBE6DD] text-[#3E312C] px-2.5 py-0.5 rounded-full font-mono">{filteredReportRequisitions.length} Matches Found</span>
                  </h3>

                  {/* Summary Metrics Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-[#FAF9F5] border border-[#EBE6DD] p-3.5 rounded-2xl">
                      <span className="text-[10px] font-mono text-[#8C7A6B] uppercase block">Total Cost Valuation</span>
                      <span className="text-lg font-extrabold text-[#3E312C] block font-mono mt-1">₱{reportSummary.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="bg-[#FAF9F5] border border-[#EBE6DD] p-3.5 rounded-2xl">
                      <span className="text-[10px] font-mono text-[#8C7A6B] uppercase block">Approved (Restocked)</span>
                      <span className="text-lg font-extrabold text-[#3E312C] block font-mono mt-1">{reportSummary.approvedCount + reportSummary.receivedCount}</span>
                    </div>
                    <div className="bg-[#FAF9F5] border border-[#EBE6DD] p-3.5 rounded-2xl col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-mono text-[#8C7A6B] uppercase block">Pending / Rejected</span>
                      <span className="text-lg font-extrabold text-[#3E312C] block font-mono mt-1">{reportSummary.pendingCount} / {reportSummary.rejectedCount}</span>
                    </div>
                  </div>

                  {/* Ranked Item Purchase list */}
                  <div className="border border-[#EBE6DD] rounded-2xl overflow-hidden bg-white">
                    <div className="bg-[#FAF9F5] p-3 border-b border-[#EBE6DD]">
                      <h4 className="text-[11px] font-bold text-[#3E312C] uppercase tracking-wider">Supplies Consumption Breakdown</h4>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-[#F0EFE9]">
                      {reportSummary.aggregatedItems.length > 0 ? (
                        reportSummary.aggregatedItems.map((item, idx) => (
                          <div key={idx} className="p-3 flex justify-between items-center text-xs">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-[#3E312C]">{item.name}</p>
                              <p className="text-[10px] text-[#8C7A6B]">Volume: {item.quantity} {item.unit} • Price: ₱{item.unitCost.toFixed(2)}</p>
                            </div>
                            <span className="font-mono font-extrabold text-sm text-[#3E312C]">₱{item.totalCost.toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-[#8C7A6B]">
                          <p className="text-xs">No records available within selected bounds.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-5 border-t border-[#F0EFE9] bg-[#FAF9F5] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="px-5 py-2 border border-[#EBE6DD] text-[#3E312C] font-semibold text-xs rounded-full hover:bg-white cursor-pointer transition-colors"
              >
                Close Panel
              </button>
              
              <button
                type="button"
                disabled={reportSummary.count === 0}
                onClick={handlePrintSummaryReport}
                className="px-6 py-2 bg-[#3E312C] hover:bg-[#2C211F] text-white disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs rounded-full cursor-pointer transition-all shadow-xs flex items-center gap-1.5 animate-pulse"
              >
                <Printer className="h-4 w-4 text-white" />
                Generate Summary Report / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: PREMIUM IFRAME-SAFE REVERSE DIALOG */}
      {/* ========================================== */}
      {reversingReqId && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-[#3E312C]/60 flex items-center justify-center p-4 backdrop-blur-xs" id="reverse-confirmation-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setReversingReqId(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center pt-2 space-y-3">
              <div className="mx-auto bg-amber-500/10 text-amber-600 border border-amber-500/20 h-12 w-12 rounded-full flex items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#3E312C] font-semibold">Reverse Requisition Status?</h3>
                <p className="text-xs text-[#8C7A6B] mt-1.5 leading-relaxed">
                  Are you sure you want to reverse this requisition back to <span className="font-bold text-[#3E312C]">Pending</span>? If this requisition was already received, this will subtract the added quantities from active warehouse stock.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setReversingReqId(null)}
                className="flex-1 py-2.5 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onReverseStatus(reversingReqId);
                  setReversingReqId(null);
                }}
                className="flex-1 py-2.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
              >
                Yes, Reverse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: DELETE CONFIRMATION DIALOG */}
      {/* ========================================== */}
      {requisitionToDelete && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-[#3E312C]/60 flex items-center justify-center p-4 backdrop-blur-xs" id="delete-confirmation-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setRequisitionToDelete(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center pt-2 space-y-3">
              <div className="mx-auto bg-red-50 text-red-600 border border-red-200/50 h-12 w-12 rounded-full flex items-center justify-center animate-bounce">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#3E312C] font-semibold font-bold">Delete Requisition?</h3>
                <p className="text-xs text-[#8C7A6B] mt-1.5 leading-relaxed">
                  Are you sure you want to delete purchase requisition <span className="font-bold text-[#3E312C]">{requisitionToDelete.requisitionNumber}</span>? 
                  It will be moved to the <span className="font-bold text-[#3E312C]">Recycle Bin</span>, and admins can restore it if needed.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setRequisitionToDelete(null)}
                className="flex-1 py-2.5 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRequisition(requisitionToDelete.id);
                  setRequisitionToDelete(null);
                  setExpandedId(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
              >
                Delete Requisition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: PURGE CONFIRMATION DIALOG */}
      {/* ========================================== */}
      {purgingReqId && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-[#3E312C]/60 flex items-center justify-center p-4 backdrop-blur-xs" id="purge-confirmation-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setPurgingReqId(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center pt-2 space-y-3">
              <div className="mx-auto bg-red-100 text-red-700 border border-red-300 h-12 w-12 rounded-full flex items-center justify-center animate-pulse">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-red-700 font-bold">Permanently Purge Record?</h3>
                <p className="text-xs text-[#8C7A6B] mt-1.5 leading-relaxed">
                  This action is <span className="font-bold text-red-600">irreversible</span>. It will permanently delete this purchase requisition record and purge all system audit logs referencing it.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setPurgingReqId(null)}
                className="flex-1 py-2.5 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onPurgeRequisition) onPurgeRequisition(purgingReqId);
                  setPurgingReqId(null);
                  setExpandedId(null);
                }}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
              >
                Purge Record & Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SIGNATURE CAPTURE MODAL */}
      {/* ========================================== */}
      {signatureModal && (
        <SignaturePadModal
          isOpen={signatureModal.isOpen}
          title={signatureModal.title}
          subtitle={signatureModal.subtitle}
          confirmLabel={signatureModal.confirmLabel}
          rememberLabel={signatureModal.rememberLabel}
          signerName={currentUser.name}
          signerRole={
            (signatureModal.action === 'draft' || signatureModal.action === 'submit' || signatureModal.action === 'submit_existing')
              ? getPreparerRoleLabel(currentUser.role)
              : signatureModal.action === 'check' 
              ? (currentUser.role === 'purchaser' ? 'Hotel Purchaser / Auditor' : 'Authorized Auditor')
              : currentUser.role === 'managing_director' 
              ? 'Hotel Managing Director' 
              : 'Authorized Approver'
          }
          onCancel={() => setSignatureModal(null)}
          onSave={async (signatureDataUrl) => {
            const action = signatureModal.action;
            const reqId = signatureModal.reqId;
            const draftData = signatureModal.draftData;
            setSignatureModal(null);

            if ((action === 'draft' || action === 'submit') && draftData) {
              onCreateRequisition({
                ...draftData,
                preparerSignature: signatureDataUrl
              });
              handleClearLocalDraft();
              setIsCreating(false);
            } else if (action === 'submit_existing' && reqId) {
              await onUpdateStatus(reqId, 'pending', signatureDataUrl);
            } else if (action === 'check' && reqId) {
              if (onCheckRequisition) {
                await onCheckRequisition(reqId, signatureDataUrl);
              }
            } else if (action === 'approve' && reqId) {
              await onUpdateStatus(reqId, 'approved', signatureDataUrl);
            }
          }}
        />
      )}

      {/* ========================================== */}
      {/* QUOTATION IMAGE PREVIEW LIGHTBOX MODAL */}
      {/* ========================================== */}
      {previewQuotationUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-[#3E312C]/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewQuotationUrl(null)}
        >
          <div 
            className="bg-white border border-[#EBE6DD] rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#FAF9F5] border-b border-[#EBE6DD] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#8C7A6B]" />
                <h3 className="text-xs font-bold text-[#3E312C] uppercase tracking-wider">Supplier Price Quote Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuotationUrl(null)}
                className="p-1.5 rounded-full hover:bg-[#EBE6DD] text-[#8C7A6B] hover:text-[#3E312C] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-[#FAF9F5]/50 flex-1 min-h-[300px]">
              <img 
                src={previewQuotationUrl} 
                alt="Full Quotation Document" 
                className="max-w-full max-h-[75vh] object-contain rounded-xl border border-[#EBE6DD] shadow-md bg-white" 
              />
            </div>
            <div className="p-3 bg-white border-t border-[#EBE6DD] flex justify-between items-center text-xs text-[#8C7A6B] font-mono">
              <span>Verified Attachment Document</span>
              <button
                type="button"
                onClick={() => setPreviewQuotationUrl(null)}
                className="px-4 py-1.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-sans text-xs font-semibold rounded-full cursor-pointer transition-colors"
              >
                Close Fullview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MARK RECEIVED & PURCHASED ITEMS MODAL */}
      {/* ========================================== */}
      {receivingModalReq && (
        <div 
          className="fixed inset-0 z-[110] bg-[#3E312C]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => {
            setReceivingModalReq(null);
            setIsConfirmingEmptyReceive(false);
          }}
        >
          <div 
            className="bg-[#FAF9F5] border border-[#EBE6DD] rounded-3xl overflow-hidden max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-white border-b border-[#EBE6DD] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#3E312C] text-white flex items-center justify-center shadow-xs shrink-0">
                  <PackageCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#3E312C]">Mark Requisition Received & Select Purchased Items</h3>
                  <p className="text-xs text-[#8C7A6B] font-mono mt-0.5">
                    PR: <strong className="text-[#3E312C]">{receivingModalReq.requisitionNumber}</strong> • Dept: <span className="font-semibold text-[#3E312C]">{receivingModalReq.requestingDept || 'General'}</span> • Requested by: <span className="text-[#3E312C]">{receivingModalReq.createdByName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceivingModalReq(null);
                  setIsConfirmingEmptyReceive(false);
                }}
                className="p-2 rounded-full hover:bg-[#FAF9F5] text-[#8C7A6B] hover:text-[#3E312C] transition-colors cursor-pointer border border-transparent hover:border-[#EBE6DD]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Instruction Notice */}
            <div className="px-5 py-3.5 bg-amber-50/80 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <p className="font-semibold">Verify Purchased Items For Actual Inventory Restocking:</p>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  Only the items checked below with received quantity &gt; 0 will be added to your active warehouse inventory stock. If an item was out of stock or not purchased, uncheck it or set quantity to 0 so your inventory counts remain 100% accurate.
                </p>
              </div>
            </div>

            {/* Batch Controls & Selection Status */}
            <div className="px-5 py-3 bg-[#F5F2EB] border-b border-[#EBE6DD] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllReceiving(true)}
                  className="px-3 py-1.5 bg-white border border-[#EBE6DD] hover:bg-[#FAF9F5] text-[#3E312C] font-semibold rounded-xl cursor-pointer text-xs transition-colors shadow-2xs"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllReceiving(false)}
                  className="px-3 py-1.5 bg-white border border-[#EBE6DD] hover:bg-[#FAF9F5] text-stone-600 font-semibold rounded-xl cursor-pointer text-xs transition-colors shadow-2xs"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={handleResetReceivingToRequested}
                  className="px-3 py-1.5 bg-white border border-[#EBE6DD] hover:bg-[#FAF9F5] text-[#8C7A6B] hover:text-[#3E312C] font-semibold rounded-xl cursor-pointer text-xs transition-colors shadow-2xs"
                >
                  Reset All to PR (Qty & Prices)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#3E312C] bg-white px-3 py-1 rounded-full border border-[#EBE6DD]">
                  {receivingItemsState.filter(i => i.isSelected && i.receivedQty > 0).length} of {receivingItemsState.length} item(s) selected for restock
                </span>
              </div>
            </div>

            {/* Items Checklist List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 divide-y divide-[#EBE6DD]">
              {receivingItemsState.map((item, idx) => {
                const isItemActive = item.isSelected && item.receivedQty > 0;
                const subtotal = isItemActive ? item.receivedQty * item.actualUnitCost : 0;
                const priceDiff = item.actualUnitCost - item.requestedUnitCost;
                const hasPriceChange = Math.abs(priceDiff) > 0.009;

                return (
                  <div 
                    key={item.itemId || idx}
                    className={`pt-3.5 first:pt-0 rounded-2xl p-3.5 sm:p-4 transition-all border ${
                      isItemActive 
                        ? 'bg-white border-emerald-300/80 shadow-xs' 
                        : 'bg-[#FAF9F5]/80 border-[#EBE6DD] opacity-75'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Checkbox and item info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          id={`receive-check-${idx}`}
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={() => handleToggleItemSelection(idx)}
                          className="mt-1 h-5 w-5 rounded-md border-[#D5CEB2] text-[#3E312C] focus:ring-[#3E312C] cursor-pointer accent-[#3E312C]"
                        />
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <label htmlFor={`receive-check-${idx}`} className="text-sm font-bold text-[#3E312C] cursor-pointer hover:underline">
                              {item.itemName}
                            </label>
                            {item.targetTab && (
                              <span className="text-[10px] font-mono font-bold text-[#8C7A6B] bg-[#FAF9F5] border border-[#EBE6DD] px-2 py-0.5 rounded-md uppercase">
                                {item.targetTab}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-[#8C7A6B] flex-wrap">
                            <span>Requested PR: <strong className="text-[#3E312C] font-mono">{item.requestedQty} {item.unit} @ ₱{item.requestedUnitCost.toFixed(2)}</strong></span>
                            <span>•</span>
                            <span>Est. PR Ext: <strong className="text-[#3E312C] font-mono">₱{(item.requestedQty * item.requestedUnitCost).toFixed(2)}</strong></span>
                            {item.allocatedLocation && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[180px]">Dest: <strong className="text-[#3E312C]">{item.allocatedLocation}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Controls: Quantity & Actual Price & Subtotal */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 shrink-0 justify-between lg:justify-end">
                        
                        {/* 1. Qty Received Input */}
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor={`receive-qty-${idx}`} className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase">
                            Qty Received:
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`receive-qty-${idx}`}
                              type="number"
                              min="0"
                              step="any"
                              value={item.receivedQty}
                              onChange={(e) => handleSetItemReceivedQty(idx, parseFloat(e.target.value))}
                              disabled={!item.isSelected}
                              className={`w-20 px-2 py-1 text-xs font-mono font-bold text-center border rounded-lg focus:ring-2 focus:ring-[#3E312C] ${
                                item.isSelected 
                                  ? 'bg-white border-[#3E312C] text-[#3E312C]' 
                                  : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                              }`}
                            />
                            <span className="text-xs font-mono text-[#8C7A6B]">{item.unit}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetItemReceivedQty(idx, item.requestedQty)}
                              className="text-[10px] px-1.5 py-0.5 bg-[#FAF9F5] border border-[#EBE6DD] hover:bg-white text-[#3E312C] rounded cursor-pointer transition-colors"
                            >
                              Full ({item.requestedQty})
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetItemReceivedQty(idx, 0)}
                              className="text-[10px] px-1.5 py-0.5 bg-[#FAF9F5] border border-[#EBE6DD] hover:bg-white text-stone-500 rounded cursor-pointer transition-colors"
                            >
                              None (0)
                            </button>
                          </div>
                        </div>

                        {/* 2. Actual Bought Price Input */}
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center justify-between w-full gap-2">
                            <label htmlFor={`receive-price-${idx}`} className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase">
                              Actual Price / Unit:
                            </label>
                            {hasPriceChange && (
                              <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                                priceDiff > 0 ? 'text-amber-800 bg-amber-100' : 'text-emerald-800 bg-emerald-100'
                              }`}>
                                {priceDiff > 0 ? `+₱${priceDiff.toFixed(2)}` : `-₱${Math.abs(priceDiff).toFixed(2)}`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="relative flex items-center">
                              <span className="absolute left-2 text-xs font-mono font-bold text-[#8C7A6B]">₱</span>
                              <input
                                id={`receive-price-${idx}`}
                                type="number"
                                min="0"
                                step="any"
                                value={item.actualUnitCost}
                                onChange={(e) => handleSetItemActualCost(idx, parseFloat(e.target.value))}
                                disabled={!item.isSelected}
                                className={`w-28 pl-5 pr-2 py-1 text-xs font-mono font-bold text-right border rounded-lg focus:ring-2 focus:ring-[#3E312C] ${
                                  item.isSelected 
                                    ? hasPriceChange 
                                      ? 'bg-amber-50/50 border-amber-400 text-[#3E312C]' 
                                      : 'bg-white border-[#3E312C] text-[#3E312C]' 
                                    : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                                }`}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleResetItemCost(idx)}
                              title="Reset price to original PR quotation rate"
                              className={`text-[10px] px-1.5 py-0.5 border rounded cursor-pointer transition-colors ${
                                hasPriceChange 
                                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold' 
                                  : 'bg-[#FAF9F5] border-[#EBE6DD] text-[#8C7A6B] hover:bg-white hover:text-[#3E312C]'
                              }`}
                            >
                              Reset to PR (₱{item.requestedUnitCost.toFixed(2)})
                            </button>
                          </div>
                        </div>

                        {/* 3. Extended Subtotal & Pill */}
                        <div className="w-32 text-right">
                          <div className="text-[10px] font-mono text-[#8C7A6B] uppercase">Restock Total</div>
                          <div className="text-sm font-mono font-bold text-[#3E312C]">
                            ₱{subtotal.toFixed(2)}
                          </div>
                          <div className="mt-1">
                            {isItemActive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full">
                                <Check className="h-3 w-3" /> Restock +{item.receivedQty}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded-full">
                                <X className="h-3 w-3" /> Exclude (0 stock)
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Receiving Notes */}
            <div className="p-4 sm:p-5 bg-white border-t border-[#EBE6DD] space-y-2">
              <label htmlFor="receive-notes" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">
                Receiving Notes / Supplier Price Discrepancy Remarks (Optional)
              </label>
              <textarea
                id="receive-notes"
                value={receivingNotes}
                onChange={(e) => setReceivingNotes(e.target.value)}
                placeholder="e.g. Bought from Metro Supermarket at ₱125/kg instead of quoted ₱110/kg; out of stock items skipped..."
                className="w-full text-xs p-3 border border-[#EBE6DD] rounded-xl bg-[#FAF9F5] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] focus:bg-white transition-all text-[#3E312C]"
                rows={2}
              />
            </div>

            {/* Empty Confirmation Prompt */}
            {isConfirmingEmptyReceive && (
              <div className="px-5 py-3 bg-red-50 border-t border-red-200 text-xs text-red-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-700 shrink-0" />
                  <span>
                    <strong>Warning:</strong> You have selected 0 items to add to inventory. Confirming will mark this requisition as Received, but NO stocks will be added to your active inventory.
                  </span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-[#FAF9F5] border-t border-[#EBE6DD] flex flex-col sm:flex-row items-center justify-between gap-4">
              {(() => {
                const activeItems = receivingItemsState.filter(i => i.isSelected && i.receivedQty > 0);
                const actualTotal = activeItems.reduce((sum, it) => sum + (it.receivedQty * it.actualUnitCost), 0);
                const requestedEstTotal = receivingModalReq.totalCost || 0;
                const totalDiff = actualTotal - requestedEstTotal;

                return (
                  <div className="text-xs text-[#8C7A6B] text-center sm:text-left space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                      <span>Actual Restock Valuation: </span>
                      <strong className="text-emerald-800 text-base font-mono font-extrabold">
                        ₱{actualTotal.toFixed(2)}
                      </strong>
                      {Math.abs(totalDiff) > 0.009 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                          totalDiff > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {totalDiff > 0 ? `+₱${totalDiff.toFixed(2)} vs PR Est` : `-₱${Math.abs(totalDiff).toFixed(2)} vs PR Est`}
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-[#8C7A6B]">
                      ({activeItems.length} of {receivingItemsState.length} items purchased • PR Quotation Est: ₱{requestedEstTotal.toFixed(2)})
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setReceivingModalReq(null);
                    setIsConfirmingEmptyReceive(false);
                  }}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-white border border-[#EBE6DD] hover:bg-[#FAF9F5] text-[#3E312C] font-semibold text-xs rounded-full cursor-pointer transition-colors shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReceived}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-white font-semibold text-xs rounded-full cursor-pointer shadow-sm transition-all ${
                    isConfirmingEmptyReceive 
                      ? 'bg-red-700 hover:bg-red-800' 
                      : 'bg-[#3E312C] hover:bg-[#2C211F]'
                  }`}
                >
                  <PackageCheck className="h-4 w-4 text-emerald-400" />
                  {isConfirmingEmptyReceive 
                    ? 'Confirm Received (Add 0 Items to Inventory)' 
                    : `Confirm & Restock ${receivingItemsState.filter(i => i.isSelected && i.receivedQty > 0).length} Item(s)`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
