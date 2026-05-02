import { BadRequestException } from '@nestjs/common';
import { SessionStatus } from '../dto/update-session-status.dto';

/**
 * Session Status State Machine Validator
 * 
 * Enforces the following valid state transitions:
 * - OPEN → BILLED (generate bill)
 * - BILLED → PAID (payment received)
 * - BILLED → VOID (admin voids after billing)
 * - OPEN → CANCELLED (cancel before billing)
 * 
 * PAID and CANCELLED are terminal states (no transitions from these)
 * VOID is also terminal (admin action)
 */

// Define valid state transitions
const STATE_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
    [SessionStatus.OPEN]: [SessionStatus.BILLED, SessionStatus.CANCELLED],
    [SessionStatus.BILLED]: [SessionStatus.PAID, SessionStatus.VOID],
    [SessionStatus.PAID]: [], // Terminal state
    [SessionStatus.CANCELLED]: [], // Terminal state
    [SessionStatus.VOID]: [], // Terminal state
};

/**
 * Validates if a status transition is allowed
 * @param currentStatus Current session status
 * @param newStatus Desired new status
 * @throws BadRequestException if transition is not allowed
 */
export function validateSessionStatusTransition(
    currentStatus: SessionStatus,
    newStatus: SessionStatus,
): void {
    // Check if trying to transition to the same status (allowed, no-op)
    if (currentStatus === newStatus) {
        return;
    }

    // Get allowed transitions from current status
    const allowedTransitions = STATE_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
        throw new BadRequestException(
            `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
            `Valid transitions from ${currentStatus} are: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal state)'}`,
        );
    }
}

/**
 * Get allowed transitions for a given status
 * @param status Current session status
 * @returns Array of allowed target statuses
 */
export function getAvailableTransitions(status: SessionStatus): SessionStatus[] {
    return STATE_TRANSITIONS[status] || [];
}

/**
 * Check if a status is a terminal state
 * @param status Session status to check
 * @returns true if status is terminal (no further transitions allowed)
 */
export function isTerminalStatus(status: SessionStatus): boolean {
    return getAvailableTransitions(status).length === 0;
}
