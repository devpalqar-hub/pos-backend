/**
 * Trigger Campaign Seeder
 * Creates trigger campaigns as PAUSED.
 * Resume them manually when you want the cron to pick them up and send emails.
 *
 * Run:   npx ts-node prisma/seed-trigger-campaigns.ts
 * Resume: POST /trigger-campaigns/:restaurantId/:id/resume
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RESTAURANT_ID = 'c5f50dda-222a-445b-a41d-4f1a31914cf9';
const CUSTOMER_EMAIL = 'msonasasikumar@gmail.com';

const TRIGGER_CAMPAIGN_NAMES = [
    '[TRIGGER] No Rules — All Customers',
    '[TRIGGER] VISITED_IN_DATE_RANGE',
    '[TRIGGER] VISITED_ON_DAY',
    '[TRIGGER] ORDERED_ITEMS',
    '[TRIGGER] HAS_PENDING_LOYALTY',
    '[TRIGGER] MIN_VISIT_COUNT',
    '[TRIGGER] MIN_SPEND_AMOUNT',
];

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
    console.log('🧹  Cleaning up previous trigger campaigns...\n');
    const deleted = await prisma.triggerCampaign.deleteMany({
        where: { restaurantId: RESTAURANT_ID, name: { in: TRIGGER_CAMPAIGN_NAMES } },
    });
    console.log(`  🗑️   Trigger campaigns deleted: ${deleted.count}`);
    console.log('\n✅  Cleanup complete.\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱  Starting trigger campaign seeder...\n');

    await cleanup();

    // ── 1. Verify restaurant ───────────────────────────────────────────────────
    const restaurant = await prisma.restaurant.findUnique({ where: { id: RESTAURANT_ID } });
    if (!restaurant) throw new Error(`Restaurant ${RESTAURANT_ID} not found`);
    console.log(`✅  Restaurant: "${restaurant.name}"`);

    // ── 2. Verify customer ─────────────────────────────────────────────────────
    const customer = await prisma.customer.findUnique({
        where: { restaurantId_email: { restaurantId: RESTAURANT_ID, email: CUSTOMER_EMAIL } },
    });
    if (!customer) throw new Error(`Customer ${CUSTOMER_EMAIL} not found — run seed-campaigns.ts first`);
    console.log(`✅  Customer: ${customer.name} (${customer.email})`);

    // ── 3. Get menu item id for ORDERED_ITEMS rule ─────────────────────────────
    const menuItem = await prisma.menuItem.findFirst({
        where: { restaurantId: RESTAURANT_ID, isActive: true },
    });
    if (!menuItem) throw new Error('No active menu items found');
    console.log(`✅  Menu item: "${menuItem.name}" → ${menuItem.id}\n`);

    const adminUser = await prisma.user.findFirst({ where: { restaurantId: RESTAURANT_ID } });
    const expiresAt = new Date('2027-01-01T00:00:00.000Z');

    type TriggerSeed = {
        name: string;
        description: string;
        subject: string;
        textContent: string;
        condition?: string;
        value?: string | null;
    };

    const seeds: TriggerSeed[] = [
        {
            name: '[TRIGGER] No Rules — All Customers',
            description: 'No rules — every active customer is eligible.',
            subject: 'Hello from {{restaurant}}!',
            textContent: 'Hi {{name}}, this automated message is from {{restaurant}}. Thanks for being with us!',
        },
        {
            name: '[TRIGGER] VISITED_IN_DATE_RANGE',
            description: 'Fires if customer visited between Mar 10 and Mar 31 2026.',
            subject: 'You visited us in March, {{name}}!',
            textContent: 'Hi {{name}}, thanks for visiting {{restaurant}} this March. Here is a special reward!',
            condition: 'VISITED_IN_DATE_RANGE',
            value: '{"startDate":"2026-03-10","endDate":"2026-03-31"}',
        },
        {
            name: '[TRIGGER] VISITED_ON_DAY',
            description: 'Fires if customer has ever visited on a Wednesday.',
            subject: 'Midweek visitor reward for {{name}}!',
            textContent: 'Hi {{name}}, we noticed you like visiting {{restaurant}} on Wednesdays!',
            condition: 'VISITED_ON_DAY',
            value: 'WEDNESDAY',
        },
        {
            name: '[TRIGGER] ORDERED_ITEMS',
            description: `Fires if customer ordered menu item ${menuItem.id}.`,
            subject: 'You love {{restaurant}}, {{name}}!',
            textContent: `Hi {{name}}, you ordered "${menuItem.name}" at {{restaurant}}. Here is an exclusive deal!`,
            condition: 'ORDERED_ITEMS',
            value: JSON.stringify([menuItem.id]),
        },
        {
            name: '[TRIGGER] HAS_PENDING_LOYALTY',
            description: 'Fires if customer has more than 100 loyalty points.',
            subject: 'Redeem your loyalty points, {{name}}!',
            textContent: 'Hi {{name}}, you have over 100 loyalty points at {{restaurant}}. Redeem them today!',
            condition: 'HAS_PENDING_LOYALTY',
            value: '100',
        },
        {
            name: '[TRIGGER] MIN_VISIT_COUNT',
            description: 'Fires if customer has visited at least 3 times.',
            subject: 'Loyal visitor reward, {{name}}!',
            textContent: 'Hi {{name}}, you have visited {{restaurant}} at least 3 times. Here is your reward!',
            condition: 'MIN_VISIT_COUNT',
            value: '3',
        },
        {
            name: '[TRIGGER] MIN_SPEND_AMOUNT',
            description: 'Fires if customer total spend is at least ₹100.',
            subject: 'Thanks for spending with us, {{name}}!',
            textContent: 'Hi {{name}}, your total spend at {{restaurant}} has crossed ₹100. Here is a reward!',
            condition: 'MIN_SPEND_AMOUNT',
            value: '100',
        },
    ];

    console.log('📣  Creating trigger campaigns as PAUSED...\n');

    const createdIds: { name: string; id: string }[] = [];

    for (const seed of seeds) {
        const tc = await prisma.triggerCampaign.create({
            data: {
                restaurantId: RESTAURANT_ID,
                createdById: adminUser?.id ?? null,
                name: seed.name,
                description: seed.description,
                subject: seed.subject,
                textContent: seed.textContent,
                ruleOperator: 'AND',
                status: 'PAUSED',   // ← PAUSED, cron will NOT fire yet
                repeatDelayDays: 1,
                maxTriggersPerCustomer: 3,
                expiresAt,
                rules: seed.condition
                    ? { create: [{ condition: seed.condition as any, value: seed.value ?? null }] }
                    : undefined,
                channels: {
                    create: [{ channel: 'EMAIL' as any }],
                },
            },
        });

        createdIds.push({ name: seed.name, id: tc.id });
        console.log(`  ✅  "${seed.name}"`);
        console.log(`      id: ${tc.id}`);
        console.log(`      condition: ${seed.condition ?? '(none)'} ${seed.value ? `= ${seed.value}` : ''}`);
        console.log();
    }

    console.log('🎉  Done! All trigger campaigns created as PAUSED.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📬  HOW TO RECEIVE EMAILS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    console.log('  STEP 1 — Resume ONE campaign when you are ready:');
    console.log(`  POST /trigger-campaigns/${RESTAURANT_ID}/:id/resume`);
    console.log();
    console.log('  STEP 2 — Wait up to 5 minutes for the cron to fire.');
    console.log('           You will receive 1 email per resumed campaign.');
    console.log();
    console.log('  STEP 3 — To test ALL at once, resume all:');
    console.log();

    for (const { name, id } of createdIds) {
        console.log(`  POST /trigger-campaigns/${RESTAURANT_ID}/${id}/resume`);
        console.log(`       → "${name}"`);
    }

    console.log();
    console.log('  ⏰  Email timeline after resuming:');
    console.log('      Within 5 min  → first email arrives');
    console.log('      +1 day        → second email (repeatDelayDays = 1)');
    console.log('      +2 days       → stops (maxTriggersPerCustomer = 3 reached after 3rd)');
    console.log();
    console.log('  📊  Check analytics:');
    console.log(`  GET /trigger-campaigns/${RESTAURANT_ID}/:id/analytics`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
    .catch((e) => {
        console.error('❌  Seeder failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());