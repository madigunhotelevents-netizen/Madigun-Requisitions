# Security Specification - Madigun Kitchen & Requisitions Hub

This document specifies the security invariants and access control constraints for the Firestore database of the Madigun Hotel & Events Requisition & Kitchen Inventory application.

## 1. Data Invariants

1. **User Identity & Role Integrity**: A user's role must be one of `admin`, `staff`, `rooms_event_officer`, or `purchaser`. Users cannot modify their own roles to escalate privileges.
2. **Stock Boundaries**: Inventory stock levels must never be negative. Items must have a valid non-empty `name`, `category`, `unit`, and `supplier`.
3. **Requisition Progression**: Requisitions must follow a strict lifecycle flow: `pending` -> `approved` -> `ordered` -> `received`, or `pending`/`approved` -> `rejected`.
4. **Immutable Timestamps & Creators**: Requisition fields like `createdAt` and `createdBy` must remain immutable once created.
5. **Branding Configurations**: Global custom configuration elements (e.g., categories list and custom logo) can only be altered by users with an `admin` role.

---

## 2. The "Dirty Dozen" Hostile Payloads

Below are the 12 hostile payloads designed to compromise database integrity, identity, or State. Our rules are mathematically structured to deny all of these.

### Payload 1: Privilege Escalation (User Collection)
An unauthenticated or standard user attempts to overwrite their role to `admin`.
```json
{
  "id": "user-chef",
  "username": "chef",
  "role": "admin",
  "password": "compromised-role"
}
```

### Payload 2: Negative Inventory Stock Injection
An attacker attempts to inject a negative stock value or infinite stock.
```json
{
  "id": "item-1",
  "name": "Fresh Chicken Breast",
  "category": "Meat & Poultry",
  "currentStock": -999,
  "unit": "kg",
  "unitCost": 8.50,
  "minStock": 15,
  "supplier": "Gourmet Poultry",
  "lastUpdated": "2026-07-09T00:00:00Z"
}
```

### Payload 3: Illegal Status Transition (Bypassing Approval)
An ordinary staff member submits a requisition directly with status `approved` or `received` instead of `pending`.
```json
{
  "id": "req-999",
  "requisitionNumber": "PR-9999",
  "createdBy": "user-chef",
  "createdByName": "Head Chef Marcus",
  "createdAt": "2026-07-09T00:00:00Z",
  "purpose": "Weekend Special Prep",
  "priority": "high",
  "status": "received",
  "totalCost": 500.00,
  "items": []
}
```

### Payload 4: Overwriting Immutable CreatedAt on Update
An attacker attempts to tamper with the creation date of a historical requisition.
```json
{
  "id": "req-1",
  "createdAt": "1970-01-01T00:00:00Z"
}
```

### Payload 5: Zero/Negative Pricing Attack
Injecting negative or zero unit cost to bypass financial calculations.
```json
{
  "id": "item-2",
  "name": "Whole Milk",
  "category": "Dairy",
  "currentStock": 5,
  "unit": "liters",
  "unitCost": -10.50,
  "minStock": 10,
  "supplier": "Valley Dairy",
  "lastUpdated": "2026-07-09T00:00:00Z"
}
```

### Payload 6: Shadow Fields (Undefined Keys)
Attempting to create documents with custom metadata or tracking keys not present in the schema.
```json
{
  "id": "item-10",
  "name": "Salted Butter",
  "category": "Dairy",
  "currentStock": 10,
  "unit": "kg",
  "unitCost": 7.90,
  "minStock": 6,
  "supplier": "Valley Dairy",
  "lastUpdated": "2026-07-09T00:00:00Z",
  "attackerPayload": "hacked-data"
}
```

### Payload 7: Identity Hijacking
Submitting a requisition with another user's ID as the `createdBy` property.
```json
{
  "id": "req-456",
  "requisitionNumber": "PR-1004",
  "createdBy": "user-admin",
  "createdByName": "Primary Root (Admin)",
  "createdAt": "2026-07-09T00:00:00Z",
  "status": "pending",
  "priority": "medium",
  "purpose": "Hacked Requisition",
  "totalCost": 12.00,
  "items": []
}
```

### Payload 8: Corrupting System Categories (Non-Admin Write)
An unauthorized non-admin trying to clear or modify the list of approved food categories.
```json
{
  "categories": ["Only Alcohol"],
  "customLogo": "http://malicious-watermark.com/logo.png"
}
```

### Payload 9: Long ID Denial of Wallet Attack
Creating documents with oversized IDs (> 128 characters) to exhaust storage queries.
```json
{
  "id": "item-verylongstringmorethan128characters..."
}
```

### Payload 10: Array Poisoning
Submitting an array of items without type safety (e.g., string elements inside an item object array).
```json
{
  "id": "req-777",
  "items": ["corrupt-string", 12345]
}
```

### Payload 11: Bypassing Audit Logs (Direct Delete)
Attempting to delete audit log entries directly from the client without admin intervention.
```javascript
db.collection("logs").doc("log-1").delete()
```

### Payload 12: Terminal State Tampering
Attempting to alter a requisition after it has reached a terminal state (e.g., `rejected` or `received`).
```json
{
  "status": "pending"
}
```

---

## 3. The Security Rules Test Outline

Every test operation for the payloads above returns `PERMISSION_DENIED`. The security policies are declared using a default-deny paradigm.
