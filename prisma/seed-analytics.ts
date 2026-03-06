/**
 * Analytics Test Data Seeder
 *
 * Seeds realistic data to test the analytics APIs:
 * - GET /analytics/profit-and-loss
 * - GET /analytics/loyalty-programs/:restaurantId
 * - GET /analytics/employees/:restaurantId
 *
 * Run: npx ts-node prisma/seed-analytics.ts
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
    MenuItem,
    Staff,
    Customer,
    LoyalityPoint,
} from '@prisma/client';

const prisma = new PrismaClient();

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🔄 Seeding analytics test data...\n');

    // ── 1. Create Owner user ──────────────────────────────────────────────────
    const owner = await prisma.user.upsert({
        where: { email: 'analytics-owner@test.com' },
        update: {},
        create: {
            name: 'Analytics Test Owner',
            email: 'analytics-owner@test.com',
            role: UserRole.OWNER,
            isActive: true,
        },
    });
    console.log(`✅ Owner: ${owner.email}`);

    // ── 2. Create Restaurant ──────────────────────────────────────────────────
    const restaurant = await prisma.restaurant.upsert({
        where: { slug: 'downtown-bistro-hq' },
        update: {},
        create: {
            name: 'Downtown Bistro (HQ)',
            slug: 'downtown-bistro-hq',
            ownerId: owner.id,
            taxRate: 8.5,
            currency: 'USD',
            phone: '+1234567890',
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            country: 'US',
        },
    });
    console.log(`✅ Restaurant: ${restaurant.name} (${restaurant.id})`);

    // ── 3. Create a staff user for opening orders ─────────────────────────────
    const staffUser = await prisma.user.upsert({
        where: { email: 'analytics-staff@test.com' },
        update: {},
        create: {
            name: 'Analytics Staff User',
            email: 'analytics-staff@test.com',
            role: UserRole.RESTAURANT_ADMIN,
            restaurantId: restaurant.id,
            isActive: true,
        },
    });
    console.log(`✅ Staff user: ${staffUser.email}`);

    // ── 4. Create Menu Category & Items ───────────────────────────────────────
    const category = await prisma.menuCategory.upsert({
        where: {
            restaurantId_name: {
                restaurantId: restaurant.id,
                name: 'Main Course',
            },
        },
        update: {},
        create: {
            restaurantId: restaurant.id,
            name: 'Main Course',
            sortOrder: 1,
        },
    });

    const menuItems: MenuItem[] = [];
    const itemNames = [
        { name: 'Grilled Salmon', price: 28.99 },
        { name: 'Ribeye Steak', price: 42.50 },
        { name: 'Pasta Primavera', price: 18.75 },
        { name: 'Caesar Salad', price: 14.50 },
        { name: 'Lobster Bisque', price: 22.00 },
    ];

    for (const item of itemNames) {
        const mi = await prisma.menuItem.create({
            data: {
                restaurantId: restaurant.id,
                categoryId: category.id,
                name: `${item.name} ${randomId(4)}`,
                price: item.price,
            },
        });
        menuItems.push(mi);
    }
    console.log(`✅ Menu items: ${menuItems.length}`);

    // ── 5. Create Orders & Bills (Revenue data) ──────────────────────────────
    // Generate paid orders across 4 months: Dec 2025, Jan-Mar 2026
    const monthlyOrders = [
        { year: 2025, month: 12, count: 30, avgTotal: 85 },   // Dec
        { year: 2026, month: 1, count: 40, avgTotal: 95 },    // Jan
        { year: 2026, month: 2, count: 45, avgTotal: 110 },   // Feb
        { year: 2026, month: 3, count: 50, avgTotal: 130 },   // Mar (current)
    ];

    let totalOrders = 0;
    for (const mo of monthlyOrders) {
        for (let i = 0; i < mo.count; i++) {
            const day = Math.min(
                Math.floor(Math.random() * 28) + 1,
                mo.month === 3 ? 6 : 28, // March up to today (6th)
            );
            const orderDate = monthDate(mo.year, mo.month, day);

            const subtotal = randomBetween(
                mo.avgTotal * 0.6,
                mo.avgTotal * 1.4,
            );
            const taxRate = 8.5;
            const taxAmount =
                Math.round(subtotal * (taxRate / 100) * 100) / 100;
            const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

            const sessionNum = randomId(6);
            const billNum = randomId(6);

            const session = await prisma.orderSession.create({
                data: {
                    restaurantId: restaurant.id,
                    sessionNumber: sessionNum,
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
                    restaurantId: restaurant.id,
                    billNumber: billNum,
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

            totalOrders++;
        }
    }
    console.log(`✅ Orders & Bills: ${totalOrders}`);

    // ── 6. Create Expenses ────────────────────────────────────────────────────
    const expenseTemplates = [
        { name: 'Rent', type: ExpenseType.MONTHLY, amount: 5500 },
        { name: 'Utilities', type: ExpenseType.MONTHLY, amount: 1200 },
        { name: 'Insurance', type: ExpenseType.MONTHLY, amount: 800 },
        { name: 'Supplies', type: ExpenseType.WEEKLY, amount: 450 },
        { name: 'Marketing', type: ExpenseType.MONTHLY, amount: 600 },
        { name: 'Maintenance', type: ExpenseType.MONTHLY, amount: 350 },
    ];

    let totalExpenses = 0;
    for (const mo of [
        { year: 2025, month: 12 },
        { year: 2026, month: 1 },
        { year: 2026, month: 2 },
        { year: 2026, month: 3 },
    ]) {
        for (const exp of expenseTemplates) {
            if (exp.type === ExpenseType.WEEKLY) {
                // Create 4 weekly expenses per month
                for (let w = 0; w < 4; w++) {
                    const day = Math.min(w * 7 + 1, 28);
                    await prisma.expense.create({
                        data: {
                            restaurantId: restaurant.id,
                            expenseName: exp.name,
                            expenseType: exp.type,
                            amount: randomBetween(
                                exp.amount * 0.8,
                                exp.amount * 1.2,
                            ),
                            date: monthDate(mo.year, mo.month, day),
                            createdById: staffUser.id,
                        },
                    });
                    totalExpenses++;
                }
            } else {
                await prisma.expense.create({
                    data: {
                        restaurantId: restaurant.id,
                        expenseName: exp.name,
                        expenseType: exp.type,
                        amount: randomBetween(
                            exp.amount * 0.9,
                            exp.amount * 1.1,
                        ),
                        date: monthDate(
                            mo.year,
                            mo.month,
                            Math.floor(Math.random() * 28) + 1,
                        ),
                        createdById: staffUser.id,
                    },
                });
                totalExpenses++;
            }
        }
    }

    // Add some daily expenses
    for (let d = 0; d < 90; d++) {
        const date = daysAgo(d);
        await prisma.expense.create({
            data: {
                restaurantId: restaurant.id,
                expenseName: 'Food & Ingredient Cost',
                expenseType: ExpenseType.DAILY,
                amount: randomBetween(120, 350),
                date,
                createdById: staffUser.id,
            },
        });
        totalExpenses++;
    }
    console.log(`✅ Expenses: ${totalExpenses}`);

    // ── 7. Create Staff Profiles (Employee data) ──────────────────────────────
    const weekdays = [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
    ];
    const allDays = [...weekdays, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY];

    const staffProfiles = [
        { name: 'John Smith', email: 'john.smith@bistro.test', role: 'Head Chef', salary: 4500, days: allDays.slice(0, 6) },
        { name: 'Maria Garcia', email: 'maria.garcia@bistro.test', role: 'Sous Chef', salary: 3500, days: allDays.slice(0, 6) },
        { name: 'David Lee', email: 'david.lee@bistro.test', role: 'Line Cook', salary: 2800, days: weekdays },
        { name: 'Sarah Johnson', email: 'sarah.johnson@bistro.test', role: 'Line Cook', salary: 2800, days: weekdays },
        { name: 'Michael Brown', email: 'michael.brown@bistro.test', role: 'Pastry Chef', salary: 3200, days: weekdays },
        { name: 'Emily Davis', email: 'emily.davis@bistro.test', role: 'Server', salary: 2200, days: allDays.slice(0, 6) },
        { name: 'James Wilson', email: 'james.wilson@bistro.test', role: 'Server', salary: 2200, days: [DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] },
        { name: 'Jessica Martinez', email: 'jessica.martinez@bistro.test', role: 'Server', salary: 2200, days: weekdays },
        { name: 'Robert Taylor', email: 'robert.taylor@bistro.test', role: 'Server', salary: 2200, days: allDays.slice(0, 6) },
        { name: 'Amanda Anderson', email: 'amanda.anderson@bistro.test', role: 'Bartender', salary: 2500, days: [DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY] },
        { name: 'Chris Thomas', email: 'chris.thomas@bistro.test', role: 'Bartender', salary: 2500, days: [DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] },
        { name: 'Laura White', email: 'laura.white@bistro.test', role: 'Host', salary: 2000, days: allDays.slice(0, 6) },
        { name: 'Daniel Harris', email: 'daniel.harris@bistro.test', role: 'Host', salary: 2000, days: [DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] },
        { name: 'Kevin Clark', email: 'kevin.clark@bistro.test', role: 'Dishwasher', salary: 1800, days: weekdays },
        { name: 'Rachel Lewis', email: 'rachel.lewis@bistro.test', role: 'Dishwasher', salary: 1800, days: [DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] },
        { name: 'Brian Walker', email: 'brian.walker@bistro.test', role: 'Manager', salary: 4000, days: allDays.slice(0, 6) },
        { name: 'Nicole Hall', email: 'nicole.hall@bistro.test', role: 'Asst Manager', salary: 3500, days: weekdays },
        { name: 'Steven Allen', email: 'steven.allen@bistro.test', role: 'Prep Cook', salary: 2400, days: weekdays },
        { name: 'Michelle Young', email: 'michelle.young@bistro.test', role: 'Prep Cook', salary: 2400, days: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.SATURDAY] },
        { name: 'Paul King', email: 'paul.king@bistro.test', role: 'Delivery Driver', salary: 2100, days: allDays },
        { name: 'Sandra Wright', email: 'sandra.wright@bistro.test', role: 'Delivery Driver', salary: 2100, days: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] },
        { name: 'Mark Lopez', email: 'mark.lopez@bistro.test', role: 'Server', salary: 2200, days: weekdays },
        { name: 'Jennifer Hill', email: 'jennifer.hill@bistro.test', role: 'Cashier', salary: 2000, days: allDays.slice(0, 6) },
        { name: 'Tom Scott', email: 'tom.scott@bistro.test', role: 'Cashier', salary: 2000, days: [DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY] },
    ];

    const createdStaff: Staff[] = [];
    for (const sp of staffProfiles) {
        const staff = await prisma.staff.upsert({
            where: { email: sp.email },
            update: {},
            create: {
                name: sp.name,
                email: sp.email,
                phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                jobRole: sp.role,
                monthlySalary: sp.salary,
                paidLeaveDays: 2,
                dailyWorkHours: 8,
                noOfWorkingDays: sp.days.length * 4,
                restaurantId: restaurant.id,
                isActive: true,
                // Make 2 staff "new this month"
                createdAt:
                    createdStaff.length >= staffProfiles.length - 2
                        ? daysAgo(Math.floor(Math.random() * 5))
                        : daysAgo(30 + Math.floor(Math.random() * 60)),
            },
        });

        // Add working days
        for (const day of sp.days) {
            await prisma.staffWorkingDay.upsert({
                where: { staffId_day: { staffId: staff.id, day } },
                update: {},
                create: { staffId: staff.id, day },
            });
        }

        createdStaff.push(staff);
    }
    console.log(`✅ Staff profiles: ${createdStaff.length}`);

    // ── 8. Add some leaves (to reduce "active today" count) ───────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Mark a few staff on leave today
    const leaveStaff = createdStaff.slice(0, 3);
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
    console.log(`✅ Leaves today: ${leaveStaff.length}`);

    // ── 9. Create Payroll records ─────────────────────────────────────────────
    let payrollCount = 0;
    for (const mo of [
        { month: 1, year: 2026 },
        { month: 2, year: 2026 },
    ]) {
        for (const staff of createdStaff) {
            const totalWorkingDays = Math.round(
                (staffProfiles.find((s) => s.email === staff.email)?.days
                    .length ?? 5) * 4.3,
            );
            const perDaySalary =
                Math.round(
                    (parseFloat(staff.monthlySalary.toString()) /
                        totalWorkingDays) *
                    100,
                ) / 100;

            await prisma.payroll.upsert({
                where: {
                    staffId_month_year: {
                        staffId: staff.id,
                        month: mo.month,
                        year: mo.year,
                    },
                },
                update: {},
                create: {
                    restaurantId: restaurant.id,
                    staffId: staff.id,
                    month: mo.month,
                    year: mo.year,
                    monthlySalary: staff.monthlySalary,
                    totalWorkingDays,
                    perDaySalary,
                    paidLeaveDays: Math.floor(Math.random() * 2),
                    unpaidLeaveDays: 0,
                    overtimeAmount: randomBetween(0, 200),
                    bonusAmount: 0,
                    deductionAmount: 0,
                    totalDeductions: 0,
                    totalAdditions: randomBetween(0, 200),
                    finalSalary: staff.monthlySalary,
                    status: PayrollStatus.PAID,
                    processedAt: monthDate(mo.year, mo.month, 28),
                },
            });
            payrollCount++;
        }
    }
    console.log(`✅ Payroll records: ${payrollCount}`);

    // ── 10. Create Customers & Loyalty Points (Loyalty analytics) ─────────────
    const customers: Customer[] = [];
    for (let i = 0; i < 30; i++) {
        const c = await prisma.customer.upsert({
            where: {
                restaurantId_phone: {
                    restaurantId: restaurant.id,
                    phone: `+1555${String(1000 + i).padStart(4, '0')}`,
                },
            },
            update: {},
            create: {
                restaurantId: restaurant.id,
                name: `Customer ${i + 1}`,
                phone: `+1555${String(1000 + i).padStart(4, '0')}`,
            },
        });
        customers.push(c);
    }
    console.log(`✅ Customers: ${customers.length}`);

    // Create loyalty programs
    const loyaltyPrograms = [
        { name: 'Weekend Brunch Bonus', points: 10, active: true },
        { name: 'Happy Hour Rewards', points: 5, active: true },
        { name: 'Birthday Special', points: 25, active: true },
        { name: 'First Visit Bonus', points: 15, active: true },
        { name: 'Lunch Express', points: 8, active: true },
        { name: 'VIP Diner Club', points: 20, active: true },
        { name: 'Seasonal Special', points: 12, active: true },
        { name: 'Late Night Rewards', points: 7, active: true },
        { name: 'Retired Program', points: 5, active: false },
        { name: 'Old Promo', points: 3, active: false },
    ];

    const createdPrograms: LoyalityPoint[] = [];
    for (let i = 0; i < loyaltyPrograms.length; i++) {
        const lp = loyaltyPrograms[i];
        const program = await prisma.loyalityPoint.create({
            data: {
                restaurantId: restaurant.id,
                name: lp.name,
                points: lp.points,
                isActive: lp.active,
                // 2 programs created recently (new)
                createdAt:
                    i >= loyaltyPrograms.length - 4
                        ? daysAgo(Math.floor(Math.random() * 10))
                        : daysAgo(30 + Math.floor(Math.random() * 90)),
            },
        });
        createdPrograms.push(program);
    }
    console.log(`✅ Loyalty programs: ${createdPrograms.length}`);

    // Create redemptions (current period - last 30 days)
    const activePrograms = createdPrograms.filter((_, i) => loyaltyPrograms[i].active);
    let redemptionCount = 0;

    // Current period: ~8 unique customers redeeming
    for (let i = 0; i < 8; i++) {
        const customer = customers[i];
        const program =
            activePrograms[Math.floor(Math.random() * activePrograms.length)];
        await prisma.loyalityPointRedemption.create({
            data: {
                loyalityPointId: program.id,
                customerId: customer.id,
                pointsAwarded: program.points,
                redeemedAt: daysAgo(Math.floor(Math.random() * 29)),
            },
        });
        redemptionCount++;
    }

    // Previous period (30-60 days ago): ~6 unique customers
    for (let i = 0; i < 6; i++) {
        const customer = customers[10 + i];
        const program =
            activePrograms[Math.floor(Math.random() * activePrograms.length)];
        await prisma.loyalityPointRedemption.create({
            data: {
                loyalityPointId: program.id,
                customerId: customer.id,
                pointsAwarded: program.points,
                redeemedAt: daysAgo(30 + Math.floor(Math.random() * 30)),
            },
        });
        redemptionCount++;
    }
    console.log(`✅ Redemptions: ${redemptionCount}`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────');
    console.log('📊 Test this data with:');
    console.log(`   Restaurant ID: ${restaurant.id}`);
    console.log(`   Owner email:   ${owner.email}`);
    console.log('');
    console.log('   GET /analytics/profit-and-loss?period=last30');
    console.log('   GET /analytics/profit-and-loss?period=quarterly');
    console.log('   GET /analytics/profit-and-loss?period=yearly');
    console.log(`   GET /analytics/loyalty-programs/${restaurant.id}`);
    console.log(`   GET /analytics/employees/${restaurant.id}`);
    console.log('─────────────────────────────────────────\n');
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log('🎉 Analytics seeding completed!');
    })
    .catch(async (e) => {
        console.error('❌ Seed failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
