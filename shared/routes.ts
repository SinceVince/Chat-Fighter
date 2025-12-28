import { z } from 'zod';
import { insertFighterSchema, fighters } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  fighters: {
    list: {
      method: 'GET' as const,
      path: '/api/fighters',
      responses: {
        200: z.array(z.custom<typeof fighters.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/fighters',
      input: insertFighterSchema,
      responses: {
        201: z.custom<typeof fighters.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/fighters/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type FighterInput = z.infer<typeof api.fighters.create.input>;
