import { PrismaClient, CouponDiscountType } from '@prisma/client'

const prisma = new PrismaClient()

const restaurantId = 'c5f50dda-222a-445b-a41d-4f1a31914cf9'
// const restaurantId = "110201cd-698d-4ad9-9c63-4ea706d95f8f"
// Helper — subtract N months from today
function monthsAgo(n: number): Date {
    const d = new Date()
    d.setMonth(d.getMonth() - n)
    return d
}

async function main() {
    console.log('🌱 Seeding coupon data...')

    // ─── 1. Clean up ALL previous coupon test data ──────────────────────────────
    await prisma.couponUsage.deleteMany({ where: { coupon: { restaurantId } } })
    await prisma.coupon.deleteMany({ where: { restaurantId } })
    console.log('🧹 Cleaned up previous coupon data')

    // ─── 2. Create Coupons ──────────────────────────────────────────────────────
    const couponInputs = [
        {
            code: 'WELCOME10',
            name: 'Welcome 10% Off',
            description: 'First-time customer discount — 10% off any order',
            discountType: CouponDiscountType.PERCENTAGE,
            discountValue: 10,
            maxDiscount: 20,
            minOrderAmount: 15,
            usageLimit: 100,
            perCustomerLimit: 1,
            validFrom: new Date('2025-01-01'),
            validUntil: new Date('2099-12-31'),
            isActive: true,
        },
        {
            code: 'FLAT5',
            name: 'Flat $5 Off',
            description: '$5 flat discount on orders above $30',
            discountType: CouponDiscountType.FIXED,
            discountValue: 5,
            maxDiscount: null,
            minOrderAmount: 30,
            usageLimit: 200,
            perCustomerLimit: null,
            validFrom: new Date('2025-01-01'),
            validUntil: new Date('2099-12-31'),
            isActive: true,
        },
        {
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
            code: 'FLAT15',
            name: 'Flat $15 Off',
            description: '$15 flat on large orders above $80',
            discountType: CouponDiscountType.FIXED,
            discountValue: 15,
            maxDiscount: null,
            minOrderAmount: 80,
            usageLimit: null,
            perCustomerLimit: null,
            validFrom: new Date('2025-01-01'),
            validUntil: new Date('2099-12-31'),
            isActive: true,
        },
        {
            code: 'EXPIRED',
            name: 'Expired Coupon',
            description: 'validUntil in the past — tests expiry rejection',
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
            code: 'INACTIVE',
            name: 'Inactive Coupon',
            description: 'isActive=false — tests deactivated-coupon rejection',
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
            code: 'NOLIMIT',
            name: 'No Minimum Order',
            description: '10% off with no minimum or usage cap',
            discountType: CouponDiscountType.PERCENTAGE,
            discountValue: 10,
            maxDiscount: null,
            minOrderAmount: null,
            usageLimit: null,
            perCustomerLimit: null,
            validFrom: new Date('2025-01-01'),
            validUntil: new Date('2099-12-31'),
            isActive: true,
        },
    ]

    // Create one by one so we can reference each record immediately
    const created: Record<string, { id: string; code: string }> = {}
    for (const input of couponInputs) {
        const c = await prisma.coupon.create({ data: { restaurantId, ...input } })
        created[c.code] = c
    }
    console.log(`✅ Created ${couponInputs.length} coupons`)

    // ─── 3. Fetch / create OrderSessions to attach usages ──────────────────────
    let sessions = await prisma.orderSession.findMany({
        where: { restaurantId },
        take: 3,
    })

    // If fewer than 3 sessions exist, create stub ones so usage seed always works
    if (sessions.length < 3) {
        // We need a user to satisfy openedById FK
        const anyUser = await prisma.user.findFirst()
        if (!anyUser) {
            console.warn('⚠️  No users found — cannot create stub sessions. Add a user and re-run.')
        } else {
            const needed = 3 - sessions.length
            for (let i = 0; i < needed; i++) {
                const sessionNumber = `SEED${String(Date.now()).slice(-3)}${i}`
                const s = await prisma.orderSession.create({
                    data: {
                        restaurantId,
                        sessionNumber,
                        openedById: anyUser.id,
                    },
                })
                sessions.push(s)
            }
            console.log(`✅ Created ${needed} stub OrderSession(s) for usage attachment`)
        }
    }

    // ─── 4. Seed CouponUsages spread across multiple months ────────────────────
    // This gives usageTrend() meaningful multi-month data to group.
    //
    // Layout:
    //   3 months ago  → WELCOME10 ×2, FLAT5 ×1
    //   2 months ago  → WELCOME10 ×1, FLAT5 ×2, SUMMER20 ×1
    //   1 month ago   → FLAT5 ×1, FLAT15 ×2, NOLIMIT ×1
    //   this month    → WELCOME10 ×1, FLAT15 ×1, NOLIMIT ×2
    //
    // Total discount spread ensures performance() returns a meaningful sum.

    if (sessions.length >= 3) {
        const [s0, s1, s2] = sessions

        const usageRows: {
            couponId: string
            orderSessionId: string
            discountAmount: number
            createdAt: Date
        }[] = [
                // ── 3 months ago ──────────────────────────────────────────────────────
                { couponId: created['WELCOME10'].id, orderSessionId: s0.id, discountAmount: 8.50, createdAt: monthsAgo(3) },
                { couponId: created['WELCOME10'].id, orderSessionId: s1.id, discountAmount: 9.00, createdAt: monthsAgo(3) },
                { couponId: created['FLAT5'].id, orderSessionId: s2.id, discountAmount: 5.00, createdAt: monthsAgo(3) },

                // ── 2 months ago ──────────────────────────────────────────────────────
                { couponId: created['WELCOME10'].id, orderSessionId: s0.id, discountAmount: 7.50, createdAt: monthsAgo(2) },
                { couponId: created['FLAT5'].id, orderSessionId: s1.id, discountAmount: 5.00, createdAt: monthsAgo(2) },
                { couponId: created['FLAT5'].id, orderSessionId: s2.id, discountAmount: 5.00, createdAt: monthsAgo(2) },
                { couponId: created['SUMMER20'].id, orderSessionId: s0.id, discountAmount: 18.00, createdAt: monthsAgo(2) },

                // ── 1 month ago ───────────────────────────────────────────────────────
                { couponId: created['FLAT5'].id, orderSessionId: s1.id, discountAmount: 5.00, createdAt: monthsAgo(1) },
                { couponId: created['FLAT15'].id, orderSessionId: s2.id, discountAmount: 15.00, createdAt: monthsAgo(1) },
                { couponId: created['FLAT15'].id, orderSessionId: s0.id, discountAmount: 15.00, createdAt: monthsAgo(1) },
                { couponId: created['NOLIMIT'].id, orderSessionId: s1.id, discountAmount: 4.20, createdAt: monthsAgo(1) },

                // ── This month ────────────────────────────────────────────────────────
                { couponId: created['WELCOME10'].id, orderSessionId: s2.id, discountAmount: 12.00, createdAt: new Date() },
                { couponId: created['FLAT15'].id, orderSessionId: s0.id, discountAmount: 15.00, createdAt: new Date() },
                { couponId: created['NOLIMIT'].id, orderSessionId: s1.id, discountAmount: 6.50, createdAt: new Date() },
                { couponId: created['NOLIMIT'].id, orderSessionId: s2.id, discountAmount: 3.80, createdAt: new Date() },
            ]

        // CouponUsage has no createdAt override in createMany, so use individual creates
        for (const row of usageRows) {
            await prisma.couponUsage.create({
                data: {
                    couponId: row.couponId,
                    orderSessionId: row.orderSessionId,
                    discountAmount: row.discountAmount,
                    createdAt: row.createdAt,
                },
            })
        }

        const totalDiscount = usageRows.reduce((s, r) => s + r.discountAmount, 0)
        console.log(`✅ Created ${usageRows.length} coupon usage records`)
        console.log(`   Total discount seeded: $${totalDiscount.toFixed(2)}`)
    } else {
        console.warn('⚠️  Not enough sessions — skipping usage seed.')
    }

    // ─── 5. Summary ─────────────────────────────────────────────────────────────
    const allCoupons = await prisma.coupon.findMany({
        where: { restaurantId },
        select: {
            code: true,
            name: true,
            discountType: true,
            discountValue: true,
            isActive: true,
            validUntil: true,
            _count: { select: { usages: true } },
        },
    })

    console.log('\n📋 Seeded Coupons:')
    console.table(
        allCoupons.map(c => ({
            code: c.code,
            type: c.discountType,
            value: Number(c.discountValue),
            active: c.isActive,
            usages: c._count.usages,
        })),
    )

    console.log('\n🧪 APIs now covered by this seed:')
    console.log('  POST   /restaurants/:id/coupons              → create()')
    console.log('  GET    /restaurants/:id/coupons              → findAll()')
    console.log('  GET    /restaurants/:id/coupons/:id          → findOne()')
    console.log('  PATCH  /restaurants/:id/coupons/:id          → update()')
    console.log('  PATCH  /restaurants/:id/coupons/:id/status   → toggleStatus()  [INACTIVE coupon]')
    console.log('  DELETE /restaurants/:id/coupons/:id          → delete()')
    console.log('  POST   /restaurants/:id/coupons/validate     → applyCoupon()   [WELCOME10 / EXPIRED / INACTIVE]')
    console.log('  DELETE /restaurants/:id/orders/:id/coupon    → removeCoupon()')
    console.log('  GET    /restaurants/:id/coupons/:id/usages   → getCouponUsages()')
    console.log('  GET    /restaurants/:id/coupons/performance  → performance()   [7 coupons, multi-month usages]')
    console.log('  GET    /restaurants/:id/coupons/usage-trend  → usageTrend()    [4 months of spread data]')
    console.log('\n🎉 Coupon seeding complete!')
}

main()
    .catch((e) => {
        console.error('❌ Seeder failed:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())