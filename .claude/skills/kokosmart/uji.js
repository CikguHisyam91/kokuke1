const {chromium}=require(process.env.PW||'playwright');
(async()=>{
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:1000}});
 const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('dialog',d=>{console.log('DIALOG',d.message().slice(0,100));d.accept();});
 const fs=require('fs'),NM=process.env.NM||'/tmp/npmx/node_modules/',adaNM=fs.existsSync(NM+'bootstrap');
 if(adaNM)await pg.route(/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.0\/dist\/(.*)/,r=>{const m=r.request().url().match(/dist\/(.*)$/);r.fulfill({path:NM+'bootstrap/dist/'+m[1]});});
 if(adaNM)await pg.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/(.*)/,r=>{const m=r.request().url().match(/6\.4\.0\/(.*)$/);r.fulfill({path:NM+'@fortawesome/fontawesome-free/'+m[1]});});
 const R=['CAMERON','STAINER','FREEMAN','STEVEN'],U=['PENGAKAP','PUTERI ISLAM','TKRS','BSMM'];const murid=[];
 for(let t=1;t<=6;t++)for(let i=0;i<20;i++)murid.push({bil:murid.length+2,nama:`MURID ${t}X${i}`,tahun:String(t),kelas:t+(i%2?' BIJAK':' CERDIK'),rumah:R[i%4],uniform:U[i%4],kelab:'SAINS',sukan:'HOKI'});
 const kh=[];for(let i=0;i<5;i++)kh.push({tarikh:'10/11/2026',kategori:'lain',namaUnit:'HARI KOKURIKULUM',perjumpaanKe:'1',namaMurid:'MURID 4X'+i,status:'Hadir',tahunAliran:'4'});
 for(let i=0;i<3;i++)kh.push({tarikh:'03/11/2026',kategori:'uniform',namaUnit:'PENGAKAP',perjumpaanKe:'2',namaMurid:'MURID 5X'+i,status:'Hadir',tahunAliran:'5'});
 const data={success:true,murid,arkib:[],kelas:['1 CERDIK','4 BIJAK','4 CERDIK'],rujukan:{rumah:R,uniform:['','TKRS','PENGAKAP','PUTERI ISLAM','BSMM','pengakap '],kelab:['SAINS','KOMPUTER'],sukan:['HOKI','BOLA SEPAK']},pencapaian:[],kehadiran:kh,jawatankuasa:[],guru:[{nama:'CIKGU AMIN'},{nama:'CIKGU SITI'}]};
 const store={'UNIT':{h:['ID','DIKEMASKINI','KATEGORI','NAMA UNIT','GURU PENASIHAT (KETUA)'],r:[['E1','x','UNIT BERUNIFORM','TKRS','CIKGU AMIN']]}};
 function sh(n){return store[n]=store[n]||{h:['ID','DIKEMASKINI'],r:[]};}
 function row(s,rek){Object.keys(rek).forEach(k=>{if(!s.h.includes(k.toUpperCase()))s.h.push(k.toUpperCase());});return s.h.map(h=>h==='DIKEMASKINI'?'x':String(rek[Object.keys(rek).find(k=>k.toUpperCase()===h)]??''));}
 let simpan=null;
 await pg.route('https://script.google.com/**',async r=>{const q=JSON.parse(r.request().postData());let res={result:{success:true}};
   if(q.fn==='semakLogin')res={result:true};else if(q.fn==='dapatkanDataSistem')res={result:data};else if(q.fn==='dapatkanPAJSK')res={result:{success:true,data:[]}};
   else if(q.fn==='dapatkanRekodModul')res={result:{success:true,modul:JSON.parse(JSON.stringify(store))}};
   else if(q.fn==='simpanRekodModul'){const s=sh(q.args[0]),rw=row(s,q.args[1]);const i=s.r.findIndex(x=>x[0]===q.args[1].ID);if(i>=0)s.r[i]=rw;else s.r.push(rw);}
   else if(q.fn==='simpanKehadiranDanLaporanPukal'){simpan=q.args;res={result:{success:true,urls:[]}};}
   await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(res)});});
 await pg.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();
 await pg.fill('#koko-pw','abc');await pg.click('#koko-btn');await pg.waitForTimeout(1200);
 // Buka setiap menu; tambah langkah ujian khusus di bawah
 const menu=process.argv.slice(2).length?process.argv.slice(2):await pg.evaluate(()=>Array.from(new Set(Array.from(document.querySelectorAll('[onclick*="tukarMenu("]')).map(e=>(e.getAttribute('onclick').match(/tukarMenu\('([^']+)'/)||[])[1]).filter(Boolean))));
 for(const m of menu){await pg.evaluate(x=>tukarMenu(x),m);await pg.waitForTimeout(150);}
 console.log('Menu diuji:',menu.length);console.log(errs.length?errs.join('\n'):'TIADA RALAT');await b.close();process.exit(errs.length?1:0);})();
