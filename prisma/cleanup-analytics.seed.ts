import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const restaurantId = '110201cd-698d-4ad9-9c63-4ea706d95f8f'

async function cleanup() {
    console.log('🧹 Starting full cleanup for restaurant:', restaurantId)

    // 1. Payment (refs Bill)
    const p1 = await prisma.payment.deleteMany({ where: { bill: { restaurantId } } })
    console.log(`  deleted payments:               ${p1.count}`)

    // 2. BillItem (refs Bill + MenuItem)
    const p2 = await prisma.billItem.deleteMany({ where: { bill: { restaurantId } } })
    console.log(`  deleted bill_items:             ${p2.count}`)

    // 3. Bill
    const p3 = await prisma.bill.deleteMany({ where: { restaurantId } })
    console.log(`  deleted bills:                  ${p3.count}`)

    // 4. OrderItem (refs OrderBatch + MenuItem)
    const p4 = await prisma.orderItem.deleteMany({
        where: { batch: { session: { restaurantId } } },
    })
    console.log(`  deleted order_items:            ${p4.count}`)

    // 5. OrderBatch
    const p5 = await prisma.orderBatch.deleteMany({ where: { session: { restaurantId } } })
    console.log(`  deleted order_batches:          ${p5.count}`)

    // 6. CouponUsage (refs OrderSession)
    const p6 = await prisma.couponUsage.deleteMany({ where: { session: { restaurantId } } })
    console.log(`  deleted coupon_usages:          ${p6.count}`)

    // 7. OrderSession
    const p7 = await prisma.orderSession.deleteMany({ where: { restaurantId } })
    console.log(`  deleted order_sessions:         ${p7.count}`)

    // 8. CartItem (refs MenuItem)
    const p8 = await prisma.cartItem.deleteMany({ where: { menuItem: { restaurantId } } })
    console.log(`  deleted cart_items:             ${p8.count}`)

    // 9. Cart
    const p9 = await prisma.cart.deleteMany({ where: { restaurantId } })
    console.log(`  deleted carts:                  ${p9.count}`)

    // 10. PriceRuleDay → PriceRule (refs MenuItem)
    const p10 = await prisma.priceRuleDay.deleteMany({ where: { rule: { restaurantId } } })
    console.log(`  deleted price_rule_days:        ${p10.count}`)
    const p11 = await prisma.priceRule.deleteMany({ where: { restaurantId } })
    console.log(`  deleted price_rules:            ${p11.count}`)

    // 11. DoorDash item mappings (refs MenuItem)
    const p12 = await prisma.doorDashItemMapping.deleteMany({
        where: { menuItem: { restaurantId } },
    })
    console.log(`  deleted doordash_item_mappings: ${p12.count}`)

    // 12. UberEats item mappings (refs MenuItem)
    const p13 = await prisma.uberEatsItemMapping.deleteMany({
        where: { menuItem: { restaurantId } },
    })
    console.log(`  deleted uber_eats_item_mappings:${p13.count}`)

    // 13. LoyalityPoint M2M join — must disconnect before deleting
    const loyalityPoints = await prisma.loyalityPoint.findMany({ where: { restaurantId } })
    for (const lp of loyalityPoints) {
        await prisma.loyalityPoint.update({
            where: { id: lp.id },
            data: { menuItems: { set: [] }, categories: { set: [] } },
        })
    }
    await prisma.loyalityPointRedemption.deleteMany({ where: { loyalityPoint: { restaurantId } } })
    await prisma.loyalityPointDay.deleteMany({ where: { loyalityPoint: { restaurantId } } })
    const p14 = await prisma.loyalityPoint.deleteMany({ where: { restaurantId } })
    console.log(`  deleted loyality_points:        ${p14.count}`)

    // 14. MenuItem — now safe
    const p15 = await prisma.menuItem.deleteMany({ where: { restaurantId } })
    console.log(`  deleted menu_items:             ${p15.count}`)

    // 15. MenuCategory
    const p16 = await prisma.menuCategory.deleteMany({ where: { restaurantId } })
    console.log(`  deleted menu_categories:        ${p16.count}`)

    console.log('\n✅ Cleanup complete!')
}

cleanup()
    .catch((e) => { console.error('❌ Cleanup failed:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())