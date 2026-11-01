import { z } from "zod"

// What can be stored on a vineyard block. Shared by the block form and by the Excel import.
export const BlockSchema = z.object({
  name: z.string().min(1, "שם הבלוק נדרש"),
  location: z.string().trim().min(1).nullable(),
  elevationMeters: z.number().int().nullable(),
  slopeDirection: z.string().trim().min(1).nullable(),
  slopeAngleDegrees: z.number().nullable(),
  soilType: z.string().trim().min(1).nullable(),
  variety: z.string().min(1, "זן הגפן נדרש"),
  rootstock: z.string().trim().min(1).nullable(),
  plantingYear: z.number().int().min(1900).max(2100).nullable(),
  plantingDensity: z.string().trim().min(1).nullable(),
  rowDirection: z.string().trim().min(1).nullable(),
  trellisMethod: z.string().trim().min(1).nullable(),
  irrigationType: z.string().trim().min(1).nullable(),
  estimatedYieldPerDunam: z.number().nullable(),
  diseaseHistory: z.string().trim().min(1).nullable(),
})

export type BlockInput = z.infer<typeof BlockSchema>
