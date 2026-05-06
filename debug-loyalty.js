const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugLoyalty() {
  try {
    // Get first restaurant
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      console.log('No restaurants found');
      return;
    }
    console.log('Restaurant:', restaurant.id, restaurant.name);

    // Get loyalty rules
    const rules = await prisma.loyalityPoint.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        days: { select: { day: true } },
        categories: { select: { id: true, name: true } },
        menuItem: { select: { id: true, name: true } },
        redemptions: { select: { customerId: true, pointsAwarded: true, redeemedAt: true } },
      },
    });

    console.log('\n=== Loyalty Rules ===');
    rules.forEach((rule, idx) => {
      console.log(`\nRule ${idx + 1}: ${rule.name}`);
      console.log(`  ID: ${rule.id}`);
      console.log(`  Points: ${rule.points}`);
      console.log(`  Amount Range: ${rule.conditionMinAmount} - ${rule.conditionMaxAmount}`);
      console.log(`  Date Range: ${rule.startDate} - ${rule.endDate}`);
      console.log(`  Time Range: ${rule.startTime} - ${rule.endTime}`);
      console.log(`  Active: ${rule.isActive}`);
      console.log(`  Max Usage Per Customer: ${rule.maxUsagePerCustomer}`);
      console.log(`  Days: ${rule.days.map((d) => d.day).join(', ') || 'Any day'}`);
      console.log(`  Categories: ${rule.categories.map((c) => c.name).join(', ') || 'Any category'}`);
      console.log(`  MenuItem: ${rule.menuItem ? rule.menuItem.name : 'Any item'}`);
      console.log(`  Total Redemptions: ${rule.redemptions.length}`);
      console.log(`  Redemption Details:`, rule.redemptions);
    });

    // Get recent bills
    console.log('\n=== Recent Bills ===');
    const bills = await prisma.bill.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        session: { select: { id: true } },
        customer: { select: { id: true, name: true, loyaltyWallet: true } },
        items: { select: { menuItemId: true, quantity: true, unitPrice: true } },
      },
    });

    bills.forEach((bill) => {
      console.log(
        `\nBill: ${bill.billNumber} | Amount: ${bill.totalAmount} | Customer: ${bill.customer?.name || 'None'} | Status: ${bill.status}`,
      );
      console.log(`  Loyalty Wallet: ${bill.customer?.loyaltyWallet || 0}`);
      console.log(`  Items:`, bill.items.map((i) => `${i.menuItemId} x${i.quantity}`).join(', '));
    });

    // Check if awards exist for recent bills
    console.log('\n=== Loyalty Point Redemptions (Awards) ===');
    const allRedemptions = await prisma.loyalityPointRedemption.findMany({
      where: { loyalityPoint: { restaurantId: restaurant.id } },
      orderBy: { redeemedAt: 'desc' },
      take: 20,
      include: {
        loyalityPoint: { select: { name: true, points: true } },
        customer: { select: { name: true } },
      },
    });

    console.log(`Total redemptions: ${allRedemptions.length}`);
    allRedemptions.forEach((r) => {
      console.log(
        `  ${r.loyalityPoint.name}: +${r.pointsAwarded} pts for ${r.customer.name} (${r.createdAt.toISOString()})`,
      );
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugLoyalty();
