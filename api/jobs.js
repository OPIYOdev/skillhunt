import { SOURCES } from "../lib/sources.js";
import { roleOf, seniorityOf, eligibilityOf, skillsOf } from "../lib/classify.js";
export default async function handler(req, res) {
  const keys = Object.keys(SOURCES);
  const out = await Promise.allSettled(keys.map(async k => (await SOURCES[k].run()).map(j => ({ ...j, source: k }))));
  const status = {}; let jobs = [];
  out.forEach((r, i) => { status[keys[i]] = r.status === "fulfilled" ? { ok: true, count: r.value.length } : { ok: false, error: String(r.reason?.message || r.reason) }; if (r.status === "fulfilled") jobs.push(...r.value); });
  const seen = new Set();
  jobs = jobs.filter(j => { const k = (j.company + "|" + j.title).toLowerCase().replace(/\W+/g, ""); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(j => { const e = eligibilityOf(j.loc); return { id: j.id, title: j.title, company: j.company, url: j.url, date: j.date, source: j.source, salary: j.salary, role: roleOf(j.title + " " + j.tags.join(" ")), seniority: seniorityOf(j.title), eligibility: e.tier, eligibilityLabel: e.label, skills: skillsOf(`${j.title} ${j.tags.join(" ")} ${j.text}`) }; })
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 600);
  // Remotive allows ~4 fetches/day, so cache at the edge for 6h and serve stale while refreshing.
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
  res.status(200).json({ generatedAt: new Date().toISOString(), status, sources: Object.fromEntries(keys.map(k => [k, { name: SOURCES[k].name, url: SOURCES[k].url }])), jobs });
}
