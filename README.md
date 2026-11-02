# Kenya Hiring Pulse
Deploy: `npm i -g vercel && vercel --prod` from this folder (no build step, no env vars, no dependencies).
- `api/jobs.js` pulls Remotive, Jobicy, Remote OK and Arbeitnow, dedupes, classifies, and caches at the edge for 6h.
- `public/` is the dashboard; the page re-checks every 5 minutes.
- `public/baseline.json` holds the verified BLS/HackerRank figures. Update it when new editions publish.
- Source terms: Remotive asks for attribution, max ~4 fetches/day, and no resubmitting its jobs to aggregators. Keep the source links in the footer and the 6h cache.
- Tune `lib/classify.js` (skills, roles, eligibility) as you see misclassifications.
