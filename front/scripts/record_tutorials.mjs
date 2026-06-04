import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.resolve(__dirname, '../src/data/tutorials.json');
const VIDEO_DIR = path.resolve(__dirname, '../public/videos');
const BASE_URL = 'https://oiem-abastible.inntek.cl';

// Ensure video directory exists
if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

async function clearAndFill(page, selector, text) {
    const loc = page.locator(selector);
    await loc.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(50);
    await loc.fill(text);
}

async function run() {
    console.log('📖 Iniciando Motor de Generación de Cápsulas...');
    const tutorialsData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

    // Orden requerido: Administrador primero, luego Contratista
    const orderedTutorials = [];
    const orderedIds = [
        'auditoria-paso-a-paso', 
        'recorrido-dashboard', 
        'creacion-registro-completo', 
        'subsanacion-contratista'
    ];

    for(const id of orderedIds) {
        const t = tutorialsData.find(x => x.id === id);
        if(t) orderedTutorials.push(t);
    }

    const browser = await chromium.launch({ headless: false, channel: 'chrome' });

    for (const tutorial of orderedTutorials) {
        console.log(`\n======================================================`);
        console.log(`🎥 Grabando Tutorial: [${tutorial.role}] ${tutorial.title}`);
        
        const context = await browser.newContext({
            recordVideo: {
                dir: VIDEO_DIR,
                size: { width: 1280, height: 720 },
            },
            viewport: { width: 1280, height: 720 },
        });

        const page = await context.newPage();

        try {
            console.log('-> Autenticando...');
            await page.goto(`${BASE_URL}/login`);
            
            const email = tutorial.role === 'administrador_contrato' ? 'administrador.contrato@abastible.cl' : 'contratista.usuario@demo.cl';
            await clearAndFill(page, '#email', email);
            await clearAndFill(page, '#password', 'User123*');
            await page.locator('button[type="submit"]').click();
            
            // Wait for navigation and dashboard load
            await page.waitForTimeout(4000);

            // Go to Tutorials page to trigger the walkthrough
            console.log('-> Iniciando Driver.js overlay...');
            await page.goto(`${BASE_URL}/tutorials`);
            await page.waitForTimeout(2000);

            // Find and click the play button for this specific tutorial
            const playBtn = page.locator(`text=${tutorial.title}`).locator('xpath=./../..').locator('svg').first();
            await playBtn.click();

            // Wait for the tutorial overlay to appear or redirect
            await page.waitForTimeout(2000);

            console.log('-> Ejecutando pasos de la prueba (Mapeo Específico)...');

            // --- SPECIFIC TUTORIAL MAPPING FOR REAL CLICKS AND RECORDING ---

            if (tutorial.id === 'auditoria-paso-a-paso') {
                // Step 1: Wait for list to load, driver is highlighting filter
                await page.waitForTimeout(3000);
                await page.selectOption('#filter-status', 'pendiente');
                await page.locator('.driver-next-btn').isVisible().then(v => v && page.locator('.driver-next-btn').click());
                await page.waitForTimeout(2000);
                
                // Step 2: Click Audit button
                await page.locator('a[id^="btn-audit-"]').first().click();
                await page.waitForTimeout(2000);

                // Step 3: Iniciar auditoria (after page load)
                await page.waitForSelector('#btn-iniciar-auditoria');
                await page.waitForTimeout(1000);
                await page.locator('#btn-iniciar-auditoria').click();
                await page.waitForTimeout(2000);

                // Step 4: Validate activity
                await page.locator('button[id^="btn-cumple-"]').first().click();
                await page.waitForTimeout(1500);
                
                // Step 5: Comments (clear first)
                await page.locator('#audit-comentario-general').scrollIntoViewIfNeeded();
                await clearAndFill(page, '#audit-comentario-general', 'Auditoría realizada conforme al plan.');
                await page.waitForTimeout(1500);

                // Step 6: Finalize
                await page.locator('#btn-finalizar-auditoria').click();
                await page.waitForTimeout(3000);

            } else if (tutorial.id === 'recorrido-dashboard') {
                // Just click through driver popovers
                await page.waitForTimeout(3000);
                let btnVisible = await page.locator('.driver-next-btn').isVisible();
                while(btnVisible) {
                    await page.locator('.driver-next-btn').click();
                    await page.waitForTimeout(2000);
                    btnVisible = await page.locator('.driver-next-btn').isVisible();
                }
                const doneVisible = await page.locator('.driver-done-btn').isVisible();
                if (doneVisible) await page.locator('.driver-done-btn').click();
                await page.waitForTimeout(2000);

            } else if (tutorial.id === 'creacion-registro-completo') {
                // Step 1: Tab registros highlighting
                await page.waitForTimeout(3000);
                await page.locator('#btn-tab-registros').click();
                await page.waitForTimeout(2000);

                // Step 2: Nuevo registro
                await page.locator('#btn-nuevo-registro').click();
                await page.waitForTimeout(2000);

                // Step 3: Seleccionar Asignación
                await page.waitForSelector('#form-assignment');
                // Select second option (if default disabled)
                await page.locator('#form-assignment').selectOption({ index: 1 });
                await page.waitForTimeout(1000);

                // Step 4: Dotacion Total
                await clearAndFill(page, '#form-dotacion-total', '15');
                await page.locator('.driver-next-btn').isVisible().then(v => v && page.locator('.driver-next-btn').click());
                await page.waitForTimeout(1000);

                // Step 5: Save Draft
                await page.locator('#btn-save-draft').click();
                await page.waitForTimeout(2000);

                // Step 6: Send Review (highlight)
                await page.locator('#btn-send-review').scrollIntoViewIfNeeded();
                await page.locator('.driver-next-btn').isVisible().then(v => v && page.locator('.driver-next-btn').click());
                await page.waitForTimeout(3000);

            } else if (tutorial.id === 'subsanacion-contratista') {
                // Step 1: Filters
                await page.waitForTimeout(3000);
                await page.selectOption('#filter-status', 'pendiente_subsanacion');
                await page.waitForTimeout(3000);

                // Try to find a row
                const editBtn = page.locator('a[id^="btn-edit-"]').first();
                if (await editBtn.isVisible()) {
                    await editBtn.click();
                    await page.waitForTimeout(2000);
                    
                    // Inside the form...
                    const doneBtn = page.locator('#btn-end-subsanacion');
                    if (await doneBtn.isVisible()) {
                        await doneBtn.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(1500);
                        // don't actually click done so we don't break the record if empty
                    }
                } else {
                    console.log('⚠️ No record in pendiente_subsanacion found for demo. Showing list filter.');
                }
                
                await page.locator('.driver-next-btn').isVisible().then(v => v && page.locator('.driver-next-btn').click());
                await page.waitForTimeout(2000);
            }

            console.log('-> Procesamiento del flujo finalizado. Guardando cápsula...');
            
        } catch (e) {
            console.error(`⚠️ Error en tutorial ${tutorial.id}:`, e);
            // Wait a bit to capture failure state in video
            await page.waitForTimeout(2000);
        } finally {
            await context.close();
        }

        // Rename video file
        const videoFileName = await page.video().path();
        const destPath = path.resolve(VIDEO_DIR, `${tutorial.id}.webm`);
        fs.renameSync(videoFileName, destPath);
        console.log(`✅ Cápsula exportada a: /public/videos/${tutorial.id}.webm`);
    }

    await browser.close();
    console.log('\n🚀 ¡Todas las cápsulas fueron generadas exitosamente!');
}

run().catch(console.error);
