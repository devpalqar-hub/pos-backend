/**
 * Session Status State Machine - Test Cases & Documentation
 * 
 * This file documents the valid state transitions for OrderSession status
 * and serves as test cases to verify the state machine implementation.
 */

import { SessionStatus } from '../dto/update-session-status.dto';
import {
    validateSessionStatusTransition,
    getAvailableTransitions,
    isTerminalStatus,
} from './session-status-machine';

describe('Session Status State Machine', () => {
    describe('Valid Transitions - Main Flow: OPEN → BILLED → PAID', () => {
        it('should allow OPEN → BILLED (generate bill)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.BILLED),
            ).not.toThrow();
        });

        it('should allow BILLED → PAID (payment received)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.BILLED, SessionStatus.PAID),
            ).not.toThrow();
        });
    });

    describe('Valid Transitions - Cancel Flow: OPEN → CANCELLED', () => {
        it('should allow OPEN → CANCELLED (cancel before billing)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.CANCELLED),
            ).not.toThrow();
        });
    });

    describe('Valid Transitions - Admin Override: BILLED → VOID', () => {
        it('should allow BILLED → VOID (admin voids after billing)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.BILLED, SessionStatus.VOID),
            ).not.toThrow();
        });
    });

    describe('Valid Transitions - Same Status (No-op)', () => {
        it('should allow OPEN → OPEN (no-op)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.OPEN),
            ).not.toThrow();
        });

        it('should allow PAID → PAID (no-op)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.PAID, SessionStatus.PAID),
            ).not.toThrow();
        });
    });

    describe('Invalid Transitions - Reverse Flows (Blocked)', () => {
        it('should reject BILLED → OPEN (cannot revert to open)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.BILLED, SessionStatus.OPEN),
            ).toThrow();
        });

        it('should reject PAID → BILLED (cannot revert to billed)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.PAID, SessionStatus.BILLED),
            ).toThrow();
        });

        it('should reject PAID → OPEN (cannot revert to open from paid)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.PAID, SessionStatus.OPEN),
            ).toThrow();
        });

        it('should reject CANCELLED → OPEN (cannot revert from cancelled)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.CANCELLED, SessionStatus.OPEN),
            ).toThrow();
        });

        it('should reject VOID → BILLED (cannot revert from void)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.VOID, SessionStatus.BILLED),
            ).toThrow();
        });
    });

    describe('Invalid Transitions - Crossing Flows (Blocked)', () => {
        it('should reject OPEN → PAID (skip billed state)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.PAID),
            ).toThrow();
        });

        it('should reject CANCELLED → BILLED (cancel flow cannot go to billed)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.CANCELLED, SessionStatus.BILLED),
            ).toThrow();
        });

        it('should reject BILLED → CANCELLED (cannot switch flows)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.BILLED, SessionStatus.CANCELLED),
            ).toThrow();
        });

        it('should reject OPEN → VOID (void only for billed sessions)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.VOID),
            ).toThrow();
        });
    });

    describe('Invalid Transitions - From Terminal States', () => {
        it('should reject PAID → CANCELLED (terminal state)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.PAID, SessionStatus.CANCELLED),
            ).toThrow();
        });

        it('should reject CANCELLED → PAID (terminal state)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.CANCELLED, SessionStatus.PAID),
            ).toThrow();
        });

        it('should reject VOID → OPEN (terminal state)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.VOID, SessionStatus.OPEN),
            ).toThrow();
        });

        it('should reject VOID → CANCELLED (terminal state)', () => {
            expect(() =>
                validateSessionStatusTransition(SessionStatus.VOID, SessionStatus.CANCELLED),
            ).toThrow();
        });
    });

    describe('Available Transitions', () => {
        it('should return [BILLED, CANCELLED] for OPEN', () => {
            const transitions = getAvailableTransitions(SessionStatus.OPEN);
            expect(transitions).toEqual([SessionStatus.BILLED, SessionStatus.CANCELLED]);
        });

        it('should return [PAID, VOID] for BILLED', () => {
            const transitions = getAvailableTransitions(SessionStatus.BILLED);
            expect(transitions).toEqual([SessionStatus.PAID, SessionStatus.VOID]);
        });

        it('should return [] for PAID (terminal)', () => {
            const transitions = getAvailableTransitions(SessionStatus.PAID);
            expect(transitions).toEqual([]);
        });

        it('should return [] for CANCELLED (terminal)', () => {
            const transitions = getAvailableTransitions(SessionStatus.CANCELLED);
            expect(transitions).toEqual([]);
        });

        it('should return [] for VOID (terminal)', () => {
            const transitions = getAvailableTransitions(SessionStatus.VOID);
            expect(transitions).toEqual([]);
        });
    });

    describe('Terminal Status Detection', () => {
        it('should identify PAID as terminal', () => {
            expect(isTerminalStatus(SessionStatus.PAID)).toBe(true);
        });

        it('should identify CANCELLED as terminal', () => {
            expect(isTerminalStatus(SessionStatus.CANCELLED)).toBe(true);
        });

        it('should identify VOID as terminal', () => {
            expect(isTerminalStatus(SessionStatus.VOID)).toBe(true);
        });

        it('should not identify OPEN as terminal', () => {
            expect(isTerminalStatus(SessionStatus.OPEN)).toBe(false);
        });

        it('should not identify BILLED as terminal', () => {
            expect(isTerminalStatus(SessionStatus.BILLED)).toBe(false);
        });
    });

    describe('Real-world Scenarios', () => {
        it('Scenario 1: Successful payment flow', () => {
            expect(() => validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.BILLED)).not.toThrow();
            expect(() => validateSessionStatusTransition(SessionStatus.BILLED, SessionStatus.PAID)).not.toThrow();
            expect(() => validateSessionStatusTransition(SessionStatus.PAID, SessionStatus.PAID)).not.toThrow(); // no-op is allowed
        });

        it('Scenario 2: Cancel before billing', () => {
            expect(() => validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.CANCELLED)).not.toThrow();
            expect(() => validateSessionStatusTransition(SessionStatus.CANCELLED, SessionStatus.CANCELLED)).not.toThrow(); // no-op
        });

        it('Scenario 3: Admin voids after billing', () => {
            expect(() => validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.BILLED)).not.toThrow();
            expect(() => validateSessionStatusTransition(SessionStatus.BILLED, SessionStatus.VOID)).not.toThrow();
        });

        it('Scenario 4: Invalid - attempt to reverse payment', () => {
            validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.BILLED);
            validateSessionStatusTransition(SessionStatus.BILLED, SessionStatus.PAID);

            // Attempt to revert from PAID should fail
            expect(() =>
                validateSessionStatusTransition(SessionStatus.PAID, SessionStatus.BILLED),
            ).toThrow('Invalid status transition');
        });

        it('Scenario 5: Invalid - attempt to bill a cancelled session', () => {
            validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.CANCELLED);

            // Attempt to bill a cancelled session should fail
            expect(() =>
                validateSessionStatusTransition(SessionStatus.CANCELLED, SessionStatus.BILLED),
            ).toThrow('Invalid status transition');
        });
    });

    describe('Error Messages', () => {
        it('should provide clear error message for invalid transition', () => {
            try {
                validateSessionStatusTransition(SessionStatus.PAID, SessionStatus.OPEN);
                fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toContain('Invalid status transition');
                expect(error.message).toContain('PAID → OPEN');
                expect(error.message).toContain('terminal state');
            }
        });

        it('should show available transitions in error message', () => {
            try {
                validateSessionStatusTransition(SessionStatus.OPEN, SessionStatus.VOID);
                fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toContain('BILLED');
                expect(error.message).toContain('CANCELLED');
            }
        });
    });
});

/**
 * STATE MACHINE DIAGRAM:
 * 
 * ┌────────────────────────────────────────┐
 * │                 FLOW 1                  │
 * │   (Standard Payment Flow)              │
 * └────────────────────────────────────────┘
 * 
 *     OPEN  ──→  BILLED  ──→  PAID
 *      ↓                        ↓
 *    items added          (Terminal)
 *
 *
 * ┌────────────────────────────────────────┐
 * │                 FLOW 2                  │
 * │   (Cancel Before Billing)              │
 * └────────────────────────────────────────┘
 * 
 *     OPEN  ──→  CANCELLED
 *      ↓              ↓
 *    items added  (Terminal)
 *
 *
 * ┌────────────────────────────────────────┐
 * │                 FLOW 3                  │
 * │   (Admin Override)                     │
 * └────────────────────────────────────────┘
 * 
 *     BILLED  ──→  VOID
 *      ↓             ↓
 *   payment       (Terminal)
 *   expected
 *
 * KEY RULES:
 * ✓ Only forward transitions allowed
 * ✓ No reverse or cross-flow transitions
 * ✓ Same-status transitions are no-ops (allowed)
 * ✓ PAID, CANCELLED, VOID are terminal (no outgoing transitions)
 */
