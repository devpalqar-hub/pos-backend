/**
 * Campaign Seeder
 * Seeds a customer + order history so that every RuleConditionTypeEnum is satisfied,
 * then creates one campaign per condition (plus one ALL_CUSTOMERS campaign).
 *
 * Run:  npx ts-node prisma/seed-campaigns.ts
 */

import {
    PrismaClient,
    OrderChannel,
    SessionStatus,
    BatchStatus,
    OrderItemStatus,
    BillStatus,
    PaymentMethod,
} from '@prisma/client';

const prisma = new PrismaClient();
const RESTAURANT_ID = "110201cd-698d-4ad9-9c63-4ea706d95f8f"
// const RESTAURANT_ID = 'c5f50dda-222a-445b-a41d-4f1a31914cf9';
const CUSTOMER_EMAIL = 'msonasasikumar@gmail.com';
const CUSTOMER_PHONE = '+919999000001';

// Campaign names — used for both cleanup and create (must stay in sync)
const CAMPAIGN_NAMES = [
    '[TEST] All Customers',
    '[TEST] Min Orders (≥ 3)',
    '[TEST] Max Orders (≤ 10)',
    '[TEST] Min Spend (≥ ₹100)',
    '[TEST] Max Spend (≤ ₹500)',
    '[TEST] Last Order Within 7 Days',
    '[TEST] Order Channel — DINE_IN',
    '[TEST] Min Loyalty Points (≥ 100)',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomAlpha(len: number) {
    return Math.random().toString(36).substring(2, 2 + len).toUpperCase().padEnd(len, 'X');
}

function daysAgo(n: number): Date {
    // Dates relative to March 13 2026 so sessions land in the past
    const base = new Date('2026-03-13T00:00:00.000Z');
    return new Date(base.getTime() - n * 24 * 60 * 60 * 1000);
}

// scheduledAt must be > March 13 2026
function futureDate(daysFromNow: number): Date {
    const base = new Date('2026-03-13T00:00:00.000Z');
    return new Date(base.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
    console.log('🧹  Cleaning up previous seed data...\n');

    // 1. Delete seeded campaigns (cascade deletes rules, channels, recipients)
    const deleted = await prisma.campaign.deleteMany({
        where: {
            restaurantId: RESTAURANT_ID,
            name: { in: CAMPAIGN_NAMES },
        },
    });
    console.log(`  🗑️   Campaigns deleted         : ${deleted.count}`);

    // 2. Find customer
    const customer = await prisma.customer.findUnique({
        where: { restaurantId_email: { restaurantId: RESTAURANT_ID, email: CUSTOMER_EMAIL } },
    });

    if (customer) {
        // 3. Delete loyalty redemptions for this customer
        const loyaltyDel = await prisma.loyalityPointRedemption.deleteMany({
            where: { customerId: customer.id },
        });
        console.log(`  🗑️   Loyalty redemptions deleted: ${loyaltyDel.count}`);

        // 4. Delete sessions + all cascade (bills, bill_items, payments, batches, order_items)
        const sessions = await prisma.orderSession.findMany({
            where: { restaurantId: RESTAURANT_ID, customerPhone: CUSTOMER_PHONE },
            select: { id: true },
        });

        if (sessions.length > 0) {
            const sessionIds = sessions.map((s) => s.id);

            // Bills cascade to BillItems and Payments
            await prisma.bill.deleteMany({ where: { sessionId: { in: sessionIds } } });

            // Batches -> OrderItems
            const batches = await prisma.orderBatch.findMany({
                where: { sessionId: { in: sessionIds } },
                select: { id: true },
            });
            await prisma.orderItem.deleteMany({ where: { batchId: { in: batches.map((b) => b.id) } } });
            await prisma.orderBatch.deleteMany({ where: { sessionId: { in: sessionIds } } });
            await prisma.orderSession.deleteMany({ where: { id: { in: sessionIds } } });
        }
        console.log(`  🗑️   Order sessions deleted    : ${sessions.length}`);

        // 5. Delete the customer
        await prisma.customer.delete({ where: { id: customer.id } });
        console.log(`  🗑️   Customer deleted          : ${customer.email}`);
    } else {
        console.log(`  ℹ️   Customer not found — skipping customer/order cleanup`);
    }

    console.log('\n✅  Cleanup complete.\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱  Starting campaign seeder...\n');

    // ── 0. Cleanup previous seed ───────────────────────────────────────────────
    await cleanup();

    // ── 1. Verify restaurant exists ────────────────────────────────────────────
    const restaurant = await prisma.restaurant.findUnique({ where: { id: RESTAURANT_ID } });
    if (!restaurant) throw new Error(`Restaurant ${RESTAURANT_ID} not found`);
    console.log(`✅  Restaurant: "${restaurant.name}"`);

    // ── 2. Create customer ─────────────────────────────────────────────────────
    const customer = await prisma.customer.create({
        data: {
            restaurantId: RESTAURANT_ID,
            phone: CUSTOMER_PHONE,
            email: CUSTOMER_EMAIL,
            name: 'Sona Sasikumar',
            isActive: true,
        },
    });
    console.log(`✅  Customer created: ${customer.id} (${customer.email})`);

    // ── 3. Grab any menu item ──────────────────────────────────────────────────
    const menuItem = await prisma.menuItem.findFirst({
        where: { restaurantId: RESTAURANT_ID, isActive: true },
    });
    if (!menuItem) throw new Error('No active menu items found — add at least one first.');
    console.log(`✅  Menu item: "${menuItem.name}" (${menuItem.id})`);

    // ── 4. Grab a staff user ───────────────────────────────────────────────────
    const staffUser = await prisma.user.findFirst({ where: { restaurantId: RESTAURANT_ID } });
    if (!staffUser) throw new Error('No staff user found for this restaurant.');
    console.log(`✅  Staff user: ${staffUser.id}\n`);

    // ── 5. Create 5 PAID sessions ──────────────────────────────────────────────
    // Conditions satisfied:
    //   MIN_ORDERS ≥ 3              → 5 orders ✓
    //   MAX_ORDERS ≤ 10             → 5 orders ✓
    //   MIN_SPEND  ≥ 100            → ₹250 total ✓
    //   MAX_SPEND  ≤ 500            → ₹250 total ✓
    //   LAST_ORDER_WITHIN_DAYS = 7  → latest is Mar 11 (2d before Mar 13) ✓
    //   ORDER_CHANNEL = DINE_IN     → all sessions DINE_IN ✓

    const sessionConfigs = [
        { daysBack: 2, amount: 50, channel: OrderChannel.DINE_IN },
        { daysBack: 5, amount: 50, channel: OrderChannel.DINE_IN },
        { daysBack: 10, amount: 50, channel: OrderChannel.DINE_IN },
        { daysBack: 20, amount: 50, channel: OrderChannel.DINE_IN },
        { daysBack: 30, amount: 50, channel: OrderChannel.DINE_IN },
    ];

    console.log('📦  Creating order sessions...');
    for (const cfg of sessionConfigs) {
        const sessionNumber = randomAlpha(6);
        const batchNumber = randomAlpha(6);
        const billNumber = randomAlpha(6);
        const createdAt = daysAgo(cfg.daysBack);

        const session = await prisma.orderSession.create({
            data: {
                restaurantId: RESTAURANT_ID,
                sessionNumber,
                channel: cfg.channel,
                status: SessionStatus.PAID,
                customerPhone: CUSTOMER_PHONE,
                customerEmail: CUSTOMER_EMAIL,
                customerName: customer.name,
                subtotal: cfg.amount,
                taxAmount: 0,
                discountAmount: 0,
                totalAmount: cfg.amount,
                openedById: staffUser.id,
                closedAt: createdAt,
                createdAt,
                updatedAt: createdAt,
            },
        });

        const batch = await prisma.orderBatch.create({
            data: {
                sessionId: session.id,
                batchNumber,
                status: BatchStatus.SERVED,
                createdById: staffUser.id,
                createdAt,
                updatedAt: createdAt,
            },
        });

        await prisma.orderItem.create({
            data: {
                batchId: batch.id,
                menuItemId: menuItem.id,
                quantity: 1,
                unitPrice: cfg.amount,
                totalPrice: cfg.amount,
                status: OrderItemStatus.SERVED,
                servedAt: createdAt,
                createdAt,
                updatedAt: createdAt,
            },
        });

        const bill = await prisma.bill.create({
            data: {
                sessionId: session.id,
                restaurantId: RESTAURANT_ID,
                billNumber,
                status: BillStatus.PAID,
                subtotal: cfg.amount,
                taxRate: 0,
                taxAmount: 0,
                discountAmount: 0,
                totalAmount: cfg.amount,
                generatedById: staffUser.id,
                paidAt: createdAt,
                createdAt,
                updatedAt: createdAt,
            },
        });

        await prisma.payment.create({
            data: {
                billId: bill.id,
                amount: cfg.amount,
                method: PaymentMethod.CASH,
                processedById: staffUser.id,
                createdAt,
            },
        });

        console.log(`  ✅  Session ${sessionNumber} — ${cfg.daysBack}d before Mar 13 — ₹${cfg.amount} — ${cfg.channel}`);
    }
    console.log();

    // ── 6. Award loyalty points ────────────────────────────────────────────────
    let loyaltyProgram = await prisma.loyalityPoint.findFirst({
        where: { restaurantId: RESTAURANT_ID, isActive: true },
    });
    if (!loyaltyProgram) {
        loyaltyProgram = await prisma.loyalityPoint.create({
            data: { restaurantId: RESTAURANT_ID, name: 'Default Loyalty', points: 10, isActive: true },
        });
        console.log(`✅  Created loyalty program: ${loyaltyProgram.id}`);
    } else {
        console.log(`✅  Using existing loyalty program: ${loyaltyProgram.id}`);
    }

    await prisma.loyalityPointRedemption.create({
        data: { loyalityPointId: loyaltyProgram.id, customerId: customer.id, pointsAwarded: 200 },
    });
    console.log(`✅  Awarded 200 loyalty points\n`);

    // ── 7. Resolve configured channels ────────────────────────────────────────
    const marketingSettings = await prisma.marketingSettings.findUnique({
        where: { restaurantId: RESTAURANT_ID },
    });

    const channels: string[] = [];
    if (marketingSettings?.smtpHost && marketingSettings?.smtpUser && marketingSettings?.smtpPassword) {
        channels.push('EMAIL');
        console.log('✅  EMAIL channel configured');
    }
    if (marketingSettings?.twilioAccountSid && marketingSettings?.twilioAuthToken) {
        channels.push('SMS');
        console.log('✅  SMS channel configured');
    }
    if (marketingSettings?.waPhoneNumberId && marketingSettings?.waAccessToken) {
        channels.push('WHATSAPP');
        console.log('✅  WHATSAPP channel configured');
    }
    if (channels.length === 0) {
        console.warn('⚠️   No marketing channels configured — defaulting to EMAIL placeholder.');
        console.warn('     Configure via PUT /marketing/settings before triggering.\n');
        channels.push('EMAIL');
    }

    const adminUser = await prisma.user.findFirst({ where: { restaurantId: RESTAURANT_ID } });

    // ── 8. Create campaigns (scheduledAt always > March 13 2026) ──────────────
    type CampaignSeed = {
        name: string;
        description: string;
        subject: string;
        textContent: string;
        condition?: string;
        value?: string | null;
        scheduledDaysFromNow: number;
    };

    const campaignSeeds: CampaignSeed[] = [
        {
            name: '[TEST] All Customers',
            description: 'Targets every customer — no rule filter.',
            subject: 'Hello from {{restaurant}}!',
            textContent: 'Hi {{name}}, this is a broadcast from {{restaurant}}. Thanks for being with us!',
            condition: 'ALL_CUSTOMERS',
            value: null,
            scheduledDaysFromNow: 1,   // Mar 14 2026
        },
        {
            name: '[TEST] Min Orders (≥ 3)',
            description: 'Targets customers with at least 3 orders.',
            subject: 'Thank you for your loyalty, {{name}}!',
            textContent: "Hi {{name}}, you have placed 3+ orders at {{restaurant}}. Here's a special reward!",
            condition: 'MIN_ORDERS',
            value: '3',
            scheduledDaysFromNow: 2,   // Mar 15 2026
        },
        {
            name: '[TEST] Max Orders (≤ 10)',
            description: 'Targets customers with at most 10 orders.',
            subject: 'We love having you, {{name}}!',
            textContent: 'Hi {{name}}, thanks for your visits to {{restaurant}}. Come back for more!',
            condition: 'MAX_ORDERS',
            value: '10',
            scheduledDaysFromNow: 3,   // Mar 16 2026
        },
        {
            name: '[TEST] Min Spend (≥ ₹100)',
            description: 'Targets customers whose total spend is at least ₹100.',
            subject: 'Big spender reward for {{name}}!',
            textContent: 'Hi {{name}}, your total spend at {{restaurant}} has crossed ₹100. Here is your reward!',
            condition: 'MIN_SPEND',
            value: '100',
            scheduledDaysFromNow: 4,   // Mar 17 2026
        },
        {
            name: '[TEST] Max Spend (≤ ₹500)',
            description: 'Targets customers whose total spend is at most ₹500.',
            subject: 'Special offer for you, {{name}}!',
            textContent: 'Hi {{name}}, enjoy this exclusive offer from {{restaurant}} just for you!',
            condition: 'MAX_SPEND',
            value: '500',
            scheduledDaysFromNow: 5,   // Mar 18 2026
        },
        {
            name: '[TEST] Last Order Within 7 Days',
            description: 'Targets customers who ordered in the last 7 days.',
            subject: 'Thanks for your recent visit, {{name}}!',
            textContent: 'Hi {{name}}, we saw you recently at {{restaurant}}. Here is something special!',
            condition: 'LAST_ORDER_WITHIN_DAYS',
            value: '7',
            scheduledDaysFromNow: 6,   // Mar 19 2026
        },
        {
            name: '[TEST] Order Channel — DINE_IN',
            description: 'Targets customers who have dined in.',
            subject: 'We miss you at the table, {{name}}!',
            textContent: 'Hi {{name}}, come dine with us again at {{restaurant}} for a special in-restaurant offer!',
            condition: 'ORDER_CHANNEL',
            value: 'DINE_IN',
            scheduledDaysFromNow: 7,   // Mar 20 2026
        },
        {
            name: '[TEST] Min Loyalty Points (≥ 100)',
            description: 'Targets customers with at least 100 loyalty points.',
            subject: 'Your loyalty points are waiting, {{name}}!',
            textContent: 'Hi {{name}}, you have earned 100+ loyalty points at {{restaurant}}. Redeem them today!',
            condition: 'MIN_LOYALTY_POINTS',
            value: '100',
            scheduledDaysFromNow: 8,   // Mar 21 2026
        },
    ];

    console.log('\n📣  Creating campaigns...\n');

    for (const seed of campaignSeeds) {
        const scheduledAt = futureDate(seed.scheduledDaysFromNow);
        await prisma.campaign.create({
            data: {
                restaurantId: RESTAURANT_ID,
                createdById: adminUser?.id ?? null,
                name: seed.name,
                description: seed.description,
                subject: seed.subject,
                textContent: seed.textContent,
                ruleOperator: 'AND',
                status: 'SCHEDULED',
                scheduledAt,
                isActive: true,
                rules: seed.condition
                    ? { create: [{ condition: seed.condition as any, value: seed.value ?? null }] }
                    : undefined,
                channels: {
                    create: channels.map((ch) => ({ channel: ch as any })),
                },
            },
        });
        console.log(`  ✅  "${seed.name}"`);
        console.log(`      scheduledAt: ${scheduledAt.toISOString()}`);
    }

    console.log('\n🎉  Seeder complete!\n');
    console.log('📋  Summary:');
    console.log(`    • Customer        : ${CUSTOMER_EMAIL} / ${CUSTOMER_PHONE}`);
    console.log(`    • Order sessions  : 5 PAID (₹250 total, all DINE_IN, latest Mar 11 2026)`);
    console.log(`    • Loyalty points  : 200`);
    console.log(`    • Campaigns       : ${campaignSeeds.length} — all scheduledAt > Mar 13 2026`);
    console.log('\n💡  Trigger manually: POST /marketing/:restaurantId/campaigns/:id/trigger {}');
}

main()
    .catch((e) => {
        console.error('❌  Seeder failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());