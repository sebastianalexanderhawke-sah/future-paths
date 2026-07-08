-- Current Self: add "The Tradeoff You Live With" — the single recurring cost
-- of becoming this person. Stored as one text column encoding three parts,
-- "strength\ntradeoff\nobservation", the same newline convention core_tension-
-- adjacent fields use. Empty string means the section is omitted (evidence too
-- weak to name a genuine tradeoff), mirroring core_tension's empty-default shape.

alter table public.current_self
add column core_tradeoff text not null default '';
