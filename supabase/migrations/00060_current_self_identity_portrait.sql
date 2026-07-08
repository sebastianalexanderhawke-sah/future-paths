-- Current Self redesign: replace the flat "Core Traits" list with an
-- evidence-first identity portrait. Values are what repeated choices
-- consistently protect, not claimed traits or scored strengths/costs.

alter table public.current_self drop column observations;

-- "values" is quoted: VALUES is a reserved SQL keyword and would otherwise
-- fail to parse as a bare column identifier.
alter table public.current_self
add column "values" jsonb not null default '[]'::jsonb,
add column afraid_of_becoming jsonb not null default '[]'::jsonb,
add column core_tension text not null default '';
