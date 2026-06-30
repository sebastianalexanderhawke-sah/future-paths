export type { BehaviorObservation, BehaviorObservationInsert } from "@/types/database";

export type IdentityDimension =
  | "Independence"
  | "Connection"
  | "Initiative"
  | "Reflection"
  | "Adaptability"
  | "Curiosity"
  | "Consistency"
  | "Risk Tolerance"
  | "Vulnerability"
  | "Conflict Tolerance";

export type DimensionScore = {
  dimension: IdentityDimension;
  score: number;
};

export type DimensionScoreMap = Record<IdentityDimension, number>;
