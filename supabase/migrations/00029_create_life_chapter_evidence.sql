-- Life chapter evidence: supporting proof linked to source identity rows.

create table public.life_chapter_evidence (
  id uuid primary key default gen_random_uuid(),
  life_chapter_id uuid not null references public.life_chapters (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  evidence_type text not null check (
    evidence_type in (
      'moment',
      'path',
      'check_in',
      'identity_update',
      'future_self',
      'contradiction',
      'alternate_self'
    )
  ),
  evidence_id uuid not null,
  label text not null,
  occurred_at timestamptz not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (life_chapter_id, evidence_type, evidence_id)
);

create index life_chapter_evidence_chapter_sort_idx
  on public.life_chapter_evidence (life_chapter_id, sort_order);

create index life_chapter_evidence_user_id_idx
  on public.life_chapter_evidence (user_id);
