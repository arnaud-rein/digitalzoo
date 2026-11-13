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

  /* ---------- Google Sheet ---------- */
  const toNumber = (value) => {
    if (typeof value === "number") return value;
    const n = parseFloat(String(value ?? "").replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const toTime = (value) => {
    if (value == null || value === "") return 0;
    const gviz = String(value).match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/);
    if (gviz) {
      const [, y, m, d, h = 0, mi = 0, s = 0] = gviz.map(Number);
      return Date.UTC(y, m, d, h, mi, s);
    }
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  };

  // Lit un onglet et renvoie une liste d'objets { en-tête normalisé: valeur }
  async function fetchSheet(sheetName, requiredCol) {
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(CONFIG.ranking.sheetId)}/gviz/tq?tqx=out:json&headers=1`
      + `&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    if (json.status === "error") throw new Error(json.errors?.[0]?.detailed_message || "Sheet inaccessible");

    let headers = json.table.cols.map((c) => normalize(c.label));
    let data = json.table.rows.map((r) => (r.c || []).map((cell) => (cell ? cell.v : null)));

    // Si Google n'a pas détecté la ligne d'en-têtes, on utilise la 1re ligne
    if (headers.every((h) => !h) && data.length) {
      headers = data[0].map(normalize);
      data = data.slice(1);
    }
    // Google renvoie le 1er onglet quand le nom est faux : on vérifie les colonnes
    if (requiredCol && !headers.includes(requiredCol)) throw new Error(`Onglet « ${sheetName} » introuvable`);

    return data.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
  }

  const isUsTeam = (name) => normalize(name).includes(normalize(CONFIG.ranking.usTeam));

  // Photo du membre du ZOO : "name" exact, ou "animal" = début du prénom
  function memberFor(playerName) {
    const full = normalize(playerName);
    const first = full.split(/\s+/)[0];
    return CONFIG.members.find((m) => (m.name && normalize(m.name) === full)
      || (m.animal && first.startsWith(normalize(m.animal)))) || null;
  }

  const byRank = (a, b) => a.rank - b.rank || b.points - a.points;

  function parseTeams(rows) {
    return rows
      .filter((r) => r.nom != null && String(r.nom).trim() !== "")
      .map((r, i) => ({
        id: String(r.equipe_id || r.nom),
        name: String(r.nom).trim(),
        points: toNumber(r.score_officiel) || toNumber(r.score_calcule),
        rank: toNumber(r.rang_officiel) || toNumber(r.rang) || i + 1,
        members: toNumber(r.membres),
        isUs: isUsTeam(r.nom),
        time: toTime(r.maj),
      }))
      .sort(byRank);
  }

  function parsePlayers(rows) {
    return rows
      .filter((r) => r.nom != null && String(r.nom).trim() !== "")
      .map((r, i) => {
        const team = String(r.equipe ?? "").trim();
        const isUs = isUsTeam(team);
        return {
          id: String(r.joueur_id || `${r.nom}|${team}`),
          name: String(r.nom).trim(),
          team,
          points: toNumber(r.score),
          rank: toNumber(r.rang) || i + 1,
          isUs,
          time: toTime(r.maj),
        };
      })
      .sort(byRank);
  }

  /* ---------- Historique des actualisations (localStorage) ----------
     Chaque nouvelle donnée du sheet = un "snapshot". Comparer deux
     snapshots permet de détecter les dépassements et la dynamique.      */
  const STORE = { history: "dz-live-history", events: "dz-live-events" };
  const MAX_HISTORY = 60;
  const MAX_FEED = 40;
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ } },
  };

  const hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };

  function snapshotOf(teams, players) {
    const pick = ({ id, name, rank, points, isUs, team }) => (team === undefined
      ? { id, name, rank, points, isUs }
      : { id, name, rank, points, isUs, team });
    const signature = teams.map((t) => `${t.id}:${t.points}`).join() + "|" + players.map((p) => `${p.id}:${p.points}`).join();
    return {
      key: hash(signature),
      time: Math.max(0, ...teams.map((t) => t.time), ...players.map((p) => p.time)) || Date.now(),
      teams: teams.map(pick),
      players: players.map(pick),
    };
  }

  /* ---------- Classement ---------- */
  const ranking = {
    teams: [],
    players: [],
    snap: null,       // dernier snapshot
    prev: null,       // snapshot précédent (pour les flèches ▲▼)
    history: [],
    teamsTotal: 0,
    loading: false,
    tab: "teams",
    query: "",
    page: 0,
    pageSize: 10,
    open: new Set(),  // équipes dépliées
  };

  const fmtNum = (n) => Math.round(Number(n)).toLocaleString("fr-FR");
  const fmtSigned = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmtNum(Math.abs(n));
  const fmtTime = (t) => new Date(t).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;

  const card = (label, value, sub) => el("div", { class: "summary" }, [
    el("span", { class: "summary__label", text: label }),
    el("span", { class: "summary__value", text: value }),
    sub ? el("span", { class: "summary__sub", text: sub }) : null,
  ]);

  function renderRankSummary() {
    const { teams, players, tab } = ranking;
    const summary = $("#rank-summary");
    summary.replaceChildren();
    if (!teams.length) return;

    const us = teams.find((t) => t.isUs);
    const leader = teams[0];
    const total = ranking.teamsTotal ? ` · sur ${fmtNum(ranking.teamsTotal)} équipes` : "";

    if (tab === "teams") {
      const gap = us && (us.rank === 1
        ? card("Avance du ZOO", `${fmtNum(us.points - (teams[1]?.points ?? us.points))} pts`, teams[1] ? `sur ${teams[1].name}` : "")
        : card("Écart avec le leader", `${fmtNum(leader.points - us.points)} pts`, leader.name));
      summary.append(
        card("Digital Zoo", us ? `#${us.rank}` : "Hors top 10", us ? `${fmtNum(us.points)} pts${total}` : `Top 10${total}`),
        card("Équipe en tête", leader.name, `${fmtNum(leader.points)} pts`),
        gap || card("Équipes engagées", fmtNum(ranking.teamsTotal || teams.length), "au total"),
      );
    } else if (players.length) {
      const zoo = players.filter((p) => p.isUs);
      const best = zoo[0];
      summary.append(
        card("Meilleur du ZOO", best ? best.name : "—", best ? `#${best.rank} · ${fmtNum(best.points)} pts` : "Aucun dans le top 50"),
        card("Leader général", players[0].name, `${players[0].team} · ${fmtNum(players[0].points)} pts`),
        card("Le ZOO dans le top 50", String(zoo.length), `sur ${players.length} joueurs classés`),
      );
    }
  }

  const prevRankOf = (list, id) => list?.find((r) => r.id === id)?.rank;

  const rankCellFor = (row, prevList) => {
    const cell = el("td", {}, el("span", { class: "rank", text: String(row.rank).padStart(2, "0") }));
    const before = prevRankOf(prevList, row.id);
    const move = before ? before - row.rank : 0;
    if (move) cell.append(el("span", { class: `move move--${move > 0 ? "up" : "down"}`, text: String(Math.abs(move)) }));
    return cell;
  };

  const scoreFor = (points) => {
    const score = el("span", { class: "score", text: fmtNum(points) });
    score.append(el("small", { text: "pts" }));
    return score;
  };

  const avatarFor = (name, member) => member
    ? el("img", { class: "player__avatar", src: member.image, alt: "", loading: "lazy" })
    : el("span", { class: "player__avatar player__avatar--empty", text: [...name][0]?.toUpperCase() || "?" });

  const playerMember = (p) => (p.isUs ? memberFor(p.name) : null);

  function memberRows(team) {
    const members = ranking.players.filter((p) => normalize(p.team) === normalize(team.name));
    if (!members.length) {
      return [el("tr", { class: "team-member" }, el("td", { colspan: "4", class: "board__empty", text: "Aucun membre dans le top 50." }))];
    }
    return members.map((p) => el("tr", { class: "team-member" }, [
      el("td", {}, el("span", { class: "team-member__rank", title: "Rang individuel", text: `#${p.rank}` })),
      el("td", {}, el("div", { class: "player" }, [
        avatarFor(p.name, playerMember(p)),
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
    const { tab, prev } = ranking;
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
    const all = isTeams ? ranking.teams : ranking.players;
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
        row.rank <= 3 && "is-podium",
        row.rank === 1 && "is-first",
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
        rankCellFor(row, isTeams ? prev?.teams : prev?.players),
        el("td", {}, el("div", { class: "player" }, [avatarFor(row.name, isTeams ? null : playerMember(row)), nameBlock])),
        isTeams ? el("td", { class: "col-num" }, [String(row.members || "—"), el("span", { class: "team-toggle", "aria-hidden": "true", text: open ? "−" : "+" })]) : null,
        el("td", { class: "col-num" }, scoreFor(row.points)),
      ]);

      if (isTeams) {
        tr.tabIndex = 0;
        tr.setAttribute("aria-expanded", String(open));
        tr.setAttribute("aria-label", `${row.name} : ${open ? "masquer" : "voir"} les membres du top 50`);
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
    if (!ranking.snap) return;
    renderRankSummary();
    renderRankBoard();
  }

  async function loadRanking() {
    if (ranking.loading) return;
    ranking.loading = true;
    const status = $("#rank-status");
    const { teamsSheet, playersSheet } = CONFIG.ranking;

    try {
      const [teamRows, playerRows] = await Promise.all([
        fetchSheet(teamsSheet, "equipe_id"),
        fetchSheet(playersSheet, "joueur_id"),
      ]);
      ranking.teams = parseTeams(teamRows);
      ranking.players = parsePlayers(playerRows);
    } catch (err) {
      console.error("[Digital Zoo] Classement :", err);
      status.textContent = "Classement indisponible pour le moment";
      status.classList.add("is-error");
      live.onError();
      return;
    } finally {
      ranking.loading = false;
    }

    const snap = snapshotOf(ranking.teams, ranking.players);
    const last = ranking.history[ranking.history.length - 1];
    const isNew = !last || last.key !== snap.key;
    if (isNew) {
      ranking.history.push(snap);
      ranking.history = ranking.history.slice(-MAX_HISTORY);
      store.set(STORE.history, ranking.history);
    }
    ranking.snap = snap;
    ranking.prev = ranking.history.length > 1 ? ranking.history[ranking.history.length - 2] : null;

    status.classList.remove("is-error");
    status.textContent = `Données de ${fmtTime(snap.time)} · actualisées toutes les 10 min`;
    renderRanking();
    live.onData(isNew && last ? diffSnapshots(last, snap) : null);
  }

  async function loadTeamsTotal() {
    try {
      const rows = await fetchSheet(CONFIG.ranking.allTeamsSheet, "equipe_id");
      ranking.teamsTotal = rows.filter((r) => r.nom).length;
      $("#stat-teams").textContent = fmtNum(ranking.teamsTotal);
      renderRanking();
    } catch (err) {
      console.warn("[Digital Zoo] Nombre d'équipes :", err);
    }
  }

  function initRanking() {
    ranking.pageSize = Number(CONFIG.ranking.pageSize) || 10;
    ranking.history = store.get(STORE.history, []);

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
    loadTeamsTotal();
  }

  /* ---------- Analyse : ce qui a changé entre deux snapshots ---------- */
  function diffSnapshots(prev, curr) {
    const img = CONFIG.live.images;
    const events = [];
    const before = new Map(prev.teams.map((t) => [t.id, t]));

    // Dépassements entre équipes
    curr.teams.forEach((t) => {
      const old = before.get(t.id);
      if (!old) {
        events.push({
          priority: t.isUs ? 110 : 60, tone: t.isUs ? "up" : "neutral", image: t.isUs ? img.zooUp : img.overtake,
          kicker: "Entrée dans le top 10", title: `${t.name} débarque`, text: `#${t.rank} avec ${fmtNum(t.points)} pts`,
        });
        return;
      }
      if (t.rank === 1 && old.rank !== 1) {
        events.push({
          priority: t.isUs ? 130 : 95, tone: t.isUs ? "up" : "down", image: t.isUs ? img.zooUp : img.leader,
          kicker: "Nouveau leader", title: `${t.name} prend la tête`, text: `${fmtNum(t.points - (curr.teams[1]?.points ?? t.points))} pts d'avance sur ${curr.teams[1]?.name ?? "le reste"}`,
        });
      }
      curr.teams.forEach((o) => {
        const oOld = before.get(o.id);
        if (o === t || !oOld || !(old.rank > oOld.rank && t.rank < o.rank)) return;
        if (t.rank === 1 && o.rank === 2 && old.rank !== 1) return; // déjà raconté par "nouveau leader"
        const us = t.isUs ? "up" : o.isUs ? "down" : "neutral";
        events.push({
          priority: us === "neutral" ? 80 - t.rank : 120,
          tone: us,
          image: us === "up" ? img.zooUp : us === "down" ? img.zooDown : img.overtake,
          kicker: us === "up" ? "Le ZOO attaque" : us === "down" ? "Alerte au ZOO" : "Dépassement",
          title: `${t.name} passe devant ${o.name}`,
          text: `#${old.rank} → #${t.rank} · ${fmtNum(t.points - o.points)} pts d'avance`,
        });
      });
    });

    // Dynamique : la plus grosse progression
    const gains = curr.teams
      .map((t) => ({ t, gain: before.has(t.id) ? t.points - before.get(t.id).points : 0 }))
      .sort((a, b) => b.gain - a.gain);
    if (gains[0]?.gain > 0 && !gains[0].t.isUs) {
      events.push({
        priority: 40, tone: "neutral", image: img.surge,
        kicker: "En feu", title: `${gains[0].t.name} ${fmtSigned(gains[0].gain)} pts`,
        text: "La plus grosse progression depuis la dernière actualisation",
      });
    }

    // Le ZOO : gain et évolution de l'écart avec l'équipe devant / derrière
    const us = curr.teams.find((t) => t.isUs);
    const usOld = us && before.get(us.id);
    if (us && usOld && us.points !== usOld.points) {
      const rival = us.rank === 1 ? curr.teams[1] : curr.teams[us.rank - 2];
      const rivalOld = rival && before.get(rival.id);
      let text = gains[0]?.t === us ? "Meilleure progression du top 10 !" : "";
      if (rival && rivalOld) {
        const gap = Math.abs(rival.points - us.points);
        const gapOld = Math.abs(rivalOld.points - usOld.points);
        const verb = us.rank === 1 ? "Avance sur" : "Écart avec";
        text = `${verb} ${rival.name} : ${fmtNum(gapOld)} → ${fmtNum(gap)} pts. ${text}`.trim();
      }
      const good = us.points - usOld.points >= (rivalOld ? rival.points - rivalOld.points : 0);
      events.push({
        priority: 70, tone: good ? "up" : "down", image: good ? img.zooUp : img.zooDown,
        kicker: good ? "Le ZOO accélère" : "Le ZOO doit réagir", title: `DigitalZoo ${fmtSigned(us.points - usOld.points)} pts`, text,
      });
    }

    // Joueurs : nouveau n°1 et mouvements des joueurs du ZOO
    const pBefore = new Map(prev.players.map((p) => [p.id, p]));
    const top = curr.players[0];
    if (top && prev.players[0] && prev.players[0].id !== top.id) {
      events.push({
        priority: top.isUs ? 115 : 65, tone: top.isUs ? "up" : "neutral",
        image: memberFor(top.name)?.image && top.isUs ? memberFor(top.name).image : img.player,
        kicker: "N°1 individuel", title: `${top.name} prend la 1re place`, text: `${top.team} · ${fmtNum(top.points)} pts`,
      });
    }
    curr.players.filter((p) => p.isUs).forEach((p) => {
      const old = pBefore.get(p.id);
      const photo = memberFor(p.name)?.image || img.player;
      if (!old) {
        events.push({ priority: 90, tone: "up", image: photo, kicker: "Entrée dans le top 50", title: `${p.name} entre dans le top 50`, text: `#${p.rank} · ${fmtNum(p.points)} pts` });
        return;
      }
      if (p.rank === old.rank) return;
      const passed = curr.players.filter((o) => {
        const oOld = pBefore.get(o.id);
        return oOld && o !== p && old.rank > oOld.rank && p.rank < o.rank;
      });
      if (p.rank < old.rank) {
        const names = passed.slice(0, 2).map((o) => o.name).join(" et ");
        events.push({
          priority: 85 - p.rank / 10, tone: "up", image: photo,
          kicker: "Un animal grimpe", title: `${p.name} #${old.rank} → #${p.rank}`,
          text: names ? `Passe devant ${names}${passed.length > 2 ? ` (+${passed.length - 2})` : ""}` : `${fmtNum(p.points)} pts`,
        });
      } else {
        events.push({ priority: 35, tone: "down", image: photo, kicker: "Ça glisse", title: `${p.name} recule à #${p.rank}`, text: `Était #${old.rank} · ${fmtNum(p.points)} pts` });
      }
    });

    return events.sort((a, b) => b.priority - a.priority).slice(0, Number(CONFIG.live.maxEffects) || 6);
  }

  /* ---------- Analyse : insights sur l'état actuel ---------- */
  const fmtDuration = (hours) => {
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
    if (hours < 48) return `${Math.round(hours * 10) / 10} h`.replace(".", ",");
    return `${Math.round(hours / 24)} jours`;
  };

  // Points / heure de chaque entité sur ~1 h d'historique
  function paceMap(snap, history, key) {
    const target = snap.time - 60 * 60 * 1000;
    const base = [...history].reverse().find((s) => s.time <= target)
      || history.find((s) => s.time < snap.time - 5 * 60 * 1000);
    if (!base) return null;
    const hours = (snap.time - base.time) / 3.6e6;
    const old = new Map(base[key].map((r) => [r.id, r.points]));
    return { hours, of: (r) => (old.has(r.id) ? (r.points - old.get(r.id)) / hours : null) };
  }

  const MEDALS = ["Or", "Argent", "Bronze"];
  const hoursLeftAt = (time) => {
    const end = Date.parse(CONFIG.ranking.seasonEnd);
    return Number.isFinite(end) ? Math.max(0, (end - time) / 3.6e6) : Infinity;
  };

  // Évolution d'un écart depuis l'actualisation précédente : "l'écart se réduit / augmente"
  function gapTrend(now, before, shrinkIsGood, since) {
    if (before == null || now === before) return null;
    const d = now - before;
    const good = shrinkIsGood ? d < 0 : d > 0;
    return { status: good ? "good" : "bad", text: `${d < 0 ? "▼ se réduit" : "▲ augmente"} de ${fmtNum(Math.abs(d))} pts depuis ${fmtTime(since)}` };
  }

  /* KPI : la situation du ZOO, chacun avec une phrase simple et un statut coloré */
  function buildKpis(snap, prev, history) {
    const { teams, players } = snap;
    if (!teams.length) return [];
    const us = teams.find((t) => t.isUs);
    const total = ranking.teamsTotal || 0;
    const out = [];

    if (!us) {
      const last = teams[teams.length - 1];
      out.push({ icon: "🏁", label: "Classement du ZOO", value: "Hors top 10", status: "bad", chip: "À aller chercher", text: `Le 10e, ${last.name}, a ${fmtNum(last.points)} pts` });
    } else {
      const pct = total ? Math.max(1, Math.ceil((us.rank / total) * 100)) : null;
      out.push({
        icon: us.rank <= 3 ? ["🥇", "🥈", "🥉"][us.rank - 1] : "🏁",
        label: "Classement du ZOO",
        value: `${us.rank}${us.rank === 1 ? "er" : "e"}`,
        unit: total ? `/ ${fmtNum(total)}` : "",
        status: us.rank === 1 ? "gold" : us.rank <= 3 ? "good" : "neutral",
        chip: us.rank <= 3 ? `Podium · ${MEDALS[us.rank - 1]}` : "Top 10",
        text: pct ? `Le ZOO fait partie du top ${pct} % des équipes` : "Classement officiel Squadeasy",
        hero: true,
      });

      const prevTeams = new Map((prev?.teams || []).map((t) => [t.id, t]));
      const pts = (t, list) => list.get(t.id)?.points;
      const usBefore = prevTeams.get(us.id);

      if (us.rank > 1) {
        const leader = teams[0];
        const gap = leader.points - us.points;
        const before = usBefore && prevTeams.has(leader.id) ? pts(leader, prevTeams) - usBefore.points : null;
        const trend = gapTrend(gap, before, true, prev?.time);
        out.push({ icon: "🎯", label: "Retard sur le 1er", value: fmtNum(gap), unit: "pts", status: trend?.status || "neutral", chip: trend?.text, text: `C'est ce qu'il manque pour rattraper ${leader.name}` });
      }
      const chaser = teams[us.rank]; // l'équipe juste derrière
      if (chaser) {
        const gap = us.points - chaser.points;
        const before = usBefore && prevTeams.has(chaser.id) ? usBefore.points - pts(chaser, prevTeams) : null;
        const trend = gapTrend(gap, before, false, prev?.time);
        out.push({ icon: "🛡️", label: `Avance sur le ${us.rank + 1}e`, value: fmtNum(gap), unit: "pts", status: trend?.status || "neutral", chip: trend?.text, text: `${chaser.name} est juste derrière nous` });
      }

      // Rythme (points par heure) et projection
      const pace = paceMap(snap, history, "teams");
      const usPace = pace?.of(us);
      const rival = us.rank === 1 ? teams[1] : teams[us.rank - 2];
      const rivalPace = rival && pace?.of(rival);
      if (usPace != null && rivalPace != null) {
        const faster = usPace >= rivalPace;
        out.push({
          icon: "⚡", label: `Rythme (sur ${fmtDuration(pace.hours)})`, value: `+${fmtNum(usPace)}`, unit: "pts/h",
          status: faster ? "good" : "bad",
          chip: faster ? `Plus rapide que ${rival.name}` : `Plus lent que ${rival.name}`,
          text: `${rival.name} avance à +${fmtNum(rivalPace)} pts/h`,
        });
      } else {
        out.push({ icon: "⚡", label: "Rythme", value: "…", unit: "pts/h", status: "neutral", chip: "Bientôt", text: "Calculé dès la prochaine actualisation (garde la page ouverte)" });
      }

      const hoursLeft = hoursLeftAt(snap.time);
      if (rival && Number.isFinite(hoursLeft) && hoursLeft > 0) {
        const gap = Math.abs(rival.points - us.points);
        const need = gap / hoursLeft; // pts/h à prendre en plus que le rival
        const rel = usPace != null && rivalPace != null ? usPace - rivalPace : null;
        if (us.rank === 1) {
          const safe = rel == null ? null : rel >= 0 || gap / -rel > hoursLeft;
          out.push({
            icon: "👑", label: "Rester 1er jusqu'au bout", value: fmtNum(need), unit: "pts/h",
            status: safe == null ? "neutral" : safe ? "good" : "bad",
            chip: safe == null ? "" : safe ? "À ce rythme, on gagne" : `Rattrapés dans ~${fmtDuration(gap / -rel)}`,
            text: `${rival.name} doit prendre ${fmtNum(need)} pts/h de plus que nous pour passer devant`,
          });
        } else {
          const ok = rel == null ? null : rel > need;
          out.push({
            icon: "🚀", label: `Objectif : passer ${us.rank - 1 === 1 ? "1er" : `${us.rank - 1}e`}`, value: `+${fmtNum(need)}`, unit: "pts/h",
            status: ok == null ? "neutral" : ok ? "good" : "warn",
            chip: ok == null ? "" : ok ? `Devant dans ~${fmtDuration(gap / rel)}` : "Il faut accélérer",
            text: `À prendre chaque heure en plus de ${rival.name} jusqu'à la fin`,
          });
        }
      }
    }

    const zoo = players.filter((p) => p.isUs);
    if (players.length) {
      out.push({
        icon: "🐾", label: "Animaux dans le top 50", value: String(zoo.length), unit: `/ ${CONFIG.members.length}`,
        status: zoo.length >= CONFIG.members.length / 2 ? "good" : "neutral",
        chip: zoo[0] ? `Meilleur : ${zoo[0].name} (${zoo[0].rank}e)` : "",
        text: "Joueurs du ZOO parmi les 50 meilleurs individuels",
        dots: { on: zoo.length, of: CONFIG.members.length },
      });
    }

    const hoursLeft = hoursLeftAt(snap.time);
    if (Number.isFinite(hoursLeft) && hoursLeft > 0) {
      const end = Date.parse(CONFIG.ranking.seasonEnd);
      out.push({
        icon: "⏳", label: "Temps restant", value: hoursLeft < 48 ? fmtNum(hoursLeft) : String(Math.floor(hoursLeft / 24)), unit: hoursLeft < 48 ? "h" : "jours",
        status: hoursLeft < 24 ? "warn" : "neutral", chip: hoursLeft < 24 ? "Dernière ligne droite" : "",
        text: `Fin le ${new Date(end).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" })} à ${fmtTime(end)}`,
      });
    }
    return out;
  }

  /* Insights : ce qui se passe dans le reste du classement */
  function buildInsights(snap, prev, history) {
    const out = [];
    const { teams, players } = snap;
    if (!teams.length) return out;

    let duel = null;
    for (let i = 1; i < teams.length; i++) {
      const gap = teams[i - 1].points - teams[i].points;
      if (!duel || gap < duel.gap) duel = { gap, a: teams[i - 1], b: teams[i] };
    }
    if (duel) out.push({ icon: "⚔️", label: "Duel le plus serré", value: `${fmtNum(duel.gap)} pts`, text: `${duel.a.name} (${duel.a.rank}e) vs ${duel.b.name} (${duel.b.rank}e)`, tone: duel.a.isUs || duel.b.isUs ? "hot" : "" });

    const pace = paceMap(snap, history, "teams");
    const paced = pace ? teams.map((t) => ({ t, v: pace.of(t) })).filter((x) => x.v != null).sort((a, b) => b.v - a.v) : [];
    if (paced[0]) out.push({ icon: "🔥", label: "Équipe la plus rapide", value: `+${fmtNum(paced[0].v)} pts/h`, text: `${paced[0].t.name} (sur ${fmtDuration(pace.hours)})`, tone: paced[0].t.isUs ? "up" : "" });

    const before = new Map((prev?.teams || []).map((t) => [t.id, t.points]));
    const gains = teams.filter((t) => before.has(t.id)).map((t) => ({ t, gain: t.points - before.get(t.id) })).sort((a, b) => b.gain - a.gain);
    if (gains[0]?.gain > 0) out.push({ icon: "📈", label: `Meilleure progression depuis ${fmtTime(prev.time)}`, value: `${fmtSigned(gains[0].gain)} pts`, text: gains[0].t.name, tone: gains[0].t.isUs ? "up" : "" });

    if (players[0]) out.push({ icon: "🏃", label: "N°1 individuel", value: `${fmtNum(players[0].points)} pts`, text: `${players[0].name} · ${players[0].team}`, tone: players[0].isUs ? "up" : "" });
    return out;
  }

  /* ---------- Graphiques (SVG / HTML, sans librairie) ---------- */
  const SVG_NS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs = {}, children = []) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  };

  // Infobulle partagée : tout élément avec data-tip ("ligne 1\nligne 2")
  const tip = {
    show(text, x, y) {
      const node = $("#chart-tip");
      node.replaceChildren(...String(text).split("\n").map((line, i) => el(i ? "span" : "strong", { text: line })));
      node.hidden = false;
      const { width, height } = node.getBoundingClientRect();
      const left = Math.min(window.innerWidth - width - 8, Math.max(8, x + 14));
      const top = y - height - 12 < 8 ? y + 18 : y - height - 12;
      node.style.transform = `translate(${left}px, ${top}px)`;
    },
    hide() { $("#chart-tip").hidden = true; },
    init() {
      const root = $("#live");
      root.addEventListener("pointermove", (e) => {
        const target = e.target.closest?.("[data-tip]");
        if (target && !target.closest(".chart--trend")) this.show(target.dataset.tip, e.clientX, e.clientY);
        else if (!e.target.closest?.(".chart--trend")) this.hide();
      });
      root.addEventListener("pointerleave", () => this.hide());
      root.addEventListener("scroll", () => this.hide(), { passive: true });
    },
  };

  const chartEmpty = (node, text) => node.replaceChildren(el("p", { class: "chart__empty", text }));

  // Barres divergentes : écart de chaque équipe du top 10 avec le ZOO
  function renderGapChart(snap) {
    const node = $("#live-gap");
    const us = snap.teams.find((t) => t.isUs);
    if (!us) return chartEmpty(node, "Le ZOO n'est pas dans le top 10 : pas d'écart à afficher.");
    const rows = snap.teams.map((t) => ({ t, d: t.points - us.points }));
    const ahead = Math.max(0, ...rows.map((r) => r.d));
    const behind = Math.max(0, ...rows.map((r) => -r.d));
    const span = ahead + behind || 1;
    const zero = (behind / span) * 100; // position du ZOO sur l'axe, en %

    node.replaceChildren(el("div", { class: "gap" }, [
      el("div", { class: "gap__legend" }, [
        el("span", { text: "◀ derrière nous" }),
        el("span", { text: "devant nous ▶" }),
      ]),
      ...rows.map(({ t, d }) => {
        const w = (Math.abs(d) / span) * 100;
        const bar = el("i", { class: `gap__bar gap__bar--${d > 0 ? "ahead" : d < 0 ? "behind" : "us"}` });
        bar.style.left = d >= 0 ? `${zero}%` : `${zero - w}%`;
        bar.style.width = d ? `${w}%` : "0";
        const value = el("span", { class: "gap__value", text: d ? fmtSigned(d) : "ZOO" });
        if (d >= 0) value.style.left = `calc(${zero + w}% + 6px)`;
        else value.style.right = `calc(${100 - zero + w}% + 6px)`;
        return el("div", {
          class: `gap__row${t.isUs ? " is-us" : ""}`,
          "data-tip": t.isUs ? `${t.name}\n${fmtNum(t.points)} pts · ${t.rank}e` : `${t.name} · ${t.rank}e\n${fmtNum(t.points)} pts\n${d > 0 ? `${fmtNum(d)} pts devant le ZOO` : `${fmtNum(-d)} pts derrière le ZOO`}`,
        }, [
          el("span", { class: "gap__name", text: t.name }),
          el("div", { class: "gap__track", style: `--zero:${zero}%` }, [bar, value]),
        ]);
      }),
    ]));
  }

  // Barres horizontales : nombre de joueurs de chaque équipe dans le top 50
  function renderPacksChart(snap) {
    const node = $("#live-packs");
    if (!snap.players.length) return chartEmpty(node, "Pas encore de données joueurs.");
    const count = new Map();
    snap.players.forEach((p) => count.set(p.team, (count.get(p.team) || 0) + 1));
    let rows = [...count.entries()].map(([team, n]) => ({ team, n, isUs: isUsTeam(team) })).sort((a, b) => b.n - a.n);
    const keep = rows.slice(0, 7);
    if (!keep.some((r) => r.isUs)) { const us = rows.find((r) => r.isUs); if (us) keep[keep.length - 1] = us; }
    const others = rows.filter((r) => !keep.includes(r)).reduce((s, r) => s + r.n, 0);
    rows = others ? [...keep, { team: `Autres (${count.size - keep.length} équipes)`, n: others, isOther: true }] : keep;
    const max = Math.max(...rows.map((r) => r.n));

    node.replaceChildren(el("div", { class: "hbars" }, rows.map((r) => {
      const bar = el("i", { class: `hbars__bar${r.isUs ? " is-us" : r.isOther ? " is-other" : ""}` });
      bar.style.width = `${(r.n / max) * 100}%`;
      return el("div", { class: `hbars__row${r.isUs ? " is-us" : ""}`, "data-tip": `${r.team}\n${plural(r.n, "joueur")} dans le top 50` }, [
        el("span", { class: "hbars__name", text: r.team }),
        el("div", { class: "hbars__track" }, [bar, el("span", { class: "hbars__value", text: String(r.n) })]),
      ]);
    })));
  }

  const niceStep = (range, count) => {
    const raw = range / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
  };

  // Courbes : points du ZOO et des équipes juste devant / juste derrière au fil des actualisations
  function renderTrendChart(snap, history) {
    const node = $("#live-trend");
    const us = snap.teams.find((t) => t.isUs);
    if (!us) return chartEmpty(node, "Le ZOO n'est pas dans le top 10 : pas de courbe à afficher.");
    const series = [
      { id: us.id, name: "DigitalZoo", cls: "zoo" },
      snap.teams[us.rank - 2] && { id: snap.teams[us.rank - 2].id, name: snap.teams[us.rank - 2].name, cls: "ahead", tag: "devant" },
      snap.teams[us.rank] && { id: snap.teams[us.rank].id, name: snap.teams[us.rank].name, cls: "behind", tag: "derrière" },
    ].filter(Boolean);

    const snaps = history.filter((s) => s.time <= snap.time).slice(-48);
    if (snaps.length < 2) {
      return chartEmpty(node, "La courbe se dessine au fil des actualisations (toutes les 10 min). Garde la page ouverte ou reviens plus tard : l'historique est gardé dans ton navigateur.");
    }
    series.forEach((s) => { s.points = snaps.map((h) => ({ time: h.time, v: h.teams.find((t) => t.id === s.id)?.points })).filter((p) => p.v != null); });

    const W = Math.max(300, node.clientWidth || 600);
    const H = 260;
    const pad = { t: 16, r: 16, b: 28, l: 52 };
    const all = series.flatMap((s) => s.points.map((p) => p.v));
    const t0 = snaps[0].time;
    const t1 = snaps[snaps.length - 1].time || t0 + 1;
    const step = niceStep(Math.max(1, Math.max(...all) - Math.min(...all)), 4);
    const yMin = Math.floor(Math.min(...all) / step) * step;
    const yMax = Math.ceil(Math.max(...all) / step) * step || yMin + step;
    const x = (t) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - yMin) / Math.max(1, yMax - yMin)) * (H - pad.t - pad.b);

    const grid = [];
    for (let v = yMin; v <= yMax + 0.5; v += step) {
      grid.push(svg("line", { class: "trend__grid", x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v) }));
      grid.push(svg("text", { class: "trend__tick", x: pad.l - 8, y: y(v) + 4, "text-anchor": "end", text: fmtNum(v) }));
    }
    const multiDay = t1 - t0 > 20 * 3.6e6;
    const ticks = Math.min(snaps.length, Math.max(2, Math.floor((W - pad.l - pad.r) / 90)));
    for (let i = 0; i < ticks; i++) {
      const t = t0 + ((t1 - t0) * i) / (ticks - 1);
      const label = multiDay ? new Date(t).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit" }) : fmtTime(t);
      grid.push(svg("text", { class: "trend__tick", x: x(t), y: H - 8, "text-anchor": i === 0 ? "start" : i === ticks - 1 ? "end" : "middle", text: label }));
    }

    const lines = series.map((s) => svg("g", { class: `trend__series trend__series--${s.cls}` }, [
      svg("path", { class: "trend__area", d: `M${x(s.points[0].time)},${H - pad.b} ${s.points.map((p) => `L${x(p.time)},${y(p.v)}`).join(" ")} L${x(s.points[s.points.length - 1].time)},${H - pad.b}Z` }),
      svg("path", { class: "trend__line", d: s.points.map((p, i) => `${i ? "L" : "M"}${x(p.time)},${y(p.v)}`).join(" ") }),
      svg("circle", { class: "trend__dot", r: 4.5, cx: x(s.points[s.points.length - 1].time), cy: y(s.points[s.points.length - 1].v) }),
    ]));

    const cross = svg("line", { class: "trend__cross", y1: pad.t, y2: H - pad.b, x1: 0, x2: 0, visibility: "hidden" });
    const hits = svg("rect", { class: "trend__hit", x: pad.l, y: pad.t, width: W - pad.l - pad.r, height: H - pad.t - pad.b });
    const chart = svg("svg", { class: "trend", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Évolution des points du ZOO et de ses voisins" }, [...grid, ...lines, cross, hits]);

    const onMove = (e) => {
      const box = chart.getBoundingClientRect();
      const px = ((e.clientX - box.left) / box.width) * W;
      const snapAt = snaps.reduce((best, s) => (Math.abs(x(s.time) - px) < Math.abs(x(best.time) - px) ? s : best), snaps[0]);
      cross.setAttribute("x1", x(snapAt.time));
      cross.setAttribute("x2", x(snapAt.time));
      cross.setAttribute("visibility", "visible");
      const lines = series.map((s) => {
        const t = snapAt.teams.find((o) => o.id === s.id);
        return t ? `${s.name} : ${fmtNum(t.points)} pts (${t.rank}e)` : null;
      }).filter(Boolean);
      const label = new Date(snapAt.time).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", hour: "2-digit", minute: "2-digit" });
      tip.show([label, ...lines].join("\n"), e.clientX, e.clientY);
    };
    hits.addEventListener("pointermove", onMove);
    hits.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); tip.hide(); });

    const legend = el("div", { class: "legend" }, series.map((s) => {
      const last = s.points[s.points.length - 1];
      return el("span", { class: `legend__item legend__item--${s.cls}` }, [
        el("i", { class: "legend__key" }),
        el("span", { text: `${s.name}${s.tag ? ` (${s.tag})` : ""}` }),
        el("strong", { text: `${fmtNum(last.v)} pts` }),
      ]);
    }));
    node.replaceChildren(legend, chart);
    $("#live-trend-hint").textContent = `${plural(snaps.length, "actualisation")} depuis ${new Date(t0).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", hour: "2-digit", minute: "2-digit" })}. Survole la courbe pour le détail.`;
  }

  /* ---------- Popup "Analyse en direct" ---------- */
  const live = {
    isOpen: false,
    pending: [],       // événements arrivés pendant que la popup est fermée
    lastSequence: null,
    shown: null,       // snapshot affiché dans la course
    nextCheck: 0,
    lastFocus: null,
    feed: [],

    onData(events) {
      this.nextCheck = Date.now() + this.interval();
      if (events) {
        this.logEvents(events);
        const sequence = [refreshEvent(ranking.snap, events), ...events];
        if (this.isOpen) {
          this.lastSequence = sequence;
          splash.play(sequence, () => this.render(true));
          return;
        }
        this.pending = sequence;
        this.setBadge(events.length || 1);
      }
      if (this.isOpen) this.render(false);
    },

    onError() {
      this.nextCheck = Date.now() + this.interval();
      if (this.isOpen) $("#live-status").textContent = "Sheet injoignable, nouvel essai bientôt";
    },

    interval: () => Math.max(20, Number(CONFIG.live.refreshSeconds) || 60) * 1000,

    logEvents(events) {
      const at = ranking.snap.time;
      this.feed = [...events.map(({ kicker, title, text, tone }) => ({ at, kicker, title, text, tone })), ...this.feed].slice(0, MAX_FEED);
      store.set(STORE.events, this.feed);
    },

    setBadge(n) {
      const badge = $("#live-badge");
      badge.hidden = !n;
      badge.textContent = n ? String(n) : "";
      $("#live-fab").classList.toggle("has-news", Boolean(n));
    },

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.lastFocus = document.activeElement;
      $("#live").hidden = false;
      document.body.classList.add("no-scroll", "live-on");
      $("#live-close").focus();

      // La course part de l'avant-dernière actualisation pour rejouer le dernier mouvement
      const sequence = this.pending.length ? this.pending : [introEvent(ranking.snap)];
      this.pending = [];
      this.setBadge(0);
      this.lastSequence = sequence;
      this.render(false, ranking.prev);
      splash.play(sequence, () => this.render(true));
    },

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      splash.stop();
      tip.hide();
      $("#live").hidden = true;
      document.body.classList.remove("no-scroll", "live-on");
      if (this.lastFocus) this.lastFocus.focus();
    },

    replay() {
      this.render(false, ranking.prev);
      splash.play(this.lastSequence || [introEvent(ranking.snap)], () => this.render(true));
    },

    render(animate, snapOverride) {
      const snap = snapOverride || ranking.snap;
      if (!snap) {
        $("#live-status").textContent = "Chargement des données…";
        return;
      }
      const prev = snapOverride ? null : ranking.prev;
      renderRace(snap, prev, animate);
      renderZoo(snap, prev);
      renderGapChart(snap);
      renderPacksChart(snap);
      if (!snapOverride) {
        renderKpis(buildKpis(snap, ranking.prev, ranking.history));
        renderTrendChart(snap, ranking.history);
        renderInsights(buildInsights(snap, ranking.prev, ranking.history));
        renderFeed(this.feed);
      }
      this.tick();
    },

    tick() {
      if (!this.isOpen || !ranking.snap) return;
      const left = Math.max(0, Math.round((this.nextCheck - Date.now()) / 1000));
      const mm = Math.floor(left / 60);
      const ss = String(left % 60).padStart(2, "0");
      $("#live-status").textContent = ranking.loading
        ? "Vérification…"
        : `Données de ${fmtTime(ranking.snap.time)} · vérif dans ${mm}:${ss}`;
    },
  };

  function introEvent(snap) {
    const img = CONFIG.live.images;
    if (!snap || !snap.teams.length) return { kicker: "Analyse en direct", title: "Le ZOO entre en piste", text: "Chargement des datas…", image: img.intro, tone: "neutral" };
    const us = snap.teams.find((t) => t.isUs);
    const leader = snap.teams[0];
    const text = !us
      ? `${leader.name} mène avec ${fmtNum(leader.points)} pts`
      : us.rank === 1
        ? `${fmtNum(us.points - (snap.teams[1]?.points ?? us.points))} pts d'avance sur ${snap.teams[1]?.name ?? "—"}`
        : `À ${fmtNum(leader.points - us.points)} pts de ${leader.name}`;
    return {
      kicker: `Analyse en direct · ${fmtTime(snap.time)}`,
      title: us ? `Le ZOO est #${us.rank}` : "Le ZOO chasse le top 10",
      text,
      image: img.intro,
      tone: us && us.rank <= 3 ? "up" : "neutral",
    };
  }

  function refreshEvent(snap, events) {
    const n = events.length;
    const best = [...snap.teams].map((t) => {
      const old = ranking.prev?.teams.find((o) => o.id === t.id);
      return { t, gain: old ? t.points - old.points : 0 };
    }).sort((a, b) => b.gain - a.gain)[0];
    return {
      kicker: `Actualisation · ${fmtTime(snap.time)}`,
      title: n ? `${plural(n, "fait")} marquant${n > 1 ? "s" : ""}` : "Le classement tient bon",
      text: best && best.gain > 0 ? `Meilleure progression : ${best.t.name} ${fmtSigned(best.gain)} pts` : "Les datas ont parlé",
      image: CONFIG.live.images.refresh,
      tone: "neutral",
    };
  }

  function animateNumber(node, from, to, duration = 1200) {
    if (from === to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.textContent = fmtNum(to);
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / duration);
      node.textContent = fmtNum(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Course : barres triées par rang, réordonnées avec une animation FLIP
  function renderRace(snap, prev, animate) {
    const list = $("#live-race");
    const teams = snap.teams;
    const max = teams[0]?.points || 1;
    const floor = Math.min(...teams.map((t) => t.points)) * 0.8;
    const width = (p) => 6 + 94 * Math.max(0, (p - floor) / Math.max(1, max - floor));
    const firstTop = new Map([...list.children].map((li) => [li.dataset.id, li.getBoundingClientRect().top]));
    const prevById = new Map((prev?.teams || []).map((t) => [t.id, t]));

    const items = teams.map((t) => {
      let li = [...list.children].find((n) => n.dataset.id === t.id);
      if (!li) {
        li = el("li", { class: "race__row", "data-id": t.id }, [
          el("span", { class: "race__rank" }),
          el("div", { class: "race__main" }, [
            el("div", { class: "race__line" }, [
              el("span", { class: "race__name" }),
              el("span", { class: "race__delta" }),
            ]),
            el("div", { class: "race__track" }, el("i", { class: "race__fill" })),
          ]),
          el("span", { class: "race__pts" }),
        ]);
        li.dataset.points = String(t.points);
      }
      const old = prevById.get(t.id);
      const move = old ? old.rank - t.rank : 0;
      const gain = old ? t.points - old.points : 0;
      li.classList.toggle("is-us", Boolean(t.isUs));
      li.classList.toggle("is-first", t.rank === 1);
      $(".race__rank", li).textContent = String(t.rank).padStart(2, "0");
      $(".race__rank", li).dataset.move = move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : "";
      $(".race__name", li).textContent = t.name;
      const delta = $(".race__delta", li);
      delta.textContent = gain ? `${fmtSigned(gain)} pts` : "";
      delta.classList.toggle("is-hot", gain > 0 && gain === Math.max(...teams.map((x) => x.points - (prevById.get(x.id)?.points ?? x.points))));

      const pts = $(".race__pts", li);
      const from = Number(li.dataset.points) || t.points;
      if (animate) animateNumber(pts, from, t.points);
      else pts.textContent = fmtNum(t.points);
      li.dataset.points = String(t.points);
      li.style.setProperty("--w", `${width(t.points)}%`);
      return li;
    });

    list.classList.toggle("no-anim", !animate);
    list.replaceChildren(...items);
    if (!animate) return;
    items.forEach((li, i) => {
      const before = firstTop.get(li.dataset.id);
      if (before == null) {
        li.animate([{ opacity: 0, transform: "translateX(-24px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: i * 40, easing: "ease-out", fill: "backwards" });
        return;
      }
      const dy = before - li.getBoundingClientRect().top;
      if (dy) {
        li.animate([{ transform: `translateY(${dy}px)`, zIndex: 2 }, { transform: "none", zIndex: 2 }], { duration: 1100, easing: "cubic-bezier(.2,.7,.2,1)" });
        li.classList.add("is-moving");
        setTimeout(() => li.classList.remove("is-moving"), 1600);
      }
    });
  }

  function renderZoo(snap, prev) {
    const list = $("#live-zoo");
    const zoo = snap.players.filter((p) => p.isUs);
    const team = snap.teams.find((t) => t.isUs);
    const total = team?.points || zoo.reduce((s, p) => s + p.points, 0) || 1;
    const max = Math.max(1, ...zoo.map((p) => p.points));
    const prevById = new Map((prev?.players || []).map((p) => [p.id, p]));
    list.replaceChildren(...(zoo.length ? zoo.map((p) => {
      const member = memberFor(p.name);
      const old = prevById.get(p.id);
      const move = old ? old.rank - p.rank : 0;
      const share = (p.points / total) * 100;
      const bar = el("i", { class: "zoo-list__bar" });
      bar.style.width = `${(p.points / max) * 100}%`;
      return el("li", { class: "zoo-list__item", "data-tip": `${p.name}${member ? ` · ${member.animal}` : ""}\n${p.rank}e du classement individuel\n${fmtNum(p.points)} pts = ${share.toFixed(1).replace(".", ",")} % des points du ZOO` }, [
        el("span", { class: "zoo-list__rank", text: `#${p.rank}` }),
        avatarFor(p.name, member),
        el("div", { class: "zoo-list__who" }, [
          el("span", { class: "player__name", text: p.name }),
          el("div", { class: "zoo-list__track" }, bar),
        ]),
        el("span", { class: "zoo-list__pts" }, [fmtNum(p.points), el("small", { text: `${Math.round(share)} %` })]),
        move ? el("span", { class: `move move--${move > 0 ? "up" : "down"}`, text: String(Math.abs(move)) }) : el("span"),
      ]);
    }) : [el("li", { class: "board__empty", text: "Aucun animal dans le top 50 pour l'instant." })]));
  }

  function renderKpis(kpis) {
    $("#live-kpis").replaceChildren(...kpis.map((k, i) => {
      const node = el("article", { class: `kpi kpi--${k.status || "neutral"}${k.hero ? " kpi--hero" : ""}` }, [
        el("div", { class: "kpi__top" }, [
          el("span", { class: "kpi__icon", "aria-hidden": "true", text: k.icon }),
          el("span", { class: "kpi__label", text: k.label }),
        ]),
        el("div", { class: "kpi__value" }, [k.value, k.unit ? el("small", { text: ` ${k.unit}` }) : null]),
        k.dots ? el("div", { class: "kpi__dots", "aria-hidden": "true" }, Array.from({ length: k.dots.of }, (_, j) => el("i", { class: j < k.dots.on ? "is-on" : "" }))) : null,
        k.chip ? el("span", { class: "kpi__chip", text: k.chip }) : null,
        el("p", { class: "kpi__text", text: k.text }),
      ]);
      node.style.animationDelay = `${i * 60}ms`;
      return node;
    }));
  }

  function renderInsights(insights) {
    $("#live-insights").replaceChildren(...insights.map((ins, i) => {
      const node = el("article", { class: `insight${ins.tone ? ` insight--${ins.tone}` : ""}` }, [
        el("span", { class: "insight__label" }, [ins.icon ? el("span", { class: "insight__icon", "aria-hidden": "true", text: ins.icon }) : null, ins.label]),
        el("span", { class: "insight__value", text: ins.value }),
        el("p", { class: "insight__text", text: ins.text }),
      ]);
      node.style.animationDelay = `${i * 70}ms`;
      return node;
    }));
  }

  function renderFeed(feed) {
    const list = $("#live-feed");
    if (!feed.length) {
      list.replaceChildren(el("li", { class: "feed__empty", text: "Les dépassements et gros coups apparaîtront ici à chaque actualisation du sheet (toutes les 10 min)." }));
      return;
    }
    list.replaceChildren(...feed.map((e) => el("li", { class: `feed__item feed__item--${e.tone || "neutral"}` }, [
      el("time", { class: "feed__time", text: fmtTime(e.at) }),
      el("div", {}, [
        el("span", { class: "feed__kicker", text: e.kicker }),
        el("strong", { class: "feed__title", text: e.title }),
        e.text ? el("span", { class: "feed__text", text: e.text }) : null,
      ]),
    ])));
  }

  /* ---------- Effet plein écran ---------- */
  const splash = {
    queue: [],
    timer: null,
    raf: null,
    onDone: null,
    index: 0,

    play(sequence, onDone) {
      this.stop();
      this.queue = sequence.filter(Boolean);
      this.onDone = onDone;
      this.index = 0;
      this.queue.forEach((e) => { if (e.image) new Image().src = e.image; });
      $("#splash").hidden = false;
      this.next();
    },

    next() {
      clearTimeout(this.timer);
      const event = this.queue[this.index];
      if (!event) {
        this.finish();
        return;
      }
      const node = $("#splash");
      const duration = (Number(CONFIG.live.effectSeconds) || 4.5) * 1000;
      node.style.setProperty("--img", event.image ? `url(${JSON.stringify(event.image)})` : "none");
      node.style.setProperty("--dur", `${duration}ms`);
      node.className = `splash splash--${event.tone || "neutral"}`;
      $("#splash-kicker").textContent = event.kicker || "";
      const title = $("#splash-title");
      title.textContent = event.title || "";
      title.dataset.text = event.title || "";
      $("#splash-text").textContent = event.text || "";
      $("#splash-skip").textContent = `${this.index + 1} / ${this.queue.length} · toucher pour passer`;
      void node.offsetWidth; // relance les animations CSS
      node.classList.add("is-playing");
      burst(event.tone);
      this.index++;
      this.timer = setTimeout(() => this.next(), duration);
    },

    finish() {
      this.stop();
      const done = this.onDone;
      this.onDone = null;
      if (done) done();
    },

    stop() {
      clearTimeout(this.timer);
      cancelAnimationFrame(this.raf);
      this.queue = [];
      const node = $("#splash");
      node.hidden = true;
      node.classList.remove("is-playing");
    },
  };

  // Éclats de lumière qui explosent depuis le centre
  function burst(tone) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = $("#splash-fx");
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width = window.innerWidth * dpr;
    const h = canvas.height = window.innerHeight * dpr;
    const rise = tone === "up";
    const parts = Array.from({ length: tone === "neutral" ? 90 : 160 }, () => {
      const angle = rise ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2;
      const speed = (rise ? 10 : 6) + Math.random() * 16;
      return {
        x: w / 2, y: rise ? h * 0.75 : h / 2,
        vx: Math.cos(angle) * speed * dpr, vy: Math.sin(angle) * speed * dpr,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        sw: (2 + Math.random() * 8) * dpr, sh: (2 + Math.random() * 18) * dpr,
        shade: tone === "down" && Math.random() < 0.35 ? 90 : 200 + Math.random() * 55,
        life: 1,
      };
    });
    const start = performance.now();
    cancelAnimationFrame(splash.raf);
    const frame = (now) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      if (t < 0.18) { splash.raf = requestAnimationFrame(frame); return; } // attend le flash
      let alive = 0;
      parts.forEach((p) => {
        p.vy += 0.32 * dpr;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.009;
        if (p.life <= 0) return;
        alive++;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgb(${p.shade},${p.shade},${p.shade})`;
        ctx.fillRect(-p.sw / 2, -p.sh / 2, p.sw, p.sh);
        ctx.restore();
      });
      if (alive) splash.raf = requestAnimationFrame(frame);
    };
    splash.raf = requestAnimationFrame(frame);
  }

  function initLive() {
    live.feed = store.get(STORE.events, []);
    live.nextCheck = Date.now() + live.interval();

    document.querySelectorAll("[data-live-open]").forEach((b) => b.addEventListener("click", () => live.open()));
    $("#live-close").addEventListener("click", () => live.close());
    $("#live-replay").addEventListener("click", () => live.replay());
    $("#live-check").addEventListener("click", () => { live.tick(); loadRanking(); });
    $("#splash").addEventListener("click", () => splash.next());
    tip.init();

    // La courbe est dessinée à la largeur de sa carte : on la redessine au redimensionnement
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (live.isOpen && ranking.snap) renderTrendChart(ranking.snap, ranking.history); }, 150);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!$("#splash").hidden) splash.finish();
      else live.close();
    });

    // Vérification régulière du sheet (seulement quand l'onglet est visible)
    setInterval(() => {
      live.tick();
      if (!document.hidden && Date.now() >= live.nextCheck && !ranking.loading) {
        live.nextCheck = Date.now() + live.interval();
        loadRanking();
      }
    }, 1000);
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
    initLive();
    initGallery();
    initContact();
    initFooter();
    initReveal();
  });
})();
