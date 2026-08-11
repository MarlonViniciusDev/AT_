/* =====================================================================
   GOOGLE-REVIEWS.JS
   ----------------------------------------------------------------------
   Busca as avaliações reais do perfil do Google da clínica e renderiza
   os cartões dentro do carrossel de depoimentos existente, mantendo o
   mesmo visual/HTML estrutural (.testimonial-slide / .testimonial-card)
   já estilizado em css/style.css.

   Fonte dos dados: Google Maps Platform — Places API, biblioteca
   "places" do Maps JavaScript API (Place.fetchFields), chamada
   diretamente do navegador (não precisa de servidor/backend).

   LIMITAÇÃO OFICIAL DO GOOGLE (não é uma limitação deste código):
   a API do Google só disponibiliza no máximo 5 avaliações por local,
   escolhidas pelo próprio Google (geralmente as mais relevantes/úteis,
   não necessariamente as mais recentes). Não existe forma de contornar
   isso sem usar o Google Business Profile API (que exige o dono
   verificado da ficha fazer login/OAuth) ou um serviço terceirizado
   de agregação (Elfsight, Taggbox, EmbedSocial etc.).

   Nenhuma avaliação é inventada ou cadastrada manualmente: se a API
   não responder, o carrossel mostra um aviso + link direto para o
   perfil real no Google, nunca dados falsos.
===================================================================== */

(function () {
  'use strict';

  const CACHE_KEY = 'at_google_reviews_cache_v1';

  const els = {
    summary: null,
    score: null,
    stars: null,
    count: null,
    skeleton: null,
    fallback: null,
    fallbackLink: null,
    track: null,
    controls: null,
    seeAllLink: null,
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheDom();

    const config = window.GOOGLE_REVIEWS_CONFIG;
    if (!config) {
      console.error('[GoogleReviews] Arquivo js/google-reviews-config.js não encontrado ou não carregado antes de google-reviews.js.');
      showFallback();
      return;
    }

    // Link "Ver todas as avaliações no Google" sempre aponta para o perfil real
    if (els.seeAllLink && config.mapsProfileUrl) els.seeAllLink.href = config.mapsProfileUrl;
    if (els.fallbackLink && config.mapsProfileUrl) els.fallbackLink.href = config.mapsProfileUrl;

    if (!isConfigured(config)) {
      console.warn(
        '[GoogleReviews] Configure "apiKey" e "placeId" em js/google-reviews-config.js para ativar as avaliações reais do Google. ' +
        'Veja o passo a passo em COMO-CONFIGURAR-GOOGLE-REVIEWS.md.'
      );
      showFallback();
      return;
    }

    // 1) Tenta usar cache local (rápido, evita chamada desnecessária à API)
    const cached = readCache(config.cacheHours);
    if (cached) {
      render(cached, config);
      // Atualiza em segundo plano sem bloquear a experiência do visitante
      fetchFromGoogle(config).then((fresh) => {
        if (fresh) { writeCache(fresh); render(fresh, config); }
      }).catch((err) => console.warn('[GoogleReviews] Falha ao atualizar avaliações em segundo plano:', err));
      return;
    }

    // 2) Sem cache válido: mostra esqueleto e busca na API do Google
    showSkeleton();
    fetchFromGoogle(config)
      .then((data) => {
        if (!data) throw new Error('Resposta vazia da API do Google.');
        writeCache(data);
        render(data, config);
      })
      .catch((err) => {
        console.error('[GoogleReviews] Não foi possível carregar as avaliações do Google:', err);
        // Se existir cache expirado, é melhor mostrar algo real e "velho"
        // do que nada — nunca mostramos dados inventados.
        const stale = readCache(Infinity);
        if (stale) { render(stale, config); return; }
        showFallback();
      });
  }

  function cacheDom() {
    els.summary = document.getElementById('reviewsSummary');
    els.score = document.getElementById('reviewsScore');
    els.stars = document.getElementById('reviewsStars');
    els.count = document.getElementById('reviewsCount');
    els.skeleton = document.getElementById('testimonialSkeleton');
    els.fallback = document.getElementById('testimonialFallback');
    els.fallbackLink = document.getElementById('testimonialFallbackLink');
    els.track = document.getElementById('testimonialTrack');
    els.controls = document.getElementById('testimonialControls');
    els.seeAllLink = document.getElementById('testimonialGoogleLink');
  }

  function isConfigured(config) {
    return (
      config.apiKey && config.apiKey !== 'SUA_CHAVE_DE_API_AQUI' &&
      config.placeId && config.placeId !== 'SEU_PLACE_ID_AQUI'
    );
  }

  /* ---------------------------------------------------------------------
     CARREGAMENTO DO GOOGLE MAPS JAVASCRIPT API (sob demanda)
  --------------------------------------------------------------------- */
  let mapsApiPromise = null;

  function loadMapsApi(apiKey) {
    if (mapsApiPromise) return mapsApiPromise;

    mapsApiPromise = new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.places) {
        resolve(window.google.maps.places);
        return;
      }

      const callbackName = '__atGoogleReviewsMapsReady';
      window[callbackName] = () => resolve(window.google.maps.places);

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Falha ao carregar o script do Google Maps (verifique a chave de API e a conexão).'));
      document.head.appendChild(script);
    });

    return mapsApiPromise;
  }

  /* ---------------------------------------------------------------------
     BUSCA DOS DADOS REAIS NO GOOGLE
  --------------------------------------------------------------------- */
  async function fetchFromGoogle(config) {
    const places = await loadMapsApi(config.apiKey);

    const place = new places.Place({ id: config.placeId });
    await place.fetchFields({
      fields: ['displayName', 'rating', 'userRatingCount', 'reviews', 'googleMapsURI'],
    });

    const reviews = (place.reviews || [])
      .filter((r) => (config.minRating ? r.rating >= config.minRating : true))
      .slice(0, config.maxReviews || 5)
      .map(normalizeReview);

    return {
      fetchedAt: Date.now(),
      businessName: place.displayName || 'AT Odontologia Especializada',
      rating: place.rating || null,
      userRatingCount: place.userRatingCount || 0,
      mapsUri: place.googleMapsURI || config.mapsProfileUrl,
      reviews,
    };
  }

  function normalizeReview(r) {
    return {
      authorName: (r.authorAttribution && r.authorAttribution.displayName) || 'Paciente do Google',
      authorPhoto: (r.authorAttribution && r.authorAttribution.photoURI) || '',
      authorUri: (r.authorAttribution && r.authorAttribution.uri) || '',
      rating: r.rating || 5,
      relativeTime: r.relativePublishTimeDescription || '',
      date: r.publishTime ? formatDate(r.publishTime) : '',
      text: (typeof r.text === 'string' ? r.text : (r.text && r.text.text) || '').trim(),
    };
  }

  function formatDate(value) {
    try {
      const d = value instanceof Date ? value : new Date(value);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  /* ---------------------------------------------------------------------
     CACHE (localStorage) — evita chamadas repetidas à API a cada visita
  --------------------------------------------------------------------- */
  function readCache(maxHours) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const ageHours = (Date.now() - parsed.fetchedAt) / 36e5;
      if (ageHours > maxHours) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* localStorage indisponível — segue sem cache */ }
  }

  /* ---------------------------------------------------------------------
     RENDERIZAÇÃO
  --------------------------------------------------------------------- */
  function render(data, config) {
    hideSkeleton();
    hideFallback();
    renderSummary(data);
    renderSlides(data.reviews, config);

    if (els.seeAllLink && data.mapsUri) els.seeAllLink.href = data.mapsUri;

    // Reconstrói o carrossel (setas, dots, autoplay) sobre os novos slides
    if (typeof window.ATInitTestimonialCarousel === 'function') {
      window.ATInitTestimonialCarousel();
    }

    document.dispatchEvent(new CustomEvent('google-reviews:rendered', { detail: data }));
  }

  function renderSummary(data) {
    if (!els.summary) return;
    els.score.textContent = data.rating ? data.rating.toFixed(1).replace('.', ',') : '—';
    els.stars.textContent = starString(Math.round(data.rating || 5));
    els.count.innerHTML = data.userRatingCount
      ? `Baseado em <strong>${data.userRatingCount}</strong> avaliações no Google`
      : 'Avaliações reais de pacientes no Google';
  }

  function renderSlides(reviews, config) {
    if (!els.track) return;

    if (!reviews || !reviews.length) {
      showFallback();
      return;
    }

    els.track.innerHTML = reviews.map((r, i) => slideTemplate(r, i, reviews.length, config)).join('');
    els.track.hidden = false;
    if (els.controls) els.controls.hidden = false;
  }

  function slideTemplate(r, index, total, config) {
    const previewLength = config.textPreviewLength || 220;
    const needsToggle = r.text.length > previewLength;
    const preview = needsToggle ? escapeHtml(r.text.slice(0, previewLength)).trim() + '…' : escapeHtml(r.text);
    const dateLabel = r.relativeTime || r.date;

    const avatar = r.authorPhoto
      ? `<img src="${escapeAttr(r.authorPhoto)}" alt="Foto de ${escapeAttr(r.authorName)}" class="review-card__avatar" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="review-card__avatar review-card__avatar--fallback" aria-hidden="true">${escapeHtml(initials(r.authorName))}</span>`;

    return `
      <article class="testimonial-slide" role="group" aria-label="Depoimento ${index + 1} de ${total}">
        <div class="testimonial-card review-card">
          <div class="review-card__header">
            ${avatar}
            <div class="review-card__identity">
              <span class="testimonial-author__name">${escapeHtml(r.authorName)}</span>
              ${dateLabel ? `<span class="review-card__date">${escapeHtml(dateLabel)}</span>` : ''}
            </div>
            <img src="img/google-logo.svg" alt="Avaliação no Google" class="review-card__google-badge" title="Avaliação verificada no Google">
          </div>

          <div class="stars" aria-label="${r.rating} de 5 estrelas">${starString(r.rating)}</div>

          <p class="review-card__text" data-full="${escapeAttr(r.text)}" data-preview="${escapeAttr(preview)}">${preview || '<em>Sem comentário escrito — apenas avaliação por estrelas.</em>'}</p>

          ${needsToggle ? `<button type="button" class="review-card__toggle js-review-toggle">Ler mais</button>` : ''}
        </div>
      </article>`;
  }

  function starString(rating) {
    const full = Math.max(0, Math.min(5, Math.round(rating || 0)));
    return '★★★★★☆☆☆☆☆'.slice(5 - full, 10 - full);
  }

  function initials(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  /* ---------------------------------------------------------------------
     ESTADOS DE UI (loading / erro)
  --------------------------------------------------------------------- */
  function showSkeleton() { if (els.skeleton) els.skeleton.hidden = false; if (els.count) els.count.textContent = 'Carregando avaliações do Google…'; }
  function hideSkeleton() { if (els.skeleton) els.skeleton.hidden = true; }

  function showFallback() {
    hideSkeleton();
    if (els.track) els.track.hidden = true;
    if (els.controls) els.controls.hidden = true;
    if (els.fallback) els.fallback.hidden = false;
    if (els.count) els.count.textContent = 'Avaliações reais de pacientes no Google';
  }
  function hideFallback() { if (els.fallback) els.fallback.hidden = true; }

  /* ---------------------------------------------------------------------
     "LER MAIS / LER MENOS" — delegação de evento no trilho
  --------------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-review-toggle');
    if (!btn) return;
    const card = btn.closest('.review-card');
    const p = card.querySelector('.review-card__text');
    const expanded = card.classList.toggle('is-expanded');
    p.textContent = expanded ? p.dataset.full : p.dataset.preview;
    btn.textContent = expanded ? 'Ler menos' : 'Ler mais';
  });

})();