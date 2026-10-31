"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";

export default function AcademyCataloguePage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedLevel, setSelectedLevel] = useState("All");

    const supabase = createClient();

    useEffect(() => {
        async function fetchCourses() {
            setLoading(true);
            const { data, error } = await supabase
                .from("courses")
                .select("*")
                .eq("is_published", true);

            if (error) {
                console.error("Error fetching courses:", error);
            } else if (data) {
                setCourses(data);
            }
            setLoading(false);
        }

        fetchCourses();
    }, [supabase]);

    const filteredCourses = courses.filter((course) => {
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;
        const matchesLevel = selectedLevel === "All" || course.level === selectedLevel;
        return matchesSearch && matchesCategory && matchesLevel;
    });

    const categories = ["All", "Trading", "Financial Markets", "Investment Analysis", "Macroeconomics", "Portfolio Management", "Risk Management"];
    const levels = ["All", "Beginner", "Intermediate", "Advanced"];

    return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-12 max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="border-b border-terminal-border pb-12 mb-12">
                <div className="flex items-center space-x-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-terminal-gold"></span>
                    <span className="font-mono text-xs text-terminal-gold tracking-widest uppercase">SAVANNA CAPITALS ACADEMY</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Build Your Edge in Finance.</h1>
                <p className="text-terminal-muted max-w-2xl text-base leading-relaxed">
                    Develop practical expertise in financial markets, trading, investment research, and portfolio management through structured, applied learning.
                </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center">
                <input
                    type="text"
                    placeholder="Search courses by topic, market, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-96 px-4 py-2.5 rounded bg-terminal-surface border border-terminal-border text-terminal-text placeholder-terminal-muted/50 text-sm focus:outline-none focus:border-terminal-gold font-mono"
                />

                <div className="flex flex-wrap gap-3">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 rounded bg-terminal-surface border border-terminal-border text-terminal-text text-xs font-mono focus:outline-none focus:border-terminal-gold"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="px-3 py-2 rounded bg-terminal-surface border border-terminal-border text-terminal-text text-xs font-mono focus:outline-none focus:border-terminal-gold"
                    >
                        {levels.map((lvl) => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Course Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-80 rounded bg-terminal-surface/50 border border-terminal-border animate-pulse"></div>
                    ))}
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="text-center py-24 bg-terminal-surface border border-terminal-border rounded-lg">
                    <p className="font-mono text-xs text-terminal-muted mb-2">NO MATCHING COURSES</p>
                    <h3 className="text-lg font-bold mb-1">No results found for your criteria</h3>
                    <p className="text-xs text-terminal-muted">Try adjusting your search filters or check back for new releases.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                        <Link
                            key={course.id}
                            href={`/academy/courses/${course.slug}`}
                            className="group p-6 rounded-lg bg-terminal-surface border border-terminal-border hover:border-terminal-gold/50 transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-mono text-xs px-2.5 py-1 rounded bg-terminal-bg text-terminal-gold border border-terminal-border">
                                        {course.category || "General"}
                                    </span>
                                    <span className="font-mono text-xs text-terminal-muted">{course.level || "All Levels"}</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 group-hover:text-terminal-gold transition-colors">{course.title}</h3>
                                <p className="text-xs text-terminal-muted line-clamp-3 mb-6 leading-relaxed">{course.description}</p>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-terminal-border/50">
                                <span className="font-mono text-xs text-terminal-muted">{course.duration_hours ? `${course.duration_hours} hrs` : "Self-paced"}</span>
                                <span className="font-mono font-bold text-terminal-gold">{Number(course.price) === 0 ? "FREE" : `$${Number(course.price)}`}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}