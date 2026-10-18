const eur = n => new Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR', maximumFractionDigits:0}).format(n || 0);
const esc = s => (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

fetch('data/pliegos.json').then(r => r.json()).then(d => {
  const rows = d.contratos || [];
  document.getElementById('t1').textContent = rows.length;
  document.getElementById('t2').textContent = eur(rows.reduce((a, r) => a + (r.importe || 0), 0));
  document.getElementById('t3').textContent = new Set(rows.map(r => r.organo)).size;
  if (!rows.length) { document.getElementById('list').innerHTML = '<p class="sub">Sin contratos en este momento.</p>'; return; }
  document.getElementById('list').innerHTML = rows.map(r => `
    <div class="row">
      <div>
        <p class="t">${esc(r.titulo)}${r.relevancia === 'alta' ? '<span class="tag">música en vivo</span>' : ''}</p>
        <div class="o">${esc(r.organo)}${r.ciudad ? ' · ' + esc(r.ciudad) : ''}${r.adjudicatario ? ' · ' + esc(r.adjudicatario) : ''}</div>
      </div>
      <div class="i">${eur(r.importe)}</div>
      <div class="u"><a href="${esc(r.url)}" target="_blank" rel="noopener">Ver expediente →</a><div class="o">${esc(r.actualizado)}</div></div>
    </div>`).join('');
}).catch(e => { document.getElementById('list').innerHTML = '<p class="sub">No se pudo cargar.</p>'; });
