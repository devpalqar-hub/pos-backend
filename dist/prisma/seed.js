"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
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
                role: client_1.UserRole.SUPER_ADMIN,
                isActive: true,
            },
            create: {
                name: admin.name,
                email: admin.email,
                role: client_1.UserRole.SUPER_ADMIN,
                isActive: true,
            },
        });
        console.log(`✅ SUPER_ADMIN ensured for: ${admin.email}`);
    }
}
main()
    .then(async () => {
    await prisma.$disconnect();
    console.log('🎉 Seeding completed');
})
    .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map