/* AT Odontologia — avaliações públicas + integração Supabase */
(() => {
  const config = window.AT_SUPABASE_CONFIG;
  const hasConfig = config && !config.url.startsWith('COLE_AQUI') && !config.anonKey.startsWith('COLE_AQUI');
  let supabaseClient = null;

  const state = { profissional: '', nota: 0, filtro: 'todas' };

  document.addEventListener('DOMContentLoaded', async () => {
    if (hasConfig && window.supabase) {
      supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    }
    initForm();
    initStars();
    initFilters();
    renderPublicReviews();
  });

  function initForm() {
    const form = document.getElementById('reviewForm');
    if (!form) return;

    const professionalButtons = form.querySelectorAll('[data-profissional]');
    professionalButtons.forEach((button) => {
      button.addEventListener('click', () => {
        state.profissional = button.dataset.profissional;
        professionalButtons.forEach((b) => {
          const selected = b === button;
          b.classList.toggle('is-selected', selected);
          b.setAttribute('aria-pressed', String(selected));
        });
        const error = document.getElementById('professionalError');
        if (error) error.textContent = '';
      });
    });

    const nameInput = document.getElementById('reviewName');
    const modeInputs = form.querySelectorAll('input[name="reviewNameMode"]');
    const preview = document.getElementById('reviewNamePreview');
    const updatePreview = () => {
      if (!preview) return;
      preview.textContent = formatPublicName(nameInput?.value || '', getNameMode(modeInputs));
    };
    nameInput?.addEventListener('input', updatePreview);
    modeInputs.forEach((input) => input.addEventListener('change', updatePreview));

    const comment = document.getElementById('reviewComment');
    const counter = document.getElementById('reviewCounter');
    comment?.addEventListener('input', () => {
      if (counter) counter.textContent = `${comment.value.length}/1000`;
    });

    form.addEventListener('submit', submitReview);
    console.log('FORMULÁRIO DE AVALIAÇÃO CARREGADO');
  }

  function initStars() {
    const stars = document.querySelectorAll('#reviewStars button');
    stars.forEach((star) => {
      star.addEventListener('click', () => setRating(Number(star.dataset.rating)));
      star.addEventListener('mouseenter', () => paintStars(Number(star.dataset.rating), true));
      star.addEventListener('mouseleave', () => paintStars(state.nota, false));
      star.addEventListener('focus', () => paintStars(Number(star.dataset.rating), true));
      star.addEventListener('blur', () => paintStars(state.nota, false));
    });
  }

  function setRating(value) {
    state.nota = value;
    paintStars(value, false);
    const label = document.getElementById('ratingValue');
    if (label) label.textContent = `${value} de 5`;
    const error = document.getElementById('ratingError');
    if (error) error.textContent = '';
  }

  function paintStars(value, preview) {
    document.querySelectorAll('#reviewStars button').forEach((star) => {
      const active = Number(star.dataset.rating) <= value;
      star.classList.toggle('is-active', active);
      star.setAttribute('aria-checked', String(active && !preview));
    });
  }

  function initFilters() {
    document.querySelectorAll('[data-review-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        state.filtro = button.dataset.reviewFilter;
        document.querySelectorAll('[data-review-filter]').forEach((b) => {
          const selected = b === button;
          b.classList.toggle('is-active', selected);
          b.setAttribute('aria-pressed', String(selected));
        });
        renderPublicReviews();
      });
    });
  }

  async function submitReview(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = document.getElementById('reviewFeedback');
    const submitButton = form.querySelector('button[type="submit"]');
    clearErrors();

    const name = document.getElementById('reviewName').value.trim();
    const comment = document.getElementById('reviewComment').value.trim();
    const mode = getNameMode(form.querySelectorAll('input[name="reviewNameMode"]'));
    const consent = document.getElementById('reviewConsent').checked;
    const honeypot = document.getElementById('reviewWebsite').value.trim();

    if (honeypot) return;
    let valid = true;
    if (!state.profissional) { setError('professionalError', 'Selecione a profissional que realizou seu atendimento.'); valid = false; }
    if (!state.nota) { setError('ratingError', 'Selecione uma nota de 1 a 5 estrelas.'); valid = false; }
    if (name.length < 2 || name.length > 120) { setError('nameError', 'Informe seu nome completo.'); valid = false; }
    if (comment.length < 10 || comment.length > 1000) { setError('commentError', 'Escreva uma experiência entre 10 e 1000 caracteres.'); valid = false; }
    const publicName = formatPublicName(name, mode);
    if (!publicName) { setError('nameError', 'Não foi possível gerar seu nome público.'); valid = false; }
    if (!valid) return;

    if (!supabaseClient) {
      setFeedback(feedback, 'A conexão com o sistema de avaliações ainda não foi configurada. Configure o Supabase antes de publicar o site.', true);
      return;
    }

    submitButton.disabled = true;
    submitButton.classList.add('is-loading');
    setFeedback(feedback, 'Enviando sua avaliação…', false);

    try {
      const { error } = await supabaseClient.rpc('enviar_avaliacao', {
        p_profissional: state.profissional,
        p_nome_cliente: name,
        p_nome_publico: publicName,
        p_modo_nome: mode,
        p_nota: state.nota,
        p_comentario: comment,
        p_consentimento: consent,
        p_client_token: getClientToken()
      });
      if (error) throw error;

      form.reset();
      state.profissional = '';
      state.nota = 0;
      document.querySelectorAll('[data-profissional]').forEach((b) => {
        b.classList.remove('is-selected');
        b.setAttribute('aria-pressed', 'false');
      });
      paintStars(0, false);
      document.getElementById('ratingValue').textContent = 'Nenhuma nota selecionada';
      document.getElementById('reviewCounter').textContent = '0/1000';
      document.getElementById('reviewNamePreview').textContent = 'Seu nome aparecerá aqui';
      setFeedback(feedback, 'Obrigado por compartilhar sua experiência com a AT Odontologia Especializada. Sua avaliação foi recebida e será analisada pela nossa equipe.', false);
    } catch (error) {
  console.error('ERRO AO ENVIAR AVALIAÇÃO:', error);

  const message = error?.message || 'Erro desconhecido.';
  setFeedback(feedback, message, true);
}
    finally {
      submitButton.disabled = false;
      submitButton.classList.remove('is-loading');
    }
  }

  async function renderPublicReviews() {
    const grid = document.getElementById('reviewsGrid');
    const empty = document.getElementById('reviewsEmpty');
    if (!grid || !supabaseClient) {
      if (grid) grid.innerHTML = '';
      if (empty) empty.hidden = true;
      return;
    }

    grid.innerHTML = '<div class="reviews-state">Carregando avaliações…</div>';
    let query = supabaseClient
      .from('avaliacoes')
      .select('id, profissional, nome_publico, nota, comentario, data_criacao')
      .eq('status', 'aprovada')
      .eq('consentimento_publicacao', true)
      .order('data_criacao', { ascending: false });
    if (state.filtro !== 'todas') query = query.eq('profissional', state.filtro);

    const { data, error } = await query;
    if (error) {
      grid.innerHTML = '<div class="reviews-state">Não foi possível carregar as avaliações agora.</div>';
      return;
    }

    grid.innerHTML = '';
    if (!data?.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    data.forEach((review) => grid.appendChild(createReviewCard(review)));
    updateAverages();
  }

  async function updateAverages() {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient
      .from('avaliacoes')
      .select('profissional, nota')
      .eq('status', 'aprovada')
      .eq('consentimento_publicacao', true);
    if (error) return;
    ['thércia', 'alexia'].forEach((professional) => {
      const rows = (data || []).filter((item) => item.profissional === professional);
      const avg = rows.length ? (rows.reduce((sum, item) => sum + item.nota, 0) / rows.length).toFixed(1).replace('.', ',') : '—';
      const avgEl = document.querySelector(`[data-average="${professional}"]`);
      const countEl = document.querySelector(`[data-count="${professional}"]`);
      if (avgEl) avgEl.textContent = avg === '—' ? 'Ainda sem avaliações' : `${avg} / 5`;
      if (countEl) countEl.textContent = `${rows.length} ${rows.length === 1 ? 'avaliação' : 'avaliações'}`;
    });
  }

  function createReviewCard(review) {
    const article = document.createElement('article');
    article.className = 'review-card';
    const professionalName = review.profissional === 'thércia' ? 'Dra. Thércia' : 'Dra. Alexia';
    const stars = '★'.repeat(review.nota) + '☆'.repeat(5 - review.nota);
    const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(review.data_criacao));
    article.innerHTML = `
      <div class="review-card__top"><span class="review-card__doctor">${professionalName}</span><span class="review-card__stars" aria-label="${review.nota} de 5 estrelas">${stars}</span></div>
      <p class="review-card__comment"></p>
      <div class="review-card__bottom"><strong></strong><time datetime="${review.data_criacao}">${date}</time></div>`;
    article.querySelector('.review-card__comment').textContent = `“${review.comentario}”`;
    article.querySelector('strong').textContent = review.nome_publico;
    return article;
  }

  function formatPublicName(name, mode) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (mode === 'completo') return parts.join(' ');
    if (mode === 'iniciais') return parts.map((p) => `${p[0].toUpperCase()}.`).join(' ');
    const last = parts[parts.length - 1];
    return parts.length > 1 ? `${parts[0]} ${last[0].toUpperCase()}.` : parts[0];
  }

  function getNameMode(inputs) { return [...inputs].find((input) => input.checked)?.value || 'primeiro_inicial'; }
  function getClientToken() {
    const key = 'at_review_client_token';
    let token = localStorage.getItem(key);
    if (!token) { token = crypto.randomUUID(); localStorage.setItem(key, token); }
    return token;
  }
  function setError(id, message) { const el = document.getElementById(id); if (el) el.textContent = message; }
  function clearErrors() { document.querySelectorAll('.review-error').forEach((el) => { el.textContent = ''; }); }
  function setFeedback(el, message, error) { if (!el) return; el.textContent = message; el.classList.toggle('is-error', !!error); el.classList.toggle('is-success', !error); }
  function friendlyError(message = '') {
    if (/Aguarde alguns minutos/i.test(message)) return message;
    return 'Não foi possível enviar sua avaliação agora. Tente novamente em instantes.';
  }
})();
