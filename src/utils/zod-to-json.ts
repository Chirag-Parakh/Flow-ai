import { ZodSchema, ZodObject, ZodString, ZodNumber, ZodBoolean, ZodEnum, ZodOptional, ZodDefault, ZodArray, ZodLiteral } from "zod";

type JsonSchema = {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  default?: unknown;
};

/**
 * Lightweight Zod → JSON Schema converter.
 * Covers the subset of Zod types used in this project.
 */
export function zodToJsonSchema(schema: ZodSchema): JsonSchema {
  return convertNode(schema);
}

function convertNode(schema: ZodSchema): JsonSchema {
  // Unwrap ZodDefault
  if (schema instanceof ZodDefault) {
    const inner = convertNode((schema as ZodDefault<ZodSchema>)._def.innerType);
    return { ...inner, default: (schema as ZodDefault<ZodSchema>)._def.defaultValue() };
  }

  // Unwrap ZodOptional
  if (schema instanceof ZodOptional) {
    return convertNode((schema as ZodOptional<ZodSchema>)._def.innerType);
  }

  if (schema instanceof ZodObject) {
    const shape = (schema as ZodObject<Record<string, ZodSchema>>).shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertNode(value as ZodSchema);
      // Required if not optional and not default
      if (!(value instanceof ZodOptional) && !(value instanceof ZodDefault)) {
        required.push(key);
      }
    }

    const result: JsonSchema = { type: "object", properties };
    if (required.length > 0) result.required = required;
    return result;
  }

  if (schema instanceof ZodString) {
    const base: JsonSchema = { type: "string" };
    const desc = schema.description;
    if (desc) base.description = desc;
    return base;
  }

  if (schema instanceof ZodNumber) {
    const base: JsonSchema = { type: "number" };
    const desc = schema.description;
    if (desc) base.description = desc;
    return base;
  }

  if (schema instanceof ZodBoolean) {
    return { type: "boolean" };
  }

  if (schema instanceof ZodEnum) {
    return { type: "string", enum: (schema as ZodEnum<[string, ...string[]]>).options };
  }

  if (schema instanceof ZodLiteral) {
    return { type: "string", enum: [(schema as ZodLiteral<string>).value] };
  }

  if (schema instanceof ZodArray) {
    return {
      type: "array",
      items: convertNode((schema as ZodArray<ZodSchema>).element),
    };
  }

  // Fallback
  return { type: "string" };
}
