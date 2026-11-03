/**
 * Which harness a pre-k agent runs on. `PREK_HARNESS=scripted` (tests, `point smoke`, keyless dev) swaps every pre-k
 * agent onto its scripted harness in app/harnesses/, which needs no model, no key and spends nothing (#17).
 */
export function harnessFor(real: string, scripted: string): string {
  return process.env.PREK_HARNESS === "scripted" ? scripted : real;
}
