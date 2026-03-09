import { PrismaClient, LeaveType } from '@prisma/client'

const prisma = new PrismaClient()

const RESTAURANT_ID = "745f819b-3fed-4992-84e9-0db4e927681f"

async function seedStaffAttendance() {

    console.log("Seeding staff...")

    const staffList: Awaited<ReturnType<typeof prisma.staff.create>>[] = []

    for (let i = 1; i <= 10; i++) {
        const staff = await prisma.staff.create({
            data: {
                name: `Test Staff ${i}`,
                email: `staff${i}@test.com`,
                phone: `99900000${i}`,
                jobRole: "Waiter",
                monthlySalary: 3000,
                paidLeaveDays: 2,
                dailyWorkHours: 8,
                noOfWorkingDays: 26,
                restaurantId: RESTAURANT_ID
            }
        })

        staffList.push(staff)
    }

    console.log("Staff created:", staffList.length)

    const year = new Date().getFullYear()
    const month = new Date().getMonth()

    const daysInMonth = new Date(year, month + 1, 0).getDate()

    console.log("Seeding leaves and overtimes...")

    for (const staff of staffList) {

        const usedLeaveDays = new Set<number>()

        for (let i = 0; i < 3; i++) {

            let randomDay = Math.floor(Math.random() * daysInMonth) + 1

            // ensure unique date
            while (usedLeaveDays.has(randomDay)) {
                randomDay = Math.floor(Math.random() * daysInMonth) + 1
            }

            usedLeaveDays.add(randomDay)

            await prisma.staffLeave.create({
                data: {
                    staffId: staff.id,
                    date: new Date(year, month, randomDay),
                    leaveType: Math.random() > 0.5 ? LeaveType.PAID : LeaveType.UNPAID,
                    leaveCost: 100,
                    reason: "Test leave"
                }
            })
        }

        // 4 random overtimes
        for (let i = 0; i < 4; i++) {

            const randomDay = Math.floor(Math.random() * daysInMonth) + 1

            await prisma.staffOvertime.create({
                data: {
                    staffId: staff.id,
                    date: new Date(year, month, randomDay),
                    hours: Number((Math.random() * 4).toFixed(2)),
                    wageAmount: Number((Math.random() * 100).toFixed(2)),
                    notes: "Test overtime"
                }
            })
        }
    }

    console.log("Leaves and overtimes seeded successfully")
}

seedStaffAttendance()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })