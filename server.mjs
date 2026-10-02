// Servidor privado opcional para probar DeepSeek localmente.
// Nunca copies la clave al navegador, config.json ni GitHub.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||8080);
const apiKey=process.env.DEEPSEEK_API_KEY;
const allowed=new Set((process.env.ALLOWED_ORIGINS||`http://localhost:${port},http://127.0.0.1:${port}`).split(',').map(s=>s.trim()).filter(Boolean));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const recent=new Map();

function send(res,status,body,type='application/json; charset=utf-8',headers={}){res.writeHead(status,{'content-type':type,'cache-control':'no-store',...headers});res.end(typeof body==='string'?body:JSON.stringify(body));}
function cors(origin){return origin&&allowed.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'Content-Type'}:{};}
function limited(ip){const now=Date.now();const state=recent.get(ip)||{start:now,count:0};if(now-state.start>60000){state.start=now;state.count=0;}state.count++;recent.set(ip,state);return state.count>12;}

http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://localhost:${port}`),origin=req.headers.origin;
  if(url.pathname==='/api/health')return send(res,200,{available:!!apiKey},'application/json; charset=utf-8',cors(origin));
  if(url.pathname==='/api/chat'){
    const headers=cors(origin);
    if(req.method==='OPTIONS')return send(res,204,'','text/plain',headers);
    if(req.method!=='POST')return send(res,405,{error:'Método no permitido'},'application/json; charset=utf-8',headers);
    if(origin&&!allowed.has(origin))return send(res,403,{error:'Origen no autorizado'});
    if(!apiKey)return send(res,503,{error:'DeepSeek no configurado'},'application/json; charset=utf-8',headers);
    if(limited(req.socket.remoteAddress||'unknown'))return send(res,429,{error:'Límite temporal de consultas'},'application/json; charset=utf-8',headers);
    let body='';for await(const chunk of req){body+=chunk;if(body.length>12000)return send(res,413,{error:'Solicitud demasiado grande'},'application/json; charset=utf-8',headers);}
    let input;try{input=JSON.parse(body);}catch{return send(res,400,{error:'JSON inválido'},'application/json; charset=utf-8',headers);}
    const question=typeof input.question==='string'?input.question.trim().slice(0,500):'';
    if(!question)return send(res,400,{error:'Falta la pregunta'},'application/json; charset=utf-8',headers);
    const context=input.context&&typeof input.context==='object'?input.context:{};
    try{
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
      const response=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${apiKey}`},body:JSON.stringify({model:'deepseek-flash',max_tokens:350,stream:false,messages:[{role:'system',content:'Eres un asistente de análisis energético para un prototipo académico en español. Todos los datos del tablero son SIMULADOS, no provienen de sensores. Responde cualquier pregunta del usuario con naturalidad. Cuando te refieras a la habitación, usa solo el contexto recibido. No inventes mediciones, ahorros ni control físico. Si la pregunta no es sobre energía, responde brevemente e indica que tu especialidad es el espacio.'},{role:'user',content:`Contexto simulado actual: ${JSON.stringify(context).slice(0,3000)}\nPregunta: ${question}`}]}),signal:controller.signal});clearTimeout(timer);
      if(!response.ok)return send(res,502,{error:'El proveedor de IA no respondió correctamente'},'application/json; charset=utf-8',headers);
      const data=await response.json();const answer=data?.choices?.[0]?.message?.content;
      return send(res,200,{answer:typeof answer==='string'?answer:'No se recibió respuesta.'},'application/json; charset=utf-8',headers);
    }catch{return send(res,502,{error:'No se pudo contactar DeepSeek'},'application/json; charset=utf-8',headers);}
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Método no permitido'});
  const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const resolved=path.resolve(root,file);
  if(!resolved.startsWith(root+path.sep))return send(res,403,{error:'Acceso denegado'});
  try{const data=await fs.readFile(resolved);res.writeHead(200,{'content-type':types[path.extname(resolved)]||'application/octet-stream','cache-control':'no-store'});res.end(req.method==='HEAD'?'':data);}catch{send(res,404,{error:'No encontrado'});}
}).listen(port,()=>console.log(`Habita Energía disponible en http://localhost:${port}`));
