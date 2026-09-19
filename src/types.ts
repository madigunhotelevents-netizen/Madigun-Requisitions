export type UserRole = 'admin' | 'managing_director' | 'staff' | 'rooms_event_officer' | 'purchaser';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  status?: 'approved' | 'pending';
  email?: string;
  phone?: string;
  department?: string;
  shift?: string;
  joinedDate?: string;
  emergencyContact?: string;
  password?: string;
}

export type InventorySection =
  | 'KITCHEN'
  | 'ROOMS'
  | 'HOUSEKEEPING'
  | 'HOUSEKEEPING_EQUIPMENTS'
  | 'HR_EQUIPMENTS'
  | 'FO_EQUIPMENTS'
  | 'FINANCE_EQUIPMENTS'
  | 'SECURITY_POST_EQUIPMENTS'
  | 'IT_EQUIPMENTS'
  | 'LINENS'
  | 'INDUSTRIAL_EQUIPMENTS'
  | 'LUZON'
  | 'MINDANAO'
  | 'OLD_HR_OFFICE';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  unitCost: number;
  minStock: number;
  supplier: string;
  lastUpdated: string;
  section?: InventorySection;
  lastAuditDate?: string;
  auditRemarks?: string;
  auditedBy?: string;
}

export interface RequisitionItem {
  itemId: string;
  itemName: string; // captured for historical safety
  quantity: number;
  unit: string;
  unitCost: number;
  actualUnitCost?: number; // Actual purchased price when restocked/bought
  requestedUnitCost?: number; // Original estimated PR price
  targetTab?: string;
  allocatedLocation?: string;
  category?: string;
  notes?: string;
}

export type RequisitionStatus = 'draft' | 'pending' | 'approved' | 'ordered' | 'received' | 'rejected';

export interface Requisition {
  id: string;
  requisitionNumber: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  lastUpdated?: string;
  items: RequisitionItem[];
  purpose: string;
  requestingDept?: string;
  allocatedLocation?: string;
  priority: 'low' | 'medium' | 'high';
  status: RequisitionStatus;
  totalCost: number;
  notes?: string;
  quotations?: string[];
  quotationVendor?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvedSignature?: string;
  checkedBy?: string;
  checkedByName?: string;
  checkedAt?: string;
  checkedSignature?: string;
  preparerSignature?: string;
  orderedAt?: string;
  receivedAt?: string;
  receivedBy?: string;
  receivedByName?: string;
  receivedItems?: RequisitionItem[];
  receivedNotes?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedByName?: string;
}

export interface FoodRequisitionItem {
  id: string;
  mealName: string;
  description?: string;
  paxOrQty: number;
  unitPrice: number;
  totalCost: number;
}

export type FoodRequisitionStatus = 'pending' | 'approved' | 'completed' | 'rejected';

export interface FoodRequisition {
  id: string;
  requisitionNumber: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  requestingDept?: string;
  eventOrPurpose: string;
  mealType?: string;
  items: FoodRequisitionItem[];
  totalCost: number;
  status: FoodRequisitionStatus;
  notes?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvedSignature?: string;
  preparerSignature?: string;
  checkedBy?: string;
  checkedByName?: string;
  checkedAt?: string;
  checkedSignature?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  isDeleted?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface WithdrawalItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export type WithdrawalStatus = 'draft' | 'pending' | 'approved' | 'completed' | 'rejected';

export interface Withdrawal {
  id: string;
  withdrawalNumber: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  items: WithdrawalItem[];
  purpose: string;
  status: WithdrawalStatus;
  warehouseName?: string;
  notes?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  completedBy?: string;
  completedByName?: string;
  completedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  isDeleted?: boolean;
}

export interface DeployedEquipment {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  condition?: 'Good / Working' | 'Needs Repair' | 'Replaced' | 'Missing';
  serialNumber?: string;
  dateDeployed?: string;
  notes?: string;
  inventoryItemId?: string;
  lastAuditDate?: string;
  auditRemarks?: string;
  auditedBy?: string;
}

export interface HotelRoom {
  id: string;
  roomNumber: string;
  roomType: string;
  floor?: string;
  status?: string;
  deployedItems: DeployedEquipment[];
  lastInspected?: string;
  notes?: string;
}

export type DamageSeverity = 'minor' | 'moderate' | 'severe' | 'beyond_repair' | 'missing';
export type DamageStatus = 'reported' | 'under_review' | 'repaired' | 'written_off' | 'replaced';

export interface DamageReportItem {
  id?: string;
  itemId?: string;
  itemName: string;
  category?: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  totalCost?: number;
  deductFromStock?: boolean;
  roomNumber?: string;
}

export interface DamageReport {
  id: string;
  reportNumber: string;
  items?: DamageReportItem[];
  itemId?: string;
  itemName: string;
  category?: string;
  location?: string;
  roomNumber?: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  totalCost?: number;
  severity: DamageSeverity;
  status: DamageStatus;
  incidentDate: string;
  reportedBy: string;
  reportedByName: string;
  reportedAt: string;
  description: string;
  actionTaken?: string;
  deductedFromStock?: boolean;
  notes?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  replacementRequisitionId?: string;
  isDeleted?: boolean;
}

export interface EquipmentIssuanceItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  serialNumber?: string;
  propertyCode?: string;
  brandModel?: string;
  condition: 'Brand New' | 'Good / Operational' | 'Refurbished' | 'Fair';
  specifications?: string;
  existingInventoryId?: string;
}

export interface EquipmentIssuance {
  id: string;
  issuanceNumber: string;
  date: string;
  recipientName: string;
  recipientDepartment: string;
  recipientPosition?: string;
  recipientContact?: string;
  targetSection: InventorySection;
  issuedBy: string;
  issuedByName: string;
  source: string;
  purpose: string;
  status: 'ISSUED' | 'RETURNED' | 'ACKNOWLEDGED';
  remarks?: string;
  items: EquipmentIssuanceItem[];
  totalAmount: number;
  autoAddedToInventory: boolean;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}
