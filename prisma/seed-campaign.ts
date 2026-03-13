/**
 * Campaign Seeder
 * Seeds a customer + order history so that every RuleConditionTypeEnum is satisfied,
 * then creates one campaign per condition (plus one ALL_CUSTOMERS campaign).
 *
 * Run:  npx ts-node seed-campaigns.ts
 * Or add to package.json: "seed:campaigns": "ts-node seed-campaigns.ts"
 */

import { PrismaClient, OrderChannel, SessionStatus, BatchStatus, OrderItemStatus, BillStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();
const RESTAURANT_ID = "110201cd-698d-4ad9-9c63-4ea706d95f8f"
// const RESTAURANT_ID = 'c5f50dda-222a-445b-a41d-4f1a31914cf9';
const CUSTOMER_EMAIL = 'msonasasikumar@gmail.com';
const CUSTOMER_PHONE = '+919999000001'; // adjust if phone must be unique in your DB

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomAlpha(len: number) {
    return Math.random().toString(36).substring(2, 2 + len).toUpperCase().padEnd(len, 'X');
}

function daysAgo(n: number): Date {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱  Starting campaign seeder...\n');

    // ── 0. Verify restaurant exists ────────────────────────────────────────────
    const restaurant = await prisma.restaurant.findUnique({
        where: { id: RESTAURANT_ID },
    });
    if (!restaurant) throw new Error(`Restaurant ${RESTAURANT_ID} not found`);
    console.log(`✅  Restaurant: "${restaurant.name}"`);

    // ── 1. Upsert customer (lookup by email to avoid duplicate email constraint) ─
    let customer = await prisma.customer.findUnique({
        where: { restaurantId_email: { restaurantId: RESTAURANT_ID, email: CUSTOMER_EMAIL } },
    });

    if (customer) {
        customer = await prisma.customer.update({
            where: { id: customer.id },
            data: { name: 'Sona Sasikumar', isActive: true },
        });
        console.log(`✅  Customer found & updated: ${customer.id} (${customer.email})`);
    } else {
        customer = await prisma.customer.create({
            data: {
                restaurantId: RESTAURANT_ID,
                phone: CUSTOMER_PHONE,
                email: CUSTOMER_EMAIL,
                name: 'Sona Sasikumar',
                isActive: true,
            },
        });
        console.log(`✅  Customer created: ${customer.id} (${customer.email})`);
    }

    // ── 2. Grab any menu item from the restaurant ──────────────────────────────
    const menuItem = await prisma.menuItem.findFirst({
        where: { restaurantId: RESTAURANT_ID, isActive: true },
    });
    if (!menuItem) throw new Error('No active menu items found — add at least one first.');
    console.log(`✅  Menu item: "${menuItem.name}" (${menuItem.id})`);

    // ── 3. Grab any staff user to assign as session opener ────────────────────
    const staffUser = await prisma.user.findFirst({
        where: { restaurantId: RESTAURANT_ID },
    });
    if (!staffUser) throw new Error('No staff user found for this restaurant.');
    console.log(`✅  Staff user: ${staffUser.id}\n`);

    // ── 4. Create order sessions ───────────────────────────────────────────────
    // We'll create 5 PAID sessions spread across time to satisfy:
    //   MIN_ORDERS        >= 3   → we create 5
    //   MAX_ORDERS        <= 10  → we create 5  ✓
    //   MIN_SPEND         >= 100 → 5 * 50 = 250 ✓
    //   MAX_SPEND         <= 500 → 250           ✓
    //   LAST_ORDER_WITHIN_DAYS 7 → latest session is 2 days ago ✓
    //   ORDER_CHANNEL DINE_IN   → all sessions are DINE_IN ✓

    const sessionConfigs = [
        { daysBack: 2, amount: 50, channel: OrderChannel.DINE_IN },
        { daysBack: 5, amount: 50, channel: OrderChannel.DINE_IN },
        { daysBack: 10, amount: 50, channel: OrderChannel.DINE_IN },
        { daysBack: 20, amount: 50, channel: OrderChannel.DINE_IN },
        { daysBack: 30, amount: 50, channel: OrderChannel.DINE_IN },
    ];

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

        console.log(`  📦  Session ${sessionNumber} — ${cfg.daysBack}d ago — ₹${cfg.amount} — ${cfg.channel}`);
    }
    console.log();

    // ── 5. Create loyalty points redemption ───────────────────────────────────
    // Seed MIN_LOYALTY_POINTS: give customer 200 points.
    // We need a LoyalityPoint record first.
    let loyaltyProgram = await prisma.loyalityPoint.findFirst({
        where: { restaurantId: RESTAURANT_ID, isActive: true },
    });

    if (!loyaltyProgram) {
        loyaltyProgram = await prisma.loyalityPoint.create({
            data: {
                restaurantId: RESTAURANT_ID,
                name: 'Default Loyalty',
                points: 10,
                isActive: true,
            },
        });
        console.log(`✅  Created loyalty program: ${loyaltyProgram.id}`);
    } else {
        console.log(`✅  Using existing loyalty program: ${loyaltyProgram.id}`);
    }

    await prisma.loyalityPointRedemption.create({
        data: {
            loyalityPointId: loyaltyProgram.id,
            customerId: customer.id,
            pointsAwarded: 200,
        },
    });
    console.log(`✅  Awarded 200 loyalty points to customer\n`);

    // ── 6. Fetch or find marketing settings (needed for campaign channel check) ─
    const marketingSettings = await prisma.marketingSettings.findUnique({
        where: { restaurantId: RESTAURANT_ID },
    });

    // Determine which channels are configured
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
        console.warn('⚠️   No marketing channels configured — campaigns will be created but sending will fail.');
        console.warn('     Configure SMTP/Twilio/WhatsApp via PUT /marketing/settings first.\n');
        channels.push('EMAIL'); // still create records so schema is valid
    }

    // ── 7. Find a user (createdById for campaigns) ────────────────────────────
    const adminUser = await prisma.user.findFirst({
        where: { restaurantId: RESTAURANT_ID },
    });

    // ── 8. Campaign definitions ────────────────────────────────────────────────
    type CampaignSeed = {
        name: string;
        description: string;
        textContent: string;
        subject: string;
        condition?: string;
        value?: string | null;
    };

    const campaignSeeds: CampaignSeed[] = [
        {
            name: '[TEST] All Customers',
            description: 'Targets every customer — no rule filter.',
            subject: 'Hello from {{restaurant}}!',
            textContent: 'Hi {{name}}, this is a broadcast message from {{restaurant}}. Thanks for being with us!',
            condition: 'ALL_CUSTOMERS',
            value: null,
        },
        {
            name: '[TEST] Min Orders (≥ 3)',
            description: 'Targets customers with at least 3 orders.',
            subject: 'Thank you for your loyalty, {{name}}!',
            textContent: 'Hi {{name}}, you have placed 3 or more orders at {{restaurant}}. Here\'s a special reward!',
            condition: 'MIN_ORDERS',
            value: '3',
        },
        {
            name: '[TEST] Max Orders (≤ 10)',
            description: 'Targets customers with at most 10 orders — catches new/mid-tier customers.',
            subject: 'We love having you, {{name}}!',
            textContent: 'Hi {{name}}, thanks for your visits to {{restaurant}}. Come back for more!',
            condition: 'MAX_ORDERS',
            value: '10',
        },
        {
            name: '[TEST] Min Spend (≥ ₹100)',
            description: 'Targets customers whose total spend is at least ₹100.',
            subject: 'Big spender reward for {{name}}!',
            textContent: 'Hi {{name}}, your total spend at {{restaurant}} has crossed ₹100. Here is your reward!',
            condition: 'MIN_SPEND',
            value: '100',
        },
        {
            name: '[TEST] Max Spend (≤ ₹500)',
            description: 'Targets customers whose total spend is at most ₹500.',
            subject: 'Special offer for you, {{name}}!',
            textContent: 'Hi {{name}}, enjoy this exclusive offer from {{restaurant}} just for you!',
            condition: 'MAX_SPEND',
            value: '500',
        },
        {
            name: '[TEST] Last Order Within 7 Days',
            description: 'Targets customers who ordered in the last 7 days.',
            subject: 'Thanks for your recent visit, {{name}}!',
            textContent: 'Hi {{name}}, we saw you recently at {{restaurant}}. Hope you enjoyed it — here is something special!',
            condition: 'LAST_ORDER_WITHIN_DAYS',
            value: '7',
        },
        {
            name: '[TEST] Order Channel — DINE_IN',
            description: 'Targets customers who have dined in.',
            subject: 'We miss you at the table, {{name}}!',
            textContent: 'Hi {{name}}, come dine with us again at {{restaurant}} and enjoy a special in-restaurant offer!',
            condition: 'ORDER_CHANNEL',
            value: 'DINE_IN',
        },
        {
            name: '[TEST] Min Loyalty Points (≥ 100)',
            description: 'Targets customers with at least 100 loyalty points.',
            subject: 'Your loyalty points are waiting, {{name}}!',
            textContent: 'Hi {{name}}, you have earned over 100 loyalty points at {{restaurant}}. Redeem them today!',
            condition: 'MIN_LOYALTY_POINTS',
            value: '100',
        },
    ];

    console.log('\n📣  Creating campaigns...\n');

    for (const seed of campaignSeeds) {
        // Check if already exists (idempotent re-runs)
        const existing = await prisma.campaign.findFirst({
            where: { restaurantId: RESTAURANT_ID, name: seed.name, isActive: true },
        });
        if (existing) {
            console.log(`  ⏭️   Already exists: "${seed.name}"`);
            continue;
        }

        await prisma.campaign.create({
            data: {
                restaurantId: RESTAURANT_ID,
                createdById: adminUser?.id ?? null,
                name: seed.name,
                description: seed.description,
                subject: seed.subject,
                textContent: seed.textContent,
                ruleOperator: 'AND',
                status: 'SCHEDULED', // SCHEDULED so they don't auto-fire
                scheduledAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year ahead
                isActive: true,
                rules: seed.condition
                    ? {
                        create: [{
                            condition: seed.condition as any,
                            value: seed.value ?? null,
                        }],
                    }
                    : undefined,
                channels: {
                    create: channels.map((ch) => ({ channel: ch as any })),
                },
            },
        });

        console.log(`  ✅  Created: "${seed.name}"`);
    }

    console.log('\n🎉  Seeder complete!\n');
    console.log('📋  Summary:');
    console.log(`    • Customer email  : ${CUSTOMER_EMAIL}`);
    console.log(`    • Customer phone  : ${CUSTOMER_PHONE}`);
    console.log(`    • Order sessions  : 5 PAID sessions (₹250 total spend)`);
    console.log(`    • Loyalty points  : 200`);
    console.log(`    • Campaigns       : ${campaignSeeds.length} (one per condition)`);
    console.log('\n💡  Tip: Trigger a campaign via POST /marketing/:restaurantId/campaigns/:id/trigger');
    console.log('    Each campaign is SCHEDULED (1 year ahead) — trigger manually to test.\n');
}

main()
    .catch((e) => {
        console.error('❌  Seeder failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());