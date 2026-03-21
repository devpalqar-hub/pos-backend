import { PrismaClient, PriceRuleType, DayOfWeek } from '@prisma/client';

const prisma = new PrismaClient();

export type PriceRuleResult = {
    isApplicable: boolean;
    specialPrice: number | null;
    appliedRuleId?: string;
};

/**
 * Evaluate if a menu item has an active price rule
 */
export async function evaluatePriceRule(
    menuItemId: string,
    restaurantId: string,
): Promise<PriceRuleResult> {
    const now = new Date();

    const currentDay = now
        .toLocaleString('en-US', { weekday: 'long' })
        .toUpperCase() as DayOfWeek;

    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // Fetch active rules sorted by priority
    const rules = await prisma.priceRule.findMany({
        where: {
            menuItemId,
            restaurantId,
            isActive: true,
        },
        include: {
            days: true,
        },
        orderBy: {
            priority: 'desc',
        },
    });

    for (const rule of rules) {
        let isValid = false;

        // ─── RECURRING WEEKLY ─────────────────────────────
        if (rule.ruleType === PriceRuleType.RECURRING_WEEKLY) {
            const hasDayMatch = rule.days.some(d => d.day === currentDay);

            if (!hasDayMatch) continue;

            isValid = checkTimeWindow(rule.startTime, rule.endTime, currentTime);
        }

        // ─── LIMITED TIME ────────────────────────────────
        if (rule.ruleType === PriceRuleType.LIMITED_TIME) {
            const withinDateRange =
                (!rule.startDate || now >= rule.startDate) &&
                (!rule.endDate || now <= rule.endDate);

            if (!withinDateRange) continue;

            isValid = checkTimeWindow(rule.startTime, rule.endTime, currentTime);
        }

        // ─── MATCH FOUND ─────────────────────────────────
        if (isValid) {
            return {
                isApplicable: true,
                specialPrice: Number(rule.specialPrice),
                appliedRuleId: rule.id,
            };
        }
    }

    return {
        isApplicable: false,
        specialPrice: null,
    };
}

/**
 * Check if current time falls within a given time window
 */
export function checkTimeWindow(
    startTime: string | null,
    endTime: string | null,
    currentTime: string,
): boolean {
    // Full day
    if (!startTime && !endTime) return true;

    if (startTime && endTime) {
        if (startTime <= endTime) {
            // Normal case (e.g. 03:00 → 05:00)
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // Overnight case (e.g. 22:00 → 02:00)
            return currentTime >= startTime || currentTime <= endTime;
        }
    }

    return true;
}