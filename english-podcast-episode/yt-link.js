// Shared YouTube linking logic (page: /youtube.html, studio tab: /studio/#/youtube)
const $ = (s) => document.querySelector(s);
const store = {
  get: () => { try { return JSON.parse(localStorage.getItem("yt-links") || "[]"); } catch { return []; } },
  set: (v) => localStorage.setItem("yt-links", JSON.stringify(v)),
};

function ytId(u) {
  const m = String(u || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/) || String(u || "").match(/^([\w-]{11})$/);
  return m ? m[1].slice(0, 20) : null;
}

function render() {
  const list = store.get();
  $("#ytList").innerHTML = list.map((it, k) => `
    <li class="yt">
      <img src="https://i.ytimg.com/vi/${it.id}/default.jpg" alt="" onerror="this.style.visibility='hidden'">
      <span class="ttl">${it.url}</span>
      <button data-prev="${k}">معاينة</button>
      <button data-del="${k}" class="ghost">حذف</button>
    </li>`).join("");
  $("#exportBox").classList.add("hidden");
}

$("#addBtn").onclick = () => {
  const id = ytId($("#ytUrl").value.trim());
  if (!id) { alert("رابط يوتيوب غير صالح"); return; }
  const url = `https://www.youtube.com/watch?v=${id}`;
  const list = store.get();
  if (!list.some((x) => x.id === id)) list.push({ id, url });
  store.set(list); $("#ytUrl").value = ""; render();
  preview({ id, url });
};

function preview(it) {
  $("#preview").innerHTML = `<iframe src="https://www.youtube.com/embed/${it.id}?autoplay=1&mute=1&loop=1&playlist=${it.id}&controls=0&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
}

document.addEventListener("click", (e) => {
  const prev = e.target.dataset.prev, del = e.target.dataset.del;
  if (prev != null) { const it = store.get()[Number(prev)]; if (it) preview(it); }
  if (del != null) { const l = store.get(); l.splice(Number(del), 1); store.set(l); render(); }
});

$("#exportBtn").onclick = async () => {
  const list = store.get();
  if (!list.length) { alert("القائمة فارغة"); return; }
  const payload = list.map((x, k) => ({
    slug: `yt-${x.id}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 24),
    type: "yt", url: x.url, cc_only: false,
  }));
  const txt = JSON.stringify(payload, null, 2);
  $("#exportBox").textContent = `# أرسل هذا للوكيل — سيضيفه لطابور الجلب ويجرّب التحميل، ومعه روابط التضمين الفورية:\n${txt}`;
  $("#exportBox").classList.remove("hidden");
  try { await navigator.clipboard.writeText(txt); $("#exportBtn").textContent = "✓ نُسخ"; setTimeout(() => $("#exportBtn").textContent = "نسخ طلبات الجلب (أرسلها للوكيل)", 1800); } catch {}
};
$("#clearBtn").onclick = () => { store.set([]); render(); };

/* ── Google sign-in (works after a Client ID is pasted into youtube-config.json) ── */
(async () => {
  let cfg = {};
  try { cfg = await fetch((location.pathname.includes("/studio/")?"../":"./")+"youtube-config.json?t=" + Date.now(), { cache: "no-store" }).then(r => r.json()); } catch {}
  const cid = (cfg.googleClientId || "").trim();
  const usable = cid.endsWith(".apps.googleusercontent.com") && !cid.startsWith("PASTE_");
  if (!usable) {
    $("#authText").innerHTML = 'الربط المباشر بحساب Google غير مهيّأ بعد — الصق معرّف العميل في <code>youtube-config.json</code> (تعليمات داخل الملف). <b>تضمين المقطع أدناه يعمل فورًا بلا تسجيل.</b>';
    $("#authHint").innerHTML = 'إنشاء المعرّف: console.cloud.google.com/apis/credentials ← Create Credentials ← OAuth client ID ← Web — وأضف أصل هذه الصفحة إلى Authorized JavaScript origins.';
    return;
  }
  const saved = JSON.parse(localStorage.getItem("yt-auth") || "null");
  const showUser = (u) => {
    $("#authText").innerHTML = `<span class="ok">مرتبط ✓ ${u.name || u.email || ""}</span>`;
    if (u.picture) { const im = document.createElement("img"); im.className = "avatar"; im.src = u.picture; $("#authStatus").appendChild(im); }
    $("#signin").classList.add("hidden"); $("#signout").classList.remove("hidden");
  };
  if (saved?.user) showUser(saved.user);
  function initClient() {
    if (!window.google?.accounts?.oauth2) return setTimeout(initClient, 300);
    const client = google.accounts.oauth2.initTokenClient({
      client_id: cid,
      scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/youtube.readonly",
      callback: async (resp) => {
        if (resp.error) return;
        const u = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + resp.access_token } }).then(r => r.json()).catch(() => ({}));
        localStorage.setItem("yt-auth", JSON.stringify({ token: resp.access_token, user: u }));
        showUser(u);
      },
    });
    $("#signin").classList.remove("hidden");
    if (!saved?.user) $("#authText").textContent = "اضغط تسجيل الدخول لربط حسابك (قراءة اليوتيوب فقط).";
    $("#signin").onclick = () => client.requestAccessToken();
    $("#signout").onclick = () => { localStorage.removeItem("yt-auth"); location.reload(); };
  }
  initClient();
})();

render();
