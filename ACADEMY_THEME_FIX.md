# Academy tab theme fix

Problem: /academy (src/app/(public)/academy/page.tsx) hard-coded dark hex colours
(bg-[#080E10], text-[#F3F5F2], border-white/10, ...). The site theme (Light / Dark / Device)
works by switching CSS variables (--t-*, --sc-*) that the Tailwind `terminal-*` colours read,
so any page not using those tokens stayed dark.

Fix: swapped every hard-coded colour for the theme tokens used by the other tabs
(terminal-bg / surface / border / text / muted / gold / emerald, plus --sc-green-rgb gradients).
Also changed the page's outer <main> to <div> (layout.tsx already provides <main>).
The dark course-cover banner (Artwork) is intentionally unchanged.

Install: unzip over the project root (it replaces only that one file), or `git apply academy-theme-fix.patch`.
