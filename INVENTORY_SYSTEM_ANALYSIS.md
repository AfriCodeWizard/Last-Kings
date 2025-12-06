# Inventory System Analysis

## Overview

The inventory system tracks stock levels across multiple locations and maintains a complete audit trail of all inventory movements. It's designed to support a multi-location liquor store with proper lot tracking and automated stock updates.

## Core Components

### 1. **Inventory Locations** (`inventory_locations`)

The system supports multiple storage locations with three types:
- **`floor`**: Sales floor (where products are displayed for customers)
- **`backroom`**: Storage area behind the sales floor
- **`warehouse`**: Main warehouse/storage facility

**Purpose**: Allows you to track inventory across different physical locations in your store.

**Example**:
- "Main Floor" (type: floor)
- "Back Storage" (type: backroom)
- "Warehouse A" (type: warehouse)

### 2. **Stock Levels** (`stock_levels`)

This is the **current inventory snapshot** - it shows how much of each product variant you have at each location.

**Key Fields**:
- `variant_id`: Which product variant (e.g., "Johnnie Walker Red Label 750ml")
- `location_id`: Which location it's stored at
- `quantity`: Current quantity in stock
- `lot_number`: Batch/lot number (for tracking expiry, recalls, etc.)
- `expiry_date`: When the product expires (if applicable)

**Unique Constraint**: `(variant_id, location_id, lot_number)` - This means you can have the same product at the same location with different lot numbers, and they're tracked separately.

**Example**:
```
Product: Johnnie Walker Red Label 750ml
Location: Main Floor
Lot Number: LOT-2024-001
Quantity: 25 bottles
Expiry: 2025-12-31
```

### 3. **Inventory Transactions** (`inventory_transactions`)

This is the **audit trail** - a complete history of every inventory movement.

**Transaction Types**:
- `receiving`: When you receive new stock (from purchase orders)
- `sale`: When you sell products (reduces stock)
- `transfer`: Moving stock between locations (NOT YET IMPLEMENTED)
- `adjustment`: Manual adjustments (NOT YET IMPLEMENTED)
- `cycle_count`: Physical count corrections (NOT YET IMPLEMENTED)

**Purpose**: 
- Track who did what and when
- Audit compliance
- Debugging inventory discrepancies
- Historical reporting

## How Stock Updates Work (Automated)

### When Receiving Stock (Receiving Page)

1. **User scans/enters products** on the Receiving page
2. **System creates a receiving session** (`receiving_sessions`)
3. **User adds items** to the session (`received_items`)
4. **Database trigger automatically**:
   - Updates `stock_levels` (adds quantity to the specified location)
   - Creates an `inventory_transaction` record (type: 'receiving')

**Flow**:
```
Receiving Page → received_items table → TRIGGER → stock_levels (quantity increases)
                                              → inventory_transactions (audit record)
```

### When Selling Products (POS Page)

1. **User scans/selects products** on the POS page
2. **User completes sale** (creates `sales` and `sale_items` records)
3. **Database trigger automatically**:
   - Updates `stock_levels` (reduces quantity from 'floor' location)
   - Creates an `inventory_transaction` record (type: 'sale')

**Flow**:
```
POS Page → sale_items table → TRIGGER → stock_levels (quantity decreases from floor)
                                    → inventory_transactions (audit record)
```

**Important**: Sales always reduce stock from the 'floor' location (the first floor location found).

## Current Inventory Page Features

### What It Shows:

1. **Location Cards**: 
   - Displays each inventory location
   - Shows total items count per location
   - Quick overview of inventory distribution

2. **Stock Levels Table**:
   - Lists all products with their current stock
   - Shows: Product name, SKU, Size, Location, Quantity, Lot Number, Status
   - Color-coded status badges:
     - **Red (Low Stock)**: Quantity < 10
     - **Gray (Medium)**: Quantity 10-24
     - **Green (In Stock)**: Quantity ≥ 25

### What's Missing (Buttons Exist But Pages Don't):

1. **Cycle Count** (`/inventory/cycle-count`) - **NOT IMPLEMENTED**
   - **Purpose**: Physical inventory count to correct discrepancies
   - **How it should work**:
     - Staff counts actual physical inventory
     - System compares physical count vs. system count
     - Creates adjustments to correct differences
     - Updates stock levels and creates 'cycle_count' transactions

2. **Transfer** (`/inventory/transfer`) - **NOT IMPLEMENTED**
   - **Purpose**: Move stock between locations
   - **How it should work**:
     - Select source location (e.g., "Warehouse")
     - Select destination location (e.g., "Floor")
     - Select product and quantity
     - System reduces from source, adds to destination
     - Creates 'transfer' transaction records

## Inventory Workflow (Complete Picture)

### 1. **Receiving New Stock**
```
Purchase Order → Receiving Page → Scan Products → 
  → Stock added to specified location → 
  → Stock levels updated → 
  → Transaction recorded
```

### 2. **Selling Products**
```
POS Page → Scan/Select Products → Complete Sale → 
  → Stock reduced from floor location → 
  → Stock levels updated → 
  → Transaction recorded
```

### 3. **Transferring Stock** (Not Yet Implemented)
```
Transfer Page → Select Source Location → Select Destination → 
  → Select Products → Confirm Transfer → 
  → Stock moved between locations → 
  → Transfer transaction recorded
```

### 4. **Cycle Counting** (Not Yet Implemented)
```
Cycle Count Page → Select Location → Count Physical Inventory → 
  → Compare with System Count → 
  → Create Adjustments → 
  → Stock levels corrected → 
  → Cycle count transaction recorded
```

## Key Design Decisions

### Why Separate Locations?

- **Floor**: Fast-moving stock for immediate sales
- **Backroom**: Backup stock for quick restocking
- **Warehouse**: Bulk storage for long-term inventory

### Why Lot Numbers?

- **Expiry Tracking**: Know which batches are expiring soon
- **Recall Management**: If a batch has issues, you can track it
- **FIFO (First In, First Out)**: Sell older stock first
- **Compliance**: Some regulations require lot tracking

### Why Automatic Triggers?

- **Data Integrity**: Stock levels always match transactions
- **No Manual Errors**: Can't forget to update stock
- **Audit Trail**: Every change is automatically recorded
- **Real-time Updates**: Stock levels are always current

## Current Limitations

1. **No Transfer Functionality**: Can't move stock between locations
2. **No Cycle Count**: Can't do physical inventory counts
3. **No Manual Adjustments**: Can't manually correct stock levels
4. **Sales Only from Floor**: System assumes all sales come from floor location
5. **No Low Stock Alerts**: System shows low stock but doesn't alert

## Recommendations

### Immediate Needs:

1. **Implement Transfer Page**:
   - Allow moving stock between locations
   - Essential for restocking floor from backroom/warehouse

2. **Implement Cycle Count Page**:
   - Physical inventory counts
   - Correct discrepancies
   - Regular audits

3. **Add Manual Adjustment**:
   - For corrections, damage, theft, etc.
   - Create 'adjustment' transactions

### Future Enhancements:

1. **Low Stock Alerts**: Notify when stock falls below threshold
2. **Replenishment Suggestions**: Suggest transfers from warehouse to floor
3. **Expiry Alerts**: Warn about expiring products
4. **Location-Specific Reports**: Stock levels per location
5. **Transfer History**: Track all transfers between locations

## Database Schema Summary

```
inventory_locations (where stock is stored)
  ├── id, name, type (floor/backroom/warehouse)

stock_levels (current stock at each location)
  ├── variant_id, location_id, quantity, lot_number, expiry_date
  └── UNIQUE(variant_id, location_id, lot_number)

inventory_transactions (audit trail of all movements)
  ├── variant_id, location_id, transaction_type, quantity_change
  ├── lot_number, reference_id, created_by, created_at
  └── Types: receiving, sale, transfer, adjustment, cycle_count

receiving_sessions (receiving batches)
  └── Links to purchase orders

received_items (items in receiving session)
  └── Triggers stock_levels update
```

## How to Use the Current System

### Viewing Inventory:
1. Go to **Inventory** page
2. See location cards with total items
3. View detailed stock levels table
4. Identify low stock items (red badges)

### Receiving Stock:
1. Go to **Receiving** page
2. Select purchase order (optional)
3. Scan or manually add products
4. Stock automatically added to specified location

### Selling Stock:
1. Go to **POS** page
2. Scan or select products
3. Complete sale
4. Stock automatically reduced from floor location

### What You Can't Do Yet:
- ❌ Transfer stock between locations
- ❌ Do physical inventory counts (cycle count)
- ❌ Manually adjust stock levels
- ❌ View transfer history
- ❌ Get low stock alerts

## Conclusion

The inventory system has a **solid foundation** with:
- ✅ Multi-location support
- ✅ Automatic stock updates
- ✅ Complete audit trail
- ✅ Lot number tracking
- ✅ Real-time stock levels

But it's **missing key operational features**:
- ❌ Transfer functionality
- ❌ Cycle count
- ❌ Manual adjustments

The buttons exist on the Inventory page, but the actual pages need to be built to complete the inventory management workflow.

