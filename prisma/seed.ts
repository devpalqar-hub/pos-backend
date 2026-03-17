import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient();

async function main() {


    console.log('🌱 Starting seed...');

    /*
    |--------------------------------------------------------------------------
    | SUPER ADMINS
    |--------------------------------------------------------------------------
    */

    const superAdmins = [
        {
            email: 'devanandjoly@gmail.com',
            name: 'Dev Super Admin',
        },
        {
            email: 'sonasasikumarm@gmail.com',
            name: 'Sona Super Admin',
        },
    ];

    for (const admin of superAdmins) {
        await prisma.user.upsert({
            where: { email: admin.email },
            update: {
                role: UserRole.SUPER_ADMIN,
                isActive: true,
            },
            create: {
                name: admin.name,
                email: admin.email,
                role: UserRole.SUPER_ADMIN,
                isActive: true,
            },
        });

        console.log(`✅ SUPER_ADMIN ensured: ${admin.email} `);
    }

    /*
    |--------------------------------------------------------------------------
    | EXPENSE CATEGORIES
    |--------------------------------------------------------------------------
    */

    const expenseCategories = [
        {
            name: 'Salary',
            description: 'Employee salaries and payroll related expenses',
        },
        {
            name: 'Utilities',
            description: 'Electricity, water, gas, and internet bills',
        },
        {
            name: 'Maintenance',
            description: 'Equipment repairs and facility maintenance',
        },
        {
            name: 'Marketing',
            description: 'Advertising, promotions, and marketing campaigns',
        },
        {
            name: 'Supplies',
            description: 'Restaurant operational supplies and materials',
        },
    ];

    for (const category of expenseCategories) {
        await prisma.expenseCategory.upsert({
            where: { name: category.name },
            update: {
                description: category.description,
                isActive: true,
            },
            create: {
                name: category.name,
                description: category.description,
                isActive: true,
            },
        });

        console.log(`📦 ExpenseCategory ensured: ${category.name} `);
    }

    console.log('🎉 Seed completed successfully');


}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error('❌ Seed failed:', error);
        await prisma.$disconnect();
        process.exit(1);
    });
