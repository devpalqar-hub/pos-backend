import {
    PrismaClient,
    ItemType,
    OrderChannel,
    OrderItemStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_RESTAURANT_ID = 'c5f50dda-222a-445b-a41d-4f1a31914cf9';

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60000);
}

function token6() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function resolveRestaurantId() {
    const requestedId = process.env.RESTAURANT_ID || DEFAULT_RESTAURANT_ID;

    const requested = await prisma.restaurant.findUnique({
        where: { id: requestedId },
        select: { id: true },
    });

    if (requested) return requested.id;

    const fallback = await prisma.restaurant.findFirst({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
    });

    if (!fallback) {
        throw new Error('No restaurant found. Create a restaurant before running this seeder.');
    }

    return fallback.id;
}

async function ensureMenuItems(restaurantId: string) {
    let items = await prisma.menuItem.findMany({
        where: { restaurantId, isActive: true },
        select: { id: true, price: true, name: true },
        take: 6,
    });

    if (items.length >= 3) {
        return items;
    }

    const category = await prisma.menuCategory.upsert({
        where: {
            restaurantId_name: {
                restaurantId,
                name: 'Kitchen Analytics Seed Category',
            },
        },
        update: { isActive: true },
        create: {
            restaurantId,
            name: 'Kitchen Analytics Seed Category',
            description: 'Seeded category for kitchen analytics testing',
            isActive: true,
        },
        select: { id: true },
    });

    const names = ['Seed Burger', 'Seed Pasta', 'Seed Fries', 'Seed Salad'];

    for (const name of names) {
        await prisma.menuItem.create({
            data: {
                restaurantId,
                categoryId: category.id,
                name,
                price: randomInt(8, 18),
                itemType: ItemType.NON_STOCKABLE,
                isAvailable: true,
                isActive: true,
            },
        });
    }

    items = await prisma.menuItem.findMany({
        where: { restaurantId, isActive: true },
        select: { id: true, price: true, name: true },
        take: 6,
    });

    return items;
}

async function main() {
    console.log('🌱 Seeding kitchen analytics test data...');

    const restaurantId = await resolveRestaurantId();
    const menuItems = await ensureMenuItems(restaurantId);

    if (menuItems.length < 3) {
        throw new Error('At least 3 menu items are required to seed kitchen analytics data.');
    }

    const channels = [
        OrderChannel.DINE_IN,
        OrderChannel.ONLINE_OWN,
        OrderChannel.UBER_EATS,
        OrderChannel.DOORDASH,
    ];

    const daysBack = 14;
    let createdSessions = 0;
    let createdItems = 0;

    for (let day = 0; day < daysBack; day++) {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() - day);

        const sessionsPerDay = randomInt(4, 7);

        for (let i = 0; i < sessionsPerDay; i++) {
            const hour = randomFrom([11, 12, 13, 18, 19, 20, 21]);
            const minute = randomInt(0, 59);

            const sessionCreatedAt = new Date(baseDate);
            sessionCreatedAt.setHours(hour, minute, 0, 0);

            const session = await prisma.orderSession.create({
                data: {
                    restaurantId,
                    sessionNumber: token6(),
                    channel: randomFrom(channels),
                    createdAt: sessionCreatedAt,
                },
                select: { id: true },
            });

            const batch = await prisma.orderBatch.create({
                data: {
                    sessionId: session.id,
                    batchNumber: token6(),
                },
                select: { id: true },
            });

            const itemsPerBatch = randomInt(2, 5);

            for (let j = 0; j < itemsPerBatch; j++) {
                const menuItem = randomFrom(menuItems);
                const quantity = randomInt(1, 3);
                const unitPrice = Number(menuItem.price);

                const itemCreatedAt = addMinutes(sessionCreatedAt, randomInt(0, 6));
                const preparedAt = addMinutes(itemCreatedAt, randomInt(6, 25));
                const servedAt = addMinutes(preparedAt, randomInt(2, 12));

                await prisma.orderItem.create({
                    data: {
                        batchId: batch.id,
                        menuItemId: menuItem.id,
                        quantity,
                        unitPrice,
                        totalPrice: unitPrice * quantity,
                        status: OrderItemStatus.SERVED,
                        createdAt: itemCreatedAt,
                        preparedAt,
                        servedAt,
                    },
                });

                createdItems++;
            }

            createdSessions++;
        }
    }

    console.log(`✅ Kitchen analytics data seeded for restaurant: ${restaurantId}`);
    console.log(`   Sessions created: ${createdSessions}`);
    console.log(`   Order items created: ${createdItems}`);
    console.log('   Use this data with getPreparationTimeAnalytics and getOrderFulfillmentTime');
}

main()
    .catch((e) => {
        console.error('❌ Kitchen analytics seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
