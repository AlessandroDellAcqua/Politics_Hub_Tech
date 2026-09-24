#!/usr/bin/env python3
"""
Politics Hub APS — assemblatore del sito statico (multilingua).

Legge i frammenti di contenuto da _src/content/<lingua>/*.html,
li avvolge nel guscio comune (header, nav, footer) e scrive le
pagine finali in ../<lingua>/. Genera anche sitemap.xml e
docs/wix-images.txt (elenco immagini ancora ospitate su Wix).

Lingue: it (principale), en, fr, es, de, zh (cinese semplificato).
Per aggiungere una lingua: aggiungila a LANGS / LANG_NAMES, completa
i dizionari di traduzione qui sotto e crea _src/content/<lingua>/.

Uso:  python3 build.py
"""

import os, re, sys, html, hashlib

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)          # cartella "website"
SITE = "https://www.politicshub.it"

LANGS = ["it", "en", "fr", "es", "de", "zh"]
LANG_NAMES = {"it": "Italiano", "en": "English", "fr": "Français",
              "es": "Español", "de": "Deutsch", "zh": "中文"}
HTML_LANG = {"it": "it", "en": "en", "fr": "fr", "es": "es", "de": "de", "zh": "zh-Hans"}
HREFLANG = {"it": "it", "en": "en", "fr": "fr", "es": "es", "de": "de", "zh": "zh-Hans"}

# New styles and interactions must also reach returning visitors with cached assets.
# Liquid glass is separate so index copy.html keeps its existing shared assets.
ASSET_VERSIONS = {}
for asset in ("assets/css/style.css", "assets/js/main.js", "assets/js/content.js",
              "assets/js/forms.js", "assets/css/liquid-glass.css", "assets/js/liquid-glass.js"):
    with open(os.path.join(ROOT, asset), "rb") as f:
        ASSET_VERSIONS[asset] = hashlib.sha256(f.read()).hexdigest()[:10]

def T(it, en, fr, es, de, zh):
    return {"it": it, "en": en, "fr": fr, "es": es, "de": de, "zh": zh}

# ---------------------------------------------------------------- pagine ---
# slug -> (titolo {lingua}, descrizione {lingua}, nav_key)
PAGES = {
    "index": (
        T("Politics Hub | Giovani", "Politics Hub | Youth", "Politics Hub | Jeunes",
          "Politics Hub | Jóvenes", "Politics Hub | Jugend", "Politics Hub | 青年"),
        T("Politics Hub nasce nel 2019 dalla necessità di ridare valore all'idea di politica, creando spazi di dialogo, lontano da logiche partitiche.",
          "Politics Hub was founded in 2019 out of the need to give value back to the idea of politics, creating spaces for dialogue, far from party logics.",
          "Politics Hub est née en 2019 du besoin de redonner de la valeur à l'idée de politique, en créant des espaces de dialogue loin des logiques partisanes.",
          "Politics Hub nació en 2019 de la necesidad de devolver valor a la idea de política, creando espacios de diálogo lejos de las lógicas partidistas.",
          "Politics Hub wurde 2019 gegründet, um der Idee von Politik wieder Wert zu geben – mit Räumen für den Dialog, fernab von Parteilogik.",
          "Politics Hub 成立于 2019 年，旨在重新赋予“政治”这一理念以价值，创造远离党派逻辑的对话空间。"),
        "home"),
    "chi-siamo": (
        T("Chi siamo", "About us", "Qui sommes-nous", "Quiénes somos", "Über uns", "关于我们"),
        T("Politics Hub nasce dalla necessità di ridare valore all'idea di politica: spazi di dialogo tra giovani, lontano da ogni logica partitica ed elettorale.",
          "Politics Hub was born from the need to give value back to the idea of politics: spaces for dialogue among young people, far from any party or electoral logic.",
          "Politics Hub est née du besoin de redonner de la valeur à l'idée de politique : des espaces de dialogue entre jeunes, loin de toute logique partisane ou électorale.",
          "Politics Hub nace de la necesidad de devolver valor a la idea de política: espacios de diálogo entre jóvenes, lejos de cualquier lógica partidista o electoral.",
          "Politics Hub entstand aus dem Bedürfnis, der Idee von Politik wieder Wert zu geben: Dialogräume für junge Menschen, fernab jeder Partei- oder Wahllogik.",
          "Politics Hub 源于重新赋予政治理念以价值的需要：为青年打造对话空间，远离一切党派与选举逻辑。"),
        "chi-siamo"),
    "parlano-di-noi": (
        T("Parlano di noi", "Press", "Ils parlent de nous", "Prensa", "Presse", "媒体报道"),
        T("Alcuni articoli che raccontano le nostre iniziative ed il nostro percorso.",
          "A selection of articles covering our initiatives and our journey.",
          "Une sélection d'articles consacrés à nos initiatives et à notre parcours.",
          "Una selección de artículos sobre nuestras iniciativas y nuestra trayectoria.",
          "Eine Auswahl von Artikeln über unsere Initiativen und unseren Weg.",
          "报道我们活动与发展历程的部分文章。"),
        "chi-siamo"),
    "photo-gallery": (
        T("Photo Gallery", "Photo Gallery", "Galerie photos", "Galería de fotos", "Fotogalerie", "图片集"),
        T("Qualche immagine dei nostri incontri.", "Some pictures from our events.",
          "Quelques images de nos rencontres.", "Algunas imágenes de nuestros encuentros.",
          "Einige Bilder von unseren Veranstaltungen.", "我们活动的部分照片。"),
        "chi-siamo"),
    "aspiranti-associati": (
        T("Aspiranti Associati", "Join us", "Nous rejoindre", "Únete", "Mitmachen", "加入我们"),
        T("Sei interessato ad entrare a far parte attivamente di Politics Hub? Ecco come fare.",
          "Interested in becoming an active member of Politics Hub? Here is how.",
          "Vous souhaitez devenir membre actif de Politics Hub ? Voici comment faire.",
          "¿Te interesa formar parte activa de Politics Hub? Así puedes hacerlo.",
          "Du möchtest aktives Mitglied von Politics Hub werden? So geht's.",
          "想成为 Politics Hub 的正式成员？请看这里。"),
        "chi-siamo"),
    "statuto": (
        T("Statuto", "Statute", "Statuts", "Estatutos", "Satzung", "章程"),
        T("La nostra \"Costituzione\": regole e organizzazione sono alla base della vita associativa.",
          "Our \"Constitution\": rules and organisation are the foundations of the association's life.",
          "Notre « Constitution » : les règles et l'organisation sont le fondement de la vie associative.",
          "Nuestra «Constitución»: las normas y la organización son la base de la vida asociativa.",
          "Unsere „Verfassung“: Regeln und Organisation bilden die Grundlage des Vereinslebens.",
          "我们的“宪法”：规则与组织是协会运作的基础。"),
        "chi-siamo"),
    "manifesto": (
        T("Manifesto", "Manifesto", "Manifeste", "Manifiesto", "Manifest", "宣言"),
        T("Politics Hub è un'associazione apartitica, senza finalità elettorali e di lucro. Questo è quello in cui crediamo.",
          "Politics Hub is a non-partisan association with no electoral or profit aims. This is what we believe in.",
          "Politics Hub est une association non partisane, sans but électoral ni lucratif. Voici ce en quoi nous croyons.",
          "Politics Hub es una asociación apartidista, sin fines electorales ni de lucro. Esto es en lo que creemos.",
          "Politics Hub ist ein überparteilicher Verein ohne Wahl- oder Gewinnabsichten. Daran glauben wir.",
          "Politics Hub 是一个无党派、不以选举和营利为目的的协会。这是我们的信念。"),
        "chi-siamo"),
    "organigramma": (
        T("Organigramma", "Organisation", "Organigramme", "Organigrama", "Organigramm", "组织架构"),
        T("Come è organizzata Politics Hub APS: organi sociali e aree di lavoro.",
          "How Politics Hub APS is organised: governing bodies and working areas.",
          "L'organisation de Politics Hub APS : organes statutaires et pôles de travail.",
          "Cómo se organiza Politics Hub APS: órganos sociales y áreas de trabajo.",
          "Wie Politics Hub APS organisiert ist: Vereinsorgane und Arbeitsbereiche.",
          "Politics Hub APS 的组织方式：管理机构与工作部门。"),
        "chi-siamo"),
    "consiglio-direttivo": (
        T("Consiglio Direttivo", "Board of Directors", "Conseil d'administration", "Junta Directiva", "Vorstand", "理事会"),
        T("Il Consiglio Direttivo di Politics Hub APS.", "The Board of Directors of Politics Hub APS.",
          "Le conseil d'administration de Politics Hub APS.", "La Junta Directiva de Politics Hub APS.",
          "Der Vorstand von Politics Hub APS.", "Politics Hub APS 理事会。"),
        "chi-siamo"),
    "5x1000": (
        T("5x1000", "5x1000", "5x1000", "5x1000", "5x1000", "5x1000"),
        T("Destina il tuo 5x1000 a Politics Hub APS: codice fiscale 92055080151.",
          "Allocate your 5x1000 to Politics Hub APS: tax code 92055080151.",
          "Attribuez votre 5x1000 à Politics Hub APS : code fiscal 92055080151.",
          "Destina tu 5x1000 a Politics Hub APS: código fiscal 92055080151.",
          "Widmen Sie Ihr 5x1000 Politics Hub APS: Steuernummer 92055080151.",
          "将您的 5x1000 捐给 Politics Hub APS：税号 92055080151。"),
        "chi-siamo"),
    "eventi": (
        T("Eventi", "Events", "Événements", "Eventos", "Veranstaltungen", "活动"),
        T("Pensiamo che lo strumento migliore per il dialogo sia l'incontro con donne e uomini protagonisti sul territorio e a livello internazionale.",
          "We believe the best tool for dialogue is meeting women and men who are protagonists locally and internationally.",
          "Nous pensons que le meilleur outil de dialogue est la rencontre avec des femmes et des hommes qui agissent localement et à l'international.",
          "Creemos que la mejor herramienta para el diálogo es el encuentro con mujeres y hombres protagonistas a nivel local e internacional.",
          "Wir glauben, dass das beste Mittel für den Dialog die Begegnung mit Frauen und Männern ist, die lokal und international Verantwortung tragen.",
          "我们相信，对话的最佳方式是与活跃在本地和国际舞台上的人士面对面交流。"),
        "eventi"),
    "progetti": (
        T("Progetti", "Projects", "Projets", "Proyectos", "Projekte", "项目"),
        T("Tutti i progetti di Politics Hub.", "All Politics Hub projects.", "Tous les projets de Politics Hub.",
          "Todos los proyectos de Politics Hub.", "Alle Projekte von Politics Hub.", "Politics Hub 的全部项目。"),
        "progetti"),
    "caffe-politico": (
        T("Caffè Politico", "Caffè Politico", "Caffè Politico", "Caffè Politico", "Caffè Politico", "政治咖啡馆（Caffè Politico）"),
        T("Spazi informali di dialogo e scambio per giovani, sempre accompagnati da un caffè.",
          "Informal spaces of dialogue and exchange for young people, always accompanied by a coffee.",
          "Des espaces informels de dialogue et d'échange pour les jeunes, toujours autour d'un café.",
          "Espacios informales de diálogo e intercambio para jóvenes, siempre acompañados de un café.",
          "Informelle Räume für Dialog und Austausch unter jungen Menschen – immer mit einem Kaffee.",
          "面向青年的非正式对话与交流空间，总有一杯咖啡相伴。"),
        "progetti"),
    "il-poligono": (
        T("Il Poligono", "Il Poligono", "Il Poligono", "Il Poligono", "Il Poligono", "Il Poligono"),
        T("Il progetto editoriale di Politics Hub: un'etica giornalistica chiara e critica nell'era dell'informazione digitale.",
          "Politics Hub's editorial project: a clear and critical journalistic ethic in the digital information age.",
          "Le projet éditorial de Politics Hub : une éthique journalistique claire et critique à l'ère de l'information numérique.",
          "El proyecto editorial de Politics Hub: una ética periodística clara y crítica en la era de la información digital.",
          "Das redaktionelle Projekt von Politics Hub: klare und kritische journalistische Ethik im digitalen Informationszeitalter.",
          "Politics Hub 的媒体项目：在数字信息时代坚持清晰而批判的新闻伦理。"),
        "progetti"),
    "rigenerazione": (
        T("RiGenerazione", "RiGenerazione", "RiGenerazione", "RiGenerazione", "RiGenerazione", "RiGenerazione"),
        T("RiGenerazione, la rivista di Politics Hub.", "RiGenerazione, the Politics Hub magazine.",
          "RiGenerazione, le magazine de Politics Hub.", "RiGenerazione, la revista de Politics Hub.",
          "RiGenerazione, das Magazin von Politics Hub.", "RiGenerazione，Politics Hub 的杂志。"),
        "progetti"),
    "libro": (
        T("Dove punta la bussola", "Where the Compass Points", "Où pointe la boussole",
          "Hacia dónde apunta la brújula", "Wohin die Kompassnadel zeigt", "罗盘指向何方"),
        T("Un libro per orientarsi nel mondo dell'economia, con il contributo di sei esperti intervistati da Politics Hub.",
          "A book to find one's bearings in the world of economics, with contributions from six experts interviewed by Politics Hub.",
          "Un livre pour s'orienter dans le monde de l'économie, avec la contribution de six experts interviewés par Politics Hub.",
          "Un libro para orientarse en el mundo de la economía, con la contribución de seis expertos entrevistados por Politics Hub.",
          "Ein Buch zur Orientierung in der Welt der Wirtschaft, mit Beiträgen von sechs von Politics Hub interviewten Fachleuten.",
          "一本帮助读者在经济世界中找准方向的书，收录了 Politics Hub 采访的六位专家的观点。"),
        "progetti"),
    "inside-a-firm": (
        T("Inside a Firm", "Inside a Firm", "Inside a Firm", "Inside a Firm", "Inside a Firm", "Inside a Firm"),
        T("Video-interviste a imprenditori di successo, in collaborazione con Confindustria Alto Milanese.",
          "Video interviews with successful entrepreneurs, in partnership with Confindustria Alto Milanese.",
          "Des interviews vidéo d'entrepreneurs à succès, en partenariat avec Confindustria Alto Milanese.",
          "Videoentrevistas a empresarios de éxito, en colaboración con Confindustria Alto Milanese.",
          "Videointerviews mit erfolgreichen Unternehmern, in Zusammenarbeit mit Confindustria Alto Milanese.",
          "与 Confindustria Alto Milanese 合作的成功企业家视频访谈。"),
        "progetti"),
    "politics-talk": (
        T("Politics Talk", "Politics Talk", "Politics Talk", "Politics Talk", "Politics Talk", "Politics Talk"),
        T("Il podcast di Politics Hub: una prospettiva giovane su economia, attualità e società.",
          "The Politics Hub podcast: a young perspective on economics, current affairs and society.",
          "Le podcast de Politics Hub : un regard jeune sur l'économie, l'actualité et la société.",
          "El pódcast de Politics Hub: una mirada joven sobre economía, actualidad y sociedad.",
          "Der Podcast von Politics Hub: ein junger Blick auf Wirtschaft, Aktuelles und Gesellschaft.",
          "Politics Hub 播客：以青年视角看经济、时事与社会。"),
        "progetti"),
    "face-to-face": (
        T("Face to Face", "Face to Face", "Face to Face", "Face to Face", "Face to Face", "Face to Face"),
        T("Temi d'attualità indagati con approfondimenti e interviste a esperti del settore.",
          "Current affairs explored through analysis and interviews with experts.",
          "L'actualité décryptée à travers des analyses et des interviews d'experts.",
          "Temas de actualidad analizados con reportajes y entrevistas a expertos.",
          "Aktuelle Themen, beleuchtet durch Analysen und Interviews mit Fachleuten.",
          "通过深度分析和专家访谈探讨时事议题。"),
        "progetti"),
    "direzione-europa": (
        T("Direzione Europa", "Direction Europe", "Direction Europe", "Dirección Europa", "Richtung Europa", "欧洲方向"),
        T("I giovani guardano all'Europa: iniziative per coinvolgere i giovani europei in politica e società.",
          "Young people look to Europe: initiatives to involve young Europeans in politics and society.",
          "Les jeunes regardent vers l'Europe : des initiatives pour impliquer les jeunes Européens dans la politique et la société.",
          "Los jóvenes miran a Europa: iniciativas para implicar a los jóvenes europeos en la política y la sociedad.",
          "Junge Menschen blicken nach Europa: Initiativen, um junge Europäer für Politik und Gesellschaft zu gewinnen.",
          "青年眼中的欧洲：推动欧洲青年参与政治与社会的倡议。"),
        "direzione-europa"),
    "iscrizione": (
        T("Iscrizione all'evento", "Event registration", "Inscription à l'événement",
          "Inscripción al evento", "Anmeldung zur Veranstaltung", "活动报名"),
        T("Iscriviti al prossimo evento di Politics Hub: fino a 2 partecipanti, biglietti con QR code via email.",
          "Register for the next Politics Hub event: up to 2 participants, QR code tickets by email.",
          "Inscrivez-vous au prochain événement de Politics Hub : jusqu'à 2 participants, billets avec QR code par e-mail.",
          "Inscríbete al próximo evento de Politics Hub: hasta 2 participantes, entradas con código QR por correo electrónico.",
          "Melde dich zur nächsten Veranstaltung von Politics Hub an: bis zu 2 Personen, Tickets mit QR-Code per E-Mail.",
          "报名参加 Politics Hub 的下一场活动：每次最多 2 人，二维码门票将通过电子邮件发送。"),
        "eventi"),
    "articolo": (
        T("Articolo", "Article", "Article", "Artículo", "Artikel", "文章"),
        T("Un articolo de Il Poligono, il progetto editoriale di Politics Hub.",
          "An article from Il Poligono, the editorial project of Politics Hub.",
          "Un article d'Il Poligono, le projet éditorial de Politics Hub.",
          "Un artículo de Il Poligono, el proyecto editorial de Politics Hub.",
          "Ein Artikel von Il Poligono, dem redaktionellen Projekt von Politics Hub.",
          "来自 Politics Hub 媒体项目 Il Poligono 的文章。"),
        "progetti"),
    "contatti": (
        T("Contatti", "Contacts", "Contact", "Contacto", "Kontakt", "联系我们"),
        T("Per rimanere sempre collegati con noi, per non perdersi nessun evento. Continua a seguirci!",
          "Stay connected with us and never miss an event. Keep following us!",
          "Restez en contact avec nous et ne manquez aucun événement. Continuez à nous suivre !",
          "Mantente en contacto con nosotros y no te pierdas ningún evento. ¡Síguenos!",
          "Bleib mit uns in Verbindung und verpasse keine Veranstaltung. Folge uns weiter!",
          "与我们保持联系，不错过任何活动。欢迎持续关注！"),
        "contatti"),
    "cookie-policy": (
        T("Privacy & Cookie Policy", "Privacy & Cookie Policy", "Politique de confidentialité et cookies",
          "Política de privacidad y cookies", "Datenschutz- und Cookie-Richtlinie", "隐私与 Cookie 政策"),
        T("Privacy e cookie policy per i visitatori del sito www.politicshub.it.",
          "Privacy and cookie policy for visitors of www.politicshub.it.",
          "Politique de confidentialité et de cookies pour les visiteurs de www.politicshub.it.",
          "Política de privacidad y cookies para los visitantes de www.politicshub.it.",
          "Datenschutz- und Cookie-Richtlinie für Besucher von www.politicshub.it.",
          "适用于 www.politicshub.it 访问者的隐私与 Cookie 政策。"),
        "legal"),
    "privacy-newsletter": (
        T("Privacy Policy newsletter", "Newsletter Privacy Policy", "Confidentialité — newsletter",
          "Privacidad — newsletter", "Datenschutz — Newsletter", "新闻通讯隐私政策"),
        T("Informativa privacy per gli iscritti alla newsletter di Politics Hub.",
          "Privacy notice for Politics Hub newsletter subscribers.",
          "Information sur la confidentialité pour les abonnés à la newsletter de Politics Hub.",
          "Información de privacidad para los suscriptores de la newsletter de Politics Hub.",
          "Datenschutzhinweise für Abonnenten des Politics-Hub-Newsletters.",
          "适用于 Politics Hub 新闻通讯订阅者的隐私声明。"),
        "legal"),
    "privacy-eventi": (
        T("Privacy Policy eventi", "Events Privacy Policy", "Confidentialité — événements",
          "Privacidad — eventos", "Datenschutz — Veranstaltungen", "活动隐私政策"),
        T("Informativa privacy per la partecipazione agli eventi di Politics Hub APS.",
          "Privacy notice for participation in Politics Hub APS events.",
          "Information sur la confidentialité pour la participation aux événements de Politics Hub APS.",
          "Información de privacidad para la participación en los eventos de Politics Hub APS.",
          "Datenschutzhinweise für die Teilnahme an Veranstaltungen von Politics Hub APS.",
          "适用于参加 Politics Hub APS 活动的隐私声明。"),
        "legal"),
    "privacy-raccolta-dati": (
        T("Privacy Policy raccolta dati", "Data Collection Privacy Policy", "Confidentialité — collecte de données",
          "Privacidad — recogida de datos", "Datenschutz — Datenerhebung", "数据收集隐私政策"),
        T("Informativa privacy per la raccolta dati sul sito www.politicshub.it.",
          "Privacy notice for data collection on www.politicshub.it.",
          "Information sur la confidentialité relative à la collecte de données sur www.politicshub.it.",
          "Información de privacidad sobre la recogida de datos en www.politicshub.it.",
          "Datenschutzhinweise zur Datenerhebung auf www.politicshub.it.",
          "关于 www.politicshub.it 数据收集的隐私声明。"),
        "legal"),
    "privacy-quiz": (
        T("Privacy Policy Quiz", "Quiz Privacy Policy", "Confidentialité — quiz",
          "Privacidad — quiz", "Datenschutz — Quiz", "问答活动隐私政策"),
        T("Informativa privacy per la partecipazione ai quiz di Politics Hub APS.",
          "Privacy notice for participation in Politics Hub APS quizzes.",
          "Information sur la confidentialité pour la participation aux quiz de Politics Hub APS.",
          "Información de privacidad para la participación en los quiz de Politics Hub APS.",
          "Datenschutzhinweise für die Teilnahme an Quizzen von Politics Hub APS.",
          "适用于参加 Politics Hub APS 问答活动的隐私声明。"),
        "legal"),
    "privacy-curriculum-vitae": (
        T("Privacy Policy curriculum vitae", "CV Privacy Policy", "Confidentialité — CV",
          "Privacidad — currículum", "Datenschutz — Lebenslauf", "简历隐私政策"),
        T("Informativa privacy per la presentazione di un curriculum vitae.",
          "Privacy notice for submitting a curriculum vitae.",
          "Information sur la confidentialité pour l'envoi d'un curriculum vitae.",
          "Información de privacidad para el envío de un currículum.",
          "Datenschutzhinweise für die Einreichung eines Lebenslaufs.",
          "适用于提交简历的隐私声明。"),
        "legal"),
}

# ------------------------------------------------------------------- nav ---
NAV = [
    {
        "key": "chi-siamo", "label": T("Chi siamo", "About us", "Qui sommes-nous", "Quiénes somos", "Über uns", "关于我们"),
        "href": "chi-siamo.html",
        "children": [
            ("chi-siamo.html",           T("Chi siamo", "About us", "Qui sommes-nous", "Quiénes somos", "Über uns", "关于我们")),
            ("parlano-di-noi.html",      T("Parlano di noi", "Press", "Ils parlent de nous", "Prensa", "Presse", "媒体报道")),
            ("photo-gallery.html",       T("Photo Gallery", "Photo Gallery", "Galerie photos", "Galería de fotos", "Fotogalerie", "图片集")),
            ("aspiranti-associati.html", T("Aspiranti Associati", "Join us", "Nous rejoindre", "Únete", "Mitmachen", "加入我们")),
            ("statuto.html",             T("Statuto APS", "Statute", "Statuts", "Estatutos", "Satzung", "章程")),
            ("manifesto.html",           T("Manifesto", "Manifesto", "Manifeste", "Manifiesto", "Manifest", "宣言")),
            ("organigramma.html",        T("Organigramma", "Organisation", "Organigramme", "Organigrama", "Organigramm", "组织架构")),
            ("consiglio-direttivo.html", T("Consiglio Direttivo", "Board", "Conseil d'administration", "Junta Directiva", "Vorstand", "理事会")),
            ("5x1000.html",              T("5x1000", "5x1000", "5x1000", "5x1000", "5x1000", "5x1000")),
        ],
    },
    {"key": "eventi", "label": T("Eventi", "Events", "Événements", "Eventos", "Veranstaltungen", "活动"),
     "href": "eventi.html", "children": []},
    {
        "key": "progetti", "label": T("Progetti", "Projects", "Projets", "Proyectos", "Projekte", "项目"),
        "href": "progetti.html",
        "children": [
            ("progetti.html",       T("Tutti i progetti", "All projects", "Tous les projets", "Todos los proyectos", "Alle Projekte", "全部项目")),
            ("caffe-politico.html", T("Caffè Politico", "Caffè Politico", "Caffè Politico", "Caffè Politico", "Caffè Politico", "政治咖啡馆")),
            ("il-poligono.html",    T("Il Poligono", "Il Poligono", "Il Poligono", "Il Poligono", "Il Poligono", "Il Poligono")),
            ("rigenerazione.html",  T("RiGenerazione", "RiGenerazione", "RiGenerazione", "RiGenerazione", "RiGenerazione", "RiGenerazione")),
            ("libro.html",          T("Libro", "Book", "Livre", "Libro", "Buch", "图书")),
            ("inside-a-firm.html",  T("Inside a Firm", "Inside a Firm", "Inside a Firm", "Inside a Firm", "Inside a Firm", "Inside a Firm")),
            ("politics-talk.html",  T("Politics Talk", "Politics Talk", "Politics Talk", "Politics Talk", "Politics Talk", "Politics Talk")),
            ("face-to-face.html",   T("Face to Face", "Face to Face", "Face to Face", "Face to Face", "Face to Face", "Face to Face")),
        ],
    },
    {"key": "direzione-europa", "label": T("Direzione Europa", "Direction Europe", "Direction Europe", "Dirección Europa", "Richtung Europa", "欧洲方向"),
     "href": "direzione-europa.html", "children": []},
    {"key": "contatti", "label": T("Contatti", "Contacts", "Contact", "Contacto", "Kontakt", "联系我们"),
     "href": "contatti.html", "children": []},
]

LEGAL = [
    ("cookie-policy.html",            T("Privacy & Cookie Policy", "Privacy & Cookie Policy", "Confidentialité & cookies", "Privacidad y cookies", "Datenschutz & Cookies", "隐私与 Cookie")),
    ("privacy-newsletter.html",       T("Privacy newsletter", "Newsletter privacy", "Confidentialité newsletter", "Privacidad newsletter", "Datenschutz Newsletter", "新闻通讯隐私")),
    ("privacy-eventi.html",           T("Privacy eventi", "Events privacy", "Confidentialité événements", "Privacidad eventos", "Datenschutz Veranstaltungen", "活动隐私")),
    ("privacy-raccolta-dati.html",    T("Privacy raccolta dati", "Data collection privacy", "Confidentialité collecte de données", "Privacidad recogida de datos", "Datenschutz Datenerhebung", "数据收集隐私")),
    ("privacy-quiz.html",             T("Privacy Quiz", "Quiz privacy", "Confidentialité quiz", "Privacidad quiz", "Datenschutz Quiz", "问答隐私")),
    ("privacy-curriculum-vitae.html", T("Privacy curriculum vitae", "CV privacy", "Confidentialité CV", "Privacidad currículum", "Datenschutz Lebenslauf", "简历隐私")),
]

HEPTAGON = ('<svg viewBox="0 0 190 200" aria-hidden="true"><polygon points="95,20 157.5,50.1 173,117.8 '
            '129.7,172.1 60.3,172.1 17,117.8 32.5,50.1"/></svg>')
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 190 200'%3E"
           "%3Cpolygon points='95,20 157.5,50.1 173,117.8 129.7,172.1 60.3,172.1 17,117.8 32.5,50.1'"
           " fill='%231E6FA8'/%3E%3C/svg%3E")

FOOT_TAGLINE = T(
    "Associazione di Promozione Sociale.<br>Legnano, Milano — Italia.",
    "Social Promotion Association.<br>Legnano, Milan — Italy.",
    "Association de promotion sociale.<br>Legnano, Milan — Italie.",
    "Asociación de Promoción Social.<br>Legnano, Milán — Italia.",
    "Gemeinnütziger Verein (APS).<br>Legnano, Mailand — Italien.",
    "社会促进协会（APS）。<br>意大利 米兰 莱尼亚诺。",
)
FOOT_NAV_TITLE = T("Esplora", "Explore", "Explorer", "Explorar", "Entdecken", "浏览")
FOOT_LEGAL_TITLE = T("Documenti e privacy", "Documents & privacy", "Documents & confidentialité",
                     "Documentos y privacidad", "Dokumente & Datenschutz", "文件与隐私")
FOOT_SUPPORT_TITLE = T("Sostienici", "Support us", "Nous soutenir", "Apóyanos", "Unterstützen", "支持我们")
FOOT_5X_LABEL = T("Il tuo 5×1000", "Your 5×1000", "Votre 5×1000", "Tu 5×1000", "Ihr 5×1000", "您的 5×1000")
FOOT_DONATE = T("Fai una donazione →", "Make a donation →", "Faire un don →", "Haz una donación →", "Jetzt spenden →", "捐款 →")
FOOT_STATUTE = T("Statuto", "Statute", "Statuts", "Estatutos", "Satzung", "章程")
NAV_CTA = T("Associati", "Join us", "Adhérer", "Únete", "Mitmachen", "加入")
SKIP = T("Vai al contenuto", "Skip to content", "Aller au contenu", "Ir al contenido", "Zum Inhalt springen", "跳至正文")
NAV_ARIA = T("Navigazione principale", "Main navigation", "Navigation principale", "Navegación principal", "Hauptnavigation", "主导航")
LANG_ARIA = T("Lingua", "Language", "Langue", "Idioma", "Sprache", "语言")

GLOBE = ('<svg class="globe" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" '
         'stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>')

def lang_menu_html(lang, current_file):
    cur_attr = ' aria-current="true" class="current"'
    opts = "".join(
        f'<li><a href="../{l}/{current_file}" lang="{HTML_LANG[l]}" hreflang="{HREFLANG[l]}"'
        f'{cur_attr if l == lang else ""}>'
        f'<span class="code">{l.upper()}</span>{LANG_NAMES[l]}</a></li>'
        for l in LANGS
    )
    # Un solo pulsante (globo + codice + freccia) apre il menu lingue: main.js gestisce .sub-toggle.
    return (f'<li class="has-sub lang-switch">'
            f'<button class="sub-toggle lang-toggle" type="button" '
            f'aria-label="{LANG_ARIA[lang]}: {LANG_NAMES[lang]}" aria-expanded="false" aria-controls="nav-lang">'
            f'{GLOBE}<b>{lang.upper()}</b><span></span></button>'
            f'<ul class="sub lang-sub" id="nav-lang">{opts}</ul></li>')

def nav_html(lang, active_key, current_file):
    items = []
    for item in NAV:
        act = ' class="active"' if item["key"] == active_key else ""
        if item["children"]:
            subs = "".join(
                f'<li><a href="{href}">{html.escape(lbl[lang])}</a></li>'
                for href, lbl in item["children"]
            )
            items.append(
                f'<li class="has-sub"><a href="{item["href"]}"{act}>{html.escape(item["label"][lang])}</a>'
                f'<button class="sub-toggle" type="button" aria-label="{html.escape(item["label"][lang])} — menu" '
                f'aria-expanded="false" aria-controls="nav-{item["key"]}"><span></span></button>'
                f'<ul class="sub" id="nav-{item["key"]}">{subs}</ul></li>'
            )
        else:
            items.append(f'<li><a href="{item["href"]}"{act}>{html.escape(item["label"][lang])}</a></li>')
    items.append(lang_menu_html(lang, current_file))
    items.append(f'<li><a class="nav-cta" href="aspiranti-associati.html">{NAV_CTA[lang]}</a></li>')
    return f'''<header class="site-header" id="site-header">
  <div class="nav-wrap">
    <a class="brand" href="index.html" aria-label="Politics Hub, home">{HEPTAGON}<span>Politics Hub</span></a>
    <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="site-nav"><span></span><span></span></button>
    <nav class="site-nav" id="site-nav" aria-label="{NAV_ARIA[lang]}"><ul>{"".join(items)}</ul></nav>
  </div>
</header>'''

def footer_html(lang):
    nav_links = "".join(
        f'<li><a href="{i["href"]}">{html.escape(i["label"][lang])}</a></li>' for i in NAV
    )
    legal_links = "".join(
        f'<li><a href="{href}">{html.escape(lbl[lang])}</a></li>' for href, lbl in LEGAL
    )
    return f'''<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="foot-brand">{HEPTAGON.replace("<svg", '<svg style="fill:#5CA9DD"')}<span>Politics Hub</span></div>
        <p>{FOOT_TAGLINE[lang]}<br><a href="mailto:info@politicshub.it">info@politicshub.it</a></p>
        <div class="socials">
          <a href="http://www.facebook.com/politicshub20025" target="_blank" rel="noopener">Facebook</a>
          <a href="http://www.instagram.com/politicshub_" target="_blank" rel="noopener">Instagram</a>
          <a href="https://twitter.com/politicshub_" target="_blank" rel="noopener">X</a>
          <a href="https://www.linkedin.com/company/politicshub" target="_blank" rel="noopener">LinkedIn</a>
          <a href="https://open.spotify.com/show/2ciGOiXGAKmAFYC7s6CdMx" target="_blank" rel="noopener">Spotify</a>
        </div>
      </div>
      <div>
        <h4>{FOOT_NAV_TITLE[lang]}</h4>
        <ul>{nav_links}</ul>
      </div>
      <div>
        <h4>{FOOT_LEGAL_TITLE[lang]}</h4>
        <ul>{legal_links}</ul>
      </div>
      <div>
        <h4>{FOOT_SUPPORT_TITLE[lang]}</h4>
        <div class="five">
          <div class="lab">{FOOT_5X_LABEL[lang]}</div>
          <div class="cf">92055080151</div>
        </div>
        <a href="https://www.paypal.com/donate/?hosted_button_id=9VVC2Y4TDYA3Y" target="_blank" rel="noopener">{FOOT_DONATE[lang]}</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span id="year">2026</span> Politics Hub APS — C.F. 92055080151 — Viale Gorizia 44, Legnano (MI)</span>
      <span><a href="cookie-policy.html">Privacy</a> · <a href="statuto.html">{FOOT_STATUTE[lang]}</a> · <a href="manifesto.html">{PAGES["manifesto"][0][lang]}</a></span>
    </div>
  </div>
</footer>'''

def page_html(lang, slug, body):
    titles, descs, nav_key = PAGES[slug]
    title, desc = titles[lang], descs[lang]
    fname = f"{slug}.html"
    full_title = title if slug == "index" else f"{title} | Politics Hub"
    alternates = "\n".join(
        f'<link rel="alternate" hreflang="{HREFLANG[l]}" href="{SITE}/{l}/{fname}">' for l in LANGS
    )
    return f'''<!DOCTYPE html>
<html lang="{HTML_LANG[lang]}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{SITE}/{lang}/{fname}">
{alternates}
<link rel="alternate" hreflang="x-default" href="{SITE}/it/{fname}">
<meta property="og:site_name" content="Politics Hub">
<meta property="og:title" content="{html.escape(full_title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}/{lang}/{fname}">
<link rel="icon" href="{FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/style.css?v={ASSET_VERSIONS['assets/css/style.css']}">
<link rel="stylesheet" href="../assets/css/liquid-glass.css?v={ASSET_VERSIONS['assets/css/liquid-glass.css']}">
</head>
<body>
<a class="skip-link" href="#main-content">{SKIP[lang]}</a>
{nav_html(lang, nav_key, fname)}
<main id="main-content" tabindex="-1">
{body}
</main>
{footer_html(lang)}
<script src="../assets/js/config.js"></script>
<script src="../assets/js/main.js?v={ASSET_VERSIONS['assets/js/main.js']}"></script>
<script src="../assets/js/liquid-glass.js?v={ASSET_VERSIONS['assets/js/liquid-glass.js']}"></script>
<script src="../assets/js/content.js?v={ASSET_VERSIONS['assets/js/content.js']}"></script>
<script src="../assets/js/forms.js?v={ASSET_VERSIONS['assets/js/forms.js']}"></script>
</body>
</html>'''

def build():
    written, missing = 0, []
    for lang in LANGS:
        src_dir = os.path.join(BASE, "content", lang)
        out_dir = os.path.join(ROOT, lang)
        os.makedirs(out_dir, exist_ok=True)
        for slug in PAGES:
            frag = os.path.join(src_dir, f"{slug}.html")
            if not os.path.exists(frag):
                missing.append(f"{lang}/{slug}.html")
                continue
            with open(frag, encoding="utf-8") as f:
                body = f.read()
            with open(os.path.join(out_dir, f"{slug}.html"), "w", encoding="utf-8") as f:
                f.write(page_html(lang, slug, body))
            written += 1
    for m in missing:
        print(f"[manca] {m} — saltato")
    # sitemap
    urls = []
    for slug in PAGES:
        fname = f"{slug}.html"
        alts = "".join(
            f'<xhtml:link rel="alternate" hreflang="{HREFLANG[l]}" href="{SITE}/{l}/{fname}"/>' for l in LANGS
        )
        for lang in LANGS:
            urls.append(f'  <url><loc>{SITE}/{lang}/{fname}</loc>{alts}</url>')
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(urls) + "\n</urlset>\n")
    # elenco immagini Wix ancora in uso
    imgs = set()
    for lang in LANGS:
        d = os.path.join(ROOT, lang)
        if not os.path.isdir(d):
            continue
        for fn in os.listdir(d):
            if fn.endswith(".html"):
                with open(os.path.join(d, fn), encoding="utf-8") as f:
                    imgs.update(re.findall(r'https://static\.wixstatic\.com/[^\s"\')]+', f.read()))
    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
    with open(os.path.join(ROOT, "docs", "wix-images.txt"), "w", encoding="utf-8") as f:
        f.write("# Immagini ancora ospitate su Wix (static.wixstatic.com).\n"
                "# Scaricarle e sostituirle con copie locali in assets/img/ PRIMA di chiudere l'account Wix.\n\n")
        f.write("\n".join(sorted(imgs)) + "\n")
    print(f"OK: {written} pagine generate ({len(LANGS)} lingue), sitemap.xml e docs/wix-images.txt aggiornati ({len(imgs)} immagini Wix).")

if __name__ == "__main__":
    build()
