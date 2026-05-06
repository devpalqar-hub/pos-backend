const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBillWithLoyalty() {
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { name: { contains: 'Hotel paragon' } } });
    const customer = await prisma.customer.findFirst({ where: { restaurantId: restaurant.id, name: 'Devanand' } });
    const items = await prisma.billItem.findMany({ where: { bill: { restaurantId: restaurant.id, status: 'PAID' } }, take: 5 });

    if (!restaurant || !customer || items.length === 0) {
      console.log('Missing required data');
      process.exit(1);
    }

    console.log(`\nCreating test bill for:`);
    console.log(`  Restaurant: ${restaurant.name}`);
    console.log(`  Customer: ${customer.name}`);

    // Create a small session and bill to test award logic
    const session = await prisma.orderSession.create({
      data: {
        restaurantId: restaurant.id,
        status: 'OPEN',
        sessionNumber: `TEST-${Date.now()}`,
        isTableService: false,
      },
    });

    const batch = await prisma.orderBatch.create({
      data: {
        sessionId: session.id,
        restaurantId: restaurant.id,
        batchNumber: `BATCH-${Date.now()}`,
        status: 'READY',
      },
    });

    // Use first item from existing bills (we know it's in the system)
    const menuItem = await prisma.menuItem.findFirst({ where: { restaurantId: restaurant.id } });
    
    const orderItem = await prisma.orderBatchItem.create({
      data: {
        batchId: batch.id,
        restaurantId: restaurant.id,
        menuItemId: menuItem.id,
        quantity: 1,
        rate: menuItem.price,
        totalPrice: menuItem.price,
        specialInstructions: null,
        status: 'READY',
        preparedAt: new Date(),
      },
    });

    // Create bill for this session
    const bill = await prisma.bill.create({
      data: {
        sessionId: session.id,
        restaurantId: restaurant.id,
        customerId: customer.id,
        billNumber: `TEST-${Date.now()}`,
        status: 'DRAFT',
        totalAmount: menuItem.price,
        items: {
          create: {
            menuItemId: menuItem.id,
            name: menuItem.name,
            quantity: 1,
            unitPrice: menuItem.price,
            totalPrice: menuItem.price,
          },
        },
      },
    });

    console.log(`\nBill created: ${bill.billNumber} for ₹${bill.totalAmount}`);
    console.log(`Bill ID: ${bill.id}`);
    console.log(`\nNow make a payment to trigger loyalty awards...`);
    console.log(`Then check the server logs for [LOYALTY] messages\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBillWithLoyalty();
