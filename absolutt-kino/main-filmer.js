// =========================================================
//  Absolutt Kino – main-filmer.js
//  Side: filmer.html (tabs: kommende / watchlist / anmeldt)
// =========================================================


// -------------------- FIREBASE INIT --------------------
const firebaseConfig = {
  apiKey: "AIzaSyADgXZ-KnvBfZTdtBsyedoixwLUqxExxWY",
  authDomain: "absolutt-kino.firebaseapp.com",
  projectId: "absolutt-kino",
  messagingSenderId: "808056313896",
  appId: "1:808056313896:web:70c00293759ca080143d1d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// -------------------- UTIL --------------------
const escapeHtml = (s) =>
  s ? s.toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
     : "";

const norskDato = (s) => {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return s;
  }
};


// -------------------- LOAD FILMS FOR TABS --------------------
async function loadFilms(category) {
  const box = document.getElementById("films-container");
  if (!box) return;
  box.innerHTML = "Laster filmer...";

  const snap = await db.collection("films").orderBy("releaseDate", "desc").get();
  const films = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let filtered = films;

  if (category === "upcoming") {
    filtered = films.filter(f => f.upcoming);
  } else if (category === "reviewed") {
    filtered = films.filter(f => f.review && f.review.title);
  } else if (category === "watchlist") {
    filtered = films.filter(f => !f.upcoming && (!f.review || !f.review.title));
  }

  box.innerHTML = "";

  filtered.forEach(f => {
    const card = document.createElement("div");
    card.className = "movie-card";

    card.innerHTML = `
      <img class="poster" src="${escapeHtml(f.img)}">
      <div class="movie-info">
        <h2>${escapeHtml(f.title)}</h2>
        <div class="movie-meta">
          <span>${escapeHtml(f.genre || "")}</span>
          <span>${norskDato(f.releaseDate)}</span>
        </div>
        <button onclick="location.href='index.html'"
          style="margin-top:10px;width:100%;">
          Gå til anmeldelser
        </button>
      </div>
    `;

    box.appendChild(card);
  });

  if (!filtered.length) {
    box.innerHTML = "<p style='text-align:center;'>Ingen filmer i denne kategorien ennå.</p>";
  }
}


// -------------------- TABS CONTROLLER --------------------
const tabButtons = document.querySelectorAll(".tabs button");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    loadFilms(btn.dataset.tab);
  });
});


// -------------------- INIT --------------------
loadFilms("upcoming");
