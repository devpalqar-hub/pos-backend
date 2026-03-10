import { PrismaClient, OrderChannel, SessionStatus, BatchStatus, BillStatus } from '@prisma/client'

const prisma = new PrismaClient()

// const RESTAURANT_ID = "110201cd-698d-4ad9-9c63-4ea706d95f8f"

const RESTAURANT_ID = "745f819b-3fed-4992-84e9-0db4e927681f"
let USER_ID: string
let MENU_ITEMS: any[] = []

function random(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateBillNumber() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''

    for (let i = 0; i < 6; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
    }

    return result
}

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

async function ensureUser() {

    const existingUser = await prisma.user.findFirst()

    if (existingUser) {
        USER_ID = existingUser.id
        return
    }

    const user = await prisma.user.create({
        data: {
            name: "Seeder Staff",
            email: "seeder@toast.test",
            role: "WAITER"
        }
    })

    USER_ID = user.id
}

async function loadMenuItems() {

    MENU_ITEMS = await prisma.menuItem.findMany({
        where: {
            restaurantId: RESTAURANT_ID
        }
    })

    if (MENU_ITEMS.length === 0) {
        throw new Error(
            "No menu items found for this restaurant. Please create menu items first."
        )
    }

}

async function createOrder(i: number) {

    const channels = [
        OrderChannel.DINE_IN,
        OrderChannel.UBER_EATS,
        OrderChannel.ONLINE_OWN,
        OrderChannel.DOORDASH
    ]

    const statuses = [
        SessionStatus.OPEN,
        SessionStatus.BILLED,
        SessionStatus.PAID
    ]

    const channel = randomFrom(channels)
    const status = randomFrom(statuses)

    const session = await prisma.orderSession.create({
        data: {
            restaurantId: RESTAURANT_ID,
            sessionNumber: `S${1000 + i}`,
            channel,
            status,
            guestCount: random(1, 4),
            customerName: `Customer ${i}`,
            customerEmail: `customer${i}@mail.com`,
            openedById: USER_ID
        }
    })

    const batch = await prisma.orderBatch.create({
        data: {
            sessionId: session.id,
            batchNumber: `B${1000 + i}`,
            status: BatchStatus.PENDING,
            createdById: USER_ID
        }
    })

    const itemCount = random(1, 4)

    let subtotal = 0

    for (let j = 0; j < itemCount; j++) {

        const menuItem = randomFrom(MENU_ITEMS)
        const price = random(100, 500)
        const quantity = random(1, 3)
        const total = price * quantity

        subtotal += total

        await prisma.orderItem.create({
            data: {
                batchId: batch.id,
                menuItemId: menuItem.id,
                quantity,
                unitPrice: price,
                totalPrice: total,
            }
        })
    }

    const taxRate = 5
    const taxAmount = subtotal * 0.05
    const total = subtotal + taxAmount

    const bill = await prisma.bill.create({
        data: {
            sessionId: session.id,
            restaurantId: RESTAURANT_ID,
            billNumber: generateBillNumber(),
            status: status === SessionStatus.PAID ? BillStatus.PAID : BillStatus.FINAL,
            subtotal,
            taxRate,
            taxAmount,
            discountAmount: 0,
            totalAmount: total,
            generatedById: USER_ID
        }
    })
    const menuItem = randomFrom(MENU_ITEMS)
    await prisma.billItem.create({
        data: {
            billId: bill.id,
            menuItemId: menuItem.id,
            name: "Test Item",
            quantity: 1,
            unitPrice: subtotal,
            totalPrice: subtotal
        }
    })

}

async function main() {
    console.log("Seeding orders for Trigger Test Bistro...")

    await ensureUser()
    await loadMenuItems()

    // Clean up previous data for this restaurant
    await prisma.orderSession.deleteMany({ where: { restaurantId: RESTAURANT_ID } })

    const ordersToCreate = 30

    for (let i = 1; i <= ordersToCreate; i++) {
        await createOrder(i)
    }

    console.log(`Created ${ordersToCreate} orders`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })