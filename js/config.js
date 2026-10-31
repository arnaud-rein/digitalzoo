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
    image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793454135/Escouade_animale_sous_l_orage_toxique_zjpnxp.webp",
    title: "DIGITAL ZOO",
    subtitle: "On marche, on court, on pédale. Et on ne lâche rien.",
  },

  /* ---------- Vidéo ----------
     Accepte :
     - un lien YouTube  (https://www.youtube.com/watch?v=XXXX ou https://youtu.be/XXXX)
     - un lien Vimeo    (https://vimeo.com/123456)
     - un fichier vidéo (.mp4 / .webm, ex. Cloudinary)                         */
  video: {
    src: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
    poster: "https://picsum.photos/seed/digitalzoo-video/1280/720",
    title: "Le ZOO en action",
  },

  /* ---------- Membres (animal totem) ----------
     "name" doit être écrit EXACTEMENT comme dans ton Google Sheet
     pour que la photo s'affiche aussi dans le classement.           */
  members: [
    { name: "Membre 1", animal: "LeGrandZebre", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Z%C3%A8bre_laser_%C3%A0_la_Citadelle_de_Lille_yyyy1z.webp" },
    { name: "Membre 2", animal: "Anisse", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Chat_noir_au_sourire_malicieux_s7mhf1.webp" },
    { name: "Membre 3", animal: "Rémy", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/remi_tigre_iaupe9.webp" },
    { name: "Membre 4", animal: "Jérémy", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Portrait_r%C3%A9aliste_d_un_chimpanz%C3%A9_en_int%C3%A9rieur_qcblsn.webp" },
    { name: "Membre 5", animal: "Nathan", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Chat_tigr%C3%A9_aux_yeux_verts_langue_tir%C3%A9e_mzgin0.webp" },
    { name: "Membre 6", animal: "Valentin", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Chat_tigr%C3%A9_muscl%C3%A9_sur_terrasse_zj1abj.webp" },
    { name: "Membre 7", animal: "James", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Tigre_anthropomorphe_sur_route_nocturne_sc7sy5.webp" },
    { name: "Membre 8", animal: "Quentin", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/Axolotl_souriant_dans_son_aquarium_swasq4.webp" },
    { name: "Membre 9", animal: "Antoine", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/H%C3%A9risson_urbain_dans_la_for%C3%AAt_brumeuse_ky3udy.webp" },
    { name: "Membre 10", animal: "Max", image: "https://res.cloudinary.com/de3xvrrq5/image/upload/v1793452241/%C3%89toile_de_mer_dodue_sur_fond_marin_fkfcbm.webp" },
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

  /* ---------- Galerie ----------
     Ajoute / supprime une ligne pour ajouter / enlever une photo.
     "caption" est optionnel.                                         */
  gallery: [
    { src: "https://picsum.photos/seed/zoo-1/1200/800", caption: "Sortie du lundi" },
    { src: "https://picsum.photos/seed/zoo-2/800/1200", caption: "Le loup en côte" },
    { src: "https://picsum.photos/seed/zoo-3/1200/800", caption: "" },
    { src: "https://picsum.photos/seed/zoo-4/1200/1200", caption: "Pause ravito" },
    { src: "https://picsum.photos/seed/zoo-5/1200/800", caption: "" },
    { src: "https://picsum.photos/seed/zoo-6/800/1200", caption: "Vélotaf sous la pluie" },
    { src: "https://picsum.photos/seed/zoo-7/1200/800", caption: "" },
    { src: "https://picsum.photos/seed/zoo-8/1200/800", caption: "Photo d'équipe" },
  ],

  /* ---------- Formulaire de contact (EmailJS) ----------
     Sur https://dashboard.emailjs.com :
     - publicKey  : Account > General > Public Key
     - serviceId  : Email Services
     - templateId : Email Templates
     Variables à utiliser dans ton template : {{from_name}}, {{reply_to}}, {{subject}}, {{message}} */
  emailjs: {
    publicKey: "",
    serviceId: "",
    templateId: "",
  },

  /* ---------- Réseaux / liens (laisser "" pour masquer) ---------- */
  links: {
    instagram: "",
    linkedin: "",
    squadeasy: "https://www.squadeasy.com",
  },
};
