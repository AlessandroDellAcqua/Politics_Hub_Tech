// Politics Hub APS — rendering dei contenuti dinamici (data/events.json, data/articles.json)
// Le pagine pubblicano solo dei contenitori vuoti; questo script li riempie.
(function () {
  var LANG = (document.documentElement.lang || 'it').slice(0, 2);
  var LOCALE = { it: 'it-IT', en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', zh: 'zh-CN' }[LANG] || 'it-IT';
  var T = {
    it: {
      noEvent: 'Al momento non c’è nessun evento in programma.',
      nextExpected: 'Prossimo evento previsto: ',
      stayTuned: 'Iscriviti alla newsletter o seguici sui social per non perdertelo.',
      register: 'Iscriviti all’evento',
      details: 'Dettagli',
      when: 'Quando', where: 'Dove', places: 'Posti disponibili',
      read: 'Leggi l’articolo', readExt: 'Leggi l’articolo (sito precedente)',
      minRead: 'min di lettura',
      latestEmpty: 'Nessun articolo pubblicato per ora.',
      notFound: 'Articolo non trovato.', backTo: 'Torna a Il Poligono',
      loadErr: 'Contenuti non disponibili in anteprima locale: apri il sito pubblicato per vederli.'
    },
    en: {
      noEvent: 'There is no event scheduled at the moment.',
      nextExpected: 'Next event expected: ',
      stayTuned: 'Subscribe to the newsletter or follow us on social media so you don’t miss it.',
      register: 'Register for the event',
      details: 'Details',
      when: 'When', where: 'Where', places: 'Places available',
      read: 'Read the article', readExt: 'Read the article (previous site, in Italian)',
      minRead: 'min read',
      latestEmpty: 'No articles published yet.',
      notFound: 'Article not found.', backTo: 'Back to Il Poligono',
      loadErr: 'Content not available in local preview: open the published site to see it.'
    },
    fr: {
      noEvent: 'Aucun événement n’est prévu pour le moment.',
      nextExpected: 'Prochain événement prévu : ',
      stayTuned: 'Abonnez-vous à la newsletter ou suivez-nous sur les réseaux sociaux pour ne pas le manquer.',
      register: 'S’inscrire à l’événement',
      details: 'Détails',
      when: 'Quand', where: 'Où', places: 'Places disponibles',
      read: 'Lire l’article', readExt: 'Lire l’article (ancien site, en italien)',
      minRead: 'min de lecture',
      latestEmpty: 'Aucun article publié pour le moment.',
      notFound: 'Article introuvable.', backTo: 'Retour à Il Poligono',
      loadErr: 'Contenu indisponible en aperçu local : ouvrez le site publié pour le voir.'
    },
    es: {
      noEvent: 'Por el momento no hay ningún evento programado.',
      nextExpected: 'Próximo evento previsto: ',
      stayTuned: 'Suscríbete a la newsletter o síguenos en redes sociales para no perdértelo.',
      register: 'Inscríbete al evento',
      details: 'Detalles',
      when: 'Cuándo', where: 'Dónde', places: 'Plazas disponibles',
      read: 'Leer el artículo', readExt: 'Leer el artículo (sitio anterior, en italiano)',
      minRead: 'min de lectura',
      latestEmpty: 'Todavía no hay artículos publicados.',
      notFound: 'Artículo no encontrado.', backTo: 'Volver a Il Poligono',
      loadErr: 'Contenido no disponible en la vista previa local: abre el sitio publicado para verlo.'
    },
    de: {
      noEvent: 'Derzeit ist keine Veranstaltung geplant.',
      nextExpected: 'Nächste Veranstaltung voraussichtlich: ',
      stayTuned: 'Abonniere den Newsletter oder folge uns in den sozialen Medien, um nichts zu verpassen.',
      register: 'Zur Veranstaltung anmelden',
      details: 'Details',
      when: 'Wann', where: 'Wo', places: 'Verfügbare Plätze',
      read: 'Artikel lesen', readExt: 'Artikel lesen (frühere Website, auf Italienisch)',
      minRead: 'Min. Lesezeit',
      latestEmpty: 'Noch keine Artikel veröffentlicht.',
      notFound: 'Artikel nicht gefunden.', backTo: 'Zurück zu Il Poligono',
      loadErr: 'Inhalte in der lokalen Vorschau nicht verfügbar: Öffne die veröffentlichte Website.'
    },
    zh: {
      noEvent: '目前暂无活动安排。',
      nextExpected: '下一场活动预计于：',
      stayTuned: '订阅我们的新闻通讯或关注我们的社交媒体，不要错过。',
      register: '报名参加活动',
      details: '详情',
      when: '时间', where: '地点', places: '剩余名额',
      read: '阅读文章', readExt: '阅读文章（旧网站，意大利语）',
      minRead: '分钟阅读',
      latestEmpty: '暂无已发布的文章。',
      notFound: '未找到该文章。', backTo: '返回 Il Poligono',
      loadErr: '本地预览无法加载内容：请打开已发布的网站查看。'
    }
  }[LANG] || {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pick(obj, base) { // campo localizzato; per le altre lingue ripiega su EN, poi IT
    return obj[base + '_' + LANG] || (LANG !== 'it' && obj[base + '_en']) || obj[base + '_it'] || '';
  }
  function imgUrl(u) {
    if (!u) return '';
    return /^https?:/.test(u) ? u : '../' + u.replace(/^\.?\//, '');
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length < 3) return iso;
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  function fmtMonth(ym) {
    if (!ym) return '';
    var p = ym.split('-');
    if (p.length < 2) return ym;
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, 1));
    return d.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  function getJSON(path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  /* ---------------- Prossimo evento (pagina eventi) ---------------- */
  var evBox = document.getElementById('ph-next-event');
  if (evBox) {
    getJSON('../data/events.json').then(function (d) {
      if (d.status === 'scheduled' && d.event) {
        var e = d.event, lay = e.layout || 'standard';
        var img = imgUrl(e.image);
        var metas = '';
        if (e.date) metas += '<span class="ev-pill">📅 ' + esc(fmtDate(e.date)) + (e.time ? ' · ' + esc(e.time) : '') + '</span>';
        if (e.location) metas += '<span class="ev-pill">📍 ' + esc(e.location) + '</span>';
        if (e.max_places) metas += '<span class="ev-pill">👥 ' + esc(e.max_places) + ' ' + esc(T.places).toLowerCase() + '</span>';
        var regHref = e.registration_url
          || ((window.PH_CONFIG && window.PH_CONFIG.FORMS_ENDPOINT) ? 'iscrizione.html' : '');
        var extAttr = e.registration_url ? ' target="_blank" rel="noopener"' : '';
        var btn = regHref
          ? '<a class="btn btn-primary" href="' + esc(regHref) + '"' + extAttr + '>' + esc(T.register) + '</a>' : '';
        var body =
          '<div class="ev-body">' +
            '<span class="meta">' + esc(pick(e, 'kicker') || 'Politics Hub') + '</span>' +
            '<h3>' + esc(pick(e, 'title')) + '</h3>' +
            '<div class="ev-meta">' + metas + '</div>' +
            '<p>' + esc(pick(e, 'description')) + '</p>' +
            (btn ? '<div class="mt-2">' + btn + '</div>' : '') +
          '</div>';
        if (lay === 'text' || !img) {
          evBox.innerHTML = '<div class="event-panel layout-text">' + body + '</div>';
        } else if (lay === 'hero') {
          evBox.innerHTML =
            '<div class="event-panel layout-hero">' +
              '<div class="ev-img"><img src="' + esc(img) + '" alt="' + esc(pick(e, 'title')) + '"></div>' + body +
            '</div>';
        } else {
          evBox.innerHTML =
            '<div class="event-panel layout-standard">' +
              '<div class="ev-img"><img src="' + esc(img) + '" alt="' + esc(pick(e, 'title')) + '"></div>' + body +
            '</div>';
        }
      } else {
        var next = d.nextEventMonth
          ? '<p class="ev-next">' + esc(T.nextExpected) + '<b>' + esc(fmtMonth(d.nextEventMonth)) + '</b></p>' : '';
        evBox.innerHTML =
          '<div class="event-empty">' +
            '<h3>' + esc(T.noEvent) + '</h3>' + next +
            '<p class="ev-hint">' + esc(T.stayTuned) + '</p>' +
          '</div>';
      }
    }).catch(function () {
      evBox.innerHTML = '<div class="event-empty"><p class="ev-hint">' + esc(T.loadErr) + '</p></div>';
    });
  }

  /* ---------------- Il Poligono: ultimo articolo + archivio ---------------- */
  var latestBox = document.getElementById('ph-latest-article');
  var archiveBox = document.getElementById('ph-article-archive');
  if (latestBox || archiveBox) {
    getJSON('../data/articles.json').then(function (d) {
      var arts = d.articles || [];
      function linkFor(a) {
        return a.external_url ? esc(a.external_url) : 'articolo.html?id=' + encodeURIComponent(a.id);
      }
      function linkAttrs(a) { return a.external_url ? ' target="_blank" rel="noopener"' : ''; }
      function readLabel(a) { return a.external_url ? T.readExt : T.read; }

      if (latestBox) {
        if (!arts.length) {
          latestBox.innerHTML = '<div class="event-empty"><p class="ev-hint">' + esc(T.latestEmpty) + '</p></div>';
        } else {
          var a = arts[0], img = imgUrl(a.image);
          latestBox.innerHTML =
            '<div class="featured-article' + (a.layout === 'cover' ? ' cover' : '') + '">' +
              (img ? '<div class="fa-img"><img src="' + esc(img) + '" alt="' + esc(pick(a, 'title')) + '"></div>' : '') +
              '<div class="fa-body">' +
                '<span class="meta">' + esc(fmtDate(a.date)) + (a.reading_min ? ' — ' + a.reading_min + ' ' + esc(T.minRead) : '') + '</span>' +
                '<h3>' + esc(pick(a, 'title')) + '</h3>' +
                '<p>' + esc(pick(a, 'excerpt')) + '</p>' +
                '<a class="btn btn-primary" href="' + linkFor(a) + '"' + linkAttrs(a) + '>' + esc(readLabel(a)) + '</a>' +
              '</div>' +
            '</div>';
        }
      }
      if (archiveBox) {
        var rest = arts.slice(1);
        archiveBox.innerHTML = rest.map(function (a) {
          var img = imgUrl(a.image);
          return '<div class="card">' +
            (img ? '<img class="thumb" loading="lazy" src="' + esc(img) + '" alt="' + esc(pick(a, 'title')) + '">' : '') +
            '<div class="body">' +
              '<span class="meta">' + esc(fmtDate(a.date)) + (a.reading_min ? ' — ' + a.reading_min + ' ' + esc(T.minRead) : '') + '</span>' +
              '<h3>' + esc(pick(a, 'title')) + '</h3>' +
              '<p>' + esc(pick(a, 'excerpt')) + '</p>' +
              '<a class="link' + (a.external_url ? ' ext' : '') + '" href="' + linkFor(a) + '"' + linkAttrs(a) + '>' + esc(readLabel(a)) + '</a>' +
            '</div></div>';
        }).join('');
      }
    }).catch(function () {
      if (latestBox) latestBox.innerHTML = '<div class="event-empty"><p class="ev-hint">' + esc(T.loadErr) + '</p></div>';
    });
  }

  /* ---------------- Pagina articolo (articolo.html?id=...) ---------------- */
  var artTitle = document.getElementById('ph-article-title');
  var artBody = document.getElementById('ph-article-body');
  if (artTitle && artBody) {
    var id = new URLSearchParams(location.search).get('id');
    getJSON('../data/articles.json').then(function (d) {
      var a = (d.articles || []).find(function (x) { return x.id === id; });
      if (!a) {
        artBody.innerHTML = '<p>' + esc(T.notFound) + '</p><p><a class="btn btn-outline" href="il-poligono.html">' + esc(T.backTo) + '</a></p>';
        return;
      }
      if (a.external_url) { location.replace(a.external_url); return; }
      artTitle.textContent = pick(a, 'title');
      document.title = pick(a, 'title') + ' | Il Poligono | Politics Hub';
      var meta = document.getElementById('ph-article-meta');
      if (meta) meta.textContent = fmtDate(a.date) + (a.reading_min ? ' — ' + a.reading_min + ' ' + T.minRead : '');
      var img = imgUrl(a.image);
      var paras = String(pick(a, 'body') || pick(a, 'excerpt')).split(/\n\s*\n/).map(function (p) {
        return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>';
      }).join('');
      artBody.innerHTML =
        (img ? '<img class="article-cover" src="' + esc(img) + '" alt="' + esc(pick(a, 'title')) + '">' : '') +
        paras +
        '<p class="mt-3"><a class="btn btn-outline" href="il-poligono.html">' + esc(T.backTo) + '</a></p>';
    }).catch(function () {
      artBody.innerHTML = '<p>' + esc(T.loadErr) + '</p>';
    });
  }
})();
