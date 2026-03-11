import { PrismaClient, ExpenseType } from '@prisma/client'

const prisma = new PrismaClient()

const RESTAURANT_ID = "110201cd-698d-4ad9-9c63-4ea706d95f8f"

function random(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {

    console.log("🌱 Seeding expense categories...")

    const categories = [
        { name: "Utilities", description: "Electricity, water and gas bills" },
        { name: "Rent", description: "Monthly restaurant rent" },
        { name: "Staff Salaries", description: "Payments for employees" },
        { name: "Maintenance", description: "Equipment repairs and maintenance" },
        { name: "Supplies", description: "Cleaning and kitchen supplies" },
        { name: "Marketing", description: "Advertising and promotions" }
    ]

    const createdCategories: Awaited<ReturnType<typeof prisma.expenseCategory.create>>[] = []

    for (const cat of categories) {
        const category = await prisma.expenseCategory.create({
            data: {
                name: cat.name,
                description: cat.description,
                isActive: true
            }
        })

        createdCategories.push(category)
    }

    console.log(`✅ Created ${createdCategories.length} categories`)

    console.log("🌱 Seeding expenses...")

    const users = await prisma.user.findMany({
        take: 1
    })

    const userId = users.length ? users[0].id : null

    const expenseNames = [
        "Electricity Bill",
        "Water Bill",
        "Gas Cylinder",
        "AC Maintenance",
        "Kitchen Cleaning Supplies",
        "Facebook Ads",
        "Google Ads",
        "Staff Salary Payment",
        "Furniture Repair",
        "Internet Bill"
    ]

    for (let i = 0; i < 40; i++) {

        const category = Math.random() > 0.3
            ? randomFrom(createdCategories)
            : null

        const expenseName = randomFrom(expenseNames)

        await prisma.expense.create({
            data: {
                restaurantId: RESTAURANT_ID,
                expenseName,
                expenseType: randomFrom([
                    ExpenseType.DAILY,
                    ExpenseType.WEEKLY,
                    ExpenseType.MONTHLY,
                    ExpenseType.YEARLY
                ]),
                amount: random(100, 5000),
                description: `${expenseName} for restaurant operations`,
                date: new Date(Date.now() - random(0, 30) * 86400000),
                createdById: userId,
                expenseCategoryId: category?.id ?? null
            }
        })
    }

    console.log("✅ Created 40 expenses")

    console.log("🎉 Expense seed completed")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })