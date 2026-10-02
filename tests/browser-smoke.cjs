const {chromium}=require(process.env.HABITA_PLAYWRIGHT);
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const qa=path.resolve(__dirname,'../../tmp/habita_mejoras');await fs.mkdir(qa,{recursive:true});
  try{
    await page.goto('http://localhost:8080');await page.waitForFunction(()=>initialized);await page.getByRole('button',{name:'Pausar',exact:true}).click();
    assert.ok(await page.locator('#daily-energy').innerText());
    await page.screenshot({path:path.join(qa,'desktop.png'),fullPage:true});
    const past=await page.evaluate(()=>JSON.stringify(sim.history));
    await page.getByRole('switch',{name:/Aire acondicionado/}).click();
    assert.equal(await page.evaluate(()=>JSON.stringify(sim.history)),past);
    await page.locator('#scenario').selectOption('visitors');assert.equal(await page.locator('#occupancy').innerText(),'3 personas');
    await page.locator('#scenario').selectOption('rest');assert.equal(await page.locator('#occupancy').innerText(),'1 persona');assert.match(await page.locator('#automation-status').innerText(),/bloqueado/);
    await page.locator('#scenario').selectOption('empty');
    await page.evaluate(()=>{sim.reset();sim.advance(720);sim.setScenario('empty');if(!sim.on(sim.devices[0]))sim.toggle('ac');sim.advance(100);render();});
    assert.ok(await page.evaluate(()=>sim.referenceEnergy>sim.energy));assert.match(await page.locator('#event-list').innerText(),/Aire apagado/);
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar CSV'}).click();const download=await downloadPromise;const file=path.join(qa,download.suggestedFilename());await download.saveAs(file);
    const csv=await fs.readFile(file,'utf8');assert.equal(csv.split('\r\n').length,821);assert.ok(csv.includes('simulado'));
    await page.getByRole('button',{name:'+ Añadir equipo'}).click();await page.locator('#new-name').fill('Ventilador');await page.locator('#new-watts').fill('50');await page.locator('#device-form').getByRole('button',{name:'Añadir equipo',exact:true}).click();assert.equal(await page.locator('.device h3').count(),4);
    await page.getByRole('switch',{name:/Ventilador/}).click();await page.evaluate(()=>{sim.advance(10);render();});const energy=await page.evaluate(()=>sim.energy);await page.getByRole('button',{name:'Eliminar equipo'}).click();assert.equal(await page.evaluate(()=>sim.energy),energy);
    await page.locator('#question').fill('¿Cuánto ahorro?');await page.getByRole('button',{name:'Enviar',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.bubble.bot').length===2);assert.equal(await page.locator('#ai-status').innerText(),'Respuesta local');
    await page.evaluate(()=>{sim.advance(1440-sim.minute);render();});await page.locator('#history-day').selectOption('1');assert.match(await page.locator('#comparison-period').innerText(),/24 horas completas/);
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(qa,'mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    await page.setViewportSize({width:360,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    assert.deepEqual(errors,[]);console.log('OK: historial inmutable, controles, escenarios, apagado, CSV, equipos, respuesta local, días y móvil (360/390 px).');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
