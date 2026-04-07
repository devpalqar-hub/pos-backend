import { PrismaClient, UserRole, OrderChannel, BillStatus, SessionStatus } from '@prisma/client';

const prisma = new PrismaClient();

const RESTAURANT_ID = 'c5f50dda-222a-445b-a41d-4f1a31914cf9';

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function token6(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

async function ensureRestaurant(restaurantId: string) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) {
        throw new Error(`Restaurant ${restaurantId} not found`);
    }
    return restaurant;
}

async function ensureWaiters(restaurantId: string) {
    const waiterSeeds = [
        { name: 'Waiter One', email: 'waiter.one.analytics@test.com' },
        { name: 'Waiter Two', email: 'waiter.two.analytics@test.com' },
        { name: 'Waiter Three', email: 'waiter.three.analytics@test.com' },
    ];

    const waiters: Array<{ id: string }> = [];

    for (const waiter of waiterSeeds) {
        const upserted = await prisma.user.upsert({
            where: { email: waiter.email },
            update: {
                name: waiter.name,
                role: UserRole.WAITER,
                restaurantId,
                isActive: true,
            },
            create: {
                name: waiter.name,
                email: waiter.email,
                role: UserRole.WAITER,
                restaurantId,
                isActive: true,
            },
        });

        waiters.push(upserted);
    }

    return waiters;
}

async function seedWaiterPerformanceData(restaurantId: string) {
    const waiters = await ensureWaiters(restaurantId);

    let sessionsCreated = 0;
    let billsCreated = 0;

    for (let d = 0; d < 7; d++) {
        const dayBase = new Date();
        dayBase.setDate(dayBase.getDate() - d);

        for (const waiter of waiters) {
            const sessionsForWaiter = randomInt(2, 4);

            for (let i = 0; i < sessionsForWaiter; i++) {
                const createdAt = new Date(dayBase);
                createdAt.setHours(randomInt(11, 22), randomInt(0, 59), randomInt(0, 59), 0);

                const subtotal = randomInt(35, 180);
                const taxRate = 5;
                const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
                const totalAmount = Number((subtotal + taxAmount).toFixed(2));

                const session = await prisma.orderSession.create({
                    data: {
                        restaurantId,
                        sessionNumber: token6(),
                        channel: OrderChannel.DINE_IN,
                        status: SessionStatus.PAID,
                        guestCount: randomInt(1, 5),
                        openedById: waiter.id,
                        createdAt,
                        closedAt: new Date(createdAt.getTime() + randomInt(20, 90) * 60000),
                    },
                });
                sessionsCreated++;

                await prisma.bill.create({
                    data: {
                        sessionId: session.id,
                        restaurantId,
                        billNumber: token6(),
                        status: BillStatus.PAID,
                        subtotal,
                        grossAmount: subtotal,
                        taxRate,
                        taxAmount,
                        totalAmount,
                        discountAmount: 0,
                        coupounDiscountAmount: 0,
                        loyalityPointDiscountAmount: 0,
                        createdAt: new Date(createdAt.getTime() + randomInt(10, 45) * 60000),
                        paidAt: new Date(createdAt.getTime() + randomInt(30, 120) * 60000),
                    },
                });
                billsCreated++;
            }
        }
    }

    return { waiters: waiters.length, sessionsCreated, billsCreated };
}

async function main() {
    console.log('🌱 Seeding waiter performance analytics data...');
    await ensureRestaurant(RESTAURANT_ID);

    const stats = await seedWaiterPerformanceData(RESTAURANT_ID);

    console.log(`✅ Waiter analytics seed completed for restaurant ${RESTAURANT_ID}`);
    console.log(`   Waiters ensured: ${stats.waiters}`);
    console.log(`   Sessions created: ${stats.sessionsCreated}`);
    console.log(`   Bills created: ${stats.billsCreated}`);
}

main()
    .catch((e) => {
        console.error('❌ Waiter analytics seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
