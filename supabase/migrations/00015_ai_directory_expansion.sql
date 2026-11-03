-- AI Opportunities directory expansion (research pass, 3 Nov 2026)
-- RULES USED: nothing is marked "verified". Status "conditional"/"restricted" and a Kenya value other than
-- "unknown" are set ONLY where a platform's own page, a news report or a Kenya-focused tracker was read.
-- last_verified is left empty on purpose: staff set it after checking each official website in /admin/ai.

-- 1. NEW PLATFORMS ---------------------------------------------------------------------------------
insert into public.ai_platforms (slug, name, short_description, category, official_url, verification_status, kenya_eligibility, last_verified, is_featured) values
  ('telus-digital-ai', 'TELUS Digital AI Community', 'Remote, part-time AI training and data annotation work for a global community of contributors. Projects open by country and language.', 'data_annotation', 'https://www.telusdigital.com', 'conditional', 'conditional', null, false),
  ('rws-trainai', 'RWS TrainAI Community', 'Freelance data collection, annotation and language work for AI projects. Free to join; RWS states it never asks for payment.', 'data_annotation', 'https://www.rws.com/artificial-intelligence/train-ai-data-services/trainai-community/', 'conditional', 'conditional', null, false),
  ('prolific', 'Prolific', 'Paid academic and AI research studies, including surveys and evaluation tasks. Open mainly to supported countries; waitlist elsewhere.', 'ai_evaluation', 'https://www.prolific.com', 'conditional', 'conditional', null, false),
  ('clickworker', 'Clickworker', 'Micro-task marketplace for data tasks such as text, image and survey work. Registration is opened and closed country by country.', 'data_annotation', 'https://www.clickworker.com', 'conditional', 'conditional', null, false),
  ('remotasks', 'Remotasks', 'Task platform run by Scale AI for annotation work. Stopped operating in Kenya in March 2024.', 'data_annotation', 'https://www.remotasks.com', 'restricted', 'no', null, false),
  ('handshake-ai', 'Handshake AI', 'Connects students, graduates and experts with AI labs for model training and evaluation. Open applications reported as US only.', 'expert_freelancing', 'https://joinhandshake.com', 'restricted', 'no', null, false),
  ('turing', 'Turing', 'Matches software engineers and other experts with AI and technology companies on longer contracts.', 'expert_freelancing', 'https://www.turing.com', 'under_review', 'unknown', null, false),
  ('invisible-technologies', 'Invisible Technologies', 'Operations and AI training company that hires specialists for model training and evaluation projects.', 'expert_freelancing', null, 'under_review', 'unknown', null, false),
  ('innodata', 'Innodata', 'Data engineering company that runs AI data annotation and model evaluation programs.', 'data_annotation', 'https://innodata.com', 'under_review', 'unknown', null, false),
  ('dataforce', 'DataForce', 'AI data services from TransPerfect: data collection, annotation and evaluation with a contributor community.', 'data_annotation', null, 'under_review', 'unknown', null, false),
  ('imerit', 'iMerit', 'Data annotation and AI data services company with managed teams and expert contributors.', 'data_annotation', 'https://imerit.net', 'under_review', 'unknown', null, false),
  ('defined-ai', 'Defined.ai', 'AI data marketplace that sources speech, text and image data from contributors through its crowd programs.', 'data_annotation', 'https://www.defined.ai', 'under_review', 'unknown', null, false),
  ('hive-micro', 'Hive Micro', 'Micro-task platform for labeling and moderation tasks from Hive.', 'data_annotation', 'https://hivemicro.com', 'under_review', 'unknown', null, false),
  ('microworkers', 'Microworkers', 'Micro-task marketplace where employers post small online jobs for a global workforce.', 'remote_digital_work', 'https://www.microworkers.com', 'under_review', 'unknown', null, false),
  ('rev', 'Rev', 'Transcription, captioning and subtitling work for freelancers.', 'language_transcription', 'https://www.rev.com', 'under_review', 'unknown', null, false),
  ('upwork', 'Upwork', 'General freelance marketplace that also lists AI training, data labeling and evaluation contracts.', 'remote_digital_work', 'https://www.upwork.com', 'under_review', 'unknown', null, false),
  ('fiverr', 'Fiverr', 'Freelance marketplace where you sell services, including data annotation, translation and AI-related gigs.', 'remote_digital_work', 'https://www.fiverr.com', 'under_review', 'unknown', null, false)
on conflict (slug) do nothing;

-- 2. CORRECTIONS TO EXISTING LISTINGS ------------------------------------------------------------------
-- Mercor: its own policy pages list Kenya as unsupported for onboarding and payouts.
update public.ai_platforms set verification_status = 'restricted', kenya_eligibility = 'no', is_featured = false,
  short_description = 'Talent marketplace that connects domain experts with AI lab projects. Mercor lists Kenya as an unsupported country.'
  where slug = 'mercor';
-- Outlier: Kenya is not on its permitted-country list (reported by two independent Kenya trackers, Oct 2026).
update public.ai_platforms set verification_status = 'restricted', kenya_eligibility = 'no',
  short_description = 'AI training platform operated by Scale AI. Kenya is reported as not on its permitted-country list.'
  where slug = 'outlier';
-- micro1: reported as not on its published list of countries it cannot hire from.
update public.ai_platforms set verification_status = 'conditional', kenya_eligibility = 'conditional' where slug = 'micro1';
-- Featured platforms are the free sample new visitors see. Feature the ones that can actually work from Kenya.
update public.ai_platforms set is_featured = false where slug in ('dataannotation', 'oneforma');
update public.ai_platforms set is_featured = true where slug in ('opentrain-ai', 'micro1', 'telus-digital-ai');

-- 3. EMPTY GUIDE ROWS for every new platform -----------------------------------------------------------
insert into public.ai_platform_guides (platform_id)
  select id from public.ai_platforms
  on conflict (platform_id) do nothing;

-- 4. WHAT WAS FOUND: guide notes for the platforms with real evidence ------------------------------------
update public.ai_platform_guides g set
  accepting_registrations = 'no', pays_in_kenya = 'no',
  country_eligibility = 'Not available in Kenya since March 2024',
  restriction_notes = 'Scale AI cut off Remotasks access for workers in Kenya on 8 March 2024. Do not use a VPN or someone else''s account to get around this: it breaks the platform''s rules and can lead to lost balances.',
  sources = '[{"label":"Rest of World: Remotasks shut down in Kenya, Nigeria and Pakistan","url":"https://restofworld.org/2024/scale-ai-remotasks-banned-workers/"}]'::jsonb
from public.ai_platforms p where g.platform_id = p.id and p.slug = 'remotasks';

update public.ai_platform_guides g set
  accepting_registrations = 'no', pays_in_kenya = 'no',
  country_eligibility = 'Kenya is listed as an unsupported country',
  restriction_notes = 'Mercor''s own policy pages list Kenya under unsupported countries for payouts and under restricted regions for phone verification. Some region-targeted research-participant projects have been advertised for Kenya, so confirm on Mercor''s official pages before applying. Mercor says it never charges talent any fee.',
  resources = '[{"label":"Mercor supported countries (payments)","url":"https://talent.docs.mercor.com/policies/supported-countries"}]'::jsonb,
  sources = '[{"label":"Mercor supported countries policy","url":"https://talent.docs.mercor.com/policies/supported-countries"},{"label":"paybillke: Mercor in Kenya (checked 16 Oct 2026)","url":"https://paybillke.com/online-jobs/ai-training-jobs"}]'::jsonb
from public.ai_platforms p where g.platform_id = p.id and p.slug = 'mercor';

update public.ai_platform_guides g set
  accepting_registrations = 'no', pays_in_kenya = 'no',
  country_eligibility = 'Kenya is reported as not on the permitted-country list',
  restriction_notes = 'Independent Kenya trackers report that Outlier''s working guidelines (effective 15 July 2026) do not list Kenya. Outlier is run by the same company as Remotasks. Confirm on Outlier''s own pages before spending time.',
  sources = '[{"label":"paybillke: AI training jobs in Kenya (16 Oct 2026)","url":"https://paybillke.com/online-jobs/ai-training-jobs"}]'::jsonb
from public.ai_platforms p where g.platform_id = p.id and p.slug = 'outlier';

update public.ai_platform_guides g set
  accepting_registrations = 'varies', pays_in_kenya = 'unknown',
  country_eligibility = 'Open applications reported as US only; outside the US by invitation',
  restriction_notes = 'A Kenya tracker reports that Handshake AI takes open applications only from the US and invites people elsewhere. Not independently verified by Savanna.',
  sources = '[{"label":"paybillke: AI training jobs in Kenya (16 Oct 2026)","url":"https://paybillke.com/online-jobs/ai-training-jobs"}]'::jsonb
from public.ai_platforms p where g.platform_id = p.id and p.slug = 'handshake-ai';

update public.ai_platform_guides g set
  accepting_registrations = 'varies', has_projects = 'varies', pays_in_kenya = 'unknown',
  country_eligibility = 'Supported countries are mostly OECD. Kenya appears only among countries with small participant populations; waitlist or invitation.',
  restriction_notes = 'Prolific says eligibility depends on where you live. You cannot buy a place: anyone selling an invitation or a "Prolific job" for a fee is running a scam.',
  resources = '[{"label":"Who are the participants on Prolific?","url":"https://researcher-help.prolific.com/en/articles/445224-who-are-the-participants-on-prolific"}]'::jsonb,
  sources = '[{"label":"Prolific: Who are the participants on Prolific?","url":"https://researcher-help.prolific.com/en/articles/445224-who-are-the-participants-on-prolific"}]'::jsonb
from public.ai_platforms p where g.platform_id = p.id and p.slug = 'prolific';

update public.ai_platform_guides g set
  accepting_registrations = 'varies', has_projects = 'varies', pays_in_kenya = 'unknown',
  country_eligibility = 'Registration is opened and closed per country, depending on available work',
  restriction_notes = 'Clickworker says it switches registration off for countries where it has enough workers or little client demand. Before working, check which payout methods appear in your account: direct bank payment covers SEPA countries and the US, otherwise PayPal. Many SEO pages about "Clickworker Kenya" are unreliable.',
  resources = '[{"label":"Clickworker support: working from different countries","url":"https://support-workplace.clickworker.com/support/solutions/articles/80000671469-is-it-possible-to-work-for-clickworker-from-many-countries-all-over-the-world-"}]'::jsonb,
  sources = '[{"label":"Clickworker support center","url":"https://support-workplace.clickworker.com/support/solutions/articles/80000671469-is-it-possible-to-work-for-clickworker-from-many-countries-all-over-the-world-"}]'::jsonb
from public.ai_platforms p where g.platform_id = p.id and p.slug = 'clickworker';

update public.ai_platform_guides g set
  accepting_registrations = 'yes', has_projects = 'varies', pays_in_kenya = 'unknown',
  country_eligibility = 'Projects open by country and language. Roles for Nairobi have been advertised.',
  restriction_notes = 'Work is project-based and open only in countries and languages where TELUS has a project. Some TELUS AI Community roles are advertised as full-time onsite; the remote contributor work is part time. Evidence for Kenya here is a third-party job board listing (Mar 2026), not TELUS''s own country list.',
  sources = '[{"label":"TELUS International AI Community listing, Nairobi (third-party job board, Mar 2026)","url":"https://www.greatkenyanjobs.com/jobs/job-detail/job-Robotics-AI-Specialist-AI-Community-job-at-TELUS-International-138538"}]'::jsonb
from public.ai_platforms p where g.platform_id = p.id and p.slug = 'telus-digital-ai';

update public.ai_platform_guides g set
  accepting_registrations = 'yes', has_projects = 'varies', pays_in_kenya = 'unknown', min_age = 18,
  country_eligibility = 'Projects are listed by country. A remote part-time role in Kenya was advertised in Oct 2024.',
  restriction_notes = 'RWS says there is no fee to join the TrainAI community and that it will never ask you for payment. Official emails come only from rws.com or moravia.com domains.',
  resources = '[{"label":"Join the TrainAI community","url":"https://www.rws.com/artificial-intelligence/train-ai-data-services/trainai-community/"}]'::jsonb,
  sources = '[{"label":"RWS TrainAI community","url":"https://www.rws.com/artificial-intelligence/train-ai-data-services/trainai-community/"},{"label":"RWS TrainAI recruiting FAQ","url":"https://community.rws.com/community-hub/resources/rws-services-train-ai-others/trainai/w/faq/6805/recruiting-process"}]'::jsonb
from public.ai_platforms p where g.platform_id = p.id and p.slug = 'rws-trainai';
