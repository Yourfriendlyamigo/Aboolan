
import { z } from 'zod';
import { insertFamilyMemberSchema, familyMembers } from './schema';

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
  family: {
    list: {
      method: 'GET' as const,
      path: '/api/family',
      responses: {
        200: z.array(z.custom<typeof familyMembers.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/family/:id',
      responses: {
        200: z.custom<typeof familyMembers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/family',
      input: insertFamilyMemberSchema,
      responses: {
        201: z.custom<typeof familyMembers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/family/:id',
      input: insertFamilyMemberSchema.partial(),
      responses: {
        200: z.custom<typeof familyMembers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/family/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    swap: {
      method: 'POST' as const,
      path: '/api/family/swap',
      input: z.object({
        id1: z.number(),
        id2: z.number(),
      }),
      responses: {
        200: z.object({
          member1: z.custom<typeof familyMembers.$inferSelect>(),
          member2: z.custom<typeof familyMembers.$inferSelect>(),
        }),
        400: errorSchemas.validation,
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

export type FamilyMemberResponse = z.infer<typeof api.family.list.responses[200]>[number];
