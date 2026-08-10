/* =====================================================================
   AT ODONTOLOGIA ESPECIALIZADA — SCRIPT.JS
   JavaScript puro, modular, organizado por responsabilidade.
   Índice:
   1. Preloader
   2. Navbar (scroll state + menu mobile)
   3. Scroll suave para âncoras
   4. Scroll Reveal (IntersectionObserver)
   5. Carrossel de depoimentos
   6. Galeria + Lightbox
   7. Antes e Depois — comparador + lightbox
   8. Botão voltar ao topo
   9. Formulário de contato
   10. Ano dinâmico no rodapé
   11. Equipe — botão "Saiba Mais"
===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initNavbar();
  initSmoothAnchors();
  initScrollReveal();
  initTestimonialCarousel();
  initGallery();
  initBeforeAfter();
  initBackToTop();
  initContactForm();
  initFooterYear();
  initTeamButtons();
});

/* ---------------------------------------------------------------------
   1. PRELOADER
--------------------------------------------------------------------- */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('is-hidden'), 300);
  });

  // Fallback caso o evento "load" demore (ex: iframes pesados)
  setTimeout(() => preloader.classList.add('is-hidden'), 2500);
}

/* ---------------------------------------------------------------------
   2. NAVBAR — estado ao rolar + menu mobile
--------------------------------------------------------------------- */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!navbar) return;

  const SCROLL_THRESHOLD = 40;

  const handleScroll = () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
  };
  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('is-open');
      toggle.classList.toggle('is-active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Fecha o menu ao clicar em um link (mobile)
    menu.querySelectorAll('.navbar__link').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/* ---------------------------------------------------------------------
   3. SCROLL SUAVE PARA ÂNCORAS
   (html { scroll-behavior:smooth } já cobre a maioria dos navegadores;
   aqui garantimos compatibilidade e offset correto para a navbar fixa)
--------------------------------------------------------------------- */
function initSmoothAnchors() {
  const links = document.querySelectorAll('a[href^="#"]');
  const navbarHeight = () => document.getElementById('navbar')?.offsetHeight || 0;

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - navbarHeight() + 1;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ---------------------------------------------------------------------
   4. SCROLL REVEAL — fade in / slide up via IntersectionObserver
--------------------------------------------------------------------- */
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  items.forEach((item) => observer.observe(item));
}

/* ---------------------------------------------------------------------
   5. CARROSSEL DE DEPOIMENTOS
--------------------------------------------------------------------- */
function initTestimonialCarousel() {
  const track = document.getElementById('testimonialTrack');
  const dotsWrap = document.getElementById('testimonialDots');
  const prevBtn = document.getElementById('testimonialPrev');
  const nextBtn = document.getElementById('testimonialNext');
  if (!track || !dotsWrap) return;

  const slides = Array.from(track.children);
  let current = 0;
  let autoplayTimer = null;
  const AUTOPLAY_INTERVAL = 6000;

  // Cria os dots dinamicamente
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.className = 'testimonial-dot';
    dot.setAttribute('aria-label', `Ir para depoimento ${index + 1}`);
    dot.addEventListener('click', () => goTo(index));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function render() {
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
  }

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    render();
    resetAutoplay();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function resetAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
    autoplayTimer = setInterval(next, AUTOPLAY_INTERVAL);
  }

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  // Suporte a swipe (touch) no mobile
  let touchStartX = 0;
  track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (delta > 50) prev();
    else if (delta < -50) next();
  }, { passive: true });

  render();
  resetAutoplay();
}

/* ---------------------------------------------------------------------
   6. GALERIA + LIGHTBOX
--------------------------------------------------------------------- */
function initGallery() {
  const items = document.querySelectorAll('.gallery__item');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeBtn = document.getElementById('lightboxClose');
  if (!items.length || !lightbox || !lightboxImg) return;

  function open(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || 'Imagem da galeria em destaque';
    lightbox.classList.add('is-active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('is-active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const full = item.getAttribute('data-full');
      const img = item.querySelector('img');
      open(full, img?.alt);
    });
  });

  closeBtn?.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox && !lightbox.classList.contains('lightbox--comparison')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}


/* ---------------------------------------------------------------------
   7. ANTES E DEPOIS — COMPARADOR INTERATIVO + LIGHTBOX
--------------------------------------------------------------------- */
function initBeforeAfter() {
  const viewers = document.querySelectorAll('[data-before-after]');
  if (!viewers.length) return;

  viewers.forEach((viewer) => {
    const range = viewer.querySelector('.before-after__range');
    const zoom = viewer.querySelector('.before-after__zoom');
    const beforeImg = viewer.querySelector('.before-after__image--before img');
    const afterImg = viewer.querySelector('.before-after__image--after img');
    if (!range || !beforeImg || !afterImg) return;

    const render = (value) => {
      const position = Math.max(0, Math.min(100, Number(value)));
      viewer.style.setProperty('--position', `${position}%`);
    };

    range.addEventListener('input', () => render(range.value));
    range.addEventListener('pointerdown', () => viewer.classList.add('is-dragging'));
    range.addEventListener('pointerup', () => viewer.classList.remove('is-dragging'));
    range.addEventListener('touchstart', () => viewer.classList.add('is-dragging'), { passive: true });
    range.addEventListener('touchend', () => viewer.classList.remove('is-dragging'), { passive: true });

    // Também permite clicar diretamente no visualizador.
    viewer.addEventListener('pointerdown', (event) => {
      if (event.target === zoom || zoom?.contains(event.target)) return;
      const rect = viewer.getBoundingClientRect();
      const value = ((event.clientX - rect.left) / rect.width) * 100;
      range.value = Math.max(0, Math.min(100, value));
      render(range.value);
      viewer.classList.add('is-dragging');
    });

    viewer.addEventListener('pointermove', (event) => {
      if (!viewer.classList.contains('is-dragging')) return;
      const rect = viewer.getBoundingClientRect();
      const value = ((event.clientX - rect.left) / rect.width) * 100;
      range.value = Math.max(0, Math.min(100, value));
      render(range.value);
    });

    const stopDragging = () => viewer.classList.remove('is-dragging');
    window.addEventListener('pointerup', stopDragging, { passive: true });

    zoom?.addEventListener('click', (event) => {
      event.stopPropagation();
      openBeforeAfterLightbox(beforeImg, afterImg);
    });

    render(range.value);
  });
}

function openBeforeAfterLightbox(beforeImg, afterImg) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  if (!lightbox || !lightboxImg) return;

  // O lightbox existente é reaproveitado para manter o projeto leve.
  const originalBefore = beforeImg.src;
  const originalAfter = afterImg.src;
  const beforeAlt = beforeImg.alt;
  const afterAlt = afterImg.alt;

  lightbox.classList.add('lightbox--comparison');
  lightbox.classList.add('is-active');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  lightboxImg.src = originalAfter;
  lightboxImg.alt = afterAlt;

  const comparison = document.createElement('div');
  comparison.className = 'lightbox__comparison';
  comparison.innerHTML = `
    <div class="lightbox__comparison-after">
      <img src="${originalAfter}" alt="${afterAlt}">
    </div>
    <div class="lightbox__comparison-before">
      <img src="${originalBefore}" alt="${beforeAlt}">
    </div>
    <div class="lightbox__comparison-divider"><span>‹ ›</span></div>
    <input class="lightbox__comparison-range" type="range" min="0" max="100" value="50" aria-label="Comparar imagens ampliadas">
  `;

  lightboxImg.hidden = true;
  lightbox.appendChild(comparison);

  const compBefore = comparison.querySelector('.lightbox__comparison-before');
  const compDivider = comparison.querySelector('.lightbox__comparison-divider');
  const compRange = comparison.querySelector('.lightbox__comparison-range');

  const render = (value) => {
    const pos = `${Math.max(0, Math.min(100, Number(value)))}%`;
    compBefore.style.width = pos;
    compDivider.style.left = pos;
  };

  compRange.addEventListener('input', () => render(compRange.value));
  render(50);

  const close = () => {
    comparison.remove();
    lightboxImg.hidden = false;
    lightbox.classList.remove('lightbox--comparison');
    lightbox.classList.remove('is-active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  lightbox.dataset.comparisonClose = 'true';
  lightbox.dataset.comparisonCloseFn = 'active';
  lightbox.querySelector('#lightboxClose')?.addEventListener('click', close, { once: true });
  comparison.addEventListener('click', (event) => event.stopPropagation());
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox && lightbox.classList.contains('lightbox--comparison')) close();
  }, { once: true });
}


/* ---------------------------------------------------------------------
   8. BOTÃO VOLTAR AO TOPO
--------------------------------------------------------------------- */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  const toggleVisibility = () => {
    btn.classList.toggle('is-visible', window.scrollY > 480);
  };
  toggleVisibility();
  window.addEventListener('scroll', toggleVisibility, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------------------------------------------------------------------
   8. FORMULÁRIO DE CONTATO
   (validação client-side + feedback; sem envio real de backend —
   pronto para ser conectado a um endpoint futuramente)
--------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const feedback = document.getElementById('formFeedback');
  if (!form || !feedback) return;

  // WhatsApp oficial da AT Odontologia
  const WHATSAPP_NUMBER = '5581996688067';

  // Impede a escolha de datas anteriores ao dia atual.
  const dataInput = form.querySelector('#data');
  if (dataInput) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    dataInput.min = `${ano}-${mes}-${dia}`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = form.nome.value.trim();
    const telefone = form.telefone.value.trim();
    const procedimento = form.procedimento.value.trim();
    const data = form.data.value;
    const horario = form.horario.value;
    const observacoes = form.mensagem.value.trim();

    if (!nome || !telefone || !procedimento || !data || !horario) {
      feedback.textContent = 'Por favor, preencha todos os campos obrigatórios.';
      feedback.style.color = '#b3261e';
      return;
    }

    // Converte a data para o formato brasileiro.
    const dataFormatada = data.split('-').reverse().join('/');

    const mensagem = [
      'Olá, AT Odontologia! Gostaria de solicitar um agendamento.',
      '',
      `👤 Nome: ${nome}`,
      `📱 Telefone: ${telefone}`,
      `🦷 Procedimento: ${procedimento}`,
      `📅 Data desejada: ${dataFormatada}`,
      `⏰ Horário desejado: ${horario}`,
      `📝 Observações: ${observacoes || 'Nenhuma'}`,
      '',
      'Aguardo a confirmação do agendamento. Obrigado!'
    ].join('\n');

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`;

    feedback.textContent = 'Abrindo o WhatsApp com os dados do agendamento...';
    feedback.style.color = 'var(--color-rosegold)';

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  });
}

/* ---------------------------------------------------------------------
   9. ANO DINÂMICO NO RODAPÉ
--------------------------------------------------------------------- */
function initFooterYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ---------------------------------------------------------------------
   10. EQUIPE — BOTÃO "SAIBA MAIS"
   (placeholder de interação; pode futuramente abrir um modal com bio
   completa de cada profissional)
--------------------------------------------------------------------- */
function initTeamButtons() {
  const buttons = document.querySelectorAll('.js-team-more');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.team-card');
      const name = card?.querySelector('h3')?.textContent || 'este profissional';
      alert(`Em breve: perfil completo de ${name}. Entre em contato para saber mais sobre sua formação e especialidades.`);
    });
  });
}
