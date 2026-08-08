const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const LOGIN_URL = 'https://softzone353-007-site12.atempurl.com/CPanel/CompanyPages/AddOrder/1236';

app.post('/api/shipping/create-order', async (req, res) => {
    const order = req.body;
    let browser;
    try {
        console.log(`Starting Puppeteer for order: ${order.id}`);
        browser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        // Go to the add order page (will redirect to login if not authenticated)
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
        
        // Check if we are on the login page (look for password input)
        const isLoginPage = await page.$('input[type="password"]');
        if (isLoginPage) {
            console.log('On login page, filling credentials...');
            
            // Assume first text input is username, password input is password
            const textInputs = await page.$$('input[type="text"]');
            if (textInputs.length > 0) {
                await textInputs[0].type('الحكاية ومافيها');
            }
            
            const passInput = await page.$('input[type="password"]');
            if (passInput) {
                await passInput.type('01288951942');
            }
            
            // Submit form
            await Promise.all([
                page.click('input[type="submit"], button[type="submit"], .btn-login, button.btn.btn-primary'),
                page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), // catch timeout just in case
            ]);
        }
        
        console.log('Navigated to AddOrder page');
        
        // The AddOrder page form filling (Based on the provided screenshot structure)
        
        await page.evaluate((orderData) => {
            // Helper to find input by its previous or parent label text
            const findInputByLabel = (labelText) => {
                const labels = Array.from(document.querySelectorAll('label, div, span, p'));
                const label = labels.find(l => l.innerText && l.innerText.includes(labelText));
                if (label) {
                    const parent = label.parentElement;
                    const input = parent.querySelector('input[type="text"], textarea');
                    if (input) return input;
                    let next = label.nextElementSibling;
                    while (next) {
                        const inNode = next.tagName === 'INPUT' || next.tagName === 'TEXTAREA' ? next : next.querySelector('input[type="text"], textarea');
                        if (inNode) return inNode;
                        next = next.nextElementSibling;
                    }
                }
                return null;
            };

            const fillField = (label, value) => {
                const input = findInputByLabel(label);
                if (input && value) {
                    input.value = value;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };
            
            fillField('المرسل إليه', orderData.name || orderData.clientName);
            fillField('التليفون', orderData.mobile || orderData.phone);
            fillField('العنوان', orderData.address);
            
            fillField('محتوى الأوردر', (orderData.items || []).map(i => `${i.workshop || i.name} (${i.quantity})`).join(', '));
            fillField('ملحوظة', orderData.orderNotes || (orderData.notes ? orderData.notes.map(n => n.text).join(' - ') : ''));
            
            fillField('إجمالي الأوردر', orderData.totalAmount);
            fillField('عدد القطع', (orderData.items || []).reduce((acc, curr) => acc + (Number(curr.quantity)||1), 0));
            
            const govLabel = Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('المحافظة'));
            if(govLabel) {
                const select = govLabel.parentElement.querySelector('select');
                if(select) {
                    const options = Array.from(select.options);
                    const matchingOpt = options.find(opt => opt.text.includes(orderData.governorate) || (orderData.governorate && opt.text.includes(orderData.governorate.trim())));
                    if(matchingOpt) {
                        select.value = matchingOpt.value;
                        select.dispatchEvent(new Event('change', {bubbles:true}));
                    }
                }
            }
        }, order);

        console.log('Form filled. Clicking save button...');
        
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn'));
            const saveBtn = btns.find(el => el.innerText.includes('حفظ الفاتورة') || el.value.includes('حفظ الفاتورة') || el.value.includes('حفظ'));
            if(saveBtn) saveBtn.click();
        });

        // Wait for page to navigate or show validation errors
        await new Promise(r => setTimeout(r, 4000));
        
        // Check if we are still on the same page and if there are errors
        const pageErrors = await page.evaluate(() => {
            if(window.location.href.toLowerCase().includes('addorder')) {
                const errorElements = Array.from(document.querySelectorAll('.text-danger, .alert-danger, span[style*="color: red"], span[style*="color:red"], .error'));
                const errTexts = errorElements.map(el => el.innerText.trim()).filter(t => t.length > 0);
                if(errTexts.length > 0) return errTexts.join(' | ');
                
                // Sometimes it's a SweetAlert
                const swal = document.querySelector('.swal-text, .swal2-html-container');
                if(swal) return swal.innerText;
                
                return "لم يتم الانتقال من الصفحة بعد الحفظ. قد يكون هناك حقل إجباري ناقص (مثل المحافظة أو المدينة).";
            }
            return null;
        });

        if (pageErrors) {
            throw new Error('خطأ من موقع شركة الشحن: ' + pageErrors);
        }

        await browser.close();

        res.json({ success: true, message: 'Order created in shipping system successfully.' });
    } catch (error) {
        console.error('Error creating shipping order:', error);
        if (browser) await browser.close();
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Shipping Backend running on http://localhost:${PORT}`);
});
