// Lumen local account — plain name+PIN sign-up/sign-in, stored hashed in the browser.
// Works immediately, no internet, no Google. YouTube linking stays optional via GIS.
(async () => {
  const $ = (s) => document.querySelector(s);
  const KEY = "lumen-account", SES = "lumen-session";
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
  const write = (k, v) => v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v));
  const hash = async (salt, pin) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + "::" + pin));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const paint = () => {
    const ses = read(SES), acc = read(KEY);
    const box = $("#acct"), out = $("#acctOut");
    if (!box || !out) return;
    if (ses) {
      box.classList.add("hidden"); out.classList.remove("hidden");
      $("#acctName").textContent = ses.name;
      const chip = document.querySelector("#chipUser b");
      if (chip) chip.textContent = ses.name;
    } else {
      box.classList.remove("hidden"); out.classList.add("hidden");
      if (acc) { $("#acctHintL").textContent = "حسابك موجود على هذا المتصفح — أدخل رقمك السري للدخول."; }
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    const btn = $("#acctGo"), acc = read(KEY);
    if (!btn) return;
    btn.textContent = acc ? "دخول" : "إنشاء الحساب";
    btn.onclick = async () => {
      const name = ($("#acctUser")?.value || "").trim();
      const pin = ($("#acctPass")?.value || "").trim();
      if (!name || pin.length < 4) { alert("اكتب الاسم + رقم سري من 4 خانت أو أكثر"); return; }
      const acct = read(KEY);
      if (!acct) {
        const salt = Math.random().toString(36).slice(2);
        write(KEY, { name, salt, hash: await hash(salt, pin) });
        write(SES, { name, at: Date.now() });
      } else {
        if (acct.name !== name) { alert("الاسم لا يطابق الحساب المحفوظ"); return; }
        if ((await hash(acct.salt, pin)) !== acct.hash) { alert("رقم سري غير صحيح"); return; }
        write(SES, { name, at: Date.now() });
      }
      paint();
    };
    const out = $("#acctExit");
    if (out) out.onclick = () => { write(SES, null); paint(); };
    paint();
  });
})();
