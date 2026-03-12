import { PrismaClient, Prisma } from '@prisma/client'
import { OrderChannel } from '@prisma/client'

const prisma = new PrismaClient()

const restaurantId = "c5f50dda-222a-445b-a41d-4f1a31914cf9"
// const restaurantId = "110201cd-698d-4ad9-9c63-4ea706d95f8f"

const customers = [
    {
        name: "Sonas Sasi Kumar",
        email: "sonasasikumarm@gmail.com",
        phone: "+919900000001",
        wallet: new Prisma.Decimal(150),
    },
    {
        name: "M Sonasasi Kumar",
        email: "msonasasikumar@gmail.com",
        phone: "+919900000002",
        wallet: new Prisma.Decimal(500), // ensure loyalty rule passes
    },
    {
        name: "Sabarinath P",
        email: "sabarinathp.dev@gmail.com",
        phone: "+919900000003",
        wallet: new Prisma.Decimal(450),
    },
    {
        name: "Devanand Joly",
        email: "devanandjoly@gmail.com",
        phone: "+919900000004",
        wallet: new Prisma.Decimal(0),
    },
    {
        name: "Nandhu Devanand",
        email: "nandhudevanand4419@gmail.com",
        phone: "+919900000005",
        wallet: new Prisma.Decimal(200),
    },
]

async function resetData() {

    console.log("Deleting previous seed data...")

    const sessions = await prisma.orderSession.findMany({
        where: { restaurantId },
        select: { id: true }
    })

    const sessionIds = sessions.map(s => s.id)

    const batches = await prisma.orderBatch.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { id: true }
    })

    const batchIds = batches.map(b => b.id)

    await prisma.orderItem.deleteMany({
        where: { batchId: { in: batchIds } }
    })

    await prisma.orderBatch.deleteMany({
        where: { id: { in: batchIds } }
    })

    await prisma.orderSession.deleteMany({
        where: { restaurantId }
    })

    await prisma.customer.deleteMany({
        where: {
            restaurantId,
            phone: {
                in: customers.map(c => c.phone)
            }
        }
    })

    console.log("Reset completed")
}

async function seedCustomers() {

    console.log("Creating customers...")

    const createdCustomers: Awaited<ReturnType<typeof prisma.customer.create>>[] = []

    for (const customer of customers) {

        const existing = await prisma.customer.findUnique({
            where: {
                restaurantId_phone: {
                    restaurantId,
                    phone: customer.phone
                }
            }
        })

        let createdOrExisting

        if (existing) {
            createdOrExisting = existing
        } else {
            createdOrExisting = await prisma.customer.create({
                data: {
                    restaurantId,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    wallet: customer.wallet
                }
            })
        }

        createdCustomers.push(createdOrExisting)
    }

    return createdCustomers
}

async function seedOrders(customers) {

    console.log("Creating orders...")

    const menuItem = await prisma.menuItem.findFirst({
        where: { restaurantId }
    })

    if (!menuItem) {
        throw new Error("At least one menu item required for seeding orders")
    }

    const user = await prisma.user.findFirst({
        where: { restaurantId }
    })

    for (let i = 0; i < customers.length; i++) {

        const customer = customers[i]

        let channels: OrderChannel[] = [OrderChannel.DINE_IN]
        let orderCount = i + 1

        // Ensure tester satisfies every campaign rule
        if (customer.email === "msonasasikumar@gmail.com") {
            channels = [OrderChannel.DINE_IN, OrderChannel.ONLINE_OWN, OrderChannel.UBER_EATS]
            orderCount = 5
        } else {
            channels =
                i === 0 ? [OrderChannel.DINE_IN] :
                    i === 1 ? [OrderChannel.ONLINE_OWN] :
                        i === 2 ? [OrderChannel.UBER_EATS] :
                            [OrderChannel.DINE_IN]
        }

        for (let j = 0; j < orderCount; j++) {

            const channel = channels[j % channels.length]

            const session = await prisma.orderSession.create({
                data: {
                    restaurantId,
                    channel,
                    sessionNumber: Math.random().toString(36).substring(2, 8),
                    openedById: user!.id,
                    customerName: customer.name,
                    customerPhone: customer.phone,
                    customerEmail: customer.email,
                    status: "PAID",
                    subtotal: new Prisma.Decimal(200 + j * 100),
                    taxAmount: new Prisma.Decimal(20),
                    totalAmount: new Prisma.Decimal(220 + j * 100),
                    closedAt: new Date()
                }
            })

            const batch = await prisma.orderBatch.create({
                data: {
                    sessionId: session.id,
                    batchNumber: Math.random().toString(36).substring(2, 8),
                    status: "SERVED"
                }
            })

            await prisma.orderItem.create({
                data: {
                    batchId: batch.id,
                    menuItemId: menuItem.id,
                    quantity: 1,
                    unitPrice: new Prisma.Decimal(200),
                    totalPrice: new Prisma.Decimal(200),
                    status: "SERVED"
                }
            })

        }

    }

}

async function main() {

    const shouldReset = process.argv.includes("--reset")

    if (shouldReset) {
        await resetData()
    }

    const createdCustomers = await seedCustomers()

    await seedOrders(createdCustomers)

    console.log("Seeding completed successfully")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })