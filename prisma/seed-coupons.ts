import { PrismaClient, CouponDiscountType } from '@prisma/client'

const prisma = new PrismaClient()

const restaurantId = 'c5f50dda-222a-445b-a41d-4f1a31914cf9'
// const restaurantId = "110201cd-698d-4ad9-9c63-4ea706d95f8f"

async function main() {
    console.log('🌱 Seeding coupon data...')

    // ─── 1. Clean up existing test data ────────────────────────────────────────
    await prisma.couponUsage.deleteMany({ where: { coupon: { restaurantId } } })
    await prisma.coupon.deleteMany({ where: { restaurantId } })

    // ─── 2. Create Coupons ──────────────────────────────────────────────────────

    const coupons = await prisma.coupon.createMany({
        data: [
            {
                restaurantId,
                code: 'WELCOME10',
                name: 'Welcome 10% Off',
                description: 'First-time customer discount — 10% off any order',
                discountType: CouponDiscountType.PERCENTAGE,
                discountValue: 10,
                maxDiscount: 20,          // cap at $20
                minOrderAmount: 15,
                usageLimit: 100,
                perCustomerLimit: 1,
                validFrom: new Date('2025-01-01'),
                validUntil: new Date('2099-12-31'),
                isActive: true,
            },
            {
                restaurantId,
                code: 'FLAT5',
                name: 'Flat $5 Off',
                description: '$5 flat discount on orders above $30',
                discountType: CouponDiscountType.FIXED,
                discountValue: 5,
                maxDiscount: null,
                minOrderAmount: 30,
                usageLimit: 200,
                perCustomerLimit: null,   // unlimited per customer
                validFrom: new Date('2025-01-01'),
                validUntil: new Date('2099-12-31'),
                isActive: true,
            },
            {
                restaurantId,
                code: 'SUMMER20',
                name: 'Summer 20% Off',
                description: 'Summer promo — 20% off, max $50 discount',
                discountType: CouponDiscountType.PERCENTAGE,
                discountValue: 20,
                maxDiscount: 50,
                minOrderAmount: 25,
                usageLimit: 50,
                perCustomerLimit: 2,
                validFrom: new Date('2025-06-01'),
                validUntil: new Date('2025-08-31'),
                isActive: true,
            },
            {
                restaurantId,
                code: 'EXPIRED',
                name: 'Expired Coupon',
                description: 'This coupon is already expired — for testing expired-coupon rejection',
                discountType: CouponDiscountType.FIXED,
                discountValue: 10,
                maxDiscount: null,
                minOrderAmount: null,
                usageLimit: null,
                perCustomerLimit: null,
                validFrom: new Date('2020-01-01'),
                validUntil: new Date('2020-12-31'),
                isActive: true,
            },
            {
                restaurantId,
                code: 'INACTIVE',
                name: 'Inactive Coupon',
                description: 'isActive=false — for testing deactivated-coupon rejection',
                discountType: CouponDiscountType.PERCENTAGE,
                discountValue: 15,
                maxDiscount: null,
                minOrderAmount: null,
                usageLimit: null,
                perCustomerLimit: null,
                validFrom: new Date('2025-01-01'),
                validUntil: new Date('2099-12-31'),
                isActive: false,
            },
            {
                restaurantId,
                code: 'NOLIMIT',
                name: 'No Minimum Order',
                description: '10% off with no minimum order requirement',
                discountType: CouponDiscountType.PERCENTAGE,
                discountValue: 10,
                maxDiscount: null,
                minOrderAmount: null,     // no minimum
                usageLimit: null,         // unlimited uses
                perCustomerLimit: null,
                validFrom: new Date('2025-01-01'),
                validUntil: new Date('2099-12-31'),
                isActive: true,
            },
        ],
    })

    console.log(`✅ Created ${coupons.count} coupons`)

    // ─── 3. Fetch created coupons for usage seeding ─────────────────────────────
    const [welcome, flat5] = await Promise.all([
        prisma.coupon.findFirst({ where: { restaurantId, code: 'WELCOME10' } }),
        prisma.coupon.findFirst({ where: { restaurantId, code: 'FLAT5' } }),
    ])

    // ─── 4. Seed a few OrderSessions to attach usages to ───────────────────────
    // Find any existing open sessions for this restaurant to attach usage records.
    const sessions = await prisma.orderSession.findMany({
        where: { restaurantId },
        take: 2,
    })

    if (sessions.length >= 2 && welcome && flat5) {
        await prisma.couponUsage.createMany({
            data: [
                {
                    couponId: welcome.id,
                    orderSessionId: sessions[0].id,
                    customerId: null,
                    discountAmount: 8.5,
                },
                {
                    couponId: flat5.id,
                    orderSessionId: sessions[1].id,
                    customerId: null,
                    discountAmount: 5,
                },
            ],
            skipDuplicates: true,
        })
        console.log('✅ Created 2 coupon usage records')
    } else {
        console.log(
            '⚠️  No existing order sessions found — skipping coupon usage seed. ' +
            'Create at least 2 OrderSessions for this restaurant first, then re-run.',
        )
    }

    // ─── 5. Summary ─────────────────────────────────────────────────────────────
    const allCoupons = await prisma.coupon.findMany({
        where: { restaurantId },
        select: { code: true, name: true, discountType: true, discountValue: true, isActive: true, validUntil: true },
    })

    console.log('\n📋 Seeded Coupons:')
    console.table(allCoupons)
    console.log('\n🎉 Coupon seeding complete!')
}

main()
    .catch((e) => {
        console.error('❌ Seeder failed:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())