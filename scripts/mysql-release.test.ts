import assert from "node:assert/strict";
import { before,after,test } from "node:test";
import { randomUUID,createHash } from "node:crypto";
import { spawn,type ChildProcess } from "node:child_process";
import { readFile,mkdir,mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { pathToFileURL } from "node:url";
import path from "node:path";
import mysql,{type RowDataPacket} from "mysql2/promise";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import { createUploadPhotoFixtures } from "./fixtures/upload-photos";

const enabled=Boolean(process.env.QA_MYSQL_URL);
const options={skip:!enabled};
const email=`mysql-${randomUUID()}@example.invalid`,password=randomUUID(),adminPassword=`private:${randomUUID()}`;
let connection:mysql.Connection,server:ChildProcess,base:string,storage:string,cookie:string,accountId:string,requestId:string,slug:string;
let serverArgs:string[],serverEnv:NodeJS.ProcessEnv;
const admin={authorization:`Basic ${Buffer.from(`qa-admin:${adminPassword}`).toString("base64")}`};
const details={title:"Departamento transaccional QA",type:"Departamento",zone:"Urbari",address:"Dirección referencial QA",bedrooms:"2",bathrooms:"",garage:"1",area:"",pets:true,furnished:false,security:true,pool:false,patio:false,grill:false,elevator:true,price:"400",currency:"USD",exchangeRate:"8.5",commonExpenses:"20",guarantee:"1 mes de alquiler",guaranteeAmount:"",description:"Departamento de prueba aislado. No es una oferta inmobiliaria real."};

before(async()=>{
  if (!enabled) return;
  const url=new URL(process.env.QA_MYSQL_URL!);
  assert.ok(url.pathname.endsWith("_qa") && ["localhost","127.0.0.1"].includes(url.hostname),"Only a local isolated *_qa database is permitted");
  connection=await mysql.createConnection({uri:url.toString(),timezone:"Z"});
  await connection.query("SET time_zone = '+00:00'");
  await mkdir("output/auth-qa",{recursive:true});
  storage=await mkdtemp(path.resolve("output/auth-qa/mysql-"));
  const listener=createServer();await new Promise<void>(resolve=>listener.listen(0,"127.0.0.1",resolve));
  const address=listener.address();assert.ok(address && typeof address !== "string");
  await new Promise<void>(resolve=>listener.close(()=>resolve()));base=`http://127.0.0.1:${address.port}`;
  serverArgs=["--import",pathToFileURL(path.resolve("scripts/oauth-qa-provider.mjs")).href,"node_modules/next/dist/bin/next","start","-p",String(address.port),"--hostname","127.0.0.1"];
  serverEnv={...process.env,DATABASE_URL:url.toString(),ZENTRO_REQUIRE_DATABASE:"1",ZENTRO_STORAGE_DIR:storage,NODE_ENV:"production",ZENTRO_URBANO_ADMIN_USER:"qa-admin",ZENTRO_URBANO_ADMIN_PASSWORD:adminPassword,GOOGLE_CLIENT_ID:"qa-client.apps.googleusercontent.com",GOOGLE_CLIENT_SECRET:"qa-not-a-real-secret",GOOGLE_QA_EMAIL:email,GOOGLE_QA_SUBJECT:email};
  await startServer();
});
async function startServer() {
  server=spawn(process.execPath,serverArgs,{cwd:process.cwd(),windowsHide:true,stdio:"ignore",env:serverEnv});
  for (let i=0;i<100;i++) {try {if ((await fetch(`${base}/api/session`)).ok) return;} catch {} await new Promise(resolve=>setTimeout(resolve,100));}
  throw new Error("SQL QA server did not start");
}
async function stopServer() {if (server && server.exitCode === null && server.signalCode === null) {const stopped=new Promise<void>(resolve=>server.once("exit",()=>resolve()));server.kill();await stopped;}}
after(async()=>{await stopServer(); if (connection) await connection.end();});
const json=(body:unknown,extra:Record<string,string>={})=>({method:"POST",headers:{"content-type":"application/json",cookie,...extra},body:JSON.stringify(body)});
async function submit(key=randomUUID(),count=5,changes:Record<string,unknown>={}) {
  const form=new FormData();form.set("payload",JSON.stringify({operation:"Alquiler",propertyType:"Departamento",publisherKind:"owner",ownerConfirmed:true,contactName:"Propietario QA",whatsapp:"75000000",sourceText:details.description,currency:"USD",exchangeRate:8.5,details,accountId:"forged",...changes}));
  for(const photo of await createUploadPhotoFixtures(count)) form.append("photos",photo);
  return fetch(`${base}/api/publication-requests`,{method:"POST",headers:{cookie,"idempotency-key":key},body:form});
}
async function decision(id:string,body:unknown,headers=admin) {return fetch(`${base}/admin/solicitudes/${id}/decision`,json(body,{...headers,origin:base}));}
async function count(table:string,where:string,values:unknown[]) {const [rows]=await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`,values);return Number(rows[0].n);}

test("MySQL registration is unique, owner-only, transactional and survives password login",options,async()=>{
  const body={email,password,displayName:"Propietario QA",accountKind:"admin"};
  const responses=await Promise.all([fetch(`${base}/api/auth/register`,json(body)),fetch(`${base}/api/auth/register`,json(body))]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const success=responses.find(r=>r.status===200)!;cookie=success.headers.get("set-cookie")!.split(";")[0];accountId=(await success.json()).accountId;
  assert.equal(await count("client_accounts","email=? AND kind='owner'",[email]),1);
  assert.equal(await count("morada_users","email=? AND password_hash IS NOT NULL",[email]),1);
  const login=await fetch(`${base}/api/auth/login`,json({email,password}));assert.equal(login.status,200);assert.equal((await login.json()).accountId,accountId);
});

test("MySQL Google login reuses the password account without creating a shadow identity",options,async()=>{
  const start=await fetch(`${base}/api/auth/google/start?next=/publicar`,{redirect:"manual"});assert.equal(start.status,307);
  const google=new URL(start.headers.get("location")!);const state=google.searchParams.get("state")!;
  const result=await fetch(`${base}/api/auth/google/callback?state=${state}&code=qa-success`,{redirect:"manual",headers:{cookie:start.headers.get("set-cookie")!.split(";")[0]}});
  assert.equal(result.status,307);assert.equal(result.headers.get("location"),`${base}/publicar`);
  assert.equal(await count("morada_users","email=?",[email]),1);assert.equal(await count("client_accounts","email=?",[email]),1);
  assert.equal((await fetch(`${base}/api/auth/login`,json({email,password}))).status,200);
});

test("provisioned owners can use a unique username without an email; disabled accounts remain blocked",options,async()=>{
  const suffix=randomUUID().replaceAll("-","");
  const owner=`acct_username_${suffix}`,user=`user_username_${suffix}`,username=`owner_${suffix}`;
  await connection.execute("INSERT INTO client_accounts (id,kind,display_name,email,avatar_initials,role_label) VALUES (?,'owner','Owner without email',NULL,'OW','Propietario')",[owner]);
  await connection.execute("INSERT INTO morada_users (id,account_id,email,username,password_hash) VALUES (?,?,NULL,?,?)",[user,owner,username,await bcrypt.hash(password,12)]);
  const login=await fetch(`${base}/api/auth/login`,json({email:` ${username.toUpperCase()} `,password}));
  assert.equal(login.status,200);assert.equal((await login.json()).accountId,owner);
  const ownCookie=login.headers.get("set-cookie")!.split(";")[0];
  assert.equal((await fetch(`${base}/cliente`,{headers:{cookie:ownCookie},redirect:"manual"})).status,200);
  assert.equal((await fetch(`${base}/api/auth/login`,json({email:username,password:"wrong-password"}))).status,401);
  assert.equal((await fetch(`${base}/api/auth/login`,json({email:"",password}))).status,401);
  await assert.rejects(connection.execute("INSERT INTO morada_users (id,account_id,email,username) VALUES (?,?,NULL,?)",[`duplicate_${suffix}`,owner,username]),{code:"ER_DUP_ENTRY"});
  await connection.execute("UPDATE client_accounts SET status='disabled' WHERE id=?",[owner]);
  assert.equal((await fetch(`${base}/api/auth/login`,json({email:username,password}))).status,401);
  await connection.execute("UPDATE client_accounts SET status='active' WHERE id=?",[owner]);
  await connection.execute("UPDATE morada_users SET status='disabled' WHERE id=?",[user]);
  assert.equal((await fetch(`${base}/api/auth/login`,json({email:username,password}))).status,401);
});

test("publication API identifies blank expenses, invalid phones and request keys separately",options,async()=>{
  const before=await count("publication_requests","account_id=?",[accountId]);
  const expenses=await submit(randomUUID(),5,{details:{...details,commonExpenses:""},whatsapp:"+591 78504969"});
  assert.equal(expenses.status,400);
  const expenseError=await expenses.json();
  assert.equal(expenseError.code,"VALIDATION_ERROR");
  assert.deepEqual(Object.keys(expenseError.fieldErrors),["commonExpenses"]);
  assert.doesNotMatch(expenseError.message,/WhatsApp/);
  const phone=await submit(randomUUID(),5,{whatsapp:"785049469"});
  assert.equal(phone.status,400);
  assert.deepEqual(Object.keys((await phone.json()).fieldErrors),["whatsapp"]);
  const key=await submit("");assert.equal(key.status,400);
  assert.equal((await key.json()).code,"INVALID_REQUEST_KEY");
  assert.equal(await count("publication_requests","account_id=?",[accountId]),before);
  const corrected=await submit(randomUUID(),5,{details:{...details,commonExpenses:"0"},whatsapp:"+591 78504969"});
  assert.equal(corrected.status,201);
  const id=(await corrected.json()).requestId;
  const [[saved]]=await connection.query<RowDataPacket[]>("SELECT payload,status FROM publication_requests WHERE id=?",[id]);
  const payload=typeof saved.payload === "string" ? JSON.parse(saved.payload) : saved.payload;
  assert.equal(payload.details.commonExpenses,0);
  assert.equal(payload.whatsapp,"59178504969");
  assert.equal(saved.status,"pending_review");
});

test("MySQL stores original photos and retries return the same request, even concurrently",options,async()=>{
  const key=randomUUID();const responses=await Promise.all([submit(key),submit(key)]);
  assert.deepEqual(responses.map(r=>r.status),[201,201]);const [a,b]=await Promise.all(responses.map(r=>r.json()));requestId=a.requestId;assert.equal(a.requestId,b.requestId);
  assert.equal(await count("publication_requests","account_id=? AND idempotency_key=?",[accountId,key]),1);
  const [timestamps]=await connection.query<RowDataPacket[]>("SELECT created_at FROM publication_requests WHERE id=?",[requestId]);
  assert.ok(Math.abs(Date.now()-timestamps[0].created_at.getTime())<10000,"Database timestamps are stored/read in UTC");
  const [photos]=await connection.query<RowDataPacket[]>("SELECT original_data FROM publication_photos WHERE request_id=?",[requestId]);
  assert.equal(photos.length,5);
  assert.deepEqual(photos[0].original_data,await readFile("public/images/properties/torre-urbari/01.jpg"));
  assert.equal((await fetch(`${base}/media/propiedades/${requestId}/01.jpg`)).status,404);
});

test("SQL failure on the second photo rolls back the request and every photo",options,async()=>{
  const key=randomUUID(),trigger=`qa_fail_${randomUUID().replaceAll("-","")}`;
  await connection.query(`CREATE TRIGGER ${trigger} BEFORE INSERT ON publication_photos FOR EACH ROW BEGIN IF NEW.filename='02.jpg' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated QA failure'; END IF; END`);
  try {assert.equal((await submit(key)).status,503);assert.equal(await count("publication_requests","account_id=? AND idempotency_key=?",[accountId,key]),0);}
  finally {await connection.query(`DROP TRIGGER ${trigger}`);}
});

test("only the configured admin may moderate; owner sessions and cross-origin requests cannot",options,async()=>{
  const body={decision:"approve",latitude:-17.7978,longitude:-63.1908,confirmed:true};
  assert.equal((await decision(requestId,body,{} as typeof admin)).status,401);
  const cross=await fetch(`${base}/admin/solicitudes/${requestId}/decision`,json(body,{...admin,origin:"https://example.invalid"}));assert.equal(cross.status,403);
  assert.equal((await decision(requestId,{...body,confirmed:false})).status,400);
  assert.equal((await decision(requestId,{...body,latitude:0})).status,400);
  assert.equal((await fetch(`${base}/admin/solicitudes/${requestId}/fotos/01.jpg`,{headers:{cookie}})).status,401);
  const original=await fetch(`${base}/admin/solicitudes/${requestId}/fotos/01.jpg`,{headers:admin});assert.equal(original.status,200);assert.match(original.headers.get("cache-control")!,/no-store/);
});

test("concurrent manual approval publishes exactly one direct-owner listing and audit event",options,async()=>{
  const body={decision:"approve",latitude:-17.7978,longitude:-63.1908,confirmed:true};
  const responses=await Promise.all([decision(requestId,body),decision(requestId,body)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  slug=(await responses.find(r=>r.status===200)!.json()).slug;
  assert.equal(await count("properties","slug=? AND published=1",[slug]),1);assert.equal(await count("client_account_properties","property_slug=? AND account_id=?",[slug,accountId]),1);
  assert.equal(await count("publication_review_audit","request_id=?",[requestId]),1);
  const page=await fetch(`${base}/propiedades/${slug}`);assert.equal(page.status,200);const html=await page.text();assert.match(html,/Departamento transaccional QA/);assert.match(html,/Propietario QA/);
  const image=await fetch(`${base}/media/propiedades/${requestId}/01.jpg`);assert.equal(image.status,200);assert.equal(image.headers.get("content-type"),"image/webp");const metadata=await sharp(Buffer.from(await image.arrayBuffer())).metadata();assert.equal(metadata.format,"webp");assert.equal(metadata.exif,undefined);
  assert.match(await (await fetch(`${base}/cliente`,{headers:{cookie}})).text(),new RegExp(slug));
});

test("each approved rental retires one demo permanently, including concurrent approvals",options,async()=>{
  const [replacements]=await connection.execute<RowDataPacket[]>("SELECT demo_slug FROM demo_listing_replacements WHERE property_slug=?",[slug]);
  assert.equal(replacements.length,1);
  const retired=String(replacements[0].demo_slug);
  for (const route of ["/","/propiedades","/mapa","/sitemap.xml"]) {
    assert.ok(!(await (await fetch(`${base}${route}`)).text()).includes(`/propiedades/${retired}`),route);
  }
  assert.equal((await fetch(`${base}/propiedades/${retired}`)).status,404);
  const contact=await fetch(`${base}/api/propiedades/${retired}/whatsapp`,{redirect:"manual"});
  assert.equal(contact.status,307);assert.equal(new URL(contact.headers.get("location")!).pathname,"/propiedades");
  await connection.execute("UPDATE properties SET published=0 WHERE slug=?",[slug]);
  try {assert.equal((await fetch(`${base}/propiedades/${retired}`)).status,404);}
  finally {await connection.execute("UPDATE properties SET published=1 WHERE slug=?",[slug]);}
  const ids=[];
  for (let i=0;i<2;i++) ids.push((await (await submit()).json()).requestId);
  const approved=await Promise.all(ids.map(id=>decision(id,{decision:"approve",confirmed:true,latitude:-17.78,longitude:-63.19})));
  assert.deepEqual(approved.map(response=>response.status),[200,200]);
  const slugs=await Promise.all(approved.map(async response=>(await response.json()).slug));
  const [added]=await connection.query<RowDataPacket[]>("SELECT demo_slug FROM demo_listing_replacements WHERE property_slug IN (?)",[slugs]);
  assert.equal(added.length,2);assert.equal(new Set(added.map(row=>row.demo_slug)).size,2);
});

test("rejection requires a reason, stays private and is visible only to its owner",options,async()=>{
  const submitted=await submit();assert.equal(submitted.status,201);const id=(await submitted.json()).requestId;
  assert.equal((await decision(id,{decision:"reject",reason:""})).status,400);
  assert.equal((await decision(id,{decision:"reject",reason:"Datos de ubicación incompletos"})).status,200);
  assert.equal((await fetch(`${base}/media/propiedades/${id}/01.jpg`)).status,404);
  const own=await fetch(`${base}/cliente/solicitudes`,{headers:{cookie}});assert.match(await own.text(),/Datos de ubicación incompletos/);
  const other=await fetch(`${base}/api/auth/register`,json({email:`other-${email}`,password,displayName:"Otro propietario"}));const otherCookie=other.headers.get("set-cookie")!.split(";")[0];
  assert.doesNotMatch(await (await fetch(`${base}/cliente/solicitudes`,{headers:{cookie:otherCookie}})).text(),new RegExp(id));
});

test("admin price corrections are scoped, transactional, audited and preserve the original submission",options,async()=>{
  const correction={price:"3.400",currency:"USD",expectedPrice:400,reason:"Corrección de separador de miles confirmada por el propietario."};
  const endpoint=`${base}/admin/solicitudes/${requestId}/precio`;
  const correct=(body:unknown,headers:Record<string,string>=admin,origin=base)=>fetch(endpoint,{...json(body,{...headers,origin}),method:"PATCH"});
  const [[before]]=await connection.query<RowDataPacket[]>("SELECT payload FROM publication_requests WHERE id=?",[requestId]);
  const [[propertyBefore]]=await connection.query<RowDataPacket[]>("SELECT long_description,images FROM properties WHERE slug=?",[slug]);
  assert.equal((await correct(correction,{})).status,401);
  assert.equal((await correct(correction,admin,"https://example.invalid")).status,403);
  assert.equal((await correct({...correction,price:-1})).status,400);
  assert.equal((await correct({...correction,currency:"BOB"})).status,409);
  assert.equal((await correct({...correction,expectedPrice:3.4})).status,409);
  const pending=await (await submit()).json();
  const response=await fetch(`${base}/admin/solicitudes/${pending.requestId}/precio`,{...json(correction,{...admin,origin:base}),method:"PATCH"});
  assert.equal(response.status,409);
  const trigger=`qa_price_${randomUUID().replaceAll("-","")}`;
  await connection.query(`CREATE TRIGGER ${trigger} BEFORE INSERT ON publication_review_audit FOR EACH ROW BEGIN IF NEW.decision='price_corrected' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated audit failure'; END IF; END`);
  try {
    assert.equal((await correct(correction)).status,503);
    assert.equal(await count("properties","slug=? AND price=400",[slug]),1);
  } finally {await connection.query(`DROP TRIGGER ${trigger}`);}
  const corrected=await correct(correction);assert.equal(corrected.status,200);
  assert.equal((await corrected.json()).price,3400);
  assert.equal((await correct(correction)).status,200);
  const [[saved]]=await connection.query<RowDataPacket[]>("SELECT price,rental_details,long_description,images FROM properties WHERE slug=?",[slug]);
  const rental=typeof saved.rental_details === "string" ? JSON.parse(saved.rental_details) : saved.rental_details;
  assert.equal(Number(saved.price),3400);assert.equal(rental.price,3400);
  assert.equal(saved.long_description,propertyBefore.long_description);assert.deepEqual(saved.images,propertyBefore.images);
  const [[after]]=await connection.query<RowDataPacket[]>("SELECT payload FROM publication_requests WHERE id=?",[requestId]);
  assert.deepEqual(after.payload,before.payload);
  assert.equal(await count("publication_review_audit","request_id=? AND decision='price_corrected'",[requestId]),1);
});

test("public price responses cannot be cached and read subsequent database edits immediately",options,async()=>{
  const routes=["/","/bienvenida","/mapa","/propiedades","/departamentos/urbari","/alquiler/santa-cruz/urbari",`/propiedades/${slug}`];
  for (const route of routes) {
    const response=await fetch(`${base}${route}`);
    assert.equal(response.status,200,route);
    assert.match(response.headers.get("cache-control") || "",/no-store/,route);
    await response.text();
  }
  const url=`${base}/propiedades/${slug}`;
  assert.match(await (await fetch(url)).text(),/\$us 3\.400\/mes/);
  await connection.execute("UPDATE properties SET price=3456 WHERE slug=?",[slug]);
  try {
    const html=await fetch(url);
    assert.match(await html.text(),/\$us 3\.456\/mes/);
    const navigation=await fetch(url,{headers:{RSC:"1"}});
    assert.match(navigation.headers.get("cache-control") || "",/no-store/);
    assert.match(await navigation.text(),/"price":3456/);
  } finally {
    await connection.execute("UPDATE properties SET price=3400 WHERE slug=?",[slug]);
  }
});

test("owner edits persist in SQL; invalid prices and temporary media never overwrite the listing",options,async()=>{
  const [rows]=await connection.query<RowDataPacket[]>("SELECT * FROM properties WHERE slug=?",[slug]);const row=rows[0];
  const parse=(value:unknown)=>typeof value === "string" ? JSON.parse(value) : value;
  const body={title:row.title,type:row.type,operation:"Alquiler",price:450,currency:"USD",exchangeRate:8.25,city:row.city,zone:row.zone,address:row.address,bedrooms:2,bathrooms:0,garage:1,area:0,pets:true,furnished:false,security:true,pool:false,patio:false,grill:false,elevator:true,shortDescription:row.short_description,longDescription:row.long_description,requirements:parse(row.requirements),images:parse(row.images),video:null,mapUrl:null,whatsapp:row.whatsapp,idealFor:[],tags:[],coordinates:parse(row.coordinates),neighborhoodHighlights:[]};
  const edit=(payload:unknown)=>fetch(`${base}/api/propiedades/${slug}`,{...json(payload),method:"PATCH"});
  assert.equal((await edit({...body,price:-1})).status,400);
  assert.equal((await edit({...body,images:["blob:temporary"]})).status,400);
  assert.equal((await edit(body)).status,200);
  assert.equal(await count("properties","slug=? AND price=450 AND exchange_rate=8.25",[slug]),1);
  assert.equal((await edit({...body,price:"4.500"})).status,200);
  assert.equal(await count("properties","slug=? AND price=4500",[slug]),1);
  const [[updated]]=await connection.query<RowDataPacket[]>("SELECT rental_details FROM properties WHERE slug=?",[slug]);
  assert.equal(parse(updated.rental_details).price,4500);
  assert.equal((await edit({...body,price:"4.50.0"})).status,400);
  assert.equal((await edit({...body,currency:"BOB"})).status,400);
  const coordinates={lat:-17.7270093,lng:-63.1385327};
  assert.equal((await edit({...body,coordinates,video:"/videos/properties/espiritu-santo.mp4"})).status,200);
  const [[media]]=await connection.query<RowDataPacket[]>("SELECT coordinates,video FROM properties WHERE slug=?",[slug]);
  assert.deepEqual(parse(media.coordinates),coordinates);
  assert.equal(media.video,"/videos/properties/espiritu-santo.mp4");
  for (const video of ["blob:temporary","//example.invalid/video.mp4","javascript:alert(1)",{},true]) {
    assert.equal((await edit({...body,video})).status,400);
  }
  assert.equal(await count("properties","slug=? AND video=?",[slug,"/videos/properties/espiritu-santo.mp4"]),1);
});

test("server restart preserves accounts, sessions, approvals and photos without filesystem state",options,async()=>{
  await stopServer();await startServer();
  assert.equal((await fetch(`${base}/publicar`,{headers:{cookie},redirect:"manual"})).status,200);
  assert.equal((await fetch(`${base}/propiedades/${slug}`)).status,200);
  assert.equal((await fetch(`${base}/media/propiedades/${requestId}/01.jpg`)).status,200);
  await assert.rejects(readFile(path.join(storage,"auth/accounts.json")),{code:"ENOENT"});
});

test("disabling an account invalidates its SQL sessions, and logout revokes the token",options,async()=>{
  await connection.execute("UPDATE morada_users SET status='disabled' WHERE account_id=?",[accountId]);
  assert.equal((await fetch(`${base}/publicar`,{headers:{cookie},redirect:"manual"})).status,307);
  await connection.execute("UPDATE morada_users SET status='active' WHERE account_id=?",[accountId]);
  assert.equal((await fetch(`${base}/api/auth/signout`,json({}))).status,200);
  assert.equal(await count("morada_sessions","token_hash=?",[createHash("sha256").update(cookie.slice(cookie.indexOf("=")+1)).digest("hex")]),0);
  assert.equal((await fetch(`${base}/publicar`,{headers:{cookie},redirect:"manual"})).status,307);
});

test("database outage returns an error and never creates fallback local accounts",options,async()=>{
  await stopServer();const original=serverEnv.DATABASE_URL;
  serverEnv.DATABASE_URL="mysql://qa:qa@127.0.0.1:1/unreachable_qa";
  await startServer();
  try {
    const response=await fetch(`${base}/api/auth/register`,json({email:`offline-${email}`,password,displayName:"Offline QA"}));
    assert.equal(response.status,503);
    assert.equal((await fetch(`${base}/api/auth/login`,json({email,password}))).status,503);
    await assert.rejects(readFile(path.join(storage,"auth/accounts.json")),{code:"ENOENT"});
  } finally {await stopServer();serverEnv.DATABASE_URL=original;}
});
