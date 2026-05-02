"""
SESSION STATUS STATE MACHINE - VISUAL FLOW DIAGRAM
==================================================

This document provides ASCII diagrams of the valid state transitions
for OrderSession status management.

MAIN VALID FLOWS
================

FLOW 1: STANDARD PAYMENT FLOW
─────────────────────────────

    ┌─────────────────────────────────────────────────┐
    │         CUSTOMER ORDERS (DINE-IN)               │
    └──────────────────┬──────────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────────┐
    │             OPEN (Active)                        │
    │  ✓ Items being added to order                   │
    │  ✓ Waiter can add/remove items                  │
    │  ✓ Multiple batches can be created              │
    │  ✓ Table status = OCCUPIED                      │
    └──────────────────┬───────────────────────────────┘
                       │ [Generate Bill Action]
                       │ (bill.service.ts triggers this)
                       ▼
    ┌──────────────────────────────────────────────────┐
    │             BILLED (Awaiting Payment)            │
    │  ✓ Bill number generated & locked               │
    │  ✓ Order items cannot be modified               │
    │  ✓ Total amount calculated                      │
    │  ✓ Payment awaiting                             │
    └──────────────────┬───────────────────────────────┘
                       │ [Payment Received Action]
                       │ (payment.service.ts triggers this)
                       ▼
    ┌──────────────────────────────────────────────────┐
    │             PAID (Settled & Closed)              │
    │  ✓✓ TERMINAL STATE - NO MORE CHANGES ✓✓          │
    │  ✓ Table released back to AVAILABLE              │
    │  ✓ Session closed                               │
    │  ✓ Bill marked as PAID                          │
    └──────────────────────────────────────────────────┘


FLOW 2: CANCEL BEFORE BILLING
─────────────────────────────

    ┌──────────────────────────────────────────────────┐
    │             OPEN (Active)                        │
    │  ✓ Items being added to order                   │
    │  ✓ Waiter realizes customer wants to cancel     │
    └──────────────────┬───────────────────────────────┘
                       │ [Cancel Order Action]
                       │ (cancellation before billing)
                       ▼
    ┌──────────────────────────────────────────────────┐
    │             CANCELLED (Voided Before Bill)      │
    │  ✓✓ TERMINAL STATE - NO MORE CHANGES ✓✓          │
    │  ✓ No bill generated                            │
    │  ✓ Table released back to AVAILABLE              │
    │  ✓ Order items not billed                       │
    └──────────────────────────────────────────────────┘


FLOW 3: ADMIN OVERRIDE (VOID AFTER BILLING)
──────────────────────────────────────────

    ┌──────────────────────────────────────────────────┐
    │             BILLED (Awaiting Payment)            │
    │  ✓ Bill generated & locked                      │
    │  ✓ Issue found: wrong order, system error, etc  │
    │  ✓ Admin decision needed                        │
    └──────────────────┬───────────────────────────────┘
                       │ [Admin VOID Order Action]
                       │ (admin override, can only happen 
                       │  after billing for audit trail)
                       ▼
    ┌──────────────────────────────────────────────────┐
    │             VOID (Admin Voided)                  │
    │  ✓✓ TERMINAL STATE - NO MORE CHANGES ✓✓          │
    │  ✓ Bill marked as VOIDED                        │
    │  ✓ Audit logged with reason                     │
    │  ✓ Table released back to AVAILABLE              │
    │  ✓ Only admin-level action allowed              │
    └──────────────────────────────────────────────────┘


BLOCKED TRANSITIONS (EXAMPLES)
===============================

REVERSE FLOW - REJECTED ❌
────────────────────────

    PAID ──X──► BILLED   ❌ Cannot revert payment
    BILLED ──X──► OPEN   ❌ Cannot revert to editing
    CANCELLED ──X──► OPEN   ❌ Cannot resurrect cancelled order
    VOID ──X──► BILLED   ❌ Cannot undo admin void


CROSS-FLOW SWITCHING - REJECTED ❌
──────────────────────────────

    OPEN ──X──► PAID   ❌ Cannot skip BILLED state
    OPEN ──X──► VOID   ❌ VOID only for BILLED state
    BILLED ──X──► CANCELLED   ❌ Can't switch to cancel flow
    CANCELLED ──X──► BILLED   ❌ Cancel flow is terminal


TERMINAL STATE - NO EXIT ❌
──────────────────────────

    PAID ──X──► * (anything)   ❌ Terminal state
    CANCELLED ──X──► * (anything)   ❌ Terminal state
    VOID ──X──► * (anything)   ❌ Terminal state


STATE TRANSITION MATRIX
=======================

From →       | OPEN | BILLED | PAID | CANCELLED | VOID
─────────────┼──────┼────────┼──────┼───────────┼──────
To ↓         |      |        |      |           |
─────────────┼──────┼────────┼──────┼───────────┼──────
OPEN         |  ✓   |   ✗    |  ✗   |     ✗     |  ✗
BILLED       |  ✓   |   ✓    |  ✗   |     ✗     |  ✗
PAID         |  ✗   |   ✓    |  ✓   |     ✗     |  ✗
CANCELLED    |  ✓   |   ✗    |  ✗   |     ✓     |  ✗
VOID         |  ✗   |   ✓    |  ✗   |     ✗     |  ✓

✓ = Valid transition allowed
✗ = Invalid transition blocked
(Diagonal ✓ = No-op, allowed but no state change)


TIMELINE EXAMPLE
================

Timeline of a successful payment flow:

    2024-05-02 10:00:00  Table 5 receives customers
                         └─► Session created (OPEN)

    2024-05-02 10:15:00  Waiter adds items across 2 batches
                         Batch 1: Burger, Fries
                         Batch 2: Dessert, Coffee

    2024-05-02 10:45:00  Bill generated
                         └─► Status: OPEN → BILLED
                         └─► Bill #000001 created
                         └─► Table status: OCCUPIED

    2024-05-02 10:50:00  Customer pays with card
                         └─► Payment received
                         └─► Status: BILLED → PAID
                         └─► Session.closedAt set
                         └─► Table status: AVAILABLE

    2024-05-02 10:51:00  Customers leave
                         Customers satisfied ✓


Timeline of a cancelled order:

    2024-05-02 11:00:00  Table 3 receives customers
                         └─► Session created (OPEN)

    2024-05-02 11:05:00  Waiter adds items
                         └─► 1 Salad added

    2024-05-02 11:06:00  Customer changes mind - wants to cancel
                         └─► Status: OPEN → CANCELLED
                         └─► Session.closedAt set
                         └─► No bill generated
                         └─► Table status: AVAILABLE

    2024-05-02 11:07:00  Customers leave
                         Customers cancelled order ✓


Timeline of admin void (after billing):

    2024-05-02 12:00:00  Table 7 receives customers
                         └─► Session created (OPEN)

    2024-05-02 12:15:00  Waiter adds items
                         └─► 2 Pizzas, 2 Drinks

    2024-05-02 12:30:00  Bill generated
                         └─► Status: OPEN → BILLED
                         └─► Bill #000002 created

    2024-05-02 12:35:00  ISSUE DISCOVERED: Wrong order sent!
                         Admin review triggered

    2024-05-02 12:36:00  Admin voids the order
                         └─► Status: BILLED → VOID
                         └─► Bill marked VOIDED
                         └─► Reason logged: "Wrong item sent - remake required"
                         └─► No payment processed
                         └─► Table status: AVAILABLE

    2024-05-02 12:45:00  Kitchen remakes correct order
                         New Session created (OPEN again)
                         └─► Fresh start for correct order


ERROR MESSAGE EXAMPLES
======================

❌ Invalid Transition Error:

    POST /api/restaurants/rest-123/sessions/sess-456/status
    {
      "status": "PAID"
    }

    Response (400 Bad Request):
    {
      "statusCode": 400,
      "message": "Invalid status transition: OPEN → PAID. Valid transitions from OPEN are: BILLED, CANCELLED",
      "error": "Bad Request"
    }


❌ Terminal State Error:

    POST /api/restaurants/rest-123/sessions/sess-789/status
    {
      "status": "BILLED"
    }

    Response (400 Bad Request):
    {
      "statusCode": 400,
      "message": "Invalid status transition: PAID → BILLED. Valid transitions from PAID are: none (terminal state)",
      "error": "Bad Request"
    }


IMPLEMENTATION DETAILS
======================

State Machine Location:
  src/orders/utils/session-status-machine.ts

Integration Points:
  1. orders.service.ts : updateSessionStatus()
  2. orders.controller.ts : API documentation

Key Functions:
  - validateSessionStatusTransition(current, new)
    └─ Throws BadRequestException if invalid

  - getAvailableTransitions(status)
    └─ Returns array of valid next states

  - isTerminalStatus(status)
    └─ Returns true if state has no outgoing transitions

Test Coverage:
  src/orders/utils/session-status-machine.test.ts
  └─ 30+ test cases covering all scenarios

"""
