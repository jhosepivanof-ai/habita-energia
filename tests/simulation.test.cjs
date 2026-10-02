const test=require('node:test');
const assert=require('node:assert/strict');
const {Simulation,defaults}=require('../simulation.js');
const realModel=require('../model.json');
const device={id:'extra-meter',name:'Carga de prueba',kind:'extra',watts:1000,enabled:true};
test('integra 1000 W durante una hora como 1 kWh y conserva el pasado después de apagar',()=>{
  const s=new Simulation([device]);s.toggle(device.id);s.advance(60);
  assert.ok(Math.abs(s.energy-1)<1e-12);assert.equal(s.referenceEnergy,s.energy);
  const past=JSON.stringify(s.history);s.toggle(device.id);s.advance(60);
  assert.equal(JSON.stringify(s.history.slice(0,60)),past);assert.ok(Math.abs(s.energy-1)<1e-12);
});
test('apagado automático solo cambia el escenario con control y deja evidencia del motivo',()=>{
  const s=new Simulation(defaults,realModel);s.advance(720);s.setScenario('empty');
  if(!s.on(s.devices[0]))s.toggle('ac');
  const before=JSON.stringify(s.history);s.advance(100);
  assert.equal(JSON.stringify(s.history.slice(0,720)),before);
  assert.ok(s.events.some(e=>e.kind==='automation'&&e.message.includes('Aire apagado')));
  assert.ok(s.referenceEnergy>s.energy);
  assert.ok(s.history.slice(720).some(r=>r.devices.find(d=>d.id==='ac').power_w===0&&r.devices.find(d=>d.id==='ac').reference_w>0));
});
test('desactivar la automatización hace coincidir ambos escenarios sin borrar acciones previas',()=>{
  const s=new Simulation(defaults,realModel);s.setAutomation(false);s.advance(1440);
  const d=s.completed[0];assert.equal(d.energy,d.referenceEnergy);assert.equal(d.history.length,1440);
});
test('descanso conserva presencia sin movimiento y bloquea el apagado incluso con probabilidad baja',()=>{
  const s=new Simulation(defaults,{...realModel,coefficients:[-100,0,0,0,0,0,0,0]});s.setScenario('rest');s.toggle('ac');s.advance(120);
  assert.equal(s.people(),1);assert.equal(s.motion(),false);assert.equal(s.on(s.devices[0]),true);
  assert.ok(!s.events.some(e=>e.message.includes('Aire apagado')));
});
test('el fin de día preserva las 1440 lecturas y los totales; el día siguiente empieza limpio',()=>{
  const s=new Simulation([device]);s.toggle(device.id);s.advance(1440);
  assert.equal(s.day,2);assert.equal(s.minute,0);assert.equal(s.history.length,0);
  assert.ok(Math.abs(s.completed[0].energy-24)<1e-9);assert.equal(s.energy,0);
  const archive=JSON.stringify(s.completed[0]);s.toggle(device.id);s.advance(20);
  assert.equal(JSON.stringify(s.completed[0]),archive);
});
test('añadir y retirar cargas no cambia la energía ni el inventario de las lecturas anteriores',()=>{
  const s=new Simulation([]);s.advance(10);s.add(device);s.toggle(device.id);s.advance(10);
  const past=JSON.stringify(s.history);s.remove(device.id);s.advance(10);
  assert.equal(JSON.stringify(s.history.slice(0,20)),past);
  assert.equal(s.history[0].devices.length,0);assert.equal(s.history[10].devices.length,1);assert.equal(s.history[20].devices.length,0);
});
test('presencia binaria del modelo no cambia al pasar de una a tres personas y movimiento queda separado',()=>{
  const s=new Simulation(defaults,realModel);s.minute=1200;s.setScenario('rest');const p=s.probability();s.setScenario('visitors');assert.equal(s.people(),3);assert.equal(s.probability(),p);
});
test('una orden manual de encendido tiene un nuevo tiempo de espera antes de apagar',()=>{
  const s=new Simulation(defaults,{...realModel,coefficients:[-100,0,0,0,0,0,0,0]});s.setScenario('empty');s.toggle('ac');s.advance(31);assert.equal(s.on(s.devices[0]),false);
  s.toggle('ac');s.advance(29);assert.equal(s.on(s.devices[0]),true);s.advance(2);assert.equal(s.on(s.devices[0]),false);
});
test('sin modelo nunca se ejecuta un apagado por predicción',()=>{
  const s=new Simulation(defaults);s.setScenario('empty');s.toggle('ac');s.advance(100);assert.equal(s.on(s.devices[0]),true);
});
