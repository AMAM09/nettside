// =========================================================
//  Absolutt Kino – main.js (fikset, med spoiler på kort + riktig lukking + trailer sizing)
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
function escapeHtml(s) {
  if (!s && s !== 0) return "";
  return s.toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function norskDato(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function avgScore(reviewObj) {
  if (!reviewObj || typeof reviewObj.score !== "number") return 0;
  return reviewObj.score;
}

// -------------------- SORTERING --------------------
let currentSort = "nyeste";
function sortFilms(list) {
  if (currentSort === "nyeste") {
    return list.sort((a,b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""));
  }
  if (currentSort === "beste") {
    return list.sort((a,b) => avgScore(b.review) - avgScore(a.review));
  }
  if (currentSort === "mestlikt") {
    return list.sort((a,b) => (b.likeCount || 0) - (a.likeCount || 0));
  }
  if (currentSort === "kommende") {
    return list.filter(f => f.upcoming);
  }
  return list;
}

// -------------------- LIKE / DISLIKE SYSTEM --------------------
let anonId = localStorage.getItem("kino_user");
if (!anonId) {
  anonId = "user_" + Math.random().toString(36).slice(2);
  localStorage.setItem("kino_user", anonId);
}

async function registerVote(movieId, delta) {
  const key = `vote_${anonId}_${movieId}`;
  const prev = localStorage.getItem(key);
  if (prev == delta) {
    alert("Du har allerede stemt slik på denne filmen.");
    return;
  }
  localStorage.setItem(key, delta);

  try {
    await db.collection("likes").add({
      movieId,
      delta,
      anonId,
      time: Date.now()
    });
  } catch (err) {
    console.error("Kunne ikke lagre stemme:", err);
  }
  loadLikesCounts();
}

async function loadLikesCounts() {
  try {
    const snap = await db.collection("likes").get();
    const counts = {};
    snap.forEach(d => {
      const x = d.data();
      if (!counts[x.movieId]) counts[x.movieId] = 0;
      counts[x.movieId] += x.delta;
    });
    for (const movieId in counts) {
      const likeBtn = document.getElementById(`like-${movieId}`);
      const dislikeBtn = document.getElementById(`dislike-${movieId}`);
      if (likeBtn) likeBtn.textContent = `👍 ${Math.max(0, counts[movieId])}`;
      if (dislikeBtn) dislikeBtn.textContent = `👎 ${Math.max(0, -counts[movieId])}`;
    }
  } catch (err) {
    console.error("loadLikesCounts error:", err);
  }
}

// -------------------- LOAD & RENDER MOVIES --------------------
async function loadMovies() {
  const container = document.getElementById("movies-container");
  if (!container) return;
  container.innerHTML = "Laster filmer...";

  try {
    const snap = await db.collection("films").orderBy("releaseDate", "desc").get();
    let films = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await loadLikesCounts();
    films = sortFilms(films);
    container.innerHTML = "";

    films.forEach(f => {
      const score = avgScore(f.review || {});
      const scoreText = score ? score.toFixed(1) : "0.0";

      // Spoiler flag for kortet
      const hasSpoiler = !!(f.review && (f.review.hasSpoilers || (f.review.spoilers && f.review.spoilers.trim())));

      const card = document.createElement("div");
      card.className = "movie-card";

      card.innerHTML = `
        <img class="poster" src="${escapeHtml(f.img || "")}" alt="${escapeHtml(f.title || "")}">
        <div class="movie-info">
          <div style="display:flex;align-items:center;gap:8px;">
            ${ hasSpoiler ? `<span class="spoiler-tag" style="background:#c3073f;color:#fff;padding:4px 8px;border-radius:6px;font-size:13px;">Spoiler</span>` : "" }
            <h2 style="margin:0;">${escapeHtml(f.title || "")}</h2>
          </div>

          <div class="movie-meta" style="margin-top:8px;">
            <span class="genre">${escapeHtml(f.genre || "Ukjent")}</span>
            <span class="date">${norskDato(f.releaseDate)}</span>
          </div>

          <div class="rating-box" style="margin-top:12px;">
            ⭐ ${scoreText}/10
          </div>

          <div class="actions" style="margin-top:12px;">
            <button class="like-btn" id="like-${f.id}" data-like="${f.id}">👍 0</button>
            <button class="dislike-btn" id="dislike-${f.id}" data-dislike="${f.id}">👎 0</button>
            ${f.trailer ? `<button class="trailer-btn" data-trailer="${escapeHtml(f.trailer)}">Trailer</button>` : ""}
          </div>

          <button class="review-btn" data-id="${f.id}" style="margin-top:10px; width:100%;">Les anmeldelse</button>
        </div>
      `;

      container.appendChild(card);
    });

    // Bind review buttons
    document.querySelectorAll(".review-btn").forEach(btn => {
      btn.addEventListener("click", () => openReview(btn.dataset.id));
    });

    // Votes
    document.querySelectorAll("[data-like]").forEach(btn => {
      btn.addEventListener("click", () => registerVote(btn.dataset.like, +1));
    });
    document.querySelectorAll("[data-dislike]").forEach(btn => {
      btn.addEventListener("click", () => registerVote(btn.dataset.dislike, -1));
    });

    // Trailers
    document.querySelectorAll("[data-trailer]").forEach(btn => {
      btn.addEventListener("click", () => showTrailer(btn.dataset.trailer));
    });

    // update likes display after binding
    loadLikesCounts();

  } catch (err) {
    console.error("loadMovies error:", err);
    container.innerHTML = "<p>Kunne ikke laste filmer.</p>";
  }
}

// -------------------- REVIEW MODAL (med spoiler) --------------------
async function openReview(id) {
  try {
    const doc = await db.collection("films").doc(id).get();
    if (!doc.exists) return;

    const f = doc.data();
    const r = f.review || {};
    const m = f.metadata || {};

    // header / facts
    document.getElementById("modal-cover").src = m.cover || f.img || "";
    document.getElementById("modal-title").textContent = r.title || f.title || "Anmeldelse";
    document.getElementById("modal-subtitle").textContent = r.subtitle || "";

    document.getElementById("modal-facts").innerHTML = `
      <p><strong>Regissør:</strong> ${escapeHtml(m.director || "-")}</p>
      <p><strong>Skuespillere:</strong> ${escapeHtml(m.cast || "-")}</p>
      <p><strong>Produksjonsår:</strong> ${escapeHtml(m.year || "-")}</p>
      <p><strong>Varighet:</strong> ${escapeHtml(m.runtime || "-")} min</p>
      <p><strong>Land:</strong> ${escapeHtml(m.country || "-")}</p>
      <p><strong>Aldersgrense:</strong> ${escapeHtml(m.age || "-")}</p>
      <p><strong>Sjanger:</strong> ${escapeHtml(f.genre || "-")}</p>
    `;

    const sections = document.getElementById("modal-sections");
    sections.innerHTML = "";

    // add non-spoiler sections
    function addSection(title, text) {
      if (!text) return;
      const div = document.createElement("div");
      div.className = "review-section";
      div.innerHTML = `<h3>${title}</h3><p>${escapeHtml(text)}</p>`;
      sections.appendChild(div);
    }

    addSection("Handling", r.plot);
    addSection("Skuespill", r.acting);
    addSection("Visuelt", r.visuals);
    addSection("Musikk / lyd", r.music);
    addSection("Tempo & regi", r.pacing);
    addSection("Konklusjon", r.conclusion);

    // Spoiler block: spacer + toggle + hidden content
    const hasSpoilerFlag = !!r.hasSpoilers;
    const spoilerText = (r.spoilers || "").toString().trim();

    if (hasSpoilerFlag || spoilerText) {
      // spacer
      const spacer = document.createElement("div");
      spacer.style.height = "18px";
      sections.appendChild(spacer);

      // warn button (toggle)
      const warn = document.createElement("button");
      warn.type = "button";
      warn.className = "danger";
      warn.style.display = "block";
      warn.style.margin = "8px 0";
      warn.textContent = "⚠️ Denne anmeldelsen inneholder spoilers — trykk for å vise";
      sections.appendChild(warn);

      // hidden spoiler content
      const spoilerDiv = document.createElement("div");
      spoilerDiv.style.display = "none";
      spoilerDiv.style.marginTop = "12px";
      spoilerDiv.innerHTML = `<h3 style="color:#c3073f;">Spoiler</h3><p>${escapeHtml(spoilerText)}</p>`;
      sections.appendChild(spoilerDiv);

      // toggle handler
      warn.addEventListener("click", () => {
        const isHidden = spoilerDiv.style.display === "none";
        spoilerDiv.style.display = isHidden ? "block" : "none";
        warn.textContent = isHidden ? "Skjul spoilers" : "⚠️ Denne anmeldelsen inneholder spoilers — trykk for å vise";
      });
    }

    // score and gallery
    const scoreEl = document.getElementById("modal-score");
    const scoreVal = (r.score || 0);
    scoreEl.textContent = `Kritikerscore: ${Number(scoreVal).toFixed(1)}/10`;

    const gallery = document.getElementById("modal-gallery");
    gallery.innerHTML = "";
    (m.gallery || []).forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      gallery.appendChild(img);
    });

    // show modal
    const reviewModal = document.getElementById("review-modal");
    reviewModal.style.display = "flex";

  } catch (err) {
    console.error("openReview error:", err);
    alert("Kunne ikke hente anmeldelse (se console).");
  }
}

// Attach modal close/backdrop handlers once on load
document.addEventListener("DOMContentLoaded", () => {
  const modalClose = document.getElementById("modal-close");
  if (modalClose) {
    modalClose.addEventListener("click", () => {
      document.getElementById("review-modal").style.display = "none";
    });
  }

  const reviewModal = document.getElementById("review-modal");
  if (reviewModal) {
    reviewModal.addEventListener("click", (e) => {
      if (e.target.id === "review-modal") {
        reviewModal.style.display = "none";
      }
    });
  }
});

// -------------------- TRAILER POPUP --------------------
function extractYouTubeID(url) {
  if (!url) return "";
  url = url.trim();

  if (url.includes("youtu.be/"))
    return url.split("youtu.be/")[1].split(/[?&]/)[0];

  if (url.includes("watch?v="))
    return url.split("watch?v=")[1].split("&")[0];

  if (url.includes("/shorts/"))
    return url.split("/shorts/")[1].split(/[?&]/)[0];

  return url;
}

function showTrailer(url) {
  const popup = document.getElementById("trailer-popup");
  const frame = document.getElementById("trailer-frame");

  const id = extractYouTubeID(url);
  frame.src = `https://www.youtube.com/embed/${id}?autoplay=1`;

  popup.style.display = "flex";   // <-- popup vises riktig
}

// close
document.getElementById("trailer-close").addEventListener("click", () => {
  const popup = document.getElementById("trailer-popup");
  const frame = document.getElementById("trailer-frame");

  popup.style.display = "none";
  frame.src = "";                 // <-- stopper videoen
});

// click outside → close
document.getElementById("trailer-popup").addEventListener("click", (e) => {
  if (e.target.id === "trailer-popup") {
    document.getElementById("trailer-close").click();
  }
});

// -------------------- SORTERING UI --------------------
const sortSelect = document.getElementById("sort-select");
if (sortSelect) {
  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    loadMovies();
  });
}

// -------------------- NEWS --------------------
async function loadNews() {
  const box = document.getElementById("news-container");
  if (!box) return;

  try {
    const snap = await db.collection("news").orderBy("date","desc").limit(12).get();
    box.innerHTML = "";
    snap.forEach(doc => {
      const n = doc.data();
      const id = doc.id;
      const card = document.createElement("div");
      card.className = "news-card";
      card.innerHTML = `
        <img src="${escapeHtml(n.img)}">
        <span class="news-tag">${escapeHtml(n.category || "Nyhet")}</span>
        <h3>${escapeHtml(n.title)}</h3>
        <p>${escapeHtml((n.body || "").slice(0,120))}...</p>
      `;
      card.addEventListener("click", () => {
        location.href = "news.html?id=" + id;
      });
      box.appendChild(card);
    });
  } catch (err) {
    console.error("loadNews error:", err);
  }
}

// -------------------- INIT --------------------
loadMovies();
loadNews();
