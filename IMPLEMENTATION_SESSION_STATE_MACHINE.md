# Session Status State Machine Implementation - Summary

## Overview
A strict state machine has been implemented to enforce valid order session status transitions. The system prevents invalid transitions and provides clear error messages.

## Files Created/Modified

### 1. **New State Machine Utility** 
   - **File**: `src/orders/utils/session-status-machine.ts`
   - **Exports**:
     - `validateSessionStatusTransition(currentStatus, newStatus)` - Validates and throws if invalid
     - `getAvailableTransitions(status)` - Returns allowed next states
     - `isTerminalStatus(status)` - Checks if no further transitions allowed

### 2. **Integration in Service**
   - **File**: `src/orders/orders.service.ts`
   - **Change**: Added import and replaced old BILLED check with new state machine validation
   - **Method**: `updateSessionStatus()` now calls `validateSessionStatusTransition()`

### 3. **API Documentation**
   - **File**: `src/orders/orders.controller.ts`
   - **Update**: Enhanced PATCH endpoint documentation with state machine rules

### 4. **Test Documentation**
   - **File**: `src/orders/utils/session-status-machine.test.ts`
   - **Contents**: 30+ test cases covering all valid/invalid transitions and real-world scenarios

## Valid State Flows

### ✅ Flow 1: Standard Payment Processing
```
OPEN (items being added)
  ↓
BILLED (bill generated)
  ↓
PAID (payment received) ← TERMINAL
```

### ✅ Flow 2: Cancel Before Billing
```
OPEN (items being added)
  ↓
CANCELLED ← TERMINAL
```

### ✅ Flow 3: Admin Override
```
BILLED (bill generated)
  ↓
VOID (admin voids) ← TERMINAL
```

## Blocked Transitions (Examples)

### ❌ Reverse Transitions
- `PAID → BILLED` (cannot revert payment)
- `BILLED → OPEN` (cannot revert to open)
- `CANCELLED → OPEN` (cannot revert from cancel)

### ❌ Cross-Flow Transitions
- `OPEN → PAID` (cannot skip BILLED)
- `BILLED → CANCELLED` (cannot switch to cancel flow)
- `CANCELLED → BILLED` (cancel flow doesn't go to billed)

### ❌ From Terminal States
- `PAID → *` (no transitions from paid)
- `CANCELLED → *` (no transitions from cancelled)
- `VOID → *` (no transitions from void)

## Error Handling

When an invalid transition is attempted, a `BadRequestException` is thrown with a clear message:

```
Invalid status transition: PAID → OPEN. Valid transitions from PAID are: none (terminal state)
```

Or for incomplete error cases:

```
Invalid status transition: OPEN → VOID. Valid transitions from OPEN are: BILLED, CANCELLED
```

## API Response Example

### Request
```json
PATCH /api/restaurants/{restaurantId}/sessions/{sessionId}/status
{
  "status": "PAID"
}
```

### Valid Response (200 OK)
```json
{
  "id": "session-uuid",
  "status": "PAID",
  "closedAt": "2026-05-02T10:30:00Z",
  ...
}
```

### Invalid Response (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Invalid status transition: OPEN → PAID. Valid transitions from OPEN are: BILLED, CANCELLED",
  "error": "Bad Request"
}
```

## Key Features

✅ **Prevents Data Corruption** - No invalid state combinations possible  
✅ **Clear Error Messages** - Users know exactly what transitions are allowed  
✅ **Extensible** - Easy to modify state machine by updating `STATE_TRANSITIONS` map  
✅ **Well-Documented** - Test cases serve as executable documentation  
✅ **Terminal State Support** - Correctly handles unreversible states  
✅ **No-op Support** - Same-status transitions allowed (idempotent)  

## Testing

Run the state machine tests:
```bash
npm run test -- session-status-machine.test.ts
```

Coverage includes:
- All valid transitions
- All invalid transitions
- Error message validation
- Available transitions lookup
- Terminal state detection
- 5+ real-world scenarios

## Usage in Code

```typescript
// In services:
import { validateSessionStatusTransition } from './utils/session-status-machine';

try {
  validateSessionStatusTransition(session.status, newStatus);
  // Update allowed
} catch (error) {
  // Handle invalid transition
  throw error;
}

// Get available options for UI:
import { getAvailableTransitions } from './utils/session-status-machine';
const options = getAvailableTransitions(session.status);
// Returns: ['BILLED', 'CANCELLED'] for OPEN state
```

## Migration Notes

- No database changes required (uses existing enum)
- Existing sessions are not affected
- New validation only on status update operations
- Backward compatible - tightens rules but doesn't break existing flows
