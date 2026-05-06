const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAwardLogic() {
  try {
    const restaurant = await prisma.restaurant.findFirst();
    console.log('Restaurant:', restaurant.name);
    console.log('Current Date/Time:', new Date());

    const now = new Date();
    const currentDay = now
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    console.log(`\nCurrent conditions:`);
    console.log(`  Day: ${currentDay}`);
    console.log(`  Time: ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} (${currentMinutes} minutes)`);

    const bill = await prisma.bill.findFirst({
      where: { restaurantId: restaurant.id, status: 'PAID' },
      include: {
        session: true,
        customer: true,
        items: { include: { menuItem: { include: { category: true } } } },
      },
    });

    if (!bill) {
      console.log('\nNo paid bills found');
      return;
    }

    console.log(`\nBill: ${bill.billNumber} (Amount: ${bill.totalAmount})`);
    console.log(`Customer: ${bill.customer?.name}`);
    console.log(`Bill Items:`, bill.items.map((i) => `${i.menuItem.name} (Category: ${i.menuItem.category.name})`));

    const rules = await prisma.loyalityPoint.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      include: { days: true, categories: true, menuItem: true },
    });

    console.log(`\n=== Checking ${rules.length} rules against Bill ===`);
    
    for (const rule of rules) {
      console.log(`\n--- Rule: ${rule.name} ---`);
      console.log(`  Points: ${rule.points}`);

      // Check date range
      let dateOK = true;
      if (rule.startDate) {
        console.log(`  Start Date: ${rule.startDate} (now >= startDate? ${now >= rule.startDate})`);
        if (now < rule.startDate) dateOK = false;
      }
      if (rule.endDate) {
        console.log(`  End Date: ${rule.endDate} (now <= endDate? ${now <= rule.endDate})`);
        if (now > rule.endDate) dateOK = false;
      }
      console.log(`  ✓ Date range OK: ${dateOK}`);

      // Check amount range
      let amountOK = true;
      if (rule.conditionMinAmount) {
        console.log(`  Min Amount: ${rule.conditionMinAmount} (${bill.totalAmount} >= ${rule.conditionMinAmount}? ${bill.totalAmount >= rule.conditionMinAmount})`);
        if (bill.totalAmount < rule.conditionMinAmount) amountOK = false;
      }
      if (rule.conditionMaxAmount) {
        console.log(`  Max Amount: ${rule.conditionMaxAmount} (${bill.totalAmount} <= ${rule.conditionMaxAmount}? ${bill.totalAmount <= rule.conditionMaxAmount})`);
        if (bill.totalAmount > rule.conditionMaxAmount) amountOK = false;
      }
      console.log(`  ✓ Amount range OK: ${amountOK}`);

      // Check time window
      let timeOK = true;
      if (rule.startTime || rule.endTime) {
        const start = parseTimeToMinutes(rule.startTime);
        const end = parseTimeToMinutes(rule.endTime);
        console.log(`  Start Time: ${rule.startTime} (${start} min), End Time: ${rule.endTime} (${end} min)`);
        console.log(`  Current: ${currentMinutes} min`);

        if (start !== null && end !== null) {
          if (start <= end) {
            timeOK = currentMinutes >= start && currentMinutes <= end;
            console.log(`  Within range [${start}-${end}]? ${timeOK}`);
          } else {
            timeOK = currentMinutes >= start || currentMinutes <= end;
            console.log(`  Overnight range [${start}-${end}]? ${timeOK}`);
          }
        }
      }
      console.log(`  ✓ Time window OK: ${timeOK}`);

      // Check days
      let daysOK = true;
      if (rule.days.length > 0) {
        const activeDays = rule.days.map((d) => d.day);
        daysOK = activeDays.includes(currentDay);
        console.log(`  Allowed days: ${activeDays.join(', ')}`);
        console.log(`  Current day: ${currentDay}`);
        console.log(`  Day match? ${daysOK}`);
      }
      console.log(`  ✓ Days OK: ${daysOK}`);

      // Check categories
      let categoryOK = true;
      if (rule.categories.length > 0) {
        const ruleCategoryIds = new Set(rule.categories.map((c) => c.id));
        const billCategoryIds = new Set(bill.items.map((i) => i.menuItem.categoryId));
        categoryOK = Array.from(ruleCategoryIds).some((id) => billCategoryIds.has(id));
        console.log(`  Allowed categories: ${rule.categories.map((c) => c.name).join(', ')}`);
        console.log(`  Bill categories: ${Array.from(billCategoryIds).join(', ')}`);
        console.log(`  Match? ${categoryOK}`);
      }
      console.log(`  ✓ Categories OK: ${categoryOK}`);

      // Check menuItem
      let menuItemOK = true;
      if (rule.menuItem) {
        const billMenuItemIds = new Set(bill.items.map((i) => i.menuItemId));
        menuItemOK = billMenuItemIds.has(rule.menuItem.id);
        console.log(`  Required item: ${rule.menuItem.name}`);
        console.log(`  Bill items: ${bill.items.map((i) => i.menuItem.name).join(', ')}`);
        console.log(`  Match? ${menuItemOK}`);
      }
      console.log(`  ✓ MenuItem OK: ${menuItemOK}`);

      // Overall
      const allOK = dateOK && amountOK && timeOK && daysOK && categoryOK && menuItemOK;
      console.log(`\n  ⭐ RESULT: ${allOK ? '✅ SHOULD AWARD' : '❌ SKIP'}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function parseTimeToMinutes(time) {
  if (!time) return null;
  const [hh, mm] = time.split(':').map((v) => Number(v));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

debugAwardLogic();
