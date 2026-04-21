// One-off inspection: queries SF for the details we just synced.
import "dotenv/config";
import { sfQuery } from "@/lib/salesforce/client";

async function main() {
  const orderNumber = process.argv[2] ?? "OL-2026-0001";
  console.log(`\n--- Order ${orderNumber} ---`);
  const orders = await sfQuery<{
    Id: string;
    OrderNumber: string;
    Status: string;
    TotalAmount: number;
    Pricebook2Id: string;
    OrderLink_Status__c: string;
    OrderLink_Total_Paise__c: number;
  }>(
    `SELECT Id, OrderNumber, Status, TotalAmount, Pricebook2Id, OrderLink_Status__c, OrderLink_Total_Paise__c FROM Order WHERE OrderLink_Order_Number__c = '${orderNumber}' LIMIT 1`
  );
  if (orders.length === 0) {
    console.log("no order found");
    process.exit(1);
  }
  console.log(orders[0]);

  const items = await sfQuery<{
    Id: string;
    Product2Id: string;
    Quantity: number;
    UnitPrice: number;
    TotalPrice: number;
  }>(
    `SELECT Id, Product2Id, Quantity, UnitPrice, TotalPrice FROM OrderItem WHERE OrderId = '${orders[0].Id}'`
  );
  console.log(`\n--- OrderItems (${items.length}) ---`);
  for (const i of items) console.log(i);

  if (items.length > 0) {
    const products = await sfQuery<{ Id: string; Name: string; ProductCode: string }>(
      `SELECT Id, Name, ProductCode FROM Product2 WHERE Id = '${items[0].Product2Id}'`
    );
    console.log(`\n--- Product2 ---`);
    console.log(products[0]);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
