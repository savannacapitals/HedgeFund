-- ========================================================
-- SAVANNA CAPITALS ACADEMY SCHEMA EXTENSION
-- ========================================================

-- 1. Course Modules Table
CREATE TABLE IF NOT EXISTS public.course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Course Lessons Table
CREATE TABLE IF NOT EXISTS public.course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type TEXT CHECK (content_type IN ('video', 'reading', 'quiz', 'assignment')) DEFAULT 'video',
    content_body TEXT,
    video_url TEXT,
    duration_minutes INT DEFAULT 0,
    is_preview BOOLEAN DEFAULT false,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Course Enrolments (Entitlements) Table
CREATE TABLE IF NOT EXISTS public.course_enrolments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('active', 'completed', 'revoked')) DEFAULT 'active',
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- 4. Lesson Progress Tracking
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, lesson_id)
);

-- 5. Verifiable Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_code TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Modules & Lessons: Public read access
CREATE POLICY "Allow public read access on course_modules" 
    ON public.course_modules FOR SELECT USING (true);

CREATE POLICY "Allow public read access on course_lessons" 
    ON public.course_lessons FOR SELECT USING (true);

-- Enrolments: Users can view their own enrolments
CREATE POLICY "Users can view own enrolments" 
    ON public.course_enrolments FOR SELECT 
    USING (auth.uid() = user_id);

-- Lesson Progress: Users can view and update their own progress
CREATE POLICY "Users can view own progress" 
    ON public.lesson_progress FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" 
    ON public.lesson_progress FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify own progress" 
    ON public.lesson_progress FOR UPDATE 
    USING (auth.uid() = user_id);

-- Certificates: Public verification read access
CREATE POLICY "Allow public read access for certificate verification" 
    ON public.certificates FOR SELECT USING (true);