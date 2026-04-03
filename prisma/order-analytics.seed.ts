import { PrismaClient, OrderChannel, BillStatus } from '@prisma/client';

const prisma = new PrismaClient();

const RESTAURANT_ID = 'c5f50dda-222a-445b-a41d-4f1a31914cf9';

function randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function addMinutes(date: Date, mins: number) {
    return new Date(date.getTime() + mins * 60000);
}

async function main() {
    console.log('🌱 Seeding analytics test data...');

    // ─────────────────────────────────────────────
    // Restaurant
    // ─────────────────────────────────────────────
    const restaurant = await prisma.restaurant.findFirst({
        where: { id: RESTAURANT_ID },
    });
    if (!restaurant) throw new Error('No restaurant found');

    const restaurantId = restaurant.id;

    // ─────────────────────────────────────────────
    // Menu Items
    // ─────────────────────────────────────────────
    const menuItems = await prisma.menuItem.findMany({
        where: { restaurantId },
    });

    if (menuItems.length < 3) {
        throw new Error('Need at least 3 menu items');
    }

    // ─────────────────────────────────────────────
    // Customers
    // ─────────────────────────────────────────────
    const customers: any[] = [];

    for (let i = 0; i < 20; i++) {
        const c = await prisma.customer.create({
            data: {
                restaurantId,
                name: `Customer ${i + 1}`,
                phone: `99999999${i}`,
            },
        });
        customers.push(c);
    }

    // ─────────────────────────────────────────────
    // Generate Orders
    // ─────────────────────────────────────────────
    const channels = [
        OrderChannel.DINE_IN,
        OrderChannel.ONLINE_OWN,
        OrderChannel.UBER_EATS,
        OrderChannel.DOORDASH,
    ];

    const now = new Date();

    for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(now.getDate() - day);

        // simulate peak hours (lunch + dinner)
        const hours = [12, 13, 14, 19, 20, 21];

        for (let i = 0; i < 10; i++) {
            const customer =
                customers[Math.floor(Math.random() * customers.length)];

            const hour =
                hours[Math.floor(Math.random() * hours.length)];

            const orderTime = new Date(date);
            orderTime.setHours(hour, Math.floor(Math.random() * 60));

            const session = await prisma.orderSession.create({
                data: {
                    restaurantId,
                    sessionNumber: Math.random().toString(36).substring(2, 8),
                    channel: channels[Math.floor(Math.random() * channels.length)],
                    customerId: customer.id,
                    createdAt: orderTime,
                },
            });

            const batch = await prisma.orderBatch.create({
                data: {
                    sessionId: session.id,
                    batchNumber: Math.random().toString(36).substring(2, 8),
                },
            });

            let total = 0;

            for (let j = 0; j < 2 + Math.floor(Math.random() * 3); j++) {
                const item =
                    menuItems[Math.floor(Math.random() * menuItems.length)];

                const qty = 1 + Math.floor(Math.random() * 2);
                const price = Number(item.price);

                const createdAt = new Date(orderTime);

                // prep time 5–30 mins
                const prepTime = randomBetween(5, 30);
                const preparedAt = addMinutes(createdAt, prepTime);

                // serve time 5–15 mins after prep
                const servedAt = addMinutes(preparedAt, randomBetween(5, 15));

                await prisma.orderItem.create({
                    data: {
                        batchId: batch.id,
                        menuItemId: item.id,
                        quantity: qty,
                        unitPrice: price,
                        totalPrice: price * qty,
                        createdAt,
                        preparedAt,
                        servedAt,
                        status: 'SERVED',
                    },
                });

                total += price * qty;
            }

            const bill = await prisma.bill.create({
                data: {
                    sessionId: session.id,
                    restaurantId,
                    billNumber: Math.random().toString(36).substring(2, 8),
                    status: BillStatus.PAID,
                    subtotal: total,
                    grossAmount: total,
                    taxRate: 5,
                    taxAmount: total * 0.05,
                    totalAmount: total * 1.05,
                    createdAt: orderTime,
                    paidAt: addMinutes(orderTime, 40),
                    customerId: customer.id,
                },
            });

            await prisma.payment.create({
                data: {
                    billId: bill.id,
                    amount: bill.totalAmount,
                    method: 'UPI',
                },
            });
        }
    }

    console.log('✅ Analytics test data seeded successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });