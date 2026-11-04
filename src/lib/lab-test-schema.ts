import { z } from "zod"

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const roundedNumber = z
  .number()
  .nullable()
  .transform((value) => (value == null ? null : round2(value)))

// The fields of a lab test, the same for a finished wine and for a barrel.
export const LabTestFieldsSchema = z.object({
  testDate: z.coerce.date(),
  lab: z.string().trim().min(1).nullable(),
  density: roundedNumber,
  ethanol: roundedNumber,
  ph: roundedNumber,
  totalAcid: roundedNumber,
  volatile: roundedNumber,
  rsBx: roundedNumber,
  co2: roundedNumber,
  malicAcid: roundedNumber,
  notes: z.string().trim().min(1).nullable(),
  actionItems: z.string().trim().min(1).nullable(),
})

// A barrel's test also has the free bisulfite, which the finished wine does not record.
export const BarrelLabFieldsSchema = LabTestFieldsSchema.extend({ freeBisulfite: roundedNumber })
