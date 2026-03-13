import { PrismaClient, BillStatus, PaymentMethod, OrderChannel, SessionStatus, BatchStatus, OrderItemStatus } from '@prisma/client'

const prisma = new PrismaClient()

const restaurantId = 'c5f50dda-222a-445b-a41d-4f1a31914cf9'
// const restaurantId = "110201cd-698d-4ad9-9c63-4ea706d95f8f"
// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function daysAgo(n: number, hour = 12, minute = 0): Date {
    const d = new Date()
    d.setDate(d.getDate() - n)
    d.setHours(hour, minute, 0, 0)
    return d
}

function randomAlphanumeric(length = 6): string {
    return Math.random().toString(36).toUpperCase().slice(2, 2 + length).padEnd(length, '0')
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
    console.log('🧹 Cleaning up analytics seed data...')

    // Delete in dependency order
    await prisma.payment.deleteMany({ where: { bill: { restaurantId } } })
    await prisma.billItem.deleteMany({ where: { bill: { restaurantId } } })
    await prisma.bill.deleteMany({ where: { restaurantId } })
    await prisma.orderItem.deleteMany({ where: { batch: { session: { restaurantId } } } })
    await prisma.orderBatch.deleteMany({ where: { session: { restaurantId } } })
    await prisma.orderSession.deleteMany({ where: { restaurantId } })
    await prisma.menuItem.deleteMany({ where: { restaurantId } })
    await prisma.menuCategory.deleteMany({ where: { restaurantId } })

    console.log('✅ Cleanup complete')
}

// ─── Main Seeder ──────────────────────────────────────────────────────────────

async function main() {
    // ── 0. Verify restaurant ────────────────────────────────────────────────────
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant) {
        console.error(`❌ Restaurant "${restaurantId}" not found. Update restaurantId and retry.`)
        process.exit(1)
    }
    console.log(`✅ Restaurant: "${restaurant.name}"`)

    // Get any staff user to use as openedById
    const staffUser = await prisma.user.findFirst({ where: { restaurantId } })
    if (!staffUser) {
        console.error('❌ No user found for this restaurant. Create at least one staff user first.')
        process.exit(1)
    }

    // ── 1. Menu Categories ──────────────────────────────────────────────────────
    console.log('🌱 Seeding menu categories...')

    const [starters, mains, drinks, desserts] = await Promise.all([
        prisma.menuCategory.create({ data: { restaurantId, name: 'Starters', sortOrder: 1 } }),
        prisma.menuCategory.create({ data: { restaurantId, name: 'Main Course', sortOrder: 2 } }),
        prisma.menuCategory.create({ data: { restaurantId, name: 'Drinks', sortOrder: 3 } }),
        prisma.menuCategory.create({ data: { restaurantId, name: 'Desserts', sortOrder: 4 } }),
    ])

    // ── 2. Menu Items ───────────────────────────────────────────────────────────
    console.log('🌱 Seeding menu items...')

    const menuItemsData = [
        // Starters
        { categoryId: starters.id, name: 'Garlic Bread', price: 5.99 },
        { categoryId: starters.id, name: 'Soup of the Day', price: 6.50 },
        { categoryId: starters.id, name: 'Chicken Wings', price: 9.99 },
        // Mains (high sellers)
        { categoryId: mains.id, name: 'Grilled Chicken', price: 15.99 },
        { categoryId: mains.id, name: 'Beef Burger', price: 13.99 },
        { categoryId: mains.id, name: 'Pasta Carbonara', price: 12.99 },
        { categoryId: mains.id, name: 'Margherita Pizza', price: 11.99 },
        { categoryId: mains.id, name: 'Fish & Chips', price: 14.99 },
        // Drinks
        { categoryId: drinks.id, name: 'Coca Cola', price: 2.99 },
        { categoryId: drinks.id, name: 'Fresh Juice', price: 4.50 },
        { categoryId: drinks.id, name: 'Iced Coffee', price: 4.99 },
        // Desserts
        { categoryId: desserts.id, name: 'Chocolate Cake', price: 6.99 },
        { categoryId: desserts.id, name: 'Ice Cream Scoop', price: 4.99 },
    ]

    const createdItems = await Promise.all(
        menuItemsData.map((item) =>
            prisma.menuItem.create({ data: { restaurantId, ...item } })
        )
    )

    // Named references for building realistic combos
    const [garlicBread, soup, wings, grilledChicken, beefBurger, pastaCarbonara,
        pizza, fishChips, cola, juice, icedCoffee, chocolateCake, iceCream] = createdItems

    console.log(`✅ Created ${createdItems.length} menu items`)

    // ── 3. Sessions, Batches, Items, Bills, Payments ─────────────────────────────
    // Spread orders across the last 90 days to cover 7d / 30d / 90d ranges.
    // Peak hours: 12–14 (lunch) and 19–21 (dinner) — intentionally denser.

    console.log('🌱 Seeding orders and bills...')

    // Define order templates: [menuItem, quantity][]
    type OrderLine = { item: typeof grilledChicken; qty: number }
    const orderTemplates: OrderLine[][] = [
        // Lunch combos
        [{ item: grilledChicken, qty: 1 }, { item: cola, qty: 1 }, { item: garlicBread, qty: 1 }],
        [{ item: beefBurger, qty: 2 }, { item: cola, qty: 2 }],
        [{ item: pastaCarbonara, qty: 1 }, { item: juice, qty: 1 }, { item: chocolateCake, qty: 1 }],
        [{ item: pizza, qty: 1 }, { item: wings, qty: 1 }, { item: cola, qty: 2 }],
        [{ item: fishChips, qty: 1 }, { item: icedCoffee, qty: 1 }],
        // Dinner combos
        [{ item: grilledChicken, qty: 2 }, { item: soup, qty: 2 }, { item: juice, qty: 2 }],
        [{ item: beefBurger, qty: 1 }, { item: garlicBread, qty: 1 }, { item: iceCream, qty: 1 }],
        [{ item: pastaCarbonara, qty: 2 }, { item: cola, qty: 2 }, { item: icedCoffee, qty: 1 }],
        // Simple single-item
        [{ item: pizza, qty: 2 }],
        [{ item: cola, qty: 3 }],
    ]

    // Day buckets: more density in last 7 days for clear trend data
    // Format: [daysAgo, count, hourRange]
    const daySlots: Array<{ daysBack: number; count: number; hours: number[] }> = [
        // Last 7 days — dense (lunch + dinner each day)
        { daysBack: 1, count: 8, hours: [12, 13, 14, 19, 20, 21, 12, 20] },
        { daysBack: 2, count: 7, hours: [12, 13, 19, 20, 21, 12, 19] },
        { daysBack: 3, count: 8, hours: [11, 12, 13, 14, 19, 20, 21, 13] },
        { daysBack: 4, count: 6, hours: [12, 13, 19, 20, 21, 12] },
        { daysBack: 5, count: 7, hours: [12, 13, 14, 19, 20, 21, 14] },
        { daysBack: 6, count: 5, hours: [12, 19, 20, 13, 21] },
        { daysBack: 7, count: 6, hours: [12, 13, 19, 20, 21, 12] },
        // Days 8–30 — moderate
        ...Array.from({ length: 23 }, (_, i) => ({
            daysBack: 8 + i,
            count: randomBetween(3, 6),
            hours: [12, 13, 19, 20, 21].slice(0, randomBetween(3, 5)),
        })),
        // Days 31–90 — sparse (background data)
        ...Array.from({ length: 60 }, (_, i) => ({
            daysBack: 31 + i,
            count: randomBetween(1, 4),
            hours: [12, 19, 20].slice(0, randomBetween(1, 3)),
        })),
    ]

    let sessionCounter = 1
    let billCounter = 1
    let batchCounter = 1

    for (const slot of daySlots) {
        for (let s = 0; s < slot.count; s++) {

            const hour = slot.hours[s % slot.hours.length]
            const minute = randomBetween(0, 59)
            const sessionDate = daysAgo(slot.daysBack, hour, minute)

            const template = orderTemplates[randomBetween(0, orderTemplates.length - 1)]

            // ── Session ──────────────────────────────────────────────────────────
            const session = await prisma.orderSession.create({
                data: {
                    restaurantId,
                    sessionNumber: randomAlphanumeric(6),
                    channel: OrderChannel.DINE_IN,
                    status: SessionStatus.PAID,
                    guestCount: randomBetween(1, 4),
                    openedById: staffUser.id,
                    createdAt: sessionDate,
                    updatedAt: sessionDate,
                    closedAt: new Date(sessionDate.getTime() + 45 * 60 * 1000),
                },
            })

            // ── Batch ────────────────────────────────────────────────────────────
            const batch = await prisma.orderBatch.create({
                data: {
                    sessionId: session.id,
                    batchNumber: randomAlphanumeric(6),
                    status: BatchStatus.SERVED,
                    createdAt: sessionDate,
                    updatedAt: sessionDate,
                    createdById: staffUser.id,
                },
            })

            // ── Order Items ──────────────────────────────────────────────────────
            let sessionSubtotal = 0

            const orderItems = await Promise.all(
                template.map((line) => {
                    const total = Number(line.item.price) * line.qty
                    sessionSubtotal += total
                    return prisma.orderItem.create({
                        data: {
                            batchId: batch.id,
                            menuItemId: line.item.id,
                            quantity: line.qty,
                            unitPrice: line.item.price,
                            totalPrice: total,
                            status: OrderItemStatus.SERVED,
                            servedAt: sessionDate,
                            createdAt: sessionDate,
                            updatedAt: sessionDate,
                        },
                    })
                })
            )

            // ── Bill ─────────────────────────────────────────────────────────────
            const taxRate = Number(restaurant.taxRate || 10)
            const taxAmount = Number(((sessionSubtotal * taxRate) / 100).toFixed(2))
            const totalAmount = Number((sessionSubtotal + taxAmount).toFixed(2))

            const bill = await prisma.bill.create({
                data: {
                    sessionId: session.id,
                    restaurantId,
                    billNumber: randomAlphanumeric(6),
                    status: BillStatus.PAID,
                    subtotal: sessionSubtotal,
                    taxRate,
                    taxAmount,
                    discountAmount: 0,
                    totalAmount,
                    generatedById: staffUser.id,
                    paidAt: new Date(sessionDate.getTime() + 40 * 60 * 1000),
                    createdAt: sessionDate,
                    updatedAt: sessionDate,
                },
            })

            // ── Bill Items ───────────────────────────────────────────────────────
            await prisma.billItem.createMany({
                data: template.map((line) => ({
                    billId: bill.id,
                    menuItemId: line.item.id,
                    name: line.item.name,
                    quantity: line.qty,
                    unitPrice: line.item.price,
                    totalPrice: Number(line.item.price) * line.qty,
                })),
            })

            // ── Payment ──────────────────────────────────────────────────────────
            await prisma.payment.create({
                data: {
                    billId: bill.id,
                    amount: totalAmount,
                    method: [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.UPI][randomBetween(0, 2)],
                    processedById: staffUser.id,
                    createdAt: new Date(sessionDate.getTime() + 42 * 60 * 1000),
                },
            })

            sessionCounter++
            billCounter++
        }
    }

    // ── 4. Summary ──────────────────────────────────────────────────────────────
    const [totalSessions, totalBills, totalPayments] = await Promise.all([
        prisma.orderSession.count({ where: { restaurantId } }),
        prisma.bill.count({ where: { restaurantId, status: 'PAID' } }),
        prisma.payment.count({ where: { bill: { restaurantId } } }),
    ])

    console.log('\n📊 Seed Summary:')
    console.table({
        'Menu Categories': 4,
        'Menu Items': createdItems.length,
        'Order Sessions': totalSessions,
        'Paid Bills': totalBills,
        'Payments': totalPayments,
    })
    console.log('\n🎯 Data coverage:')
    console.log('  • last 7 days  → ~50 sessions  (dense, tests 7d range)')
    console.log('  • last 30 days → ~120 sessions (moderate, tests 30d range)')
    console.log('  • last 90 days → ~220 sessions (sparse, tests 90d range)')
    console.log('  • Peak hours   → 12:00–14:00 and 19:00–21:00')
    console.log('\n🎉 Analytics seed complete!')
}

// ─── Entry point ──────────────────────────────────────────────────────────────
// Seed:         npx ts-node prisma/seed-analytics.ts
// Cleanup only: CLEANUP_ONLY=true npx ts-node prisma/seed-analytics.ts

if (process.env.CLEANUP_ONLY === 'true') {
    cleanup()
        .catch((e) => { console.error('❌ Cleanup failed:', e); process.exit(1) })
        .finally(() => prisma.$disconnect())
} else {
    main()
        .catch(async (e) => {
            console.error('❌ Seeder failed:', e)
            console.log('\n🔄 Auto-cleaning partially seeded data...')
            await cleanup().catch((ce) => console.error('❌ Cleanup also failed:', ce))
            process.exit(1)
        })
        .finally(() => prisma.$disconnect())
}