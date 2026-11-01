/* =========================================================
   DIGITAL ZOO — Script principal
   Le contenu se modifie dans js/config.js, pas ici.
   ========================================================= */

(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  };
  const normalize = (str) =>
    String(str ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  /* ---------- Navigation ---------- */
  function initNav() {
    const nav = $("#nav");
    const burger = $("#burger");
    const menu = $("#menu");

    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      document.body.classList.toggle("no-scroll", open);
    };

    burger.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });

    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Lien actif selon la section visible
    const links = [...menu.querySelectorAll("a")];
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));
  }

  /* ---------- Hero ---------- */
  function initHero() {
    const { hero, teamName } = CONFIG;
    const img = $("#hero-img");
    img.src = hero.image;
    img.alt = teamName;
    $("#hero-title").textContent = hero.title || teamName;
    $("#hero-subtitle").textContent = hero.subtitle || CONFIG.tagline;
  }

  /* ---------- Vidéo ---------- */
  function initVideo() {
    const { video } = CONFIG;
    const wrapper = $("#video-wrapper");
    if (video.title) $("#video-title").textContent = video.title;

    const src = (video.src || "").trim();
    if (!src) {
      wrapper.append(el("div", { class: "video__empty", text: "Vidéo à venir" }));
      return;
    }

    const yt = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);

    if (yt || vimeo) {
      wrapper.append(el("iframe", {
        src: yt
          ? `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`
          : `https://player.vimeo.com/video/${vimeo[1]}?dnt=1`,
        title: video.title || "Vidéo",
        loading: "lazy",
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
        allowfullscreen: "",
      }));
    } else {
      const attrs = { src, controls: "", playsinline: "", preload: "metadata" };
      if (video.poster) attrs.poster = video.poster;
      wrapper.append(el("video", attrs));
    }
  }

  /* ---------- Équipe ---------- */
  function initTeam() {
    const team = $("#team");
    CONFIG.members.forEach((m, i) => {
      team.append(el("article", { class: "member reveal" }, [
        el("img", { src: m.image, alt: m.name ? `${m.name} — ${m.animal}` : m.animal, loading: "lazy" }),
        el("span", { class: "member__num", text: String(i + 1).padStart(2, "0") }),
        el("div", { class: "member__info" }, [
          el("span", { class: "member__animal", text: m.animal }),
          m.name ? el("span", { class: "member__name", text: m.name }) : null,
        ]),
      ]));
    });
  }

  /* ---------- Classement (Google Sheets) ---------- */
  const board = {
    rows: [],
    sort: { key: "score", asc: false },
  };

  const memberByName = (name) => CONFIG.members.find((m) => normalize(m.name) === normalize(name));

  const toNumber = (value) => {
    if (typeof value === "number") return value;
    const n = parseFloat(String(value ?? "").replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  function demoRows() {
    // Données fictives tant que le Google Sheet n'est pas configuré
    return CONFIG.members.map((m, i) => ({
      name: m.name,
      score: Math.round(18000 - i * 1350 + ((i * 7919) % 900)),
      shame: (i * 3) % 7,
    }));
  }

  async function fetchSheet() {
    const { sheetId, sheetName } = CONFIG.scoreboard;
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json&headers=1`
      + (sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : "")
      + `&_=${Date.now()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    if (json.status === "error") throw new Error(json.errors?.[0]?.detailed_message || "Sheet inaccessible");

    const cols = json.table.cols.map((c) => normalize(c.label));
    let data = json.table.rows.map((r) => (r.c || []).map((cell) => (cell ? cell.v : null)));

    // Si Google n'a pas détecté la ligne d'en-têtes, on utilise la 1re ligne
    let headers = cols;
    if (cols.every((c) => !c) && data.length) {
      headers = data[0].map(normalize);
      data = data.slice(1);
    }

    const find = (keyword, fallback) => {
      const idx = headers.findIndex((h) => h.includes(keyword));
      return idx === -1 ? fallback : idx;
    };
    const iName = find("nom", find("name", 0));
    const iScore = find("score", 1);
    const iShame = find("shame", 2);

    return data
      .filter((r) => r[iName] != null && String(r[iName]).trim() !== "")
      .map((r) => ({ name: String(r[iName]).trim(), score: toNumber(r[iScore]), shame: toNumber(r[iShame]) }));
  }

  function renderSummary(rows) {
    const summary = $("#board-summary");
    summary.replaceChildren();
    if (!rows.length) return;

    const unit = CONFIG.scoreboard.scoreUnit || "";
    const leader = [...rows].sort((a, b) => b.score - a.score)[0];
    const shameKing = [...rows].sort((a, b) => b.shame - a.shame)[0];
    const total = rows.reduce((sum, r) => sum + r.score, 0);
    const fmt = (n) => n.toLocaleString("fr-FR");

    const card = (label, value, sub) => el("div", { class: "summary" }, [
      el("span", { class: "summary__label", text: label }),
      el("span", { class: "summary__value", text: value }),
      sub ? el("span", { class: "summary__sub", text: sub }) : null,
    ]);

    summary.append(
      card("Total du ZOO", `${fmt(total)} ${unit}`.trim(), `${rows.length} membres`),
      card("Capitaine du ZOO", leader.name, `${fmt(leader.score)} ${unit}`.trim()),
      card("Roi de la honte", shameKing.shame > 0 ? shameKing.name : "Personne 🙏", shameKing.shame > 0 ? `${fmt(shameKing.shame)} shame${shameKing.shame > 1 ? "s" : ""}` : "Aucun shame pour l'instant"),
    );
  }

  function renderBoard() {
    const body = $("#board-body");
    body.replaceChildren();

    if (!board.rows.length) {
      body.append(el("tr", {}, el("td", { class: "board__empty", colspan: "4", text: "Aucune donnée pour le moment." })));
      return;
    }

    // Le rang dépend toujours du score, quel que soit le tri affiché
    const ranked = [...board.rows].sort((a, b) => b.score - a.score);
    const rankOf = new Map(ranked.map((r, i) => [r, i + 1]));
    const maxShame = Math.max(...board.rows.map((r) => r.shame));

    const { key, asc } = board.sort;
    const sorted = [...board.rows].sort((a, b) => {
      const cmp = key === "name" ? a.name.localeCompare(b.name, "fr") : a[key] - b[key];
      return asc ? cmp : -cmp;
    });

    const unit = CONFIG.scoreboard.scoreUnit || "";
    sorted.forEach((row) => {
      const rank = rankOf.get(row);
      const member = memberByName(row.name);
      const classes = [rank <= 3 && "is-podium", rank === 1 && "is-first", maxShame > 0 && row.shame === maxShame && "is-shame-king"].filter(Boolean);

      const avatar = member
        ? el("img", { class: "player__avatar", src: member.image, alt: "", loading: "lazy" })
        : el("span", { class: "player__avatar player__avatar--empty", text: row.name.charAt(0).toUpperCase() });

      const pips = el("span", { class: "shame-pips", "aria-hidden": "true" });
      for (let i = 0; i < Math.min(row.shame, 10); i++) pips.append(el("i"));

      const scoreCell = el("span", { class: "score", text: row.score.toLocaleString("fr-FR") });
      if (unit) scoreCell.append(el("small", { text: unit }));

      body.append(el("tr", { class: classes.join(" ") }, [
        el("td", {}, el("span", { class: "rank", text: String(rank).padStart(2, "0") })),
        el("td", {}, el("div", { class: "player" }, [
          avatar,
          el("div", {}, [
            el("span", { class: "player__name", text: row.name }),
            member ? el("span", { class: "player__animal", text: member.animal }) : null,
          ]),
        ])),
        el("td", { class: "col-num" }, scoreCell),
        el("td", { class: "col-num" }, el("span", { class: "shame" }, [pips, el("span", { class: "shame__count", text: String(row.shame) })])),
      ]));
    });

    document.querySelectorAll("#board th[data-sort]").forEach((th) => {
      const active = th.dataset.sort === key;
      th.classList.toggle("is-sorted", active);
      th.classList.toggle("is-asc", active && asc);
      th.setAttribute("aria-sort", active ? (asc ? "ascending" : "descending") : "none");
    });
  }

  async function loadBoard() {
    const status = $("#board-status");
    const btn = $("#board-refresh");
    status.classList.remove("is-error");

    if (!CONFIG.scoreboard.sheetId) {
      board.rows = demoRows();
      status.textContent = "Données de démo — configure ton Google Sheet";
      renderSummary(board.rows);
      renderBoard();
      return;
    }

    btn.disabled = true;
    status.textContent = "Chargement…";
    try {
      board.rows = await fetchSheet();
      const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      status.textContent = `Mis à jour à ${time}`;
    } catch (err) {
      console.error("[Digital Zoo] Google Sheet :", err);
      status.textContent = "Impossible de charger le Google Sheet (est-il public ?)";
      status.classList.add("is-error");
    } finally {
      btn.disabled = false;
    }
    renderSummary(board.rows);
    renderBoard();
  }

  function initBoard() {
    document.querySelectorAll("#board th[data-sort]").forEach((th) => {
      th.tabIndex = 0;
      const toggle = () => {
        const key = th.dataset.sort;
        board.sort = board.sort.key === key
          ? { key, asc: !board.sort.asc }
          : { key, asc: key === "name" };
        renderBoard();
      };
      th.addEventListener("click", toggle);
      th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });

    $("#board-refresh").addEventListener("click", loadBoard);
    loadBoard();

    const minutes = Number(CONFIG.scoreboard.refreshMinutes);
    if (CONFIG.scoreboard.sheetId && minutes > 0) setInterval(loadBoard, minutes * 60 * 1000);
  }

  /* ---------- Classement Squadeasy (data/leaderboard.json) ---------- */
  const ranking = {
    data: null,
    tab: "teams",
    query: "",
    page: 0,      // page affichée (0 = première)
    pageSize: 50,
    open: new Set(), // équipes dépliées
  };

  const fmtNum = (n) => Number(n).toLocaleString("fr-FR");
  const fmtDate = (iso, opts) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", ...opts });

  function renderRankSummary() {
    const { data, tab } = ranking;
    const summary = $("#rank-summary");
    summary.replaceChildren();

    const card = (label, value, sub) => el("div", { class: "summary" }, [
      el("span", { class: "summary__label", text: label }),
      el("span", { class: "summary__value", text: value }),
      sub ? el("span", { class: "summary__sub", text: sub }) : null,
    ]);

    if (tab === "teams") {
      const us = data.teams.find((t) => t.isUs);
      const leader = data.teams[0];
      summary.append(
        card("Digital Zoo", us ? `#${us.rank}` : "—", us ? `${fmtNum(us.points)} pts · sur ${data.teams.length} équipes` : "Équipe introuvable"),
        card("Équipe en tête", leader.name, `${fmtNum(leader.points)} pts`),
        card("Équipes engagées", fmtNum(data.teams.length), `${fmtNum(data.participants.length)} participants`),
      );
    } else {
      const leader = data.participants[0];
      const bestOfUs = data.participants.find((p) => p.isUs);
      summary.append(
        card("Meilleur du ZOO", bestOfUs ? bestOfUs.name : "—", bestOfUs ? `#${bestOfUs.rank} · ${fmtNum(bestOfUs.points)} pts` : ""),
        card("Leader général", leader.name, `${leader.team} · ${fmtNum(leader.points)} pts`),
        card("Participants", fmtNum(data.participants.length), `${fmtNum(data.teams.length)} équipes`),
      );
    }
  }

  const rankCellFor = (row) => {
    const cell = el("td", {}, el("span", { class: "rank", text: String(row.rank).padStart(2, "0") }));
    if (row.move) cell.append(el("span", { class: `move move--${row.move > 0 ? "up" : "down"}`, text: String(Math.abs(row.move)) }));
    return cell;
  };

  const scoreFor = (points) => {
    const score = el("span", { class: "score", text: fmtNum(points) });
    score.append(el("small", { text: "pts" }));
    return score;
  };

  const avatarFor = (name) =>
    el("span", { class: "player__avatar player__avatar--empty", text: [...name][0]?.toUpperCase() || "?" });

  function teamMembers(teamId) {
    return ranking.data.participants.filter((p) => p.teamId === teamId); // déjà triés par points
  }

  function memberRows(team) {
    const members = teamMembers(team.id);
    if (!members.length) {
      return [el("tr", { class: "team-member" }, el("td", { colspan: "4", class: "board__empty", text: "Aucun membre." }))];
    }
    return members.map((p) => el("tr", { class: "team-member" }, [
      el("td", {}, el("span", { class: "team-member__rank", title: "Rang individuel", text: `#${p.rank}` })),
      el("td", {}, el("div", { class: "player" }, [
        avatarFor(p.name),
        el("span", { class: "player__name", text: p.name }),
      ])),
      el("td", {}),
      el("td", { class: "col-num" }, scoreFor(p.points)),
    ]));
  }

  function toggleTeam(team) {
    if (ranking.open.has(team.id)) ranking.open.delete(team.id);
    else ranking.open.add(team.id);
    renderRankBoard();
  }

  function renderRankBoard() {
    const { data, tab } = ranking;
    const isTeams = tab === "teams";
    const head = $("#rank-head");
    const body = $("#rank-body");

    head.replaceChildren(el("tr", {}, [
      el("th", { class: "col-rank", scope: "col", text: "#" }),
      el("th", { scope: "col", text: isTeams ? "Équipe" : "Participant" }),
      isTeams ? el("th", { class: "col-num", scope: "col", text: "Membres" }) : null,
      el("th", { class: "col-num", scope: "col", text: "Points" }),
    ]));

    const q = normalize(ranking.query);
    const all = isTeams ? data.teams : data.participants;
    const rows = q ? all.filter((r) => normalize(r.name).includes(q) || normalize(r.team).includes(q)) : all;
    const pageCount = Math.max(1, Math.ceil(rows.length / ranking.pageSize));
    ranking.page = Math.min(ranking.page, pageCount - 1);
    const from = ranking.page * ranking.pageSize;
    const visible = rows.slice(from, from + ranking.pageSize);

    body.replaceChildren();
    if (!visible.length) {
      body.append(el("tr", {}, el("td", { class: "board__empty", colspan: isTeams ? "4" : "3", text: "Aucun résultat." })));
    }

    visible.forEach((row) => {
      const open = isTeams && ranking.open.has(row.id);
      const classes = [
        data.started && row.rank <= 3 && "is-podium",
        data.started && row.rank === 1 && "is-first",
        row.isUs && "is-us",
        isTeams && "is-team",
        open && "is-open",
      ].filter(Boolean);

      const nameBlock = el("div", {}, [
        el("span", { class: "player__name", text: row.name }),
        row.isUs && isTeams ? el("span", { class: "badge-us", text: "Nous" }) : null,
        isTeams ? null : el("span", { class: "player__animal", text: row.team }),
      ]);

      const tr = el("tr", { class: classes.join(" ") }, [
        rankCellFor(row),
        el("td", {}, el("div", { class: "player" }, [avatarFor(row.name), nameBlock])),
        isTeams ? el("td", { class: "col-num" }, [String(row.members), el("span", { class: "team-toggle", "aria-hidden": "true", text: open ? "−" : "+" })]) : null,
        el("td", { class: "col-num" }, scoreFor(row.points)),
      ]);

      if (isTeams) {
        tr.tabIndex = 0;
        tr.setAttribute("aria-expanded", String(open));
        tr.setAttribute("aria-label", `${row.name} : ${open ? "masquer" : "voir"} les membres`);
        tr.addEventListener("click", () => toggleTeam(row));
        tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTeam(row); } });
      }

      body.append(tr);
      if (open) body.append(...memberRows(row));
    });

    renderPager(rows.length, pageCount, from, visible.length);
  }

  // Numéros affichés : 1 … 4 5 6 … 18
  function pageNumbers(current, count) {
    const keep = new Set([0, count - 1, current - 1, current, current + 1]);
    const pages = [...keep].filter((p) => p >= 0 && p < count).sort((a, b) => a - b);
    return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? ["…", p] : [p]));
  }

  function goToPage(page) {
    ranking.page = page;
    renderRankBoard();
    $("#rank-board").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderPager(total, pageCount, from, shown) {
    const pager = $("#rank-pager");
    pager.replaceChildren();
    pager.hidden = pageCount <= 1;
    if (pager.hidden) return;

    const btn = (label, page, attrs = {}) => {
      const b = el("button", { class: "pager__btn", type: "button", ...attrs, text: label });
      if (page == null) b.disabled = true;
      else b.addEventListener("click", () => goToPage(page));
      return b;
    };
    const current = ranking.page;

    pager.append(
      el("span", { class: "pager__info", text: `${fmtNum(from + 1)}–${fmtNum(from + shown)} sur ${fmtNum(total)}` }),
      el("div", { class: "pager__pages" }, [
        btn("←", current > 0 ? current - 1 : null, { "aria-label": "Page précédente" }),
        ...pageNumbers(current, pageCount).map((p) => p === "…"
          ? el("span", { class: "pager__gap", text: "…" })
          : btn(String(p + 1), p === current ? null : p, p === current ? { class: "pager__btn is-current", "aria-current": "page" } : { "aria-label": `Page ${p + 1}` })),
        btn("→", current < pageCount - 1 ? current + 1 : null, { "aria-label": "Page suivante" }),
      ]),
    );
  }

  function renderRanking() {
    if (!ranking.data) return;
    renderRankSummary();
    renderRankBoard();
  }

  async function loadRanking() {
    const status = $("#rank-status");
    const notice = $("#rank-notice");
    try {
      const res = await fetch(`${CONFIG.ranking.file}?_=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ranking.data = await res.json();
    } catch (err) {
      console.error("[Digital Zoo] Classement :", err);
      status.textContent = "Classement indisponible pour le moment";
      status.classList.add("is-error");
      return;
    }

    const { data } = ranking;
    status.textContent = `Données du ${fmtDate(data.updatedAt, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · mis à jour 1×/jour`;
    $("#stat-teams").textContent = fmtNum(data.teams.length);

    if (!data.started) {
      const start = data.season.start
        ? fmtDate(data.season.start, { weekday: "long", day: "numeric", month: "long" })
        : "bientôt";
      notice.replaceChildren(
        el("strong", { text: `Le défi commence le ${start}` }),
        document.createTextNode("Aucun point pour l'instant : le classement se remplira dès les premières activités."),
      );
      notice.hidden = false;
    }
    renderRanking();
  }

  function initRanking() {
    ranking.pageSize = Number(CONFIG.ranking.pageSize) || 50;

    document.querySelectorAll(".tabs__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        ranking.tab = btn.dataset.tab;
        ranking.page = 0;
        document.querySelectorAll(".tabs__btn").forEach((b) => {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-selected", String(active));
        });
        renderRanking();
      });
    });

    $("#rank-search").addEventListener("input", (e) => {
      ranking.query = e.target.value;
      ranking.page = 0;
      renderRanking();
    });

    loadRanking();
  }

  /* ---------- Galerie + lightbox ---------- */
  function initGallery() {
    const gallery = $("#gallery");
    const items = CONFIG.gallery.filter((g) => g && g.src);
    const lb = $("#lightbox");
    const lbImg = $("#lb-img");
    const lbCaption = $("#lb-caption");
    let current = 0;
    let lastFocus = null;

    const show = (index) => {
      current = (index + items.length) % items.length;
      const item = items[current];
      lbImg.src = item.src;
      lbImg.alt = item.caption || `Photo ${current + 1}`;
      lbCaption.textContent = item.caption || "";
    };
    const open = (index) => {
      lastFocus = document.activeElement;
      show(index);
      lb.hidden = false;
      document.body.classList.add("no-scroll");
      $("#lb-close").focus();
    };
    const close = () => {
      lb.hidden = true;
      document.body.classList.remove("no-scroll");
      if (lastFocus) lastFocus.focus();
    };

    items.forEach((item, i) => {
      const btn = el("button", { class: "gallery__item reveal", type: "button", "aria-label": item.caption || `Ouvrir la photo ${i + 1}` }, [
        el("img", { src: item.src, alt: item.caption || `Photo ${i + 1}`, loading: "lazy" }),
        item.caption ? el("span", { class: "gallery__caption", text: item.caption }) : null,
      ]);
      btn.addEventListener("click", () => open(i));
      gallery.append(btn);
    });

    $("#lb-close").addEventListener("click", close);
    $("#lb-prev").addEventListener("click", () => show(current - 1));
    $("#lb-next").addEventListener("click", () => show(current + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });

    // Swipe mobile
    let startX = null;
    lb.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Contact (EmailJS) ---------- */
  function initContact() {
    const form = $("#contact-form");
    const feedback = $("#contact-feedback");
    const submit = $("#contact-submit");
    const { publicKey, serviceId, templateId } = CONFIG.emailjs;
    const configured = publicKey && serviceId && templateId && window.emailjs;

    if (configured) emailjs.init({ publicKey });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      let valid = true;
      form.querySelectorAll(".field input, .field textarea").forEach((field) => {
        const ok = field.checkValidity() && field.value.trim() !== "";
        field.closest(".field").classList.toggle("is-invalid", !ok);
        if (!ok) valid = false;
      });
      if (!valid) {
        feedback.textContent = "Merci de remplir correctement tous les champs.";
        return;
      }

      if (!configured) {
        feedback.textContent = "Formulaire pas encore configuré (clés EmailJS manquantes dans js/config.js).";
        return;
      }

      form.elements.time.value = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" });
      submit.disabled = true;
      submit.textContent = "Envoi…";
      feedback.textContent = "";
      try {
        await emailjs.sendForm(serviceId, templateId, form);
        form.reset();
        feedback.textContent = "Message envoyé. La meute te répond vite !";
      } catch (err) {
        console.error("[Digital Zoo] EmailJS :", err);
        feedback.textContent = "Oups, l'envoi a échoué. Réessaie dans un instant.";
      } finally {
        submit.disabled = false;
        submit.textContent = "Envoyer";
      }
    });

    form.addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("is-invalid"));
  }

  /* ---------- Footer ---------- */
  function initFooter() {
    $("#year").textContent = new Date().getFullYear();
    const links = $("#footer-links");
    const labels = { instagram: "Instagram", linkedin: "LinkedIn", squadeasy: "Squadeasy" };
    Object.entries(CONFIG.links || {}).forEach(([key, href]) => {
      if (href) links.append(el("a", { href, target: "_blank", rel: "noopener", text: labels[key] || key }));
    });
  }

  /* ---------- Apparition au scroll ---------- */
  function initReveal() {
    document.querySelectorAll(".section__head, .video, .table-wrap, .board__summary, .tabs, .form").forEach((n) => n.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((n) => io.observe(n));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initHero();
    initVideo();
    initTeam();
    initRanking();
    initBoard();
    initGallery();
    initContact();
    initFooter();
    initReveal();
  });
})();
