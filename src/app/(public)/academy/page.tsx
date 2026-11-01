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

const DEFAULT_CATEGORIES = ["Trading", "Financial Markets", "Investment Analysis", "Macroeconomics", "Portfolio Management", "Risk Management"];

function Arrow() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M4 16 16 4M6 4h10v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" /><path d="m12.5 12.5 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

function Artwork({ category, large = false }: { category?: string | null; large?: boolean }) {
  const key = (category || "").toLowerCase();
  const accent = key.includes("trad") ? "#6DD5B0" : key.includes("macro") ? "#7CB9E8" : key.includes("investment") || key.includes("portfolio") ? "#D9B978" : "#9BC9B4";
  return (
    <div className={`relative isolate overflow-hidden ${large ? "h-full min-h-[250px]" : "h-44"}`} style={{ background: `radial-gradient(circle at 75% 22%, ${accent}38, transparent 34%), linear-gradient(135deg,#18352E 0%,#101C20 55%,#111A27 100%)` }}>
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize: "34px 34px" }} />
      <svg viewBox="0 0 520 280" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M-10 220 C55 207 67 154 120 170 S190 215 236 143 300 166 348 103 424 116 530 38" fill="none" stroke={accent} strokeWidth="2.5" />
        <path d="M-10 245 C55 230 91 206 134 213 S211 235 260 190 330 203 380 158 456 166 530 124" fill="none" stroke={accent} strokeOpacity=".28" strokeWidth="1.2" />
        <path d="M330 0V280M390 0V280M450 0V280" stroke="white" strokeOpacity=".12" strokeDasharray="3 7" />
        <circle cx="348" cy="103" r="5" fill={accent} /><circle cx="348" cy="103" r="13" fill={accent} fillOpacity=".15" />
      </svg>
      <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.2em] text-white/75 backdrop-blur">Savanna Capitals Academy</div>
      <div className="absolute bottom-5 left-5 text-[10px] tracking-[.2em] text-white/55">MARKETS · RESEARCH · CAPITAL</div>
    </div>
  );
}

function priceLabel(price: Course["price"]) {
  const amount = Number(price ?? 0);
  return amount === 0 ? "Free" : `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export default function AcademyCataloguePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    async function loadCourses() {
      setLoading(true);
      const { data, error } = await supabase.from("courses").select("*").eq("is_published", true);
      if (!active) return;
      if (error) {
        console.error("Error fetching courses:", error);
        setCourses([]);
      } else {
        setCourses((data ?? []) as Course[]);
      }
      setLoading(false);
    }
    loadCourses();
    return () => { active = false; };
  }, [supabase]);

  const categories = useMemo(() => {
    const existing = courses.map((course) => course.category).filter((item): item is string => Boolean(item));
    return ["All", ...Array.from(new Set([...DEFAULT_CATEGORIES, ...existing]))];
  }, [courses]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      const searchable = `${course.title ?? ""} ${course.description ?? ""} ${course.category ?? ""}`.toLowerCase();
      return (!query || searchable.includes(query)) && (category === "All" || course.category === category) && (level === "All" || course.level === level);
    });
  }, [courses, search, category, level]);

  const featured = filtered[0];
  const others = filtered.slice(1);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080E10] text-[#F3F5F2]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(55,119,91,.20),transparent_65%)]" />
      <div className="relative mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        <section className="grid gap-10 border-b border-white/[0.09] pb-12 pt-5 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:pb-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#B99A5B]/25 bg-[#B99A5B]/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.22em] text-[#D9BD82]"><span className="h-1.5 w-1.5 rounded-full bg-[#D9BD82]" />Savanna Capitals · Academy</div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl lg:text-[64px]">Learn the markets.<span className="block text-[#8DB9A5]">Think like an investor.</span></h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-[#A4B0AC] sm:text-base">Practical financial education built around market structure, investment research and disciplined capital allocation. Learn at your pace. Apply what matters.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4"><a href="#course-catalogue" className="inline-flex items-center gap-3 rounded-lg bg-[#D4B675] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#101714] transition hover:bg-[#E2C98F]">Explore courses <Arrow /></a><span className="text-xs text-[#75827D]">Structured learning · Self-paced programmes</span></div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#101A1B] p-6 sm:p-8">
            <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full bg-[#4B9276]/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8CA49A]">The learning framework</span><span className="text-xl text-[#D9BD82]">◈</span></div>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[["01", "Understand", "Build a strong foundation"], ["02", "Analyse", "Read markets with context"], ["03", "Apply", "Turn knowledge into process"]].map(([number, title, description]) => <div key={number} className="border-l border-[#6E9C83]/40 pl-3"><span className="font-mono text-[10px] text-[#C9AE75]">{number}</span><h3 className="mt-3 text-sm font-semibold text-white">{title}</h3><p className="mt-2 text-[11px] leading-5 text-[#81908A]">{description}</p></div>)}
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-white/[0.08] pt-4"><span className="text-xs text-[#81908A]">Published programmes</span><span className="font-mono text-xl text-[#D9BD82]">{loading ? "—" : String(courses.length).padStart(2, "0")}</span></div>
            </div>
          </div>
        </section>

        <section id="course-catalogue" className="scroll-mt-8 pt-14">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.22em] text-[#C9AE75]">The catalogue</p><h2 className="text-2xl font-semibold tracking-[-.03em] sm:text-3xl">Explore the curriculum</h2><p className="mt-2 text-sm text-[#899791]">Choose a subject. Build a repeatable edge.</p></div>
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <label className="relative block min-w-0 sm:min-w-[260px]"><span className="sr-only">Search courses</span><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#82928B]"><SearchIcon /></span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the catalogue" className="h-11 w-full rounded-lg border border-white/10 bg-[#10191A] pl-10 pr-4 text-xs text-white outline-none transition placeholder:text-[#64716C] focus:border-[#9BBCA9]/60" /></label>
              <label><span className="sr-only">Filter by level</span><select value={level} onChange={(event) => setLevel(event.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-[#10191A] px-4 text-xs text-[#D5DDD8] outline-none focus:border-[#9BBCA9]/60 sm:min-w-[150px]">{["All", "Beginner", "Intermediate", "Advanced"].map((item) => <option key={item} value={item}>{item === "All" ? "All levels" : item}</option>)}</select></label>
            </div>
          </div>

          <div className="mt-7 flex gap-2 overflow-x-auto pb-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-medium transition ${category === item ? "border-[#BDA36D]/60 bg-[#BDA36D]/[0.12] text-[#E0C98F]" : "border-white/[0.09] bg-white/[0.02] text-[#87948E] hover:border-white/20 hover:text-white"}`}>{item}</button>)}</div>

          {loading ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[350px] animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.035]" />)}</div> :
            filtered.length === 0 ? <div className="mt-8 rounded-2xl border border-white/10 bg-[#10191A] px-6 py-20 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#BDA36D]">◈</div><h3 className="mt-5 text-lg font-semibold">No courses match those filters</h3><p className="mt-2 text-sm text-[#87948E]">Try another keyword or reset the selected category and level.</p><button type="button" onClick={() => { setSearch(""); setCategory("All"); setLevel("All"); }} className="mt-6 text-xs font-semibold text-[#D9BD82] underline underline-offset-4">Clear all filters</button></div> :
              <>
                {featured && <Link href={`/academy/courses/${featured.slug}`} className="group mt-8 grid overflow-hidden rounded-2xl border border-white/[0.10] bg-[#10191A] transition duration-300 hover:border-[#A5C2B1]/40 lg:grid-cols-[.95fr_1.05fr]"><Artwork category={featured.category} large /><div className="flex flex-col justify-center p-6 sm:p-9 lg:p-11"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#C7A96A]/25 bg-[#C7A96A]/[0.08] px-3 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-[#D9BD82]">Featured programme</span><span className="text-[10px] text-[#7F8C86]">{featured.category || "Finance"}</span></div><h3 className="mt-5 max-w-xl text-2xl font-semibold leading-tight tracking-[-.03em] transition group-hover:text-[#B9D4C4] sm:text-3xl">{featured.title}</h3><p className="mt-4 line-clamp-3 max-w-xl text-sm leading-7 text-[#91A099]">{featured.description || "A structured programme designed to develop practical knowledge and analytical capability."}</p><div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/[0.08] pt-5"><span className="text-[10px] uppercase tracking-[.12em] text-[#91A099]">{featured.level || "All levels"}</span><span className="text-[10px] uppercase tracking-[.12em] text-[#91A099]">{featured.duration_hours ? `${featured.duration_hours} hours` : "Self-paced"}</span><span className="ml-auto text-sm font-semibold text-[#D9BD82]">{priceLabel(featured.price)}</span><span className="inline-flex items-center gap-2 text-xs font-semibold text-white">View programme <Arrow /></span></div></div></Link>}
                {others.length > 0 && <div className="mt-12"><div className="mb-5 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">More programmes</h3><span className="font-mono text-[10px] text-[#74817B]">{String(filtered.length).padStart(2, "0")} RESULTS</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{others.map((course) => <Link key={course.id} href={`/academy/courses/${course.slug}`} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#10191A] transition duration-300 hover:-translate-y-1 hover:border-[#A5C2B1]/40 hover:bg-[#13201F]"><Artwork category={course.category} /><div className="flex flex-1 flex-col p-5"><div className="flex items-center justify-between gap-3"><span className="truncate text-[9px] font-semibold uppercase tracking-[.16em] text-[#C9AE75]">{course.category || "Finance"}</span><span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-[#8E9B95]">{course.level || "All levels"}</span></div><h4 className="mt-4 text-lg font-semibold leading-snug tracking-[-.02em] transition group-hover:text-[#B9D4C4]">{course.title}</h4><p className="mt-2 line-clamp-3 text-xs leading-6 text-[#87948E]">{course.description || "Explore the core concepts, frameworks and practical skills in this programme."}</p><div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-5"><span className="text-[10px] text-[#829089]">{course.duration_hours ? `${course.duration_hours} hrs` : "Self-paced"}</span><span className="text-sm font-semibold text-[#D9BD82]">{priceLabel(course.price)}</span></div></div></Link>)}</div></div>}
              </>
          }
        </section>

        <section className="mt-20 overflow-hidden rounded-2xl border border-[#8EB19C]/20 bg-[linear-gradient(110deg,rgba(40,75,61,.34),rgba(15,25,26,.95)_58%)] px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:py-12">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#D9BD82]">Knowledge compounds</p><h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-.03em] sm:text-3xl">Build the judgement behind better financial decisions.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#93A29B]">Start with the fundamentals. Develop your analytical process. Keep improving your understanding of capital and markets.</p></div>
          <a href="#course-catalogue" className="mt-7 inline-flex shrink-0 items-center gap-3 text-xs font-bold uppercase tracking-[.12em] text-[#E0C98F] lg:mt-0">Browse the catalogue <Arrow /></a>
        </section>
      </div>
    </main>
  );
}