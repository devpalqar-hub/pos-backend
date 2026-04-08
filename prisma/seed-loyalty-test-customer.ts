import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Restaurant ID for testing
const RESTAURANT_ID = '2c229453-0625-4327-bb48-ed944b9c9989';

async function main() {
    console.log('🌱 Starting loyalty point test customer seeder...\n');

    // ── 1. Verify restaurant exists ─────────────────────────────────────────
    const restaurant = await prisma.restaurant.findUnique({
        where: { id: RESTAURANT_ID },
    });

    if (!restaurant) {
        throw new Error(`❌ Restaurant ${RESTAURANT_ID} not found`);
    }
    console.log(`✅ Restaurant found: "${restaurant.name}"\n`);

    // ── 2. Create or get test customer ──────────────────────────────────────
    const testCustomer = await prisma.customer.upsert({
        where: {
            restaurantId_phone: {
                restaurantId: RESTAURANT_ID,
                phone: '9876543210',
            },
        },
        update: {
            name: 'Test Loyalty Customer',
            email: 'loyalty-test@example.com',
            is_registered: true,
            isActive: true,
        },
        create: {
            restaurantId: RESTAURANT_ID,
            phone: '9876543210',
            name: 'Test Loyalty Customer',
            email: 'loyalty-test@example.com',
            is_registered: true,
            isActive: true,
        },
    });

    console.log(`✅ Customer created/updated: ${testCustomer.name} (${testCustomer.phone})`);
    console.log(`   Email: ${testCustomer.email}`);
    console.log(`   ID: ${testCustomer.id}\n`);

    // ── 3. Get or create loyalty point rule for testing ─────────────────────
    const loyaltyPoint = await prisma.loyalityPoint.findFirst({
        where: {
            restaurantId: RESTAURANT_ID,
            isActive: true,
        },
    });

    if (!loyaltyPoint) {
        console.log(
            '⚠️  No active loyalty point rules found in restaurant. Creating a test rule...\n',
        );

        const createdLoyaltyPoint = await prisma.loyalityPoint.create({
            data: {
                restaurantId: RESTAURANT_ID,
                name: 'Test Loyalty Points Rule',
                points: 10, // 10 points per purchase
                isActive: true,
            },
        });

        console.log(`✅ Created loyalty point rule: ${createdLoyaltyPoint.name}`);
        console.log(`   ID: ${createdLoyaltyPoint.id}`);
        console.log(`   Points/purchase: ${createdLoyaltyPoint.points}\n`);

        // Create loyalty point redemptions for testing
        await createLoyaltyPointRedemptions(createdLoyaltyPoint.id, testCustomer.id);
    } else {
        console.log(`✅ Using existing loyalty point rule: ${loyaltyPoint.name}`);
        console.log(`   ID: ${loyaltyPoint.id}`);
        console.log(`   Points/purchase: ${loyaltyPoint.points}\n`);

        // Create loyalty point redemptions for testing
        await createLoyaltyPointRedemptions(loyaltyPoint.id, testCustomer.id);
    }

    console.log('🎉 Seeder completed successfully!\n');
    console.log('📝 Test Details:');
    console.log(`   Restaurant ID: ${RESTAURANT_ID}`);
    console.log(`   Customer ID: ${testCustomer.id}`);
    console.log(`   Phone: ${testCustomer.phone}`);
    console.log(`   Email: ${testCustomer.email}\n`);
    console.log('Use these IDs to test loyalty point reduction logic.\n');
}

async function createLoyaltyPointRedemptions(loyalityPointId: string, customerId: string) {
    console.log('📌 Creating loyalty point redemptions...\n');

    // Delete existing redemptions for this customer to reset
    const deletedCount = await prisma.loyalityPointRedemption.deleteMany({
        where: {
            customerId,
            loyalityPointId,
        },
    });

    if (deletedCount.count > 0) {
        console.log(`   🗑️  Deleted ${deletedCount.count} existing redemptions\n`);
    }

    // Create multiple redemptions to give customer loyalty points
    const redemptionAmounts = [250, 200, 150, 100, 50]; // Different point amounts for testing

    for (let i = 0; i < redemptionAmounts.length; i++) {
        await prisma.loyalityPointRedemption.create({
            data: {
                loyalityPointId,
                customerId,
                pointsAwarded: redemptionAmounts[i],
                redeemedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Spread over days
            },
        });

        console.log(`   ✅ Created redemption ${i + 1}: ${redemptionAmounts[i]} points`);
    }

    const totalPoints = redemptionAmounts.reduce((sum, val) => sum + val, 0);
    console.log(`\n   💰 Total loyalty points available: ${totalPoints} points\n`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
