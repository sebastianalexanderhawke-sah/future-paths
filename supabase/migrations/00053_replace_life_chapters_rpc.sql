-- Atomic life-chapter replacement.
--
-- generateTimeline previously deleted every existing chapter, then inserted
-- the new set one row at a time from the application. A failure (or
-- interrupted request) after the delete destroyed the user's previous
-- timeline and left a partial new one. This function performs the whole
-- replacement in one transaction: either the complete new chapter set lands,
-- or the previous timeline is untouched.
--
-- SECURITY INVOKER: runs as the calling user, so the existing RLS policies on
-- life_chapters and life_chapter_evidence apply to every statement. user_id
-- is always derived from auth.uid(), never trusted from the payload.

create or replace function public.replace_life_chapters(p_chapters jsonb)
returns setof public.life_chapters
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_chapter jsonb;
  v_evidence jsonb;
  v_chapter_id uuid;
  v_chapter_index integer := 0;
  v_evidence_index integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- The timeline prompt produces at most 8 chapters with at most 8 evidence
  -- entries each; 12 leaves headroom without accepting unbounded payloads.
  if p_chapters is null
     or jsonb_typeof(p_chapters) <> 'array'
     or jsonb_array_length(p_chapters) < 1
     or jsonb_array_length(p_chapters) > 12 then
    raise exception 'invalid_chapters_payload';
  end if;

  delete from public.life_chapter_evidence where user_id = v_uid;
  delete from public.life_chapters where user_id = v_uid;

  for v_chapter in select * from jsonb_array_elements(p_chapters) loop
    insert into public.life_chapters (
      user_id, title, period_label, starts_at, ends_at, summary, themes,
      includes_current_self, sort_order
    )
    values (
      v_uid,
      v_chapter ->> 'title',
      v_chapter ->> 'period_label',
      (v_chapter ->> 'starts_at')::date,
      (v_chapter ->> 'ends_at')::date,
      v_chapter ->> 'summary',
      coalesce(v_chapter -> 'themes', '[]'::jsonb),
      coalesce((v_chapter ->> 'includes_current_self')::boolean, false),
      v_chapter_index
    )
    returning id into v_chapter_id;

    v_evidence_index := 0;
    for v_evidence in
      select * from jsonb_array_elements(coalesce(v_chapter -> 'evidence', '[]'::jsonb))
    loop
      -- A duplicate evidence reference within a chapter is a draft-quality
      -- issue, not a reason to lose the user's timeline: skip it instead of
      -- aborting the whole replacement.
      insert into public.life_chapter_evidence (
        life_chapter_id, user_id, evidence_type, evidence_id, label,
        occurred_at, sort_order
      )
      values (
        v_chapter_id,
        v_uid,
        v_evidence ->> 'evidence_type',
        (v_evidence ->> 'evidence_id')::uuid,
        v_evidence ->> 'label',
        (v_evidence ->> 'occurred_at')::timestamptz,
        coalesce((v_evidence ->> 'sort_order')::smallint, v_evidence_index)
      )
      on conflict (life_chapter_id, evidence_type, evidence_id) do nothing;

      v_evidence_index := v_evidence_index + 1;
    end loop;

    v_chapter_index := v_chapter_index + 1;
  end loop;

  return query
    select *
      from public.life_chapters
     where user_id = v_uid
     order by sort_order asc;
end;
$$;

revoke execute on function public.replace_life_chapters(jsonb) from public, anon;
grant execute on function public.replace_life_chapters(jsonb) to authenticated;
