import fs from 'fs';

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Skip the markdown header
  const lines = content.split('\n');
  const csvStartIndex = lines.findIndex(line => line.startsWith('"') || line.startsWith('ProductName') || line.startsWith('العمود'));
  if (csvStartIndex === -1) return [];
  
  const csvLines = lines.slice(csvStartIndex);
  // Simple CSV parser
  const data = [];
  let headers = [];
  
  for (let i = 0; i < csvLines.length; i++) {
    const line = csvLines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.replace(/^"|"$/g, '').trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.replace(/^"|"$/g, '').trim());

    if (i === 0) {
      headers = values;
    } else {
      const obj = {};
      headers.forEach((header, idx) => {
        if (header) {
          obj[header] = values[idx] || '';
        }
      });
      data.push(obj);
    }
  }
  return data;
}

const productsData = parseCSV('C:\\Users\\ACC\\.gemini\\antigravity\\brain\\f8dee957-d326-4fdc-b630-32920b4cf515\\.system_generated\\steps\\161\\content.md');
const clientsData = parseCSV('C:\\Users\\ACC\\.gemini\\antigravity\\brain\\f8dee957-d326-4fdc-b630-32920b4cf515\\.system_generated\\steps\\167\\content.md');

// Map products to the format we need
const products = productsData.map((p, index) => ({
  id: 'prod_' + (index + 1),
  name: p['ProductName'],
  type: p['Type'],
  buyPrice: Number(p['شراء']) || 0,
  sellPrice: Number(p['بيع']) || 0,
  stock: Number(p['المخزن']) || 0
})).filter(p => p.name);

// Map clients
const clients = clientsData.map((c, index) => ({
  id: 'client_' + (index + 1),
  name: c['العمود 1'],
  phone: c['Phone'] || c['المحمول'] || '',
  governorate: c['المحافظة'] || '',
  area: c['المنطقة'] || '',
  address: c['العنوان بالتفصيل'] || '',
  church: c['اسم الكنيسة'] || ''
})).filter(c => c.name);

if (!fs.existsSync('src/data')) {
  fs.mkdirSync('src/data', { recursive: true });
}

fs.writeFileSync('src/data/products.json', JSON.stringify(products, null, 2));
fs.writeFileSync('src/data/clients.json', JSON.stringify(clients, null, 2));

console.log('Imported', products.length, 'products and', clients.length, 'clients.');
