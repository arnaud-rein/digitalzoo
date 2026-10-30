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
    image: "https://picsum.photos/seed/digitalzoo-hero/1920/1080",
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
    title: "La meute en action",
  },

  /* ---------- Membres (animal totem) ----------
     "name" doit être écrit EXACTEMENT comme dans ton Google Sheet
     pour que la photo s'affiche aussi dans le classement.           */
  members: [
    { name: "Membre 1",  animal: "Lion",      image: "https://picsum.photos/seed/lion/600/600" },
    { name: "Membre 2",  animal: "Loup",      image: "https://picsum.photos/seed/wolf/600/600" },
    { name: "Membre 3",  animal: "Guépard",   image: "https://picsum.photos/seed/cheetah/600/600" },
    { name: "Membre 4",  animal: "Ours",      image: "https://picsum.photos/seed/bear/600/600" },
    { name: "Membre 5",  animal: "Aigle",     image: "https://picsum.photos/seed/eagle/600/600" },
    { name: "Membre 6",  animal: "Renard",    image: "https://picsum.photos/seed/fox/600/600" },
    { name: "Membre 7",  animal: "Panda",     image: "https://picsum.photos/seed/panda/600/600" },
    { name: "Membre 8",  animal: "Zèbre",     image: "https://picsum.photos/seed/zebra/600/600" },
    { name: "Membre 9",  animal: "Gorille",   image: "https://picsum.photos/seed/gorilla/600/600" },
    { name: "Membre 10", animal: "Paresseux", image: "https://picsum.photos/seed/sloth/600/600" },
  ],

  /* ---------- Classement (Google Sheet public) ----------
     1. Dans Google Sheets : Partager > "Tous les utilisateurs disposant du lien" > Lecteur
     2. Copie l'ID dans l'URL : docs.google.com/spreadsheets/d/<ID>/edit
     3. Ligne 1 du sheet = en-têtes : Nom | Score | Shame
     Tant que sheetId est vide, des données de démo sont affichées.          */
  scoreboard: {
    sheetId: "",
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
