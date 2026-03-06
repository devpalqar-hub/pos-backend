/**
 * Analytics Seeder for Sai Sandeep's Restaurants
 *
 * Seeds realistic analytics data for:
 * - Sai's Shops      (709181ee-9326-4441-a311-f5a4bd41a889)
 * - Chandra Stores    (c5f50dda-222a-445b-a41d-4f1a31914cf9)
 *
 * Run: npx ts-node prisma/seed-analytics-sai.ts
 */

import {
    PrismaClient,
    UserRole,
    DayOfWeek,
    SessionStatus,
    BillStatus,
    OrderChannel,
    ExpenseType,
    PayrollStatus,
    LeaveType,
    Staff,
    Customer,
    LoyalityPoint,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─── Constants ────────────────────────────────────────────────────────────────

const OWNER_ID = '69e2b73a-875c-470b-805b-2ff148897790';

const RESTAURANTS = [
    { id: '709181ee-9326-4441-a311-f5a4bd41a889', name: "Sai's Shops" },
    { id: 'c5f50dda-222a-445b-a41d-4f1a31914cf9', name: 'Chandra Stores' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomId(len = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function randomBetween(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

function monthDate(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day);
}

// ─── Seed one restaurant ──────────────────────────────────────────────────────

async function seedRestaurant(restaurantId: string, restaurantName: string) {
    console.log(`\n── Seeding: ${restaurantName} (${restaurantId}) ──`);

    // ── Staff user for order references ───────────────────────────────────────
    const staffEmail = `staff-${restaurantId.slice(0, 8)}@seed.test`;
    const staffUser = await prisma.user.upsert({
        where: { email: staffEmail },
        update: {},
        create: {
            name: `${restaurantName} Staff`,
            email: staffEmail,
            role: UserRole.RESTAURANT_ADMIN,
            restaurantId,
            isActive: true,
        },
    });
    console.log(`  ✅ Staff user: ${staffUser.email}`);

    // ── Menu category & items ─────────────────────────────────────────────────
    const category = await prisma.menuCategory.upsert({
        where: {
            restaurantId_name: { restaurantId, name: 'General Items' },
        },
        update: {},
        create: {
            restaurantId,
            name: 'General Items',
            sortOrder: 1,
        },
    });

    const itemNames = [
        { name: 'Product A', price: 25.99 },
        { name: 'Product B', price: 18.50 },
        { name: 'Product C', price: 35.00 },
        { name: 'Product D', price: 12.75 },
    ];
    for (const item of itemNames) {
        await prisma.menuItem.create({
            data: {
                restaurantId,
                categoryId: category.id,
                name: `${item.name} ${randomId(4)}`,
                price: item.price,
            },
        });
    }
    console.log(`  ✅ Menu items: ${itemNames.length}`);

    // ══════════════════════════════════════════════════════════════════════════
    // REVENUE: Orders & Bills across Dec 2025 – Mar 2026
    // ══════════════════════════════════════════════════════════════════════════
    const monthlyOrders = [
        { year: 2025, month: 12, count: 35, avgTotal: 90 },
        { year: 2026, month: 1, count: 50, avgTotal: 105 },
        { year: 2026, month: 2, count: 55, avgTotal: 120 },
        { year: 2026, month: 3, count: 30, avgTotal: 140 },
    ];

    let orderCount = 0;
    for (const mo of monthlyOrders) {
        for (let i = 0; i < mo.count; i++) {
            const day = Math.min(
                Math.floor(Math.random() * 28) + 1,
                mo.month === 3 ? 6 : 28,
            );
            const orderDate = monthDate(mo.year, mo.month, day);

            const subtotal = randomBetween(mo.avgTotal * 0.5, mo.avgTotal * 1.5);
            const taxRate = 8.5;
            const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
            const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

            const session = await prisma.orderSession.create({
                data: {
                    restaurantId,
                    sessionNumber: randomId(6),
                    channel: OrderChannel.DINE_IN,
                    status: SessionStatus.PAID,
                    guestCount: Math.floor(Math.random() * 4) + 1,
                    openedById: staffUser.id,
                    subtotal,
                    taxAmount,
                    totalAmount,
                    closedAt: orderDate,
                    createdAt: orderDate,
                },
            });

            await prisma.bill.create({
                data: {
                    sessionId: session.id,
                    restaurantId,
                    billNumber: randomId(6),
                    status: BillStatus.PAID,
                    subtotal,
                    taxRate,
                    taxAmount,
                    totalAmount,
                    generatedById: staffUser.id,
                    paidAt: orderDate,
                    createdAt: orderDate,
                },
            });
            orderCount++;
        }
    }
    console.log(`  ✅ Orders & Bills: ${orderCount}`);

    // ══════════════════════════════════════════════════════════════════════════
    // EXPENSES
    // ══════════════════════════════════════════════════════════════════════════
    const expenseTemplates = [
        { name: 'Rent', type: ExpenseType.MONTHLY, amount: 4800 },
        { name: 'Utilities', type: ExpenseType.MONTHLY, amount: 950 },
        { name: 'Insurance', type: ExpenseType.MONTHLY, amount: 700 },
        { name: 'Supplies', type: ExpenseType.WEEKLY, amount: 380 },
        { name: 'Marketing', type: ExpenseType.MONTHLY, amount: 500 },
        { name: 'Maintenance', type: ExpenseType.MONTHLY, amount: 300 },
    ];

    let expenseCount = 0;
    for (const mo of [
        { year: 2025, month: 12 },
        { year: 2026, month: 1 },
        { year: 2026, month: 2 },
        { year: 2026, month: 3 },
    ]) {
        for (const exp of expenseTemplates) {
            if (exp.type === ExpenseType.WEEKLY) {
                for (let w = 0; w < 4; w++) {
                    await prisma.expense.create({
                        data: {
                            restaurantId,
                            expenseName: exp.name,
                            expenseType: exp.type,
                            amount: randomBetween(exp.amount * 0.8, exp.amount * 1.2),
                            date: monthDate(mo.year, mo.month, Math.min(w * 7 + 1, 28)),
                            createdById: staffUser.id,
                        },
                    });
                    expenseCount++;
                }
            } else {
                await prisma.expense.create({
                    data: {
                        restaurantId,
                        expenseName: exp.name,
                        expenseType: exp.type,
                        amount: randomBetween(exp.amount * 0.9, exp.amount * 1.1),
                        date: monthDate(mo.year, mo.month, Math.floor(Math.random() * 28) + 1),
                        createdById: staffUser.id,
                    },
                });
                expenseCount++;
            }
        }
    }

    // Daily food/ingredient costs for last 90 days
    for (let d = 0; d < 90; d++) {
        await prisma.expense.create({
            data: {
                restaurantId,
                expenseName: 'Food & Ingredient Cost',
                expenseType: ExpenseType.DAILY,
                amount: randomBetween(100, 320),
                date: daysAgo(d),
                createdById: staffUser.id,
            },
        });
        expenseCount++;
    }
    console.log(`  ✅ Expenses: ${expenseCount}`);

    // ══════════════════════════════════════════════════════════════════════════
    // STAFF PROFILES (Employee Directory Analytics)
    // ══════════════════════════════════════════════════════════════════════════
    const weekdays = [
        DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY, DayOfWeek.FRIDAY,
    ];
    const allDays = [...weekdays, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY];

    const staffProfiles = [
        { name: 'Arjun Patel', email: `arjun.${restaurantId.slice(0, 6)}@seed.test`, role: 'Head Chef', salary: 4200, days: allDays.slice(0, 6) },
        { name: 'Priya Sharma', email: `priya.${restaurantId.slice(0, 6)}@seed.test`, role: 'Sous Chef', salary: 3400, days: allDays.slice(0, 6) },
        { name: 'Rahul Kumar', email: `rahul.${restaurantId.slice(0, 6)}@seed.test`, role: 'Line Cook', salary: 2600, days: weekdays },
        { name: 'Meena Reddy', email: `meena.${restaurantId.slice(0, 6)}@seed.test`, role: 'Line Cook', salary: 2600, days: weekdays },
        { name: 'Vikram Singh', email: `vikram.${restaurantId.slice(0, 6)}@seed.test`, role: 'Manager', salary: 3800, days: allDays.slice(0, 6) },
        { name: 'Ananya Nair', email: `ananya.${restaurantId.slice(0, 6)}@seed.test`, role: 'Server', salary: 2100, days: allDays.slice(0, 6) },
        { name: 'Karthik Iyer', email: `karthik.${restaurantId.slice(0, 6)}@seed.test`, role: 'Server', salary: 2100, days: [DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] },
        { name: 'Deepa Menon', email: `deepa.${restaurantId.slice(0, 6)}@seed.test`, role: 'Server', salary: 2100, days: weekdays },
        { name: 'Suresh Pillai', email: `suresh.${restaurantId.slice(0, 6)}@seed.test`, role: 'Server', salary: 2100, days: allDays.slice(0, 6) },
        { name: 'Lakshmi Das', email: `lakshmi.${restaurantId.slice(0, 6)}@seed.test`, role: 'Cashier', salary: 1900, days: allDays.slice(0, 6) },
        { name: 'Arun Mohan', email: `arun.${restaurantId.slice(0, 6)}@seed.test`, role: 'Cashier', salary: 1900, days: [DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY] },
        { name: 'Divya Krishnan', email: `divya.${restaurantId.slice(0, 6)}@seed.test`, role: 'Host', salary: 1800, days: weekdays },
        { name: 'Manoj George', email: `manoj.${restaurantId.slice(0, 6)}@seed.test`, role: 'Bartender', salary: 2400, days: [DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] },
        { name: 'Revathi Balan', email: `revathi.${restaurantId.slice(0, 6)}@seed.test`, role: 'Prep Cook', salary: 2200, days: weekdays },
        { name: 'Sanjay Verma', email: `sanjay.${restaurantId.slice(0, 6)}@seed.test`, role: 'Prep Cook', salary: 2200, days: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.SATURDAY] },
        { name: 'Kavitha Raj', email: `kavitha.${restaurantId.slice(0, 6)}@seed.test`, role: 'Dishwasher', salary: 1700, days: weekdays },
        { name: 'Ganesh Babu', email: `ganesh.${restaurantId.slice(0, 6)}@seed.test`, role: 'Dishwasher', salary: 1700, days: [DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] },
        { name: 'Nisha Thomas', email: `nisha.${restaurantId.slice(0, 6)}@seed.test`, role: 'Delivery', salary: 2000, days: allDays },
        { name: 'Ravi Shankar', email: `ravi.${restaurantId.slice(0, 6)}@seed.test`, role: 'Delivery', salary: 2000, days: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] },
        { name: 'Pooja Nambiar', email: `pooja.${restaurantId.slice(0, 6)}@seed.test`, role: 'Asst Manager', salary: 3200, days: weekdays },
    ];

    const createdStaff: Staff[] = [];
    for (let i = 0; i < staffProfiles.length; i++) {
        const sp = staffProfiles[i];
        const staff = await prisma.staff.upsert({
            where: { email: sp.email },
            update: {},
            create: {
                name: sp.name,
                email: sp.email,
                phone: `+91${Math.floor(7000000000 + Math.random() * 2999999999)}`,
                jobRole: sp.role,
                monthlySalary: sp.salary,
                paidLeaveDays: 2,
                dailyWorkHours: 8,
                noOfWorkingDays: sp.days.length * 4,
                restaurantId,
                isActive: true,
                // Last 2 staff are "new this month"
                createdAt: i >= staffProfiles.length - 2
                    ? daysAgo(Math.floor(Math.random() * 5))
                    : daysAgo(30 + Math.floor(Math.random() * 60)),
            },
        });

        for (const day of sp.days) {
            await prisma.staffWorkingDay.upsert({
                where: { staffId_day: { staffId: staff.id, day } },
                update: {},
                create: { staffId: staff.id, day },
            });
        }
        createdStaff.push(staff);
    }
    console.log(`  ✅ Staff profiles: ${createdStaff.length}`);

    // ── Leaves today ──────────────────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveStaff = createdStaff.slice(0, 2);
    for (const s of leaveStaff) {
        await prisma.staffLeave.upsert({
            where: { staffId_date: { staffId: s.id, date: today } },
            update: {},
            create: {
                staffId: s.id,
                date: today,
                leaveType: LeaveType.PAID,
                reason: 'Personal day',
            },
        });
    }
    console.log(`  ✅ Leaves today: ${leaveStaff.length}`);

    // ── Payroll (Jan & Feb 2026) ──────────────────────────────────────────────
    let payrollCount = 0;
    for (const mo of [{ month: 1, year: 2026 }, { month: 2, year: 2026 }]) {
        for (const staff of createdStaff) {
            const sp = staffProfiles.find((s) => s.email === staff.email);
            const totalWorkingDays = Math.round((sp?.days.length ?? 5) * 4.3);
            const salary = parseFloat(staff.monthlySalary.toString());
            const perDaySalary = Math.round((salary / totalWorkingDays) * 100) / 100;

            await prisma.payroll.upsert({
                where: {
                    staffId_month_year: { staffId: staff.id, month: mo.month, year: mo.year },
                },
                update: {},
                create: {
                    restaurantId,
                    staffId: staff.id,
                    month: mo.month,
                    year: mo.year,
                    monthlySalary: staff.monthlySalary,
                    totalWorkingDays,
                    perDaySalary,
                    paidLeaveDays: Math.floor(Math.random() * 2),
                    unpaidLeaveDays: 0,
                    overtimeAmount: randomBetween(0, 150),
                    bonusAmount: 0,
                    deductionAmount: 0,
                    totalDeductions: 0,
                    totalAdditions: randomBetween(0, 150),
                    finalSalary: staff.monthlySalary,
                    status: PayrollStatus.PAID,
                    processedAt: monthDate(mo.year, mo.month, 28),
                },
            });
            payrollCount++;
        }
    }
    console.log(`  ✅ Payroll records: ${payrollCount}`);

    // ══════════════════════════════════════════════════════════════════════════
    // LOYALTY PROGRAMS & CUSTOMERS
    // ══════════════════════════════════════════════════════════════════════════
    const customers: Customer[] = [];
    for (let i = 0; i < 25; i++) {
        const c = await prisma.customer.upsert({
            where: {
                restaurantId_phone: {
                    restaurantId,
                    phone: `+91${restaurantId.slice(0, 4)}${String(1000 + i).padStart(4, '0')}`,
                },
            },
            update: {},
            create: {
                restaurantId,
                name: `Customer ${i + 1}`,
                phone: `+91${restaurantId.slice(0, 4)}${String(1000 + i).padStart(4, '0')}`,
            },
        });
        customers.push(c);
    }
    console.log(`  ✅ Customers: ${customers.length}`);

    const loyaltyDefs = [
        { name: 'Weekend Bonus', points: 10, active: true },
        { name: 'Happy Hour Rewards', points: 5, active: true },
        { name: 'Birthday Special', points: 25, active: true },
        { name: 'First Visit Bonus', points: 15, active: true },
        { name: 'Lunch Express', points: 8, active: true },
        { name: 'VIP Club', points: 20, active: true },
        { name: 'Seasonal Special', points: 12, active: true },
        { name: 'Night Owl Rewards', points: 7, active: true },
        { name: 'Old Promotion', points: 5, active: false },
        { name: 'Retired Program', points: 3, active: false },
    ];

    const programs: LoyalityPoint[] = [];
    for (let i = 0; i < loyaltyDefs.length; i++) {
        const lp = loyaltyDefs[i];
        const program = await prisma.loyalityPoint.create({
            data: {
                restaurantId,
                name: lp.name,
                points: lp.points,
                isActive: lp.active,
                createdAt: i >= loyaltyDefs.length - 3
                    ? daysAgo(Math.floor(Math.random() * 15))
                    : daysAgo(30 + Math.floor(Math.random() * 90)),
            },
        });
        programs.push(program);
    }
    console.log(`  ✅ Loyalty programs: ${programs.length}`);

    // ── Redemptions ───────────────────────────────────────────────────────────
    const activePrograms = programs.filter((_, i) => loyaltyDefs[i].active);
    let redemptionCount = 0;

    // Current period (last 30 days): ~7 unique redeemers
    for (let i = 0; i < 7; i++) {
        const program = activePrograms[Math.floor(Math.random() * activePrograms.length)];
        await prisma.loyalityPointRedemption.create({
            data: {
                loyalityPointId: program.id,
                customerId: customers[i].id,
                pointsAwarded: program.points,
                redeemedAt: daysAgo(Math.floor(Math.random() * 29)),
            },
        });
        redemptionCount++;
    }

    // Previous period (30-60 days ago): ~5 unique redeemers
    for (let i = 0; i < 5; i++) {
        const program = activePrograms[Math.floor(Math.random() * activePrograms.length)];
        await prisma.loyalityPointRedemption.create({
            data: {
                loyalityPointId: program.id,
                customerId: customers[10 + i].id,
                pointsAwarded: program.points,
                redeemedAt: daysAgo(30 + Math.floor(Math.random() * 30)),
            },
        });
        redemptionCount++;
    }
    console.log(`  ✅ Redemptions: ${redemptionCount}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🔄 Seeding analytics data for Sai Sandeep\'s restaurants...\n');

    for (const r of RESTAURANTS) {
        await seedRestaurant(r.id, r.name);
    }

    console.log('\n─────────────────────────────────────────');
    console.log('📊 Test with:');
    console.log(`   Owner ID: ${OWNER_ID}`);
    for (const r of RESTAURANTS) {
        console.log(`\n   ${r.name}:`);
        console.log(`   GET /analytics/profit-and-loss?restaurantId=${r.id}&period=last30`);
        console.log(`   GET /analytics/profit-and-loss?restaurantId=${r.id}&period=quarterly`);
        console.log(`   GET /analytics/profit-and-loss?restaurantId=${r.id}&period=yearly`);
        console.log(`   GET /analytics/loyalty-programs/${r.id}`);
        console.log(`   GET /analytics/employees/${r.id}`);
    }
    console.log('\n   All Locations:');
    console.log('   GET /analytics/profit-and-loss?period=yearly');
    console.log('─────────────────────────────────────────\n');
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log('🎉 Seeding completed!');
    })
    .catch(async (e) => {
        console.error('❌ Seed failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
