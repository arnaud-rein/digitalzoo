/* =========================================================
   DIGITAL ZOO — FICHIER DE CONFIGURATION
   ---------------------------------------------------------
   C'est le SEUL fichier à modifier pour changer le contenu
   du site : images, vidéo, membres, galerie, Google Sheet,
   EmailJS. Remplace les liens picsum.photos par tes liens
   Cloudinary (https://res.cloudinary.com/...).
   ========================================================= */

const CONFIG = {
  /* ---------- Équipe ---------- */
  teamName: "Digital Zoo",
  tagline: "10 animaux. 100 entreprises. Une seule jungle.",

  /* ---------- Grande image d'accueil ---------- */
  hero: {
    image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793539127/zoo_laser_end_ttr9u1.webp",
    title: "DIGITAL ZOO",
    subtitle: "On marche, on court, on pédale. Et on ne lâche rien.",
  },

  /* ---------- Vidéo ----------
     Accepte :
     - un lien YouTube  (https://www.youtube.com/watch?v=XXXX ou https://youtu.be/XXXX)
     - un lien Vimeo    (https://vimeo.com/123456)
     - un fichier vidéo (.mp4 / .webm, ex. Cloudinary)                         */
  video: {
    src: "https://youtu.be/oxdMK45VmaI",
    poster: "https://picsum.photos/seed/digitalzoo-video/1280/720",
    title: "Le ZOO en action",
  },

  /* ---------- Membres (animal totem) ----------
     "name" doit être écrit EXACTEMENT comme dans ton Google Sheet
     pour que la photo s'affiche aussi dans le classement.           */
  members: [
    { name: "", animal: "LeGrandZebre", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Z%C3%A8bre_laser_%C3%A0_la_Citadelle_de_Lille_yyyy1z.webp" },
    { name: "", animal: "Anisse", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Chat_noir_au_sourire_malicieux_s7mhf1.webp" },
    { name: "", animal: "Rémy", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/remi_tigre_iaupe9.webp" },
    { name: "", animal: "Jérémy", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Portrait_r%C3%A9aliste_d_un_chimpanz%C3%A9_en_int%C3%A9rieur_qcblsn.webp" },
    { name: "", animal: "Nathan", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Chat_tigr%C3%A9_aux_yeux_verts_langue_tir%C3%A9e_mzgin0.webp" },
    { name: "", animal: "Valentin", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Chat_tigr%C3%A9_muscl%C3%A9_sur_terrasse_zj1abj.webp" },
    { name: "", animal: "James", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Tigre_anthropomorphe_sur_route_nocturne_sc7sy5.webp" },
    { name: "", animal: "Quentin", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Axolotl_souriant_dans_son_aquarium_swasq4.webp" },
    { name: "", animal: "Dimos", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793537046/ours_bresson_jzjfmk.webp" },
    { name: "", animal: "Max", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793537274/maxime_derveaux_ddog_hij2kg.webp" },
  ],

  /* ---------- Classement (Google Sheet public) ----------
     1. Dans Google Sheets : Partager > "Tous les utilisateurs disposant du lien" > Lecteur
     2. Copie l'ID dans l'URL : docs.google.com/spreadsheets/d/<ID>/edit
     3. Ligne 1 du sheet = en-têtes : Nom | Score | Shame
     Tant que sheetId est vide, des données de démo sont affichées.          */
  scoreboard: {
    sheetId: "1RisYZycIcMY6wfWXNDUfvoDZXcLnddhgvkBu0HbWVsU",
    sheetName: "Feuille 1",   // nom de l'onglet (ex. "Feuille 1" ou "Sheet1")
    refreshMinutes: 5,        // rafraîchissement auto (0 = désactivé)
    scoreUnit: "pts",
  },

  /* ---------- Classement Squadeasy ----------
     Fichier généré par : node scripts/build-leaderboard.mjs          */
  ranking: {
    file: "data/leaderboard.json",
    pageSize: 10,             // lignes par page
  },

  /* ---------- Galerie ----------
     Ajoute / supprime une ligne pour ajouter / enlever une photo.
     "caption" est optionnel.                                         */
  gallery: [
    { src: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793563683/Charge_h%C3%A9ro%C3%AFque_dans_la_for%C3%AAt_en_flammes_kadfm0.webp", caption: "" },
    { src: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793563682/Tigre_%C3%A9lectrique_dans_l_apocalypse_sauvage_crhuil.webp", caption: "" },
    { src: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793563680/Axolotl_n%C3%A9on_au_c%C5%93ur_de_la_temp%C3%AAte_yjt4ek.webp", caption: "" },
    { src: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793563679/Ru%C3%A9e_n%C3%A9on_des_pr%C3%A9dateurs_sauvages_yjxu4a.webp", caption: "" },
    { src: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793563678/Chien_tactique_dans_la_for%C3%AAt_en_flammes_evolcs.webp", caption: "" },
    { src: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793563676/Le_lion_tactique_franchit_le_gouffre_en_flammes_vyvqyx.webp", caption: "" },
    { src: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793563674/La_charge_du_zoo_num%C3%A9rique_ljwauy.webp", caption: "" },
    { src: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793563673/Route_n%C3%A9on_dans_la_for%C3%AAt_orageuse_thjb6g.webp", caption: "" },
    { src: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793563672/lasers_sol_m9vlme.webp", caption: "" },
  ],

  /* ---------- Formulaire de contact (EmailJS) ----------
     Sur https://dashboard.emailjs.com :
     - publicKey  : Account > General > Public Key
     - serviceId  : Email Services
     - templateId : Email Templates
     Variables envoyées au template : {{name}}, {{email}}, {{subject}}, {{message}}, {{time}} */
  emailjs: {
    publicKey: "T8tUkXObPsZp_txln",            // À REMPLIR : Account > General > Public Key
    serviceId: "service_kop10jb",
    templateId: "template_j800b2a",
  },

  /* ---------- Réseaux / liens (laisser "" pour masquer) ---------- */
  links: {
    instagram: "",
    linkedin: "",
    squadeasy: "https://www.squadeasy.com",
  },
};
