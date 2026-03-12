import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const restaurantId = "c5f50dda-222a-445b-a41d-4f1a31914cf9"

// const restaurantId = "110201cd-698d-4ad9-9c63-4ea706d95f8f"

async function main() {

    const customers = [
        {
            name: "Sonas Sasi Kumar",
            email: "sonasasikumarm@gmail.com",
            phone: "+919900000001",
            wallet: 120,
            createdAt: new Date("2026-02-01T10:00:00Z"),
        },
        {
            name: "M Sonasasi Kumar",
            email: "msonasasikumar@gmail.com",
            phone: "+919900000002",
            wallet: 0,
            createdAt: new Date("2026-03-01T10:00:00Z"),
        },
        {
            name: "Sabarinath P",
            email: "sabarinathp.dev@gmail.com",
            phone: "+919900000003",
            wallet: 450,
            createdAt: new Date("2026-01-15T10:00:00Z"),
        },
        {
            name: "Devanand Joly",
            email: "devanandjoly@gmail.com",
            phone: "+919900000004",
            wallet: 30,
            createdAt: new Date("2026-03-10T10:00:00Z"),
        },
        {
            name: "Nandhu Devanand",
            email: "nandhudevanand4419@gmail.com",
            phone: "+919900000005",
            wallet: 200,
            createdAt: new Date("2026-02-10T10:00:00Z"),
        },
    ]

    for (const customer of customers) {

        const existing = await prisma.customer.findFirst({
            where: {
                restaurantId,
                phone: customer.phone
            }
        })

        if (!existing) {

            await prisma.customer.create({
                data: {
                    restaurantId,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    wallet: customer.wallet,
                    createdAt: customer.createdAt
                }
            })

            console.log(`Created customer: ${customer.email}`)

        } else {
            console.log(`Customer already exists: ${customer.email}`)
        }
    }

    console.log("Seeder finished")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })