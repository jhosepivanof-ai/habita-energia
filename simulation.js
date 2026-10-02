/* Motor de demostración. Todos los valores son sintéticos. */
(function (root) {
  'use strict';
  const DAY = 1440;
  const defaults = [
    {id:'ac',name:'Aire acondicionado',kind:'ac',watts:953,source:'Nominal · placa',enabled:true},
    {id:'lights',name:'Iluminación · 2 lámparas',kind:'lights',watts:36,source:'Nominal · 18 W c/u',enabled:true},
    {id:'tv',name:'Televisor · 32 pulgadas',kind:'tv',watts:56,source:'Supuesto provisional',enabled:true}
  ];
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  class Simulation {
    constructor(devices = defaults, model = null) {
      this.devices=devices.map(d=>({...d})); this.model=model;
      this.automation=true; this.wait=30; this.tariff=1000; this.scenario='routine';
      this.reset();
    }
    reset() {
      this.minute=0; this.day=1; this.history=[]; this.completed=[]; this.events=[];
      this.overrides={}; this.autoOff=new Set(); this.energy=0; this.referenceEnergy=0;
      this.lastMotion=null; this.motionEpoch=0; this.policyStarted=0;
    }
    people(m=this.minute) {
      if(this.scenario==='empty')return 0;
      if(this.scenario==='visitors')return 3;
      if(this.scenario==='rest')return 1;
      const h=m/60;
      return h>=18&&h<22?2:+(h<6.4||h>=6.7&&h<8.2||h>=12.1&&h<13.2||h>=22&&h<23.8);
    }
    motion(m=this.minute) {
      return this.scenario!=='rest' && !(this.scenario==='routine'&&m<360) && this.people(m)>0 && Math.sin(m/8)>-.25;
    }
    idle() { return this.motion()?0:this.minute-(this.lastMotion===null?this.motionEpoch:this.lastMotion); }
    scheduled(d,m=this.minute) {
      const h=m/60;
      if(d.kind==='ac')return (h>=12&&h<15.5||h>=19&&h<23.7)&&Math.sin(m/42)>-.15;
      if(d.kind==='lights')return h>=18.3&&h<23.3||h>=5.8&&h<6.7;
      if(d.kind==='tv')return h>=19.2&&h<22.5;
      return false;
    }
    on(d,reference=false,m=this.minute) {
      if(!d.enabled)return false;
      if(!reference&&this.autoOff.has(d.id))return false;
      return this.overrides[d.id]===undefined?this.scheduled(d,m):this.overrides[d.id];
    }
    watts(d,reference=false,m=this.minute) {
      if(!this.on(d,reference,m))return 0;
      const factor=d.kind==='ac'?.82+.13*Math.sin(m/17)**2:d.kind==='tv'?.89+.09*Math.sin(m/13)**2:1;
      return Math.round(d.watts*factor);
    }
    ambient(reference=false) {
      const m=this.minute,h=m/60,ac=this.devices.find(d=>d.id==='ac');
      const cooling=ac&&this.on(ac,reference);
      return {t:clamp(27.3+1.75*Math.sin((h-8)/24*2*Math.PI)-(cooling?1.65:0)+.18*Math.sin(m/47),22,31),rh:clamp(65+8*Math.sin((h+3)/24*2*Math.PI)+(cooling?-5:0),35,90)};
    }
    probability() {
      if(!this.model)return null;
      const a=this.ambient(),h=this.minute/60,ac=this.devices.find(d=>d.id==='ac');
      const x=[1,+(this.people()>0),Math.sin(2*Math.PI*h/24),Math.cos(2*Math.PI*h/24),0,(a.t-27)/5,(a.rh-70)/20,+(!!ac&&this.on(ac))];
      const z=x.reduce((s,v,i)=>s+v*this.model.coefficients[i],0);
      return 1/(1+Math.exp(-z));
    }
    log(message,kind='manual') {
      this.events.push({day:this.day,minute:this.minute,message,kind});
      if(this.events.length>150)this.events.shift();
    }
    setScenario(value) {
      if(!['routine','empty','visitors','rest'].includes(value))return;
      this.scenario=value; this.lastMotion=null; this.motionEpoch=this.minute;
      this.autoOff.clear();this.policyStarted=this.minute;
      this.log('Escenario cambiado: '+({routine:'rutina del espacio',empty:'espacio vacío',visitors:'visita · 3 personas',rest:'descanso · persona sin movimiento'})[value],'scenario');
    }
    setAutomation(value) {
      this.automation=!!value;this.autoOff.clear();this.policyStarted=this.minute;
      this.log(value?'Automatización activada; comienza un nuevo tiempo de espera.':'Automatización desactivada; se recuperan los estados manuales y horarios.','policy');
    }
    setWait(value) {
      if(!Number.isFinite(value)||value<5||value>120)return;
      this.wait=value;this.policyStarted=this.minute;
      this.log(`Tiempo de espera: ${value} minutos. La nueva regla se aplica desde ahora.`,'policy');
    }
    toggle(id) {
      const d=this.devices.find(x=>x.id===id);if(!d)return;
      const state=!this.on(d);this.overrides[id]=state;this.autoOff.delete(id);
      if(id==='ac')this.policyStarted=this.minute;
      this.log(`${d.name}: ${state?'encendido':'apagado'} manual simulado.`);
    }
    add(d) {this.devices.push({...d});this.log(`Equipo añadido: ${d.name}. Su historial comienza ahora.`);}
    remove(id) {
      const d=this.devices.find(x=>x.id===id);if(!d)return;
      this.devices=this.devices.filter(x=>x.id!==id);delete this.overrides[id];this.autoOff.delete(id);
      this.log(`Equipo retirado: ${d.name}. Las lecturas anteriores se conservan.`);
    }
    applyAutomation() {
      if(this.motion()) {
        this.lastMotion=this.minute;
        if(this.autoOff.size) {this.autoOff.clear();this.log('Movimiento detectado: se libera el apagado automático y se recupera el horario o estado manual.','automation');}
      }
      const ac=this.devices.find(d=>d.id==='ac'),p=this.probability();
      if(this.automation&&this.scenario!=='rest'&&ac&&this.on(ac)&&this.idle()>=this.wait&&this.minute-this.policyStarted>=this.wait&&p!==null&&p<this.model.threshold) {
        this.autoOff.add('ac');
        this.log(`Aire apagado: ${this.idle()} min sin movimiento y ${(p*100).toFixed(1)} % de probabilidad, inferior al umbral ${(this.model.threshold*100).toFixed(1)} %. Acción simulada.`,'automation');
      }
    }
    snapshot() {
      const a=this.ambient();
      const devices=this.devices.map(d=>({id:d.id,name:d.name,on:this.on(d),power_w:this.watts(d),reference_w:this.watts(d,true)}));
      return {day:this.day,minute:this.minute,temperature_c:a.t,humidity_pct:a.rh,people:this.people(),motion:!!this.motion(),idle:this.idle(),probability:this.probability(),power_w:devices.reduce((s,d)=>s+d.power_w,0),reference_w:devices.reduce((s,d)=>s+d.reference_w,0),devices};
    }
    advance(minutes) {
      for(let i=0;i<minutes;i++) {
        this.applyAutomation();const s=this.snapshot();
        this.energy+=s.power_w/60000;this.referenceEnergy+=s.reference_w/60000;
        this.history.push({...s,energy_kwh:this.energy,reference_kwh:this.referenceEnergy,tariff_cop_kwh:this.tariff,automation_enabled:this.automation});
        this.minute++;
        if(this.minute===DAY) {
          this.completed.push({day:this.day,history:this.history,energy:this.energy,referenceEnergy:this.referenceEnergy});
          if(this.completed.length>7)this.completed.shift();
          this.day++;this.minute=0;this.history=[];this.energy=0;this.referenceEnergy=0;
          this.overrides={};this.autoOff.clear();this.lastMotion=null;this.motionEpoch=0;this.policyStarted=0;
          this.log('Nuevo día: reinician los horarios. El día anterior queda guardado.','day');
        }
      }
    }
  }
  root.HabitaSimulation={Simulation,defaults,DAY};
  if(typeof module!=='undefined')module.exports=root.HabitaSimulation;
})(globalThis);
