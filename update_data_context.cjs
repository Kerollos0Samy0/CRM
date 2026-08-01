const fs = require('fs');
let code = fs.readFileSync('src/context/DataContext.jsx', 'utf8');

code = code.replace(
  "import fixedOrdersV20 from '../data/fixed_orders_v20.json';", 
  "import fixedOrdersV20 from '../data/fixed_orders_v20.json';\nimport sheetsOrders from '../data/sheets_orders.json';"
);

code = code.replace(
  "let migratedV26 = rawData.migratedV26 || false;",
  "let migratedV26 = rawData.migratedV26 || false;\n  let migratedV28 = rawData.migratedV28 || false;"
);

const migrationBlock = `
  // v28 - Replace archaic archive with the 749 meticulously formatted sheets from User
  if (!migratedV28) {
    if (sheetsOrders && sheetsOrders.archived && sheetsOrders.archived.length > 0) {
      // 1. Wipe old archived orders
      archivedOrders = sheetsOrders.archived;
      
      // 2. Remove any active order created before August 2026, as they are now in the archive
      const augustCutoff = new Date('2026-08-01T00:00:00Z').getTime();
      const cleanedOrders = {};
      Object.entries(orders).forEach(([id, o]) => {
         const t = new Date(o.createdAt || o.archivedAt).getTime();
         if (t >= augustCutoff) {
            cleanedOrders[id] = o;
         } else {
            // Drop from columns
            Object.keys(columns).forEach(colId => {
              if (columns[colId].orderIds) {
                 columns[colId].orderIds = columns[colId].orderIds.filter(oid => oid !== id);
              }
            });
         }
      });
      orders = cleanedOrders;
    }
    migratedV28 = true;
  }
`;

code = code.replace(
  "migratedV26 = true;\n    }",
  "migratedV26 = true;\n    }\n" + migrationBlock
);

code = code.replace(
  "migratedV26, migratedV2,",
  "migratedV26, migratedV28, migratedV2,"
);

code = code.replace(
  "migratedV26, \r\nmigratedV2",
  "migratedV26, migratedV28, \r\nmigratedV2"
);

code = code.replace(
  "migratedV26, \nmigratedV2",
  "migratedV26, migratedV28, \nmigratedV2"
);


code = code.replace(
  "migratedV26: true }",
  "migratedV26: true, migratedV28: true }"
);

fs.writeFileSync('src/context/DataContext.jsx', code);
