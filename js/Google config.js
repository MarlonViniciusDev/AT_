/* =====================================================================
   GOOGLE-REVIEWS-CONFIG.JS
   ----------------------------------------------------------------------
   ÚNICO arquivo que você precisa editar para ligar as avaliações reais
   do Google no site. Não é necessário mexer em nenhum outro arquivo.

   Preencha os dois campos abaixo:

   1) apiKey  → sua chave da Google Maps Platform (API Key).
   2) placeId → o ID do local da AT Odontologia Especializada no Google.

   O passo a passo completo de como obter os dois está no arquivo
   "COMO-CONFIGURAR-GOOGLE-REVIEWS.md", entregue junto com este projeto.
===================================================================== */

window.GOOGLE_REVIEWS_CONFIG = {

  // Cole aqui a sua chave da API do Google Maps Platform.
  // Ela é uma chave "pública" de front-end — deve ser restrita por
  // domínio (HTTP referrer) no Google Cloud Console, nunca por IP.
  apiKey: "SUA_CHAVE_DE_API_AQUI",

  // Cole aqui o Place ID da clínica (não é o link do Google, é um
  // código como "ChIJN1t_tDeuEmsRUsoyG83frY4").
  placeId: "SEU_PLACE_ID_AQUI",

  // Link de fallback: usado no botão "Ver todas as avaliações no
  // Google" e caso a API não consiga carregar as avaliações.
  // Pode ser o link curto que você já usa (share.google/...) ou a URL
  // completa do perfil no Google Maps.
  mapsProfileUrl: "https://share.google/N4qz71SVFqVAFyF7c",

  // Quantidade máxima de avaliações exibidas no carrossel.
  // A API do Google Places retorna no máximo 5 avaliações por local
  // (é uma limitação do próprio Google, não do site) — não é possível
  // configurar um número maior que 5 aqui.
  maxReviews: 5,

  // Nota mínima para uma avaliação ser exibida no carrossel (1 a 5).
  // Use 0 para exibir todas as avaliações retornadas pela API, sem filtro.
  minRating: 0,

  // Por quantas horas o site guarda as avaliações já buscadas no
  // navegador do visitante antes de buscar novamente no Google.
  // Isso deixa o carregamento mais rápido e reduz o consumo da API.
  cacheHours: 12,

  // Número de caracteres do texto da avaliação antes de exibir o
  // botão "Ler mais".
  textPreviewLength: 220,
};