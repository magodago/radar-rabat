const hostOf = u => { try { return new URL(u).hostname.replace('www.',''); } catch(e){ return u; } };
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
let DATA = null, rows = [], gens = new Set(), state = { q:'', prov:'', mes:'', ord:'fecha', alto:false, conf:false };

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function fmtFecha(r){
  if (r.estado !== 'confirmado') return { d: String(Math.max(r.anio||0, new Date().getFullYear()+1)), m: '' };
  const d = new Date(r.inicio + 'T12:00:00');
  if (isNaN(d)) return { d:'--', m:'' };
  return { d: String(d.getDate()).padStart(2,'0'), m: MESES[d.getMonth()].slice(0,3).toUpperCase() + ' ' + r.anio };
}

function init(){
  fetch(location.search.indexOf('muestra') >= 0 ? 'data/muestra.json' : 'data/festivals.json').then(r => r.json()).then(d => {
    DATA = d; rows = (d.festivales || []).slice().sort((a,b)=>{
      const ca = a.estado==='confirmado'?0:1, cb = b.estado==='confirmado'?0:1;
      if (ca !== cb) return ca-cb;
      return a.inicio < b.inicio ? -1 : 1;
    });
    $('#upd').textContent = 'ACT. ' + new Date(d.meta.generado).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});
    $('#kTotal').textContent = d.meta.total;
    $('#kProv').textContent = d.meta.provincias;
    $('#kAlto').textContent = rows.filter(r => r.encaje === 'alto').length;
    const w = Date.now() - 7*864e5;
    $('#kNuevo').textContent = rows.filter(r => Date.parse(r.visto || 0) > w).length;
    $('#kContacto').textContent = rows.filter(r => r.email || r.email_ayto).length;
    $('#kNuevo').textContent = rows.filter(r => r.web).length;
    $('#footMeta').textContent = 'Actualizado ' + new Date(d.meta.generado).toLocaleString('es-ES');

    const provs = [...new Set(rows.map(r => r.provincia).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    $('#prov').insertAdjacentHTML('beforeend', provs.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join(''));

    const counts = {};
    rows.forEach(r => { if (r.generos_es) r.generos_es.forEach(g => counts[g] = (counts[g]||0)+1); });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
    $('#gens').innerHTML = top.map(([g,n]) => `<button class="g" data-g="${esc(g)}">${esc(g)} <sup>${n}</sup></button>`).join('');

    render();
  }).catch(e => { $('#list').innerHTML = '<div class="empty">No se pudo cargar el listado.</div>'; console.error(e); });
}

function filtered(){
  const q = norm(state.q);
  let out = rows.filter(r => {
    if (state.alto && r.encaje !== 'alto') return false;
    if (state.conf && r.estado !== 'confirmado') return false;
    if (state.prov && r.provincia !== state.prov) return false;
    if (state.mes && Number(state.mes) !== r.mes) return false;
    if (gens.size && !(r.generos_es||[]).some(g => gens.has(g))) return false;
    if (q){
      const heno = norm([r.nombre, r.municipio, r.provincia, r.recinto, (r.cartel||[]).join(' '), (r.match||[]).map(m=>m.artista).join(' ')].join(' '));
      if (!heno.includes(q)) return false;
    }
    return true;
  });
  if (state.ord === 'nombre') out.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  else if (state.ord === 'encaje') out.sort((a,b)=> (a.encaje==='alto'?-2:a.encaje==='medio'?-1:0) - (b.encaje==='alto'?-2:b.encaje==='medio'?-1:0) || (a.inicio||'').localeCompare(b.inicio||''));
  else out.sort((a,b)=> ((a.estado==='confirmado')?0:1) - ((b.estado==='confirmado')?0:1)
      || (a.inicio||'9999').localeCompare(b.inicio||'9999')
      || (a.anio||9999) - (b.anio||9999)
      || a.nombre.localeCompare(b.nombre,'es'));
  return out;
}

function render(){
  const out = filtered();
  $('#count').textContent = out.length + ' festival' + (out.length===1?'':'es');
  $('#empty').hidden = out.length > 0;
  $('#list').innerHTML = out.map((r,i) => {
    const f = fmtFecha(r);
    const gs = (r.generos_es||[]).slice(0,3).map(g=>`<span>${esc(g)}</span>`).join('');
    return `<article class="row" data-i="${rows.indexOf(r)}">
      <div class="dt"><b>${f.d}</b>${f.m}</div>
      <div class="nm">${esc(r.nombre_corto || r.nombre)}${r.estado==='confirmado'?'':'<em class="pend">fecha por confirmar</em>'}</div>
      <div class="loc"><b>${esc(r.municipio||'—')}</b> · ${esc(r.provincia||'')}</div>
      <div class="gg">${gs}</div>
      <div class="enc ${r.encaje}">${r.encaje==='alto'?'● ':''}${r.encaje}</div>
      <div class="arw">→</div>
    </article>`;
  }).join('');
}

function drawer(i){
  const r = rows[i]; if (!r) return;
  const f = new Date(r.inicio+'T12:00:00');
  const fechas = r.fin && r.fin !== r.inicio
    ? `${f.getDate()} ${MESES[f.getMonth()]} – ${new Date(r.fin+'T12:00:00').getDate()} ${MESES[new Date(r.fin+'T12:00:00').getMonth()]} ${r.anio}`
    : `${f.getDate()} ${MESES[f.getMonth()]} ${r.anio}`;
  const host = u => { try { return new URL(u).hostname.replace('www.',''); } catch(e){ return 'enlace'; } };
  const links = (r.links||[]).slice(0,4).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a>`).join('');
  const cartel = (r.cartel||[]).slice(0,18).map(a=>`<span>${esc(a)}</span>`).join('');
  const match = (r.match||[]).length
    ? r.match.map(m=>`<div class="mi"><b>${esc(m.artista)}</b><span>${esc(m.motivo)}</span></div>`).join('')
    : '<div class="mi"><span>Sin coincidencia directa con el roster</span></div>';

  $('#dwBody').innerHTML = `
    <div class="dw-k">FESTIVAL · ${esc(r.provincia)}</div>
    <h2 class="dw-t">${esc(r.nombre)}</h2>
    <div class="dw-meta">
      <div>FECHAS <b>${esc(fechas)}</b></div>
      <div>LUGAR <b>${esc(r.recinto || '—')}</b></div>
      <div>MUNICIPIO <b>${esc(r.municipio || '—')}</b></div>
      <div>PROVINCIA <b>${esc(r.provincia)}</b></div>
      <div>ENCAJE <b>${esc((r.encaje||'').toUpperCase())}</b></div>
    </div>
    <div class="dw-sec">Géneros</div>
    <div class="dw-chips">${(r.generos_es||[]).map(g=>`<span>${esc(g)}</span>`).join('') || '<span>—</span>'}</div>
    <div class="dw-sec">Encaje con el roster</div>
    <div class="match">${match}</div>
    ${cartel ? `<div class="dw-sec">Cartel confirmado (${(r.cartel||[]).length})</div><div class="dw-chips">${cartel}</div>` : ''}
    ${r.descripcion ? `<div class="dw-sec">Sobre el festival</div><div class="dw-line dim">${esc(r.descripcion.slice(0,600))}${r.descripcion.length>600?'…':''}</div>` : ''}
    <div class="dw-sec">Contacto y promotor</div>
    ${r.email?`<div class="dw-line"><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></div>`:`<div class="dw-line dim">Sin email público · usa la web o el pitch</div>`}
    ${(r.emails||[]).length>1?`<div class="dw-line dim">${esc(r.emails.slice(1).join(' · '))}</div>`:''}
    ${r.promotor?`<div class="dw-line">Promotor / organiza: <b>${esc(r.promotor)}</b></div>`:''}
    ${r.email_ayto?`<div class="dw-line">Ayuntamiento: <a href="mailto:${esc(r.email_ayto)}">${esc(r.email_ayto)}</a>${r.tel_ayto?` · ${esc(r.tel_ayto)}`:''}</div>`:''}
    ${r.web_ayto?`<div class="dw-line dim">Ayto. web: <a href="${esc(r.web_ayto)}" target="_blank" rel="noopener">${esc(hostOf(r.web_ayto))}</a></div>`:''}
    ${r.web?`<div class="dw-line dim">Web: <a href="${esc(r.web)}" target="_blank" rel="noopener">${esc(hostOf(r.web))}</a></div>`:''}
    <div class="dw-acts">
      <button class="primary" id="dwPitch">COPIAR PITCH</button>
      ${links}
    </div>`;

  $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden','false');
  $('#scrim').hidden = false;
  $('#dwPitch').onclick = () => {
    const txt = `Hola. Somos Rabat Music Group (sello LORE). Trabajamos con artistas como ${(r.match||[]).map(m=>m.artista).slice(0,3).join(', ') || 'nuestro roster'} y creemos que encajan en ${r.nombre} (${r.municipio}, ${fechas}). ¿Nos pasáis las condiciones de programación y el contacto de contratación para esta edición? Gracias.`;
    navigator.clipboard.writeText(txt).then(()=>{ $('#dwPitch').textContent='COPIADO'; setTimeout(()=>$('#dwPitch').textContent='COPIAR PITCH',1600); });
  };
}

function closeDrawer(){ $('#drawer').classList.remove('on'); $('#drawer').setAttribute('aria-hidden','true'); $('#scrim').hidden = true; }

function toCSV(out){
  const head = ['Festival','Inicio','Fin','Recinto','Municipio','Provincia','CCAA','Géneros','Encaje','Artistas sugeridos','Cartel','Web'];
  const lines = [head.join(';')].concat(out.map(r => [
    r.nombre, r.inicio, r.fin, r.recinto, r.municipio, r.provincia, r.ccaa,
    (r.generos_es||[]).join(', '), r.encaje, (r.match||[]).map(m=>m.artista).join(', '),
    (r.cartel||[]).slice(0,10).join(', '), (r.web|| (r.links||[])[0] || '')
  ].map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';')));
  const blob = new Blob(['\ufeff'+lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rabat-festivales-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  $('#q').addEventListener('input', e => { state.q = e.target.value; render(); });
  $('#prov').addEventListener('change', e => { state.prov = e.target.value; render(); });
  $('#mes').innerHTML += MESES.map((m,i)=>`<option value="${i+1}">${m[0].toUpperCase()+m.slice(1)}</option>`).join('');
  $('#mes').addEventListener('change', e => { state.mes = e.target.value; render(); });
  $('#ord').addEventListener('change', e => { state.ord = e.target.value; render(); });
  $('#soloAlto').addEventListener('change', e => { state.alto = e.target.checked; render(); });
  $('#soloConf').addEventListener('change', e => { state.conf = e.target.checked; render(); });
  $('#gens').addEventListener('click', e => {
    const b = e.target.closest('.g'); if (!b) return;
    const g = b.dataset.g;
    b.classList.toggle('on');
    gens.has(g) ? gens.delete(g) : gens.add(g);
    render();
  });
  $('#list').addEventListener('click', e => {
    const row = e.target.closest('.row'); if (row) drawer(Number(row.dataset.i));
  });
  $('#dwX').onclick = closeDrawer; $('#scrim').onclick = closeDrawer;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  $('#btnCsv').onclick = () => toCSV(filtered());
  $('#btnXls').onclick = () => { location.href = 'data/festivales.xlsx'; };
  $('#btnPdf').onclick = () => { window.open('data/informe.pdf','_blank'); };
});
