# User Hierarchy & Permissions Guide

## Overview
The Last Kings system uses a role-based access control (RBAC) system with three user roles: **Admin**, **Manager**, and **Staff**. Additionally, all users (except admins) must be approved before they can fully access the system.

---

## User Roles

### 1. **Admin** 👑
**Status**: Auto-approved upon registration

**Full System Access**:
- ✅ **View Costs**: Can see product costs, purchase prices, profit margins
- ✅ **Manage Users**: 
  - View all users
  - Approve/reject pending user accounts
  - Remove users from the system
  - Change user roles
- ✅ **Add Customers**: Create and manage customer profiles
- ✅ **Add Distributors**: Create and manage supplier/distributor relationships
- ✅ **All Settings**: Full access to all system settings
- ✅ **All Features**: Complete access to all modules

**What Admins Can Do**:
- View dashboard with full metrics
- Process sales (POS)
- Receive inventory
- Create and manage purchase orders
- View and manage products (with costs visible)
- Manage inventory
- View reports
- Manage customers
- Manage distributors
- Manage users and approvals
- Configure tax rates
- Manage inventory locations

---

### 2. **Manager** 📊
**Status**: Requires admin approval before full access

**Access Level**: High (but limited compared to admin)

**Permissions**:
- ✅ **View Costs**: Can see product costs, purchase prices, profit margins
- ❌ **Manage Users**: Cannot approve users or manage user accounts
- ✅ **Add Customers**: Can create and manage customer profiles
- ✅ **Add Distributors**: Can create and manage supplier/distributor relationships
- ✅ **Settings Access**: Can manage most settings (except user management)

**What Managers Can Do**:
- View dashboard with full metrics
- Process sales (POS)
- Receive inventory
- Create and manage purchase orders
- View and manage products (with costs visible)
- Manage inventory
- View reports
- Manage customers
- Manage distributors
- Configure tax rates
- Manage inventory locations

**What Managers Cannot Do**:
- ❌ Approve or reject user accounts
- ❌ Remove users from the system
- ❌ Change user roles
- ❌ Access user management settings

---

### 3. **Staff** 👤
**Status**: Requires admin approval before full access

**Access Level**: Limited (operational tasks only)

**Permissions**:
- ❌ **View Costs**: Cannot see product costs, purchase prices, or profit margins
- ❌ **Manage Users**: No access to user management
- ❌ **Add Customers**: Cannot create new customer profiles
- ❌ **Add Distributors**: Cannot create new distributors
- ⚠️ **Settings Access**: Limited settings access

**What Staff Can Do**:
- View dashboard (without cost information)
- Process sales (POS)
- Receive inventory
- View purchase orders (likely read-only, need to verify)
- View products (costs hidden)
- View inventory
- View reports (without cost data)
- View customers (read-only)
- View distributors (read-only)

**What Staff Cannot Do**:
- ❌ See product costs or profit margins
- ❌ Create new customers
- ❌ Create new distributors
- ❌ Manage users
- ❌ Approve user accounts
- ❌ Access most settings

---

## Approval System

### How It Works:
1. **New User Registration**: 
   - Users can register with any role (admin, manager, or staff)
   - Admin users are **automatically approved** upon registration
   - Manager and Staff users start with `is_approved = FALSE`

2. **Pending Approval State**:
   - Unapproved users can log in but see a "Account Pending Approval" message
   - They cannot access the full dashboard or system features
   - Only admins can approve pending users

3. **Approval Process**:
   - Admins go to Settings → Users
   - They see a list of all users with their approval status
   - Admins can click "Approve" to activate a user account
   - Once approved, users gain full access according to their role

---

## Permission Matrix

| Feature | Admin | Manager | Staff |
|---------|-------|---------|-------|
| **Dashboard** | ✅ Full | ✅ Full | ✅ Limited (no costs) |
| **View Costs** | ✅ Yes | ✅ Yes | ❌ No |
| **POS / Sales** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Receiving** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Purchase Orders** | ✅ Full | ✅ Full | ⚠️ View Only? |
| **Products** | ✅ Full (with costs) | ✅ Full (with costs) | ✅ View (no costs) |
| **Inventory** | ✅ Full | ✅ Full | ✅ View |
| **Reports** | ✅ Full | ✅ Full | ✅ Limited (no costs) |
| **Customers** | ✅ Full | ✅ Full | ⚠️ View Only |
| **Add Customers** | ✅ Yes | ✅ Yes | ❌ No |
| **Distributors** | ✅ Full | ✅ Full | ⚠️ View Only |
| **Add Distributors** | ✅ Yes | ✅ Yes | ❌ No |
| **User Management** | ✅ Yes | ❌ No | ❌ No |
| **Approve Users** | ✅ Yes | ❌ No | ❌ No |
| **Settings** | ✅ Full | ✅ Most | ⚠️ Limited |

---

## Key Permission Functions

The system uses these permission checks (defined in `lib/auth.ts`):

- `canViewCosts(role)`: Returns `true` for admin and manager, `false` for staff
- `canManageUsers(role)`: Returns `true` only for admin
- `canAddCustomers(role)`: Returns `true` for admin and manager
- `canAddDistributors(role)`: Returns `true` for admin and manager
- `requireApproved()`: Ensures user is approved (admins bypass this check)
- `requireRole(allowedRoles)`: Restricts access to specific roles

---

## Security Notes

1. **Admin Auto-Approval**: Admin users are automatically approved to prevent lockout scenarios
2. **Role-Based UI**: The interface adapts based on user role (e.g., cost columns hidden for staff)
3. **Server-Side Validation**: All permission checks are enforced server-side, not just client-side
4. **Protected Routes**: All routes under `/app/(protected)/` require authentication

---

## Best Practices

1. **User Registration**: 
   - Only create admin accounts for trusted personnel
   - Most users should register as "staff" or "manager"
   - Admins should review and approve new accounts promptly

2. **Role Assignment**:
   - **Admin**: System administrators, owners
   - **Manager**: Store managers, supervisors who need cost visibility
   - **Staff**: Cashiers, floor staff who don't need cost information

3. **Approval Workflow**:
   - Review new user registrations regularly
   - Verify user identity before approving
   - Remove inactive or unauthorized users promptly

