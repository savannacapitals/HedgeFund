"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";

type Course = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  category?: string | null;
  level?: string | null;
  duration_hours?: number | null;
  price?: number | string | null;
};

const CATEGORIES = [
  "All",
  "Trading",
  "Financial Markets",
  "Investment Analysis",
  "Macroeconomics",
  "Portfolio Management",
  "Risk Management",
];

const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"];

const CATEGORY_STYLES: Record<string, { label: string; glow: string; icon: string }> = {
  Trading: { label: "TRADING", glow: "from-emerald-400/20 via-teal-500/5 to-transparent", icon: "↗" },
  "Financial Markets": { label: "MARKETS", glow: "from-sky-400/20 via-cyan-500/5 to-transparent", icon: "⌁" },
  "Investment Analysis": { label: "ANALYSIS", glow: "from-amber-300/20 via-yellow-500/5 to-transparent", icon: "◈" },
  Macroeconomics: { label: "ECONOMICS", glow: "from-violet-400/20 via-purple-500/5 to-transparent", icon: "◎" },
  "Portfolio Management": { label: "PORTFOLIO", glow: "from-blue-400/20 via-indigo-500/5 to-transparent", icon: "▥" },
  "Risk Management": { label: "RISK", glow: "from-rose-400/20 via-pink-500/5 to-transparent", icon: "◇" },
};

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1">
      <path d="M4.5 12h14m-5.5-5.5L18.5 12 13 17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CourseArtwork({ category, index }: { category: string; index: number }) {
  const style = CATEGORY_STYLES[category] ?? {
    label: "ACADEMY",
    glow: "from-emerald-400/20 via-teal-500/5 to-transparent",
    icon: "✳",
  };

  return (
    <div className={`relative isolate flex h-40 items-center justify-between overflow-hidden rounded-t-2xl border-b border-white/[0.07] bg-gradient-to-br ${style.glow} from-[#15232a] via-[#101b22] to-[#0b1218] px-6`}>
      <div className="absolute inset-0 -z-10 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(159,190,178,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(159,190,178,.12) 1px, transparent 1px)", backgroundSize: "28px 28px", maskImage: "linear-gradient(to bottom, black, transparent)" }} />
      <div className="absolute -right-7 -top-16 h-48 w-48 rounded-full border border-emerald-100/10" />
      <div className="absolute -right-1 -top-9 h-36 w-36 rounded-full border border-emerald-100/10" />
      <div className="relative">
        <span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-[#a6c4b5]">{style.label}</span>
        <div className="mt-4 flex items-end gap-1.5" aria-hidden="true">
          {[24, 37, 29, 48, 39, 58, 46, 67, 54, 78, 65, 88].map((height, i) => (
            <span key={i} className={`w-1.5 rounded-t-sm ${i > 8 ? "bg-[#c7ad75]" : "bg-[#4bd6a3]/70"}`} style={{ height: `${height * 0.62}px` }} />
          ))}
        </div>
      </div>
      <div className="relative mr-2 flex h-[76px] w-[76px] items-center justify-center rounded-full border border-[#9ac7b4]/25 bg-[#0c171c]/70 text-4xl font-light text-[#c7ad75] shadow-[0_0_45px_rgba(66,214,163,0.08)]">
        {style.icon}
      </div>
      <span className="absolute bottom-4 right-5 font-mono text-[9px] tracking-[0.16em] text-white/35">MODULE {String(index + 1).padStart(2, "0")}</span>
    </div>
  );
}

export default function AcademyCataloguePage() {
  const supabase = useMemo(() => createClient(), []);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");

  useEffect(() => {
    let active = true;

    async function fetchCourses() {
      setLoading(true);
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true);

      if (!active) return;

      if (error) {
        console.error("Error fetching courses:", error);
      } else {
        setCourses((data ?? []) as Course[]);
      }
      setLoading(false);
    }

    fetchCourses();
    return () => {
      active = false;
    };
  }, [supabase]);

  const filteredCourses = courses.filter((course) => {
    const query = searchQuery.trim().toLowerCase();
    const title = course.title ?? "";
    const description = course.description ?? "";
    const matchesSearch = !query || title.toLowerCase().includes(query) || description.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;
    const matchesLevel = selectedLevel === "All" || course.level === selectedLevel;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  return (
    <main className="min-h-screen overflow-hidden bg-[#080e12] text-[#edf4f0]">
      <div className="pointer-events-none absolute left-0 right-0 top-0 -z-0 h-[620px] bg-[radial-gradient(ellipse_at_72%_12%,rgba(46,139,105,0.17),transparent_47%)]" />

      <section className="relative mx-auto max-w-7xl px-5 pb-14 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:pb-20 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#4bd6a3]/20 bg-[#10211d]/70 px-3.5 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4bd6a3] shadow-[0_0_12px_rgba(75,214,163,.7)]" />
              <span className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[#a8d8c4]">SAVANNA CAPITALS ACADEMY</span>
            </div>

            <h1 className="max-w-3xl text-4xl font-medium leading-[1.08] tracking-[-0.055em] sm:text-5xl lg:text-[64px]">
              Learn the markets.
              <span className="mt-1 block text-[#58d9a8]">Think with conviction.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#9aaba9] sm:text-lg sm:leading-8">
              Build practical financial knowledge through focused courses in markets, investment research, trading, and portfolio strategy.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#course-catalogue" className="group inline-flex min-h-12 items-center gap-3 rounded-lg bg-[#4bd6a3] px-5 text-sm font-semibold text-[#07140f] transition hover:bg-[#73e7bd]">
                Explore courses <ArrowIcon />
              </a>
              <a href="#learning-paths" className="inline-flex min-h-12 items-center rounded-lg border border-white/10 px-5 text-sm font-medium text-[#d5e0dc] transition hover:border-[#4bd6a3]/40 hover:bg-white/[0.03]">
                Explore learning paths
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#7f9290]">
              <span className="inline-flex items-center gap-2"><span className="text-[#4bd6a3]">✓</span> Learn at your own pace</span>
              <span className="inline-flex items-center gap-2"><span className="text-[#4bd6a3]">✓</span> Practical market concepts</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-full bg-[#2b8b68]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-[#9db8ac]/20 bg-[#0e191f]/95 p-5 shadow-[0_28px_100px_rgba(0,0,0,.28)] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-[#78918a]">YOUR LEARNING JOURNEY</p>
                  <h2 className="mt-2 text-xl font-medium tracking-tight sm:text-2xl">From fundamentals to insight</h2>
                </div>
                <div className="rounded-lg border border-[#4bd6a3]/20 bg-[#16352a] px-2.5 py-1.5 font-mono text-[9px] tracking-wider text-[#72e3b7]">ACADEMY</div>
              </div>

              <div className="mt-7 rounded-xl border border-white/[0.07] bg-[#0a1318] p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#91a5a0]">A framework for better decisions</span>
                  <span className="font-mono text-[9px] text-[#6f8a80]">01 — 04</span>
                </div>
                <div className="relative mt-5 h-36 overflow-hidden">
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2, 3].map((line) => <div key={line} className="border-t border-white/[0.06]" />)}
                  </div>
                  <svg viewBox="0 0 420 130" className="relative h-full w-full" role="img" aria-label="Illustrative upward market trend line">
                    <defs><linearGradient id="academy-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4bd6a3" stopOpacity=".23"/><stop offset="100%" stopColor="#4bd6a3" stopOpacity="0"/></linearGradient></defs>
                    <path d="M0 108 C22 100 25 84 48 91 S78 101 97 76 S126 89 149 65 S177 76 196 57 S226 72 246 47 S273 64 296 34 S329 49 349 25 S386 31 420 8 L420 130 L0 130Z" fill="url(#academy-area)"/>
                    <path d="M0 108 C22 100 25 84 48 91 S78 101 97 76 S126 89 149 65 S177 76 196 57 S226 72 246 47 S273 64 296 34 S329 49 349 25 S386 31 420 8" fill="none" stroke="#58d9a8" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="420" cy="8" r="4" fill="#c7ad75"/><circle cx="420" cy="8" r="8" fill="#c7ad75" fillOpacity=".16"/>
                  </svg>
                </div>
                <div className="mt-3 flex justify-between font-mono text-[9px] tracking-wide text-[#637a76]">
                  <span>FOUNDATIONS</span><span>ANALYSIS</span><span>APPLICATION</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { title: "Understand", text: "Market basics" },
                  { title: "Evaluate", text: "Risk & return" },
                  { title: "Apply", text: "Better process" },
                ].map((item, index) => (
                  <div key={item.title} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                    <span className="font-mono text-[9px] text-[#4bd6a3]">0{index + 1}</span>
                    <p className="mt-2 text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-[10px] leading-4 text-[#819590]">{item.text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] leading-4 text-[#617571]">Illustrative learning framework. Educational content is not investment advice.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="learning-paths" className="border-y border-white/[0.07] bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-6 sm:grid-cols-3 sm:px-8 lg:px-12">
          {[
            { n: "01", title: "Market foundations", detail: "Understand how markets work." },
            { n: "02", title: "Research & analysis", detail: "Build a structured way to evaluate." },
            { n: "03", title: "Portfolio & risk", detail: "Explore risk-aware decision making." },
          ].map((item) => (
            <div key={item.n} className="flex items-start gap-4 py-2">
              <span className="pt-0.5 font-mono text-xs text-[#c7ad75]">{item.n}</span>
              <div>
                <h3 className="text-sm font-medium text-[#e0e9e4]">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-[#829490]">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="course-catalogue" className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[#58d9a8]">THE COURSE CATALOGUE</p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Find your next insight.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#91a39e]">Explore focused learning across the disciplines that shape financial decisions.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#819590]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#4bd6a3]" />
            {loading ? "Loading published courses…" : `${filteredCourses.length} ${filteredCourses.length === 1 ? "course" : "courses"} available`}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0d171d] p-3 sm:p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#080f13] px-4 text-[#819590] transition focus-within:border-[#4bd6a3]/50">
              <SearchIcon />
              <span className="sr-only">Search courses</span>
              <input
                type="search"
                placeholder="Search courses, topics, or keywords"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-transparent text-sm text-[#edf4f0] outline-none placeholder:text-[#637570]"
              />
              {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="text-xs text-[#7e938b] hover:text-white" aria-label="Clear search">Clear</button>}
            </label>
            <label className="flex min-h-12 items-center rounded-xl border border-white/[0.08] bg-[#080f13] px-3">
              <span className="sr-only">Filter by topic</span>
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="w-full bg-transparent text-sm text-[#c6d2cc] outline-none">
                {CATEGORIES.map((category) => <option key={category} value={category} className="bg-[#0d171d]">{category === "All" ? "All topics" : category}</option>)}
              </select>
            </label>
            <label className="flex min-h-12 items-center rounded-xl border border-white/[0.08] bg-[#080f13] px-3">
              <span className="sr-only">Filter by level</span>
              <select value={selectedLevel} onChange={(event) => setSelectedLevel(event.target.value)} className="w-full bg-transparent text-sm text-[#c6d2cc] outline-none">
                {LEVELS.map((level) => <option key={level} value={level} className="bg-[#0d171d]">{level === "All" ? "All levels" : level}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.slice(0, 5).map((category) => (
              <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`rounded-full border px-3 py-1.5 text-[11px] transition ${selectedCategory === category ? "border-[#4bd6a3]/40 bg-[#15362a] text-[#79e4b9]" : "border-white/[0.08] text-[#819590] hover:border-white/20 hover:text-[#d7e1dc]"}`}>
                {category === "All" ? "All courses" : category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-[360px] animate-pulse rounded-2xl border border-white/[0.07] bg-[#0e191f]" />)}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d171d] px-6 py-16 text-center sm:py-20">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#4bd6a3]/20 bg-[#153027] text-xl text-[#58d9a8]"><SearchIcon /></div>
              <h3 className="mt-5 text-lg font-medium">No courses found</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#819590]">Try another keyword or adjust your filters to discover more learning opportunities.</p>
              <button type="button" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); setSelectedLevel("All"); }} className="mt-5 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-[#dbe5df] transition hover:border-[#4bd6a3]/40">Reset filters</button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course, index) => (
                <Link key={course.id} href={`/academy/courses/${course.slug}`} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d171d] transition duration-300 hover:-translate-y-1 hover:border-[#4bd6a3]/35 hover:shadow-[0_18px_50px_rgba(0,0,0,.22)]">
                  <CourseArtwork category={course.category ?? ""} index={index} />
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#4bd6a3]/20 bg-[#123025] px-2.5 py-1 text-[10px] font-medium text-[#8ce5bf]">{course.category || "General"}</span>
                      <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] text-[#92a49d]">{course.level || "All levels"}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-medium leading-snug tracking-[-0.02em] text-[#edf4f0] transition group-hover:text-[#79e4b9]">{course.title}</h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-[#8b9e98]">{course.description || "Explore core concepts and develop practical knowledge with this self-paced course."}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                      <div className="flex items-center gap-2 text-xs text-[#819590]">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        {course.duration_hours ? `${course.duration_hours} hours` : "Self-paced"}
                      </div>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#c7ad75]">
                        {Number(course.price) === 0 ? "Free" : `$${Number(course.price || 0).toLocaleString()}`}
                        <ArrowIcon />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 rounded-2xl border border-[#4bd6a3]/15 bg-gradient-to-r from-[#10231d] to-[#0d171d] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#58d9a8]">KEEP BUILDING YOUR EDGE</p>
            <h3 className="mt-2 text-xl font-medium tracking-tight">Good decisions start with good foundations.</h3>
            <p className="mt-2 text-sm text-[#8da19a]">Choose a topic, take the first lesson, and keep learning.</p>
          </div>
          <a href="#course-catalogue" className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-lg border border-[#4bd6a3]/30 px-4 text-sm font-medium text-[#8de7bf] transition hover:bg-[#4bd6a3]/10">Browse the catalogue <ArrowIcon /></a>
        </div>
      </section>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-xs text-[#687d76] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span className="font-mono tracking-[0.12em]">SAVANNA CAPITALS <span className="text-[#c7ad75]">ACADEMY</span></span>
          <span>Education for informed decisions. Content is for educational purposes only.</span>
        </div>
      </footer>
    </main>
  );
}
