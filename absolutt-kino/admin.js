// admin.js — Ryddet versjon med spoilere støtte (hasSpoilers + spoilers)

// -------------------- KONFIG --------------------
const firebaseConfig = {
  apiKey: "AIzaSyADgXZ-KnvBfZTdtBsyedoixwLUqxExxWY",
  authDomain: "absolutt-kino.firebaseapp.com",
  projectId: "absolutt-kino",
  messagingSenderId: "808056313896",
  appId: "1:808056313896:web:70c00293759ca080143d1d"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// -------------------- HJELPEFUNKSJONER --------------------
function escapeHtml(s) {
  if (!s && s !== 0) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const MONTHS = [
  "januar","februar","mars","april","mai","juni",
  "juli","august","september","oktober","november","desember"
];

function buildDatePicker(base) {
  const dayEl   = document.getElementById(`${base}-dag`);
  const monthEl = document.getElementById(`${base}-maaned`);
  const yearEl  = document.getElementById(`${base}-aar`);
  if (!dayEl || !monthEl || !yearEl) return;

  dayEl.innerHTML = `<option value="">Dag</option>`;
  for (let i = 1; i <= 31; i++) dayEl.innerHTML += `<option value="${i}">${i}</option>`;

  monthEl.innerHTML = `<option value="">Måned</option>`;
  MONTHS.forEach((m, idx) => monthEl.innerHTML += `<option value="${idx+1}">${m}</option>`);

  const now = new Date().getFullYear();
  yearEl.innerHTML = `<option value="">År</option>`;
  for (let y = now - 2; y <= now + 10; y++) yearEl.innerHTML += `<option value="${y}">${y}</option>`;
}

function getDateFromPicker(base) {
  const day   = document.getElementById(`${base}-dag`)?.value;
  const month = document.getElementById(`${base}-maaned`)?.value;
  const year  = document.getElementById(`${base}-aar`)?.value;
  if (!day || !month || !year) return "";
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

// -------------------- INIT UI --------------------
window.addEventListener("DOMContentLoaded", () => {
  buildDatePicker("dato");
  buildDatePicker("edit");
  attachPreviewHandlers();
});

// -------------------- AUTH --------------------
const btnLogin  = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const authMsg   = document.getElementById("auth-msg");

btnLogin?.addEventListener("click", async () => {
  const email = document.getElementById("admin-email").value;
  const pass  = document.getElementById("admin-pass").value;
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    authMsg.textContent = "Innlogging vellykket";
  } catch (e) {
    console.error(e);
    authMsg.textContent = "Innlogging feilet";
  }
});

btnLogout?.addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged(user => {
  const authSection = document.getElementById("auth-section");
  const adminPanel  = document.getElementById("admin-panel");
  if (authSection) authSection.style.display = user ? "none" : "block";
  if (adminPanel)  adminPanel.style.display  = user ? "block" : "none";
  if (user) loadManageList();
});

// -------------------- BILDEPREVIEW --------------------
function attachPreviewHandlers() {
  const preview  = document.getElementById("preview-img");
  const imgInput = document.getElementById("film-image");
  if (imgInput && preview) {
    imgInput.addEventListener("input", () => {
      const url = imgInput.value.trim();
      preview.src = url;
      preview.style.display = url ? "block" : "none";
    });
  }

  const editPreview = document.getElementById("edit-preview");
  const editInput   = document.getElementById("edit-image");
  if (editInput && editPreview) {
    editInput.addEventListener("input", () => {
      const url = editInput.value.trim();
      editPreview.src = url;
      editPreview.style.display = url ? "block" : "none";
    });
  }
}

// -------------------- LEGG TIL FILM --------------------
document.getElementById("btn-add-film")?.addEventListener("click", async () => {
  const title       = document.getElementById("film-title").value.trim();
  const desc        = document.getElementById("film-desc").value.trim();
  const genre       = document.getElementById("film-genre").value;
  const releaseDate = getDateFromPicker("dato");
  const upcoming    = document.getElementById("film-upcoming").checked;
  const img         = document.getElementById("film-image").value.trim();
  const trailer     = document.getElementById("film-trailer").value.trim();

  // REVIEW FELTER (håndterer om elementene mangler)
  const review = {
    title:     document.getElementById("review-title")?.value.trim() || "",
    subtitle:  document.getElementById("review-subtitle")?.value.trim() || "",
    plot:      document.getElementById("review-plot")?.value.trim() || "",
    acting:    document.getElementById("review-acting")?.value.trim() || "",
    visuals:   document.getElementById("review-visuals")?.value.trim() || "",
    music:     document.getElementById("review-music")?.value.trim() || "",
    pacing:    document.getElementById("review-pacing")?.value.trim() || "",
    conclusion:document.getElementById("review-conclusion")?.value.trim() || "",
    // spoilers (legg til understøttelse ved add hvis feltene finnes)
    hasSpoilers: document.getElementById("review-hasSpoilers") ? !!document.getElementById("review-hasSpoilers").checked : false,
    spoilers:    document.getElementById("review-spoilers")?.value.trim() || "",
    score:      Number(document.getElementById("review-score")?.value) || 0
  };

  // METADATA
  const metadata = {
    director: document.getElementById("review-director")?.value.trim() || "",
    cast:     document.getElementById("review-cast")?.value.trim() || "",
    year:     document.getElementById("review-year")?.value.trim() || "",
    runtime:  document.getElementById("review-runtime")?.value.trim() || "",
    country:  document.getElementById("review-country")?.value.trim() || "",
    age:      document.getElementById("review-age")?.value.trim() || "",
    cover:    document.getElementById("review-cover")?.value.trim() || "",
    gallery:  (document.getElementById("review-gallery")?.value || "")
                .split(",").map(s => s.trim()).filter(Boolean)
  };

  const msgEl = document.getElementById("add-film-msg");
  if (msgEl) msgEl.textContent = "";

  if (!title || !desc || !img || !releaseDate) {
    if (msgEl) msgEl.textContent = "Fyll ut tittel, beskrivelse, bilde og premiere-dato.";
    return;
  }

  try {
    await db.collection("films").add({
      title,
      desc,
      genre,
      releaseDate,
      upcoming,
      img,
      trailer,
      review,
      metadata,
      createdAt: Date.now()
    });
    if (msgEl) msgEl.textContent = "Filmen ble lagt til!";
    loadManageList();
  } catch (e) {
    console.error(e);
    if (msgEl) msgEl.textContent = "Noe gikk galt ved lagring.";
  }
});

// -------------------- LEGG TIL NYHET --------------------
document.getElementById("btn-add-news")?.addEventListener("click", async () => {
  const title    = document.getElementById("news-title").value.trim();
  const category = document.getElementById("news-category").value;
  const body     = document.getElementById("news-body").value.trim();
  const img      = document.getElementById("news-image").value.trim();
  const link     = document.getElementById("news-link").value.trim();

  const msgEl = document.getElementById("add-news-msg");
  if (msgEl) msgEl.textContent = "";

  if (!title || !img) {
    if (msgEl) msgEl.textContent = "Fyll ut tittel og bilde-URL.";
    return;
  }

  try {
    await db.collection("news").add({
      title, category, body, img, link,
      date: new Date().toISOString().slice(0,10)
    });
    if (msgEl) msgEl.textContent = "Nyhet lagt til!";
    loadManageList();
  } catch (e) {
    console.error(e);
    if (msgEl) msgEl.textContent = "Kunne ikke legge til nyhet.";
  }
});

// -------------------- LASTE INN & MANAGE --------------------
async function loadManageList() {
  const box = document.getElementById("manage-list");
  if (!box) return;
  box.innerHTML = "<h3>Filmer</h3>";

  try {
    const snap = await db.collection("films").orderBy("releaseDate","desc").get();

    snap.forEach(doc => {
      const f  = doc.data();
      const id = doc.id;

      const wrap = document.createElement("div");
      wrap.className = "edit-box";
      wrap.style.marginBottom = "12px";
      wrap.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${escapeHtml(f.img || '')}" style="width:96px;height:auto;border-radius:8px;object-fit:cover;">
          <div style="flex:1;">
            <strong>${escapeHtml(f.title || 'Uten tittel')}</strong>
            <div style="font-size:13px;color:#aaa;">${escapeHtml(f.releaseDate || '')}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button data-edit="${id}">Rediger</button>
            <button class="danger" data-delete="${id}">Slett</button>
          </div>
        </div>
      `;
      box.appendChild(wrap);

      wrap.querySelector(`[data-edit="${id}"]`)?.addEventListener("click", () => openEditor(id));
      wrap.querySelector(`[data-delete="${id}"]`)?.addEventListener("click", async () => {
        if (!confirm("Slette film?")) return;
        await db.collection("films").doc(id).delete();
        loadManageList();
      });
    });

    // Nyheter
    const ns = await db.collection("news").orderBy("date","desc").get();
    const hr = document.createElement("hr"); hr.style.margin = "16px 0";
    box.appendChild(hr);
    const nh = document.createElement("h3"); nh.textContent = "Nyheter";
    box.appendChild(nh);

    ns.forEach(doc => {
      const n = doc.data();
      const el = document.createElement("div");
      el.className = "edit-box";
      el.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${escapeHtml(n.img || '')}" style="width:96px;height:auto;border-radius:8px;object-fit:cover;">
          <div style="flex:1;">
            <strong>${escapeHtml(n.title || 'Uten tittel')}</strong>
            <div style="font-size:13px;color:#aaa;">
              ${escapeHtml(n.date || '')} ${n.category ? ' · ' + escapeHtml(n.category) : ''}
            </div>
          </div>
          <button class="danger" data-delete-news="${doc.id}">Slett</button>
        </div>
      `;
      box.appendChild(el);
      el.querySelector(`[data-delete-news="${doc.id}"]`)?.addEventListener("click", async () => {
        if (!confirm("Slette nyhet?")) return;
        await db.collection("news").doc(doc.id).delete();
        loadManageList();
      });
    });

  } catch (e) {
    console.error(e);
    box.innerHTML = "<p>Kunne ikke laste filmer.</p>";
  }
}

// -------------------- REDIGERE FILM --------------------
async function openEditor(id) {
  try {
    const docRef = await db.collection("films").doc(id).get();
    if (!docRef.exists) { alert("Fant ikke filmen"); return; }

    const f = docRef.data();
    const r = f.review || {};
    const m = f.metadata || {};

    const panel = document.getElementById("edit-panel");
    if (!panel) return;
    panel.style.display = "block";

    // Hidden ID
    document.getElementById("edit-id")?.remove();
    const hid = document.createElement("input");
    hid.type = "hidden"; hid.id = "edit-id"; hid.value = id;
    panel.prepend(hid);

    // Grunnfelter
    document.getElementById("edit-title").value = f.title || "";
    document.getElementById("edit-desc").value  = f.desc || f.description || "";
    document.getElementById("edit-genre").value = f.genre || "";

    if (f.releaseDate) {
      const [yy, mm, dd] = f.releaseDate.split("-");
      document.getElementById("edit-dag").value    = Number(dd);
      document.getElementById("edit-maaned").value = Number(mm);
      document.getElementById("edit-aar").value    = Number(yy);
    }

    document.getElementById("edit-upcoming").checked = !!f.upcoming;
    document.getElementById("edit-image").value = f.img || "";
    const ep = document.getElementById("edit-preview");
    if (ep) { ep.src = f.img || ""; ep.style.display = f.img ? "block" : "none"; }
    document.getElementById("edit-trailer").value = f.trailer || "";

    // Review fields (inkl. spoilers)
    document.getElementById("edit-review-title").value      = r.title || "";
    document.getElementById("edit-review-subtitle").value   = r.subtitle || "";
    document.getElementById("edit-review-plot").value       = r.plot || "";
    document.getElementById("edit-review-acting").value     = r.acting || "";
    document.getElementById("edit-review-visuals").value    = r.visuals || "";
    document.getElementById("edit-review-music").value      = r.music || "";
    document.getElementById("edit-review-pacing").value     = r.pacing || "";
    document.getElementById("edit-review-conclusion").value = r.conclusion || "";
    document.getElementById("edit-review-score").value      = r.score ?? "";

    // spoilers — støtt både boolean og falsy
    const hasSpoEl = document.getElementById("edit-review-hasSpoilers");
    if (hasSpoEl) hasSpoEl.checked = !!r.hasSpoilers;
    const spoEl = document.getElementById("edit-review-spoilers");
    if (spoEl) spoEl.value = r.spoilers || "";

    // Metadata
    document.getElementById("edit-review-director").value = m.director || "";
    document.getElementById("edit-review-cast").value     = m.cast || "";
    document.getElementById("edit-review-year").value     = m.year || "";
    document.getElementById("edit-review-runtime").value  = m.runtime || "";
    document.getElementById("edit-review-country").value  = m.country || "";
    document.getElementById("edit-review-age").value      = m.age || "";
    document.getElementById("edit-review-cover").value    = m.cover || "";
    document.getElementById("edit-review-gallery").value  = (m.gallery || []).join(", ");
  } catch (e) {
    console.error(e);
    alert("Noe gikk galt ved åpning av redigering.");
  }
}
window.openEditor = openEditor;

// -------------------- LAGRE ENDRINGER --------------------
document.getElementById("btn-save-edit")?.addEventListener("click", async () => {
  const id = document.getElementById("edit-id")?.value;
  if (!id) { alert("Ingen film valgt"); return; }

  const updated = {
    title: document.getElementById("edit-title").value.trim(),
    desc:  document.getElementById("edit-desc").value.trim(),
    // fjern gammel description hvis den eksisterer
    description: firebase.firestore.FieldValue.delete(),
    genre:       document.getElementById("edit-genre").value,
    releaseDate: getDateFromPicker("edit"),
    upcoming:    document.getElementById("edit-upcoming").checked,
    img:         document.getElementById("edit-image").value.trim(),
    trailer:     document.getElementById("edit-trailer").value.trim(),

    review: {
      title:      document.getElementById("edit-review-title").value.trim(),
      subtitle:   document.getElementById("edit-review-subtitle").value.trim(),
      plot:       document.getElementById("edit-review-plot").value.trim(),
      acting:     document.getElementById("edit-review-acting").value.trim(),
      visuals:    document.getElementById("edit-review-visuals").value.trim(),
      music:      document.getElementById("edit-review-music").value.trim(),
      pacing:     document.getElementById("edit-review-pacing").value.trim(),
      conclusion: document.getElementById("edit-review-conclusion").value.trim(),
      // spoilere felter:
      hasSpoilers: !!document.getElementById("edit-review-hasSpoilers")?.checked,
      spoilers:    document.getElementById("edit-review-spoilers")?.value.trim() || "",
      score:       Number(document.getElementById("edit-review-score").value) || 0
    },

    metadata: {
      director: document.getElementById("edit-review-director").value.trim(),
      cast:     document.getElementById("edit-review-cast").value.trim(),
      year:     document.getElementById("edit-review-year").value.trim(),
      runtime:  document.getElementById("edit-review-runtime").value.trim(),
      country:  document.getElementById("edit-review-country").value.trim(),
      age:      document.getElementById("edit-review-age").value.trim(),
      cover:    document.getElementById("edit-review-cover").value.trim(),
      gallery:  (document.getElementById("edit-review-gallery").value || "")
                  .split(",").map(s=>s.trim()).filter(Boolean)
    }
  };

  try {
    await db.collection("films").doc(id).update(updated);
    document.getElementById("edit-msg").textContent = "Endringer lagret!";
    document.getElementById("edit-panel").style.display = "none";
    loadManageList();
  } catch (e) {
    console.error(e);
    document.getElementById("edit-msg").textContent = "Kunne ikke lagre endringer.";
  }
});

document.getElementById("btn-cancel-edit")?.addEventListener("click", () => {
  document.getElementById("edit-panel").style.display = "none";
});

