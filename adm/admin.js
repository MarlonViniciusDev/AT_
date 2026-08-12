(() => {
  const config = window.AT_SUPABASE_CONFIG;
  if (!config || config.url.startsWith('COLE_AQUI') || !window.supabase) return;
  const sb = window.supabase.createClient(config.url, config.anonKey);

  const isLogin = !!document.getElementById('loginForm');
  if (isLogin) initLogin(); else initDashboard();

  async function initLogin() {
    const { data } = await sb.auth.getSession();
    if (data.session) window.location.href = 'dashboard.html';
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const feedback = document.getElementById('loginFeedback');
      const email = document.getElementById('email').value.trim(); const password = document.getElementById('password').value;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { feedback.textContent = 'Não foi possível entrar. Verifique seus dados e a autorização administrativa.'; return; }
      window.location.href = 'dashboard.html';
    });
  }

  async function initDashboard() {
    const { data } = await sb.auth.getSession();
    if (!data.session) { window.location.href = 'login.html'; return; }
    const { data: admin } = await sb.rpc('is_admin');
    if (!admin) { await sb.auth.signOut(); alert('Usuário sem permissão administrativa.'); window.location.href='login.html'; return; }
    document.getElementById('logoutButton').onclick = async () => { await sb.auth.signOut(); window.location.href='login.html'; };
    ['statusFilter','professionalFilter','ratingFilter','searchFilter'].forEach(id => document.getElementById(id).addEventListener('input', loadReviews));
    loadReviews();
  }

  async function loadReviews() {
    const status = document.getElementById('statusFilter').value;
    const professional = document.getElementById('professionalFilter').value;
    const rating = document.getElementById('ratingFilter').value;
    const search = document.getElementById('searchFilter').value.trim().toLowerCase();
    const { data: allRows, error: statsError } = await sb.from('avaliacoes').select('id,status,nota');
    if (statsError) { document.getElementById('adminReviews').innerHTML = '<div class="admin-review">Erro ao carregar avaliações.</div>'; return; }
    let query = sb.from('avaliacoes').select('*').order('data_criacao', { ascending:false });
    if (status !== 'todos') query = query.eq('status', status);
    if (professional !== 'todas') query = query.eq('profissional', professional);
    if (rating !== 'todos') query = query.eq('nota', Number(rating));
    const { data, error } = await query;
    if (error) { document.getElementById('adminReviews').innerHTML = '<div class="admin-review">Erro ao carregar avaliações.</div>'; return; }
    const filtered = (data || []).filter(r => !search || `${r.nome_cliente} ${r.nome_publico} ${r.comentario}`.toLowerCase().includes(search));
    renderStats(allRows || []); renderReviews(filtered);
  }

  function renderStats(rows) {
    const avg = rows.length ? (rows.reduce((s,r)=>s+r.nota,0)/rows.length).toFixed(1).replace('.',',') : '—';
    document.getElementById('stats').innerHTML = [
      ['Total',rows.length],['Pendentes',rows.filter(r=>r.status==='pendente').length],['Aprovadas',rows.filter(r=>r.status==='aprovada').length],['Rejeitadas',rows.filter(r=>r.status==='rejeitada').length],['Média geral',avg]
    ].map(([label,value])=>`<div class="stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
  }

  function renderReviews(rows) {
    const root = document.getElementById('adminReviews');
    if (!rows.length) { root.innerHTML='<div class="admin-review">Nenhuma avaliação encontrada.</div>'; return; }
    root.innerHTML = rows.map(r => `<article class="admin-review"><div class="admin-review__head"><div><strong>${escapeHtml(r.nome_cliente)}</strong><div class="admin-review__meta">${r.profissional==='thércia'?'Dra. Thércia':'Dra. Alexia'} · ${r.nota}/5 · ${escapeHtml(r.nome_publico)}</div></div><span class="badge ${r.status}">${r.status}</span></div><p class="admin-review__comment">${escapeHtml(r.comentario)}</p><div class="admin-review__meta">Publicação autorizada: ${r.consentimento_publicacao?'sim':'não'} · ${new Date(r.data_criacao).toLocaleString('pt-BR')}</div><div class="admin-actions"><button class="approve" data-action="aprovada" data-id="${r.id}">Aprovar</button><button data-action="rejeitada" data-id="${r.id}">Rejeitar</button><button class="delete" data-action="delete" data-id="${r.id}">Excluir</button></div></article>`).join('');
    root.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>act(btn.dataset.action,btn.dataset.id));
  }

  async function act(action,id) {
    if (action==='delete' && !confirm('Excluir esta avaliação permanentemente?')) return;
    const result = action==='delete' ? await sb.from('avaliacoes').delete().eq('id',id) : await sb.from('avaliacoes').update({status:action}).eq('id',id);
    if (result.error) alert('Não foi possível concluir a ação.'); else loadReviews();
  }
  function escapeHtml(value=''){const div=document.createElement('div');div.textContent=value;return div.innerHTML;}
})();
