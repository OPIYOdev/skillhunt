const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
let DATA = null, mine = new Set(ls.get("skills", ["Python", "FastAPI", "REST APIs", "Flutter", "Agents (LangGraph/CrewAI)", "Docker"]));
const lastSeen = new Set(ls.get("seen", [])); let firstLoad = lastSeen.size === 0;
const ELIG = { kenya: 3, africa: 2, worldwide: 1 };
async function load() {
  try { const r = await fetch("/api/jobs"); if (!r.ok) throw new Error("HTTP " + r.status); DATA = await r.json(); render(); }
  catch (e) { $("updated").textContent = "Feed unavailable (" + e.message + "). Showing last data if any."; }
}
function filtered(ignoreQ) {
  const e = $("fElig").value, role = $("fRole").value, sen = $("fSen").value, q = $("fQ").value.toLowerCase();
  return DATA.jobs.filter(j => (e === "all" || (e === "kenya" ? j.eligibility === "kenya" : ELIG[j.eligibility]))
    && (!role || j.role === role) && (!sen || j.seniority === sen) && (!$("fNew").checked || !lastSeen.has(j.id))
    && (ignoreQ || !q || (j.title + j.company + j.skills.join(" ")).toLowerCase().includes(q)));
}
const score = j => j.skills.length ? Math.round(100 * j.skills.filter(s => mine.has(s)).length / j.skills.length) : 0;
function fillSelect(el, label, vals) { const cur = el.value; el.innerHTML = `<option value="">${label}</option>` + vals.map(v => `<option>${esc(v)}</option>`).join(""); el.value = cur; }
function render() {
  const all = DATA.jobs, d = new Date(DATA.generatedAt);
  $("updated").textContent = `${all.length} listings · fetched ${d.toLocaleString()}`;
  fillSelect($("fRole"), "All roles", [...new Set(all.map(j => j.role))].sort());
  fillSelect($("fSen"), "All seniority", [...new Set(all.map(j => j.seniority))]);
  $("srcs").innerHTML = Object.entries(DATA.status).map(([k, s]) => `<a href="${esc(DATA.sources[k].url)}" rel="noopener">${esc(DATA.sources[k].name)}</a> ${s.ok ? s.count : "down (" + esc(s.error) + ")"}`).join(" · ");
  $("myskills").innerHTML = [...new Set([...mine, ...all.flatMap(j => j.skills)])].sort().map(s => `<button class="chip ${mine.has(s) ? "on" : ""}" data-s="${esc(s)}" aria-pressed="${mine.has(s)}">${esc(s)}</button>`).join("");
  list(); prompts();
}
function list() {
  const base = filtered(), jobs = base.slice().sort((a, b) => score(b) - score(a) || new Date(b.date) - new Date(a.date));
  $("count").textContent = `${jobs.length} roles match. Sorted by how many of the skills each posting names you already have.`;
  $("jobs").innerHTML = jobs.slice(0, 80).map(j => `<li class="job"><div><a href="${esc(j.url)}" rel="noopener" target="_blank">${esc(j.title)}</a><br><small>${esc(j.company)} · ${esc(j.role)} · ${esc(j.seniority)} · ${new Date(j.date).toLocaleDateString()} · ${esc(j.source)}</small>
  <div>${lastSeen.has(j.id) || firstLoad ? "" : '<span class="tag new">new</span>'}<span class="tag ${j.eligibility === "restricted" || j.eligibility === "unknown" ? "e-restricted" : ""}">${esc(j.eligibilityLabel)}</span>${j.skills.map(s => `<span class="tag ${mine.has(s) ? "" : "miss"}">${esc(s)}</span>`).join("")}${j.salary ? `<span class="tag">${esc(j.salary)}</span>` : ""}</div></div>
  <div class="score">${j.skills.length ? score(j) + "%" : "–"}<small>skill match</small></div></li>`).join("") || '<li class="hint">No roles match these filters. Widen eligibility or clear the search.</li>';
  const cnt = {}; base.forEach(j => j.skills.forEach(s => cnt[s] = (cnt[s] || 0) + 1));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 14), max = top[0]?.[1] || 1;
  $("demandScope").textContent = `(${base.length} roles in current filter)`;
  $("demand").innerHTML = top.map(([s, n]) => `<div class="bar ${mine.has(s) ? "have" : ""}"><span>${esc(s)}</span><i style="width:${100 * n / max}%"></i><span>${Math.round(100 * n / base.length)}%</span></div>`).join("") || '<p class="hint">Nothing to chart yet.</p>';
  const tally = k => Object.entries(base.reduce((a, j) => (a[j[k]] = (a[j[k]] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]);
  $("mix").innerHTML = [...tally("seniority"), ["—", ""], ...tally("role").slice(0, 6)].map(([k, n]) => n === "" ? "<br>" : `<div class="mixrow"><span>${esc(k)}</span><b>${n}</b></div>`).join("");
}
function prompts() {
  const open = DATA.jobs.filter(j => ELIG[j.eligibility] && j.skills.length), P = [];
  const cnt = {}; open.forEach(j => j.skills.forEach(s => { if (!mine.has(s)) cnt[s] = (cnt[s] || 0) + 1; }));
  Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([s, n]) => P.push(`<div class="prompt"><b>Learn ${esc(s)}</b>${n} of ${open.length} open Kenya-eligible roles name it and it isn't in your skills. Ship one small project that uses it and put it on your CV.</div>`));
  const junior = open.filter(j => /Junior|Intern/.test(j.seniority)).length, senior = open.filter(j => /Senior|Lead|Staff/.test(j.seniority)).length;
  P.push(`<div class="prompt warn"><b>Seniority gap</b>${senior} senior-or-above vs ${junior} junior/intern roles among ${open.length} eligible listings. Treat "unspecified" titles as the realistic door in, and read their requirements for years of experience.</div>`);
  const kenya = open.filter(j => j.eligibility === "kenya").length;
  P.push(`<div class="prompt warn"><b>Kenya-specific supply is thin</b>${kenya} listings in these feeds explicitly name Kenya or East Africa; ${open.length - kenya} are worldwide or Africa-wide. Check local boards and employer sites too: these feeds don't cover them.</div>`);
  const best = open.filter(j => score(j) >= 60).length;
  P.push(`<div class="prompt"><b>Apply this week</b>${best} eligible roles already match 60%+ of the skills they list. Sort by match below and apply to those first.</div>`);
  $("prompts").innerHTML = P.join("");
}
$("myskills").onclick = e => { const s = e.target.dataset?.s; if (!s) return; mine.has(s) ? mine.delete(s) : mine.add(s); ls.set("skills", [...mine]); render(); };
["fElig", "fRole", "fSen", "fQ", "fNew"].forEach(id => $(id).addEventListener("input", () => DATA && list()));
$("refresh").onclick = load;
fetch("/baseline.json").then(r => r.json()).then(b => {
  $("chk").textContent = b.checked;
  $("verified").innerHTML = b.verified.map(v => `<div class="v">${esc(v.label)}<b>${esc(v.value)}</b><a href="${esc(v.url)}" rel="noopener">${esc(v.src)}</a></div>`).join("");
  $("caveats").innerHTML = b.caveats.map(c => `<li>${esc(c)}</li>`).join("");
});
load(); setInterval(load, 5 * 60 * 1000); // cheap: served from the edge cache between 6-hour refreshes
addEventListener("pagehide", () => DATA && ls.set("seen", DATA.jobs.map(j => j.id)));
