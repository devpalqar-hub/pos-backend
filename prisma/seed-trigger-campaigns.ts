/**
 * Trigger Campaigns Test Data Seeder
 *
 * Seeds data to manually test the Trigger Campaign APIs via Postman:
 * - Customers with phone numbers and emails
 * - Order sessions linked to customers (by phone)
 * - Order items for specific menu items (to test ORDERED_ITEMS rule)
 * - Loyalty point redemptions (to test HAS_PENDING_LOYALTY rule)
 * - Orders on specific days (to test VISITED_ON_DAY rule)
 * - Orders in a date range (to test VISITED_IN_DATE_RANGE rule)
 *
 * Run: npx ts-node prisma/seed-trigger-campaigns.ts
 */

import {
    PrismaClient,
    UserRole,
    SessionStatus,
    OrderChannel,
    BatchStatus,
    OrderItemStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomId(len = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

/** Returns the most recent date that falls on a given weekday (0=Sun..6=Sat) */
function lastWeekday(weekday: number): Date {
    const d = new Date();
    const diff = (d.getDay() - weekday + 7) % 7 || 7;
    d.setDate(d.getDate() - diff);
    d.setHours(12, 0, 0, 0);
    return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🔄 Seeding trigger campaign test data...\n');

    // ── 1. Owner ────────────────────────────────────────────────────────────────
    const owner = await prisma.user.upsert({
        where: { email: 'trigger-test-owner@test.com' },
        update: {},
        create: {
            name: 'Trigger Test Owner',
            email: 'trigger-test-owner@test.com',
            role: UserRole.OWNER,
            isActive: true,
        },
    });
    console.log(`✅ Owner: ${owner.email} (${owner.id})`);

    // ── 2. Restaurant ──────────────────────────────────────────────────────────
    const restaurant = await prisma.restaurant.upsert({
        where: { slug: 'trigger-test-bistro' },
        update: {},
        create: {
            name: 'Trigger Test Bistro',
            slug: 'trigger-test-bistro',
            ownerId: owner.id,
            taxRate: 8.5,
            currency: 'USD',
        },
    });
    console.log(`✅ Restaurant: ${restaurant.name} (${restaurant.id})`);

    // ── 3. Staff user (for openedById) ─────────────────────────────────────────
    const staffUser = await prisma.user.upsert({
        where: { email: 'trigger-test-staff@test.com' },
        update: {},
        create: {
            name: 'Trigger Test Staff',
            email: 'trigger-test-staff@test.com',
            role: UserRole.RESTAURANT_ADMIN,
            restaurantId: restaurant.id,
            isActive: true,
        },
    });
    console.log(`✅ Staff: ${staffUser.email}`);

    // ── 4. Marketing Settings (so channel validation passes) ───────────────────
    await prisma.marketingSettings.upsert({
        where: { restaurantId: restaurant.id },
        update: {},
        create: {
            restaurantId: restaurant.id,
            // Dummy SMTP (won't actually send — but passes the config check)
            smtpHost: 'smtp.mailtrap.io',
            smtpPort: 587,
            smtpUser: 'test-user',
            smtpPassword: 'test-pass',
            smtpFromEmail: 'noreply@triggertest.com',
            smtpFromName: 'Trigger Test Bistro',
            smtpSecure: false,
            // Dummy Twilio
            twilioAccountSid: 'AC_test_sid',
            twilioAuthToken: 'test_auth_token',
            twilioFromNumber: '+15551234567',
        },
    });
    console.log(`✅ Marketing settings created (dummy SMTP + Twilio)`);

    // ── 5. Menu Category & Items ───────────────────────────────────────────────
    const category = await prisma.menuCategory.upsert({
        where: {
            restaurantId_name: { restaurantId: restaurant.id, name: 'Trigger Test Menu' },
        },
        update: {},
        create: {
            restaurantId: restaurant.id,
            name: 'Trigger Test Menu',
            sortOrder: 1,
        },
    });

    const menuItemNames = [
        { name: 'Spicy Chicken Wings', price: 12.99 },
        { name: 'Veggie Burger', price: 14.50 },
        { name: 'Margherita Pizza', price: 16.99 },
        { name: 'Caesar Salad', price: 9.99 },
        { name: 'Chocolate Lava Cake', price: 8.50 },
    ];

    const menuItems: Array<{ id: string; name: string; price: number }> = [];
    for (const item of menuItemNames) {
        const mi = await prisma.menuItem.create({
            data: {
                restaurantId: restaurant.id,
                categoryId: category.id,
                name: item.name,
                price: item.price,
            },
        });
        menuItems.push({ id: mi.id, name: mi.name, price: Number(mi.price) });
    }
    console.log(`✅ Menu items: ${menuItems.map((m) => `${m.name} (${m.id})`).join(', ')}`);

    // ── 6. Customers ───────────────────────────────────────────────────────────
    const customerData = [
        { name: 'Alice Monday', phone: '+15559001001', email: 'alice@test.com' },
        { name: 'Bob Weekend', phone: '+15559001002', email: 'bob@test.com' },
        { name: 'Charlie BigSpender', phone: '+15559001003', email: 'charlie@test.com' },
        { name: 'Diana Loyal', phone: '+15559001004', email: 'diana@test.com' },
        { name: 'Eve Inactive', phone: '+15559001005', email: 'eve@test.com' },
        { name: 'Frank Recent', phone: '+15559001006', email: 'frank@test.com' },
        { name: 'Grace Pizza', phone: '+15559001007', email: 'grace@test.com' },
        { name: 'Henry NoOrders', phone: '+15559001008', email: 'henry@test.com' },
    ];

    const customers: Array<{ id: string; phone: string; name: string }> = [];
    for (const c of customerData) {
        const customer = await prisma.customer.upsert({
            where: {
                restaurantId_phone: { restaurantId: restaurant.id, phone: c.phone },
            },
            update: {},
            create: {
                restaurantId: restaurant.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
            },
        });
        customers.push({ id: customer.id, phone: customer.phone, name: c.name });
    }
    console.log(`✅ Customers: ${customers.length}`);

    // ── 7. Create orders with specific patterns ────────────────────────────────

    // Helper: create a PAID session with order items
    async function createOrder(
        customerPhone: string,
        orderDate: Date,
        items: Array<{ menuItemId: string; price: number }>,
        total: number,
    ) {
        const session = await prisma.orderSession.create({
            data: {
                restaurantId: restaurant.id,
                sessionNumber: randomId(6),
                channel: OrderChannel.DINE_IN,
                status: SessionStatus.PAID,
                customerPhone,
                guestCount: 1,
                openedById: staffUser.id,
                subtotal: total,
                taxAmount: Math.round(total * 0.085 * 100) / 100,
                totalAmount: Math.round(total * 1.085 * 100) / 100,
                closedAt: orderDate,
                createdAt: orderDate,
            },
        });

        const batch = await prisma.orderBatch.create({
            data: {
                sessionId: session.id,
                batchNumber: randomId(6),
                status: BatchStatus.SERVED,
                createdById: staffUser.id,
                createdAt: orderDate,
            },
        });

        for (const item of items) {
            await prisma.orderItem.create({
                data: {
                    batchId: batch.id,
                    menuItemId: item.menuItemId,
                    quantity: 1,
                    unitPrice: item.price,
                    totalPrice: item.price,
                    status: OrderItemStatus.SERVED,
                    createdAt: orderDate,
                },
            });
        }

        return session;
    }

    // Alice — visited on MONDAY (last Monday), ordered wings
    const lastMonday = lastWeekday(1); // 1 = Monday
    await createOrder(
        customers[0].phone,
        lastMonday,
        [{ menuItemId: menuItems[0].id, price: menuItems[0].price }],
        menuItems[0].price,
    );
    console.log(`✅ Alice: order on Monday (${lastMonday.toDateString()}), Spicy Chicken Wings`);

    // Bob — visited on SATURDAY and SUNDAY
    const lastSaturday = lastWeekday(6);
    const lastSunday = lastWeekday(0);
    await createOrder(
        customers[1].phone,
        lastSaturday,
        [{ menuItemId: menuItems[1].id, price: menuItems[1].price }],
        menuItems[1].price,
    );
    await createOrder(
        customers[1].phone,
        lastSunday,
        [{ menuItemId: menuItems[3].id, price: menuItems[3].price }],
        menuItems[3].price,
    );
    console.log(`✅ Bob: orders on Saturday + Sunday (weekend visitor)`);

    // Charlie — big spender: 5 orders over the last 30 days, ~$200 total
    for (let i = 0; i < 5; i++) {
        await createOrder(
            customers[2].phone,
            daysAgo(i * 5 + 1),
            [
                { menuItemId: menuItems[2].id, price: menuItems[2].price },
                { menuItemId: menuItems[4].id, price: menuItems[4].price },
            ],
            menuItems[2].price + menuItems[4].price,
        );
    }
    console.log(`✅ Charlie: 5 orders, big spender (total ~$127)`);

    // Diana — has loyalty points
    const loyaltyProgram = await prisma.loyalityPoint.create({
        data: {
            restaurantId: restaurant.id,
            name: 'Trigger Test Loyalty',
            points: 50,
            isActive: true,
        },
    });
    await prisma.loyalityPointRedemption.create({
        data: {
            loyalityPointId: loyaltyProgram.id,
            customerId: customers[3].id,
            pointsAwarded: 120,
            redeemedAt: daysAgo(3),
        },
    });
    // Also give Diana an order
    await createOrder(
        customers[3].phone,
        daysAgo(3),
        [{ menuItemId: menuItems[0].id, price: menuItems[0].price }],
        menuItems[0].price,
    );
    console.log(`✅ Diana: 120 pending loyalty points + 1 order`);

    // Frank — recent visitor (yesterday)
    await createOrder(
        customers[5].phone,
        daysAgo(1),
        [{ menuItemId: menuItems[3].id, price: menuItems[3].price }],
        menuItems[3].price,
    );
    console.log(`✅ Frank: visited yesterday`);

    // Grace — ordered Pizza specifically (for ORDERED_ITEMS rule)
    await createOrder(
        customers[6].phone,
        daysAgo(2),
        [{ menuItemId: menuItems[2].id, price: menuItems[2].price }],
        menuItems[2].price,
    );
    console.log(`✅ Grace: ordered Margherita Pizza`);

    // Henry — no orders at all (should NOT be eligible for most rules)
    console.log(`✅ Henry: no orders (control customer)`);

    // Eve — no orders (inactive test customer)
    console.log(`✅ Eve: no orders (control customer)`);

    // ── Summary ─────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 TRIGGER CAMPAIGN TEST DATA READY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Save these IDs for Postman:');
    console.log('');
    console.log(`   Restaurant ID:  ${restaurant.id}`);
    console.log(`   Owner User ID:  ${owner.id}`);
    console.log(`   Staff User ID:  ${staffUser.id}`);
    console.log('');
    console.log('   Menu Item IDs:');
    for (const mi of menuItems) {
        console.log(`     ${mi.name}: ${mi.id}`);
    }
    console.log('');
    console.log('   Customer IDs:');
    for (const c of customers) {
        console.log(`     ${c.name} (${c.phone}): ${c.id}`);
    }
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🧪 TEST SCENARIOS FOR POSTMAN:');
    console.log('');
    console.log('1️⃣  VISITED_ON_DAY = "MONDAY"');
    console.log('   → Should match: Alice');
    console.log('');
    console.log('2️⃣  VISITED_ON_DAY = "SATURDAY,SUNDAY"');
    console.log('   → Should match: Bob');
    console.log('');
    console.log(`3️⃣  ORDERED_ITEMS = ["${menuItems[2].id}"]  (Margherita Pizza)`);
    console.log('   → Should match: Charlie, Grace');
    console.log('');
    console.log('4️⃣  HAS_PENDING_LOYALTY (value: null or "0")');
    console.log('   → Should match: Diana (120 points)');
    console.log('');
    console.log('5️⃣  MIN_VISIT_COUNT = "3"');
    console.log('   → Should match: Charlie (5 visits)');
    console.log('');
    console.log('6️⃣  MIN_SPEND_AMOUNT = "100"');
    console.log('   → Should match: Charlie (~$127 total)');
    console.log('');
    console.log(`7️⃣  VISITED_IN_DATE_RANGE = {"startDate":"${daysAgo(7).toISOString().split('T')[0]}","endDate":"${new Date().toISOString().split('T')[0]}"}`);
    console.log('   → Should match: Alice, Bob, Charlie, Diana, Frank, Grace');
    console.log('');
    console.log('8️⃣  Combined (OR): VISITED_ON_DAY="MONDAY" + HAS_PENDING_LOYALTY');
    console.log('   → Should match: Alice OR Diana');
    console.log('');
    console.log('9️⃣  Combined (AND): MIN_VISIT_COUNT="3" + MIN_SPEND_AMOUNT="100"');
    console.log('   → Should match: Charlie only');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log('\n🎉 Trigger campaign seeding completed!');
    })
    .catch(async (e) => {
        console.error('❌ Seed failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
