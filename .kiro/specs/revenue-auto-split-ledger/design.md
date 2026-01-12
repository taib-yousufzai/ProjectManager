# Design Document

## Overview

The Revenue Auto-Split + Ledger System is a comprehensive financial management module that integrates seamlessly with the existing Firebase-based Project & Payment Management System. The system automatically generates ledger entries when payments are verified, manages revenue distribution rules, maintains running balances, and provides settlement workflows.

The architecture follows the existing React + Firebase pattern, extending current Firestore collections and adding new ones for revenue rules and ledger entries. The system uses event-driven architecture where payment verification triggers automatic ledger entry creation through Firebase Cloud Functions or client-side listeners.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (React)                     │
├─────────────────────────────────────────────────────────────┤
│  Revenue Rules Page  │  Ledger Page  │  Enhanced Payment UI │
│  - Rule Management   │  - Entry List │  - Revenue Breakdown │
│  - Percentage Sliders│  - Filtering  │  - Split Visualization│
│  - Validation        │  - Settlement │  - Proof Integration │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  revenueService.js   │  ledgerService.js  │  Enhanced       │
│  - Rule CRUD         │  - Entry CRUD      │  paymentService │
│  - Split Calculation │  - Balance Calc    │  - Verification │
│  - Validation        │  - Settlement      │  - Integration  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Firebase Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Firestore Collections:                                     │
│  - revenueRules (new)    - ledgerEntries (new)            │
│  - payments (extended)   - settlements (new)               │
│  - projects (existing)   - users (existing)                │
└─────────────────────────────────────────────────────────────┘
```

### Event-Driven Revenue Processing

```
Payment Verification → Revenue Engine → Ledger Creation → Notifications
       │                     │               │              │
   verified=true      Calculate Split    Create Entries   Notify Parties
```

### Component Architecture

```
src/
├── components/
│   ├── features/
│   │   ├── RevenueRules/
│   │   │   ├── RevenueRuleForm.jsx
│   │   │   ├── RevenueRuleList.jsx
│   │   │   └── PercentageSlider.jsx
│   │   ├── Ledger/
│   │   │   ├── LedgerTable.jsx
│   │   │   ├── LedgerFilters.jsx
│   │   │   ├── BalanceCard.jsx
│   │   │   └── SettlementModal.jsx
│   │   └── Revenue/
│   │       ├── RevenueBreakdown.jsx
│   │       ├── RevenuePieChart.jsx
│   │       └── MonthlyRevenueWidget.jsx
├── pages/
│   ├── RevenueRules/
│   ├── Ledger/
│   └── Enhanced ProjectDetails/ (Revenue tab)
├── services/
│   ├── revenueService.js
│   ├── ledgerService.js
│   └── settlementService.js
└── hooks/
    ├── useRevenueRules.js
    ├── useLedgerEntries.js
    └── useSettlements.js
```

## Components and Interfaces

### Firestore Schema Extensions

#### Revenue Rules Collection
```typescript
interface RevenueRule {
  id: string;
  ruleName: string;
  adminPercent: number;
  teamPercent: number;
  vendorPercent?: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### Ledger Entries Collection
```typescript
interface LedgerEntry {
  id: string;
  paymentId: string;
  projectId: string;
  revenueRuleId: string;
  type: 'credit' | 'debit';
  party: 'admin' | 'team' | 'vendor';
  amount: number;
  currency: string;
  date: Timestamp;
  status: 'pending' | 'cleared';
  remarks?: string;
  settlementId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Settlements Collection
```typescript
interface Settlement {
  id: string;
  party: 'admin' | 'team' | 'vendor';
  ledgerEntryIds: string[];
  totalAmount: number;
  currency: string;
  settlementDate: Timestamp;
  proofUrls?: string[];
  remarks?: string;
  createdBy: string;
  createdAt: Timestamp;
}
```

#### Extended Payment Schema
```typescript
interface Payment {
  // ... existing fields
  revenueRuleId?: string;
  ledgerEntryIds?: string[];
  revenueProcessed: boolean;
  revenueProcessedAt?: Timestamp;
}
```

### Core Service Interfaces

#### Revenue Service
```typescript
interface RevenueService {
  // Revenue Rules Management
  createRevenueRule(rule: Omit<RevenueRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateRevenueRule(id: string, updates: Partial<RevenueRule>): Promise<void>;
  getRevenueRules(): Promise<RevenueRule[]>;
  getActiveRevenueRule(projectId?: string): Promise<RevenueRule>;
  
  // Revenue Processing
  processPaymentRevenue(paymentId: string): Promise<LedgerEntry[]>;
  calculateRevenueSplit(amount: number, currency: string, rule: RevenueRule): RevenueSplit;
  validateRevenueRule(rule: Partial<RevenueRule>): ValidationResult;
}

interface RevenueSplit {
  admin: { amount: number; currency: string };
  team: { amount: number; currency: string };
  vendor?: { amount: number; currency: string };
}
```

#### Ledger Service
```typescript
interface LedgerService {
  // Ledger Entry Management
  createLedgerEntry(entry: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  getLedgerEntries(filters?: LedgerFilters): Promise<LedgerEntry[]>;
  updateLedgerEntryStatus(id: string, status: 'pending' | 'cleared'): Promise<void>;
  
  // Balance Calculations
  getPartyBalance(party: 'admin' | 'team' | 'vendor', currency?: string): Promise<PartyBalance>;
  getProjectLedgerSummary(projectId: string): Promise<ProjectLedgerSummary>;
  
  // Settlement Operations
  createSettlement(settlement: Omit<Settlement, 'id' | 'createdAt'>): Promise<string>;
  getSettlements(party?: string): Promise<Settlement[]>;
}

interface LedgerFilters {
  party?: 'admin' | 'team' | 'vendor';
  status?: 'pending' | 'cleared';
  dateRange?: { start: Date; end: Date };
  projectId?: string;
  currency?: string;
}

interface PartyBalance {
  party: string;
  totalPending: number;
  totalCleared: number;
  netBalance: number;
  currency: string;
  lastUpdated: Date;
}
```

### React Component Interfaces

#### Revenue Rule Components
```typescript
interface RevenueRuleFormProps {
  rule?: RevenueRule;
  onSave: (rule: Partial<RevenueRule>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface PercentageSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}
```

#### Ledger Components
```typescript
interface LedgerTableProps {
  entries: LedgerEntry[];
  onStatusChange: (entryId: string, status: 'pending' | 'cleared') => void;
  onSettlement: (entryIds: string[]) => void;
  loading?: boolean;
}

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: 'admin' | 'team' | 'vendor';
  selectedEntries: LedgerEntry[];
  onConfirm: (settlement: Partial<Settlement>) => Promise<void>;
}
```

#### Revenue Visualization Components
```typescript
interface RevenueBreakdownProps {
  paymentId: string;
  amount: number;
  currency: string;
  revenueRule: RevenueRule;
  showChart?: boolean;
}

interface MonthlyRevenueWidgetProps {
  dateRange: { start: Date; end: Date };
  currency?: string;
  showTrends?: boolean;
}
```

## Data Models

### Revenue Processing Flow

```typescript
class RevenueEngine {
  async processPaymentVerification(paymentId: string): Promise<void> {
    // 1. Validate payment is verified
    const payment = await this.paymentService.getPayment(paymentId);
    if (!payment.verified || payment.revenueProcessed) return;
    
    // 2. Get applicable revenue rule
    const rule = await this.revenueService.getActiveRevenueRule(payment.projectId);
    
    // 3. Calculate revenue split
    const split = this.revenueService.calculateRevenueSplit(
      payment.amount, 
      payment.currency, 
      rule
    );
    
    // 4. Create ledger entries
    const entries = await this.createLedgerEntries(payment, rule, split);
    
    // 5. Update payment with processing status
    await this.paymentService.updatePayment(paymentId, {
      revenueProcessed: true,
      revenueProcessedAt: new Date(),
      ledgerEntryIds: entries.map(e => e.id),
      revenueRuleId: rule.id
    });
    
    // 6. Send notifications
    await this.notificationService.notifyRevenueProcessed(payment, entries);
  }
}
```

### Balance Calculation Logic

```typescript
class BalanceCalculator {
  async calculatePartyBalance(party: string, currency?: string): Promise<PartyBalance> {
    const entries = await this.ledgerService.getLedgerEntries({
      party: party as 'admin' | 'team' | 'vendor',
      currency
    });
    
    const pending = entries
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + (e.type === 'credit' ? e.amount : -e.amount), 0);
      
    const cleared = entries
      .filter(e => e.status === 'cleared')
      .reduce((sum, e) => sum + (e.type === 'credit' ? e.amount : -e.amount), 0);
    
    return {
      party,
      totalPending: pending,
      totalCleared: cleared,
      netBalance: pending + cleared,
      currency: currency || 'USD',
      lastUpdated: new Date()
    };
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After reviewing the prework analysis, several properties can be consolidated to eliminate redundancy while maintaining comprehensive coverage:

### Property 1: Revenue Rule Validation
*For any* set of percentage values entered for a revenue rule, the system should validate that the total equals exactly 100% before allowing the rule to be saved.
**Validates: Requirements 1.3**

### Property 2: Revenue Rule Persistence
*For any* valid revenue rule, when saved, the system should store it in Firestore with a unique ID, timestamp, and all specified fields intact.
**Validates: Requirements 1.4**

### Property 3: Historical Data Preservation
*For any* revenue rule modification, existing ledger entries should remain unchanged and only future payments should use the updated rule.
**Validates: Requirements 1.5, 6.3**

### Property 4: Default Rule Fallback
*For any* payment without a specified revenue rule, the system should automatically apply the default revenue rule for split calculations.
**Validates: Requirements 1.6**

### Property 5: Automatic Revenue Processing
*For any* payment that becomes verified, the revenue engine should automatically trigger split calculation and ledger entry creation.
**Validates: Requirements 2.1, 7.1**

### Property 6: Revenue Split Calculation
*For any* payment amount and revenue rule, the calculated split should distribute the exact payment amount across all parties according to the rule percentages.
**Validates: Requirements 2.2, 2.3**

### Property 7: Ledger Entry Relationships
*For any* generated ledger entry, it should maintain proper links to the originating payment ID, project ID, and preserve the original currency.
**Validates: Requirements 2.4, 2.5**

### Property 8: Error Handling Isolation
*For any* revenue processing failure, the error should be logged and administrators notified without affecting the payment's verified status.
**Validates: Requirements 2.6**

### Property 9: Ledger Filtering and Display
*For any* combination of filter criteria (party, date range, project, status), the ledger should return only entries matching all specified filters and display complete entry information.
**Validates: Requirements 3.2, 3.3**

### Property 10: Balance Calculation Accuracy
*For any* set of ledger entries for a party, the running balance should accurately reflect the sum of all credits minus debits, grouped by currency.
**Validates: Requirements 3.4**

### Property 11: Data Protection Rules
*For any* ledger entry linked to a verified payment, the system should prevent modification or deletion of that entry.
**Validates: Requirements 3.6, 6.2**

### Property 12: Settlement Processing
*For any* selection of pending ledger entries, the settlement process should mark all selected entries as "cleared" and create a corresponding settlement record.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 13: Settlement Notifications
*For any* completed settlement, the system should send notifications to the affected party with settlement details.
**Validates: Requirements 4.6, 9.2**

### Property 14: Revenue Visualization Accuracy
*For any* payment with processed revenue, the visual breakdown should accurately represent the split amounts according to the applied revenue rule.
**Validates: Requirements 5.1**

### Property 15: Export Functionality
*For any* set of ledger data, the export function should generate complete CSV and PDF reports containing all relevant entry information.
**Validates: Requirements 5.3**

### Property 16: Dashboard Calculations
*For any* current ledger state, the dashboard should accurately calculate and display pending payout amounts per party.
**Validates: Requirements 5.4**

### Property 17: Input Validation
*For any* monetary amount input, the system should validate that values are positive, properly formatted, and consistent with currency requirements.
**Validates: Requirements 6.1, 6.5**

### Property 18: Audit Trail Completeness
*For any* ledger modification or settlement action, the system should create complete audit logs with user identification and timestamps.
**Validates: Requirements 6.4, 10.3**

### Property 19: Backward Compatibility
*For any* existing payment record, the system should maintain full functionality and data integrity when ledger features are added.
**Validates: Requirements 7.2, 7.5**

### Property 20: UI Integration Consistency
*For any* payment with associated ledger entries, the payment details view should display the revenue breakdown and related ledger information.
**Validates: Requirements 7.3, 8.2**

### Property 21: Design System Consistency
*For any* new ledger component, it should use the existing design patterns, styling, and responsive behavior consistent with the current application.
**Validates: Requirements 8.3, 8.4, 8.5**

### Property 22: Notification Integration
*For any* ledger-related event (entry creation, settlement completion, rule changes), the system should integrate with existing notification systems and respect user preferences.
**Validates: Requirements 9.1, 9.4, 9.5**

### Property 23: Access Control Enforcement
*For any* user attempting to access ledger features, the system should enforce role-based permissions and restrict access based on user roles and party associations.
**Validates: Requirements 10.1, 10.2, 10.5**

### Property 24: Security and Compliance
*For any* financial data operation, the system should maintain encryption, audit trails, and compliance with financial data protection regulations.
**Validates: Requirements 10.4, 10.6**

<function_calls>
<invoke name="prework">
<parameter name="featureName">revenue-auto-split-ledger

## Error Handling

### Revenue Processing Error Handling

The system implements comprehensive error handling for financial operations to ensure data integrity and user confidence:

#### Revenue Rule Validation Errors
- **Percentage Validation**: Real-time validation ensuring percentages sum to exactly 100%
- **Field Validation**: Required field validation with specific error messages
- **Duplicate Rule Names**: Prevention of duplicate rule names with clear feedback
- **Historical Impact Warnings**: Alerts when rule changes might affect existing data

#### Revenue Engine Error Handling
- **Payment Processing Failures**: Isolated error handling that doesn't affect payment verification
- **Split Calculation Errors**: Detailed logging and administrator notifications
- **Firestore Transaction Failures**: Retry mechanisms with exponential backoff
- **Currency Conversion Issues**: Fallback to original currency with error logging

#### Ledger Operation Errors
- **Balance Calculation Failures**: Graceful degradation with cached balance display
- **Settlement Processing Errors**: Transaction rollback with user notification
- **File Upload Failures**: Progress indicators with retry options
- **Permission Denied Errors**: Clear messaging with suggested actions

#### Data Consistency Error Recovery
- **Orphaned Ledger Entries**: Background reconciliation processes
- **Missing Revenue Rules**: Automatic fallback to default rules
- **Currency Mismatch Detection**: Automated alerts and correction suggestions
- **Audit Trail Gaps**: Comprehensive logging with integrity checks

### User Experience Error Handling

#### Progressive Error Disclosure
- **Field-Level Validation**: Immediate feedback for form inputs
- **Form-Level Summaries**: Comprehensive error lists for complex forms
- **Modal Error Dialogs**: Critical errors requiring user acknowledgment
- **Toast Notifications**: Non-blocking errors and success confirmations

#### Financial Data Protection
- **Transaction Isolation**: Atomic operations for financial data modifications
- **Rollback Mechanisms**: Automatic reversal of failed multi-step operations
- **Data Backup Triggers**: Automatic backups before critical operations
- **Compliance Error Handling**: Specialized handling for regulatory requirement failures

## Testing Strategy

### Dual Testing Approach

The Revenue Auto-Split + Ledger System requires both unit testing and property-based testing to ensure financial accuracy and regulatory compliance:

#### Unit Testing Focus Areas
Unit tests verify specific financial scenarios and integration points:

- **Revenue Rule Management**: Test rule creation, validation, and modification workflows
- **Split Calculation Logic**: Verify accurate percentage-based calculations with various amounts
- **Settlement Workflows**: Test bulk settlement operations and proof upload functionality
- **UI Component Integration**: Verify proper data display and user interaction handling
- **Error Boundary Testing**: Ensure graceful handling of financial operation failures

#### Property-Based Testing Framework
Property tests verify universal financial properties using **fast-check** with React Testing Library:

- **Minimum 100 iterations** per property test for financial accuracy validation
- Each property test references its design document property
- Tag format: **Feature: revenue-auto-split-ledger, Property {number}: {property_text}**

#### Financial Accuracy Testing
**Critical Financial Properties**:
- Revenue splits always sum to original payment amount (no money lost or created)
- Balance calculations remain consistent across all operations
- Currency consistency maintained throughout all transformations
- Audit trails capture all financial state changes

**Property Test Configuration**:
- **Framework**: fast-check with custom financial data generators
- **Precision**: Decimal.js for accurate monetary calculations in tests
- **Currency Testing**: Multi-currency scenarios with exchange rate stability
- **Temporal Testing**: Date-based filtering and historical data integrity

#### Integration Testing Requirements
**End-to-End Financial Workflows**:
- Complete payment verification → revenue processing → settlement cycle
- Multi-party settlement scenarios with various currencies
- Revenue rule changes with historical data preservation
- Error recovery and data consistency validation

**Performance Testing**:
- Large dataset handling for ledger operations
- Concurrent settlement processing
- Real-time balance calculation performance
- Export functionality with substantial data volumes

#### Compliance and Security Testing
**Regulatory Compliance**:
- Audit trail completeness and immutability
- Data retention and privacy requirement validation
- Financial reporting accuracy and completeness
- Access control and permission enforcement

**Security Testing**:
- Financial data encryption validation
- Permission boundary testing
- Input sanitization for financial data
- Authentication integration with existing systems

#### Test Data Management
**Financial Test Data**:
- Realistic monetary amounts with proper precision
- Multi-currency scenarios with various exchange rates
- Historical data spanning multiple time periods
- Edge cases including zero amounts and maximum values

**Mock Services**:
- Firebase Firestore operations with transaction simulation
- File upload and storage operations
- Notification system integration
- Authentication and permission services

The testing strategy ensures both specific financial accuracy (unit tests) and universal correctness properties (property tests), providing confidence in the system's financial integrity and regulatory compliance.