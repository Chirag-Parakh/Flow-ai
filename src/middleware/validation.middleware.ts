import { z, ZodTypeAny, ZodError } from "zod";

/**
 * Validates raw input against a Zod schema.
 * Returns the parsed (typed + defaulted) value.
 * Throws a descriptive error on failure.
 */
export function validateInput<S extends ZodTypeAny>(schema: S, raw: unknown): z.infer<S> {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  const messages = (result.error as ZodError).errors
    .map((e) => `  • ${e.path.join(".")} — ${e.message}`)
    .join("\n");

  throw new Error(`Invalid input:\n${messages}`);
}
