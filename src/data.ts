import { InventoryItem, User, Requisition, AuditLog, FoodRequisition } from './types';

export const INITIAL_USERS: (User & { password?: string })[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'admin', // plain-text for this local demo environment
    name: 'Property Custodian (Admin)',
    role: 'admin' as const,
    status: 'approved' as const,
    email: 'custodian@madigun.hotel',
    phone: '+63 920 555 0199',
    department: 'Property & Inventory Management',
    shift: 'General Shift',
    joinedDate: '2023-01-01',
    emergencyContact: 'Sec - +63 920 123 0000'
  },
  {
    id: 'user-director',
    username: 'director',
    password: 'director',
    name: 'Hotel Managing Director',
    role: 'managing_director' as const,
    status: 'approved' as const,
    email: 'director@madigun.hotel',
    phone: '+63 917 000 1111',
    department: 'Executive Management',
    shift: 'General Shift',
    joinedDate: '2022-05-01',
    emergencyContact: 'Exec Office - +63 917 000 0000'
  },
  {
    id: 'user-rooms',
    username: 'rooms',
    password: 'rooms',
    name: 'Rooms & Events Officer',
    role: 'rooms_event_officer' as const,
    status: 'approved' as const,
    email: 'rooms@madigun.hotel',
    phone: '+63 917 888 0200',
    department: 'Rooms & Deployed Inventory',
    shift: 'Day Shift',
    joinedDate: '2024-02-15',
    emergencyContact: '+63 917 111 2222'
  },
  {
    id: 'user-purchaser',
    username: 'purchaser',
    password: 'purchaser',
    name: 'Purchaser / Auditor',
    role: 'purchaser' as const,
    status: 'approved' as const,
    email: 'purchaser@madigun.hotel',
    phone: '+63 918 333 4444',
    department: 'Procurement & Purchasing',
    shift: 'Regular Shift',
    joinedDate: '2023-06-10',
    emergencyContact: '+63 918 555 6666'
  },
  {
    id: 'user-staff',
    username: 'staff',
    password: 'staff',
    name: 'Kitchen & Operations Staff',
    role: 'staff' as const,
    status: 'approved' as const,
    email: 'staff@madigun.hotel',
    phone: '+63 919 777 8888',
    department: 'Housekeeping & Kitchen Ops',
    shift: 'Rotation Shift',
    joinedDate: '2024-01-05',
    emergencyContact: '+63 919 999 0000'
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item-1',
    name: 'Fresh Chicken Breast',
    category: 'Meat & Poultry',
    currentStock: 25,
    unit: 'kg',
    unitCost: 280.00,
    minStock: 10,
    supplier: 'Poultry Fresh Direct',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-2',
    name: 'Ribeye Beef Steak',
    category: 'Meat & Poultry',
    currentStock: 15,
    unit: 'kg',
    unitCost: 1250.00,
    minStock: 5,
    supplier: 'Prime Meats Philippines',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-3',
    name: 'Organic Vine Tomatoes',
    category: 'Produce',
    currentStock: 18,
    unit: 'kg',
    unitCost: 120.00,
    minStock: 5,
    supplier: 'Green Harvest Farm',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-4',
    name: 'Extra Virgin Olive Oil',
    category: 'Oils & Spices',
    currentStock: 12,
    unit: 'liters',
    unitCost: 850.00,
    minStock: 3,
    supplier: 'Mediterranean Imports',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-5',
    name: 'All-Purpose Flour',
    category: 'Dry Goods',
    currentStock: 40,
    unit: 'kg',
    unitCost: 65.00,
    minStock: 15,
    supplier: 'Bakers Choice Supplies',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-6',
    name: 'Fresh Salmon Fillet',
    category: 'Seafood',
    currentStock: 10,
    unit: 'kg',
    unitCost: 980.00,
    minStock: 4,
    supplier: 'Ocean Fresh Seafood',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-7',
    name: 'Heavy Cream',
    category: 'Dairy',
    currentStock: 20,
    unit: 'liters',
    unitCost: 240.00,
    minStock: 5,
    supplier: 'Dairy Fresh Co',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-8',
    name: 'Garlic Cloves',
    category: 'Produce',
    currentStock: 15,
    unit: 'kg',
    unitCost: 150.00,
    minStock: 3,
    supplier: 'Green Harvest Farm',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-9',
    name: 'Whole Milk',
    category: 'Dairy',
    currentStock: 30,
    unit: 'liters',
    unitCost: 95.00,
    minStock: 10,
    supplier: 'Dairy Fresh Co',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-10',
    name: 'Salted Butter',
    category: 'Dairy',
    currentStock: 22,
    unit: 'kg',
    unitCost: 420.00,
    minStock: 5,
    supplier: 'Dairy Fresh Co',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-k-11',
    name: 'Jasmine Rice 25kg',
    category: 'Dry Goods',
    currentStock: 10,
    unit: 'sacks',
    unitCost: 1250.00,
    minStock: 3,
    supplier: 'National Rice Traders',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-k-12',
    name: 'Cooking Oil 18L',
    category: 'Oils & Spices',
    currentStock: 8,
    unit: 'tins',
    unitCost: 1400.00,
    minStock: 2,
    supplier: 'Golden Palm Oils',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-k-13',
    name: 'Granulated Sugar 50kg',
    category: 'Dry Goods',
    currentStock: 5,
    unit: 'sacks',
    unitCost: 3200.00,
    minStock: 2,
    supplier: 'Sweet Harvest Corp',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-k-14',
    name: 'Iodized Salt 1kg',
    category: 'Oils & Spices',
    currentStock: 30,
    unit: 'packs',
    unitCost: 35.00,
    minStock: 10,
    supplier: 'National Salt Co',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-k-15',
    name: 'Fresh Whole Eggs',
    category: 'Dairy',
    currentStock: 25,
    unit: 'trays',
    unitCost: 210.00,
    minStock: 8,
    supplier: 'Poultry Fresh Direct',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-k-16',
    name: 'Yellow Onions',
    category: 'Produce',
    currentStock: 25,
    unit: 'kg',
    unitCost: 90.00,
    minStock: 5,
    supplier: 'Green Harvest Farm',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-k-17',
    name: 'Pork Tenderloin',
    category: 'Meat & Poultry',
    currentStock: 12,
    unit: 'kg',
    unitCost: 320.00,
    minStock: 4,
    supplier: 'Prime Meats Philippines',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-k-18',
    name: 'Soy Sauce 1L',
    category: 'Oils & Spices',
    currentStock: 20,
    unit: 'bottles',
    unitCost: 65.00,
    minStock: 5,
    supplier: 'Golden Palm Oils',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-k-19',
    name: 'Vinegar 1L',
    category: 'Oils & Spices',
    currentStock: 20,
    unit: 'bottles',
    unitCost: 45.00,
    minStock: 5,
    supplier: 'Golden Palm Oils',
    lastUpdated: '2026-08-01T10:00:00Z',
    section: 'KITCHEN'
  },
  {
    id: 'item-11',
    name: 'Luxury Bath Towels',
    category: 'Linens',
    currentStock: 45,
    unit: 'pieces',
    unitCost: 12.00,
    minStock: 15,
    supplier: 'Soft Cotton Bedding Corp',
    lastUpdated: '2026-07-07T10:00:00Z',
    section: 'LINENS'
  },
  {
    id: 'item-12',
    name: 'King-Size Bed Sheets',
    category: 'Linens',
    currentStock: 28,
    unit: 'pieces',
    unitCost: 18.50,
    minStock: 30, // Trigger low-stock alert
    supplier: 'Soft Cotton Bedding Corp',
    lastUpdated: '2026-07-07T10:15:00Z',
    section: 'LINENS'
  },
  {
    id: 'item-13',
    name: 'Premium Liquid Hand Soap',
    category: 'Toiletries',
    currentStock: 120,
    unit: 'bottles',
    unitCost: 2.20,
    minStock: 40,
    supplier: 'Hygiene & Clean Supplies',
    lastUpdated: '2026-07-07T10:30:00Z',
    section: 'HOUSEKEEPING'
  },
  {
    id: 'item-14',
    name: 'All-Purpose Disinfectant Cleaner',
    category: 'Cleaning Supplies',
    currentStock: 8,
    unit: 'liters',
    unitCost: 5.50,
    minStock: 10, // Trigger low-stock alert
    supplier: 'EcoClean Wholesale Services',
    lastUpdated: '2026-07-07T10:45:00Z',
    section: 'HOUSEKEEPING'
  },
  {
    id: 'item-15',
    name: 'Microfiber Cleaning Cloths',
    category: 'Cleaning Supplies',
    currentStock: 60,
    unit: 'pieces',
    unitCost: 1.10,
    minStock: 20,
    supplier: 'EcoClean Wholesale Services',
    lastUpdated: '2026-07-07T11:00:00Z',
    section: 'HOUSEKEEPING'
  },
  {
    id: 'item-it-1',
    name: 'Cisco Gigabit Ethernet Switch 24-Port',
    category: 'Networking',
    currentStock: 5,
    unit: 'units',
    unitCost: 14500.00,
    minStock: 2,
    supplier: 'TechServe IT Solutions',
    lastUpdated: '2026-07-23T00:00:00Z',
    section: 'IT_EQUIPMENTS'
  },
  {
    id: 'item-it-2',
    name: 'UniFi Long Range Wi-Fi Access Point',
    category: 'Networking',
    currentStock: 12,
    unit: 'units',
    unitCost: 7800.00,
    minStock: 4,
    supplier: 'TechServe IT Solutions',
    lastUpdated: '2026-07-23T00:00:00Z',
    section: 'IT_EQUIPMENTS'
  },
  {
    id: 'item-it-3',
    name: 'EPSON Thermal POS Receipt Printer',
    category: 'POS & Hardware',
    currentStock: 8,
    unit: 'units',
    unitCost: 6200.00,
    minStock: 3,
    supplier: 'Infotech Supplies Inc.',
    lastUpdated: '2026-07-23T00:00:00Z',
    section: 'IT_EQUIPMENTS'
  }
];

export const INITIAL_REQUISITIONS: Requisition[] = [
  {
    id: 'req-1',
    requisitionNumber: 'PR-1001',
    createdBy: 'user-chef',
    createdByName: 'Head Chef Marcus',
    createdAt: '2026-07-06T10:00:00Z',
    purpose: 'Weekend Dinner Specials preparation',
    requestingDept: 'KITCHEN',
    allocatedLocation: 'Main Kitchen Prep Station',
    priority: 'high',
    status: 'received',
    items: [
      {
        itemId: 'item-1',
        itemName: 'Fresh Chicken Breast',
        quantity: 10,
        unit: 'kg',
        unitCost: 8.50,
        targetTab: 'KITCHEN',
        allocatedLocation: 'Walk-in Cooler B'
      },
      {
        itemId: 'item-3',
        itemName: 'Organic Vine Tomatoes',
        quantity: 5,
        unit: 'kg',
        unitCost: 3.20,
        targetTab: 'KITCHEN',
        allocatedLocation: 'Cold Storage Room'
      }
    ],
    totalCost: 101.00,
    notes: 'Delivered directly to walk-in cooler B.',
    approvedBy: 'user-admin',
    approvedByName: 'Property Custodian (Admin)',
    approvedAt: '2026-07-06T11:15:00Z',
    orderedAt: '2026-07-06T11:45:00Z',
    receivedAt: '2026-07-06T16:00:00Z'
  },
  {
    id: 'req-2',
    requisitionNumber: 'PR-1002',
    createdBy: 'user-sous',
    createdByName: 'Sous Chef Elena',
    createdAt: '2026-07-07T09:15:00Z',
    purpose: 'Baking station supplies replenishment',
    requestingDept: 'KITCHEN',
    allocatedLocation: 'Pastry & Bakery Station',
    priority: 'medium',
    status: 'pending',
    items: [
      {
        itemId: 'item-9',
        itemName: 'All-Purpose Flour',
        quantity: 20,
        unit: 'kg',
        unitCost: 1.20,
        targetTab: 'KITCHEN',
        allocatedLocation: 'Pastry & Bakery Station'
      },
      {
        itemId: 'item-10',
        itemName: 'Salted Butter',
        quantity: 5,
        unit: 'kg',
        unitCost: 7.90,
        targetTab: 'KITCHEN',
        allocatedLocation: 'Pastry & Bakery Station'
      }
    ],
    totalCost: 63.50,
    notes: 'Urgent restocking before Wednesday bakery prep.'
  },
  {
    id: 'req-3',
    requisitionNumber: 'PR-1003',
    createdBy: 'user-chef',
    createdByName: 'Head Chef Marcus',
    createdAt: '2026-07-07T11:00:00Z',
    purpose: 'Replenishing low-stock whole milk & onions',
    priority: 'low',
    status: 'approved',
    items: [
      {
        itemId: 'item-2',
        itemName: 'Whole Milk',
        quantity: 15,
        unit: 'liters',
        unitCost: 1.80
      },
      {
        itemId: 'item-6',
        itemName: 'Yellow Onions',
        quantity: 20,
        unit: 'kg',
        unitCost: 1.50
      }
    ],
    totalCost: 57.00,
    notes: 'Wait for standard weekly supplier route.',
    approvedBy: 'user-admin',
    approvedByName: 'Primary Root (Admin)',
    approvedAt: '2026-07-07T12:30:00Z'
  }
];

export const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'user-admin',
    username: 'admin',
    action: 'System Init',
    details: 'Initial database configured with 10 core inventory products.',
    timestamp: '2026-07-05T00:00:00Z'
  },
  {
    id: 'log-2',
    userId: 'user-chef',
    username: 'chef',
    action: 'Created Requisition',
    details: 'Created PR-1001 for weekend preparation ($101.00).',
    timestamp: '2026-07-06T10:00:00Z'
  },
  {
    id: 'log-3',
    userId: 'user-admin',
    username: 'admin',
    action: 'Approved Requisition',
    details: 'Approved PR-1001 and dispatched ordering.',
    timestamp: '2026-07-06T11:15:00Z'
  },
  {
    id: 'log-4',
    userId: 'user-admin',
    username: 'admin',
    action: 'Received Requisition',
    details: 'Received items for PR-1001. Inventory quantities updated.',
    timestamp: '2026-07-06T16:00:00Z'
  }
];

export const INITIAL_ROOMS = [
  {
    id: 'room-101',
    roomNumber: 'Room 101',
    roomType: 'Junior Suite',
    floor: '1st Floor',
    status: 'Clean' as const,
    lastInspected: '2026-07-20',
    notes: 'Ground floor near main garden',
    deployedItems: [
      {
        id: 'dep-101-1',
        name: 'Samsung 55" Smart TV',
        category: 'Electronics',
        quantity: 1,
        unit: 'unit',
        unitCost: 28000,
        condition: 'Good / Working' as const,
        serialNumber: 'SN-TV-101-88',
        dateDeployed: '2026-01-15',
        notes: 'Mounted on wall'
      },
      {
        id: 'dep-101-2',
        name: 'Carrier Split Air Conditioner 1.5HP',
        category: 'Appliances',
        quantity: 1,
        unit: 'unit',
        unitCost: 32000,
        condition: 'Good / Working' as const,
        serialNumber: 'SN-AC-101-02',
        dateDeployed: '2026-01-15'
      },
      {
        id: 'dep-101-3',
        name: 'Luxury Bath Towels',
        category: 'Linens',
        quantity: 4,
        unit: 'pieces',
        unitCost: 500,
        condition: 'Good / Working' as const,
        dateDeployed: '2026-07-18'
      }
    ]
  },
  {
    id: 'room-102',
    roomNumber: 'Room 102',
    roomType: 'Deluxe Rooms',
    floor: '1st Floor',
    status: 'Occupied' as const,
    lastInspected: '2026-07-21',
    notes: 'Pool view',
    deployedItems: [
      {
        id: 'dep-102-1',
        name: 'Mini Refrigerator 50L',
        category: 'Appliances',
        quantity: 1,
        unit: 'unit',
        unitCost: 8500,
        condition: 'Good / Working' as const,
        serialNumber: 'SN-RF-102-09',
        dateDeployed: '2026-02-10'
      },
      {
        id: 'dep-102-2',
        name: 'Electric Kettle 1.7L',
        category: 'Appliances',
        quantity: 1,
        unit: 'unit',
        unitCost: 1200,
        condition: 'Good / Working' as const,
        dateDeployed: '2026-02-10'
      }
    ]
  },
  {
    id: 'room-201',
    roomNumber: 'Room 201',
    roomType: 'Standard Rooms',
    floor: '2nd Floor',
    status: 'Vacant' as const,
    lastInspected: '2026-07-19',
    notes: 'Ocean view balcony',
    deployedItems: [
      {
        id: 'dep-201-1',
        name: 'Digital Safe Box',
        category: 'Electronics',
        quantity: 1,
        unit: 'unit',
        unitCost: 4500,
        condition: 'Good / Working' as const,
        serialNumber: 'SN-SF-201-33',
        dateDeployed: '2026-03-01'
      }
    ]
  }
];

export const INITIAL_FOOD_REQUISITIONS: FoodRequisition[] = [
  {
    id: 'freq-1',
    requisitionNumber: 'FREQ-2026-001',
    createdBy: 'user-staff',
    createdByName: 'Kitchen & Operations Staff',
    createdAt: '2026-08-08T08:30:00Z',
    requestingDept: 'Kitchen / F&B Operations',
    eventOrPurpose: 'Managing Director VIP Guest Breakfast Service',
    mealType: 'breakfast',
    items: [
      {
        id: 'fi-1',
        mealName: 'Executive Breakfast Platter (American / Filipino)',
        paxOrQty: 10,
        unitPrice: 350,
        totalCost: 3500
      },
      {
        id: 'fi-2',
        mealName: 'Fresh Tropical Fruit Juices (Pitcher)',
        paxOrQty: 3,
        unitPrice: 250,
        totalCost: 750
      }
    ],
    totalCost: 4250,
    status: 'approved',
    notes: 'Served in VIP Dining Room 1.',
    approvedBy: 'user-director',
    approvedByName: 'Hotel Managing Director',
    approvedAt: '2026-08-08T09:00:00Z'
  },
  {
    id: 'freq-2',
    requisitionNumber: 'FREQ-2026-002',
    createdBy: 'user-staff',
    createdByName: 'Kitchen & Operations Staff',
    createdAt: '2026-08-09T11:15:00Z',
    requestingDept: 'Housekeeping & Maintenance',
    eventOrPurpose: 'Duty Staff Night Shift Buffet Meal',
    mealType: 'dinner',
    items: [
      {
        id: 'fi-3',
        mealName: 'Staff Duty Dinner Meal Combo',
        paxOrQty: 18,
        unitPrice: 150,
        totalCost: 2700
      }
    ],
    totalCost: 2700,
    status: 'pending',
    notes: 'Scheduled for 7:00 PM shift change break.'
  }
];
