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
        el("img", { src: m.image, alt: `${m.name} — ${m.animal}`, loading: "lazy" }),
        el("span", { class: "member__num", text: String(i + 1).padStart(2, "0") }),
        el("div", { class: "member__info" }, [
          el("span", { class: "member__animal", text: m.animal }),
          el("span", { class: "member__name", text: m.name }),
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
      card("Total de la meute", `${fmt(total)} ${unit}`.trim(), `${rows.length} membres`),
      card("Chef de meute", leader.name, `${fmt(leader.score)} ${unit}`.trim()),
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
      form.querySelectorAll("input, textarea").forEach((field) => {
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
    document.querySelectorAll(".section__head, .video, .table-wrap, .board__summary, .form").forEach((n) => n.classList.add("reveal"));
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
    initBoard();
    initGallery();
    initContact();
    initFooter();
    initReveal();
  });
})();
