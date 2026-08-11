import { z } from 'zod';

/**
 * Backend hata zarfi (CargoPilot.Application/Common/Models/Result.cs):
 *   { isSuccess: false, message: string, data: null, error: { code, description, validationErrors? } }
 *
 * Model-binding hatalarinda ayni zarf ApiBehaviorOptions tarafindan uretilir; bu
 * durumda kullaniciya en anlamli metin `validationErrors[].message` icindedir.
 * `detail`/`title` yalnizca RFC7807 donduren uclar icin geriye donuk destektir.
 */
const validationFailureSchema = z.object({
  field: z.string().nullish(),
  message: z.string().nullish(),
});

export const apiErrorResponseSchema = z.object({
  message: z.string().nullish(),
  error: z
    .object({
      code: z.string().nullish(),
      description: z.string().nullish(),
      validationErrors: z.array(validationFailureSchema).nullish(),
    })
    .nullish(),
  detail: z.string().nullish(),
  title: z.string().nullish(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

function firstNonEmpty(candidates: ReadonlyArray<string | null | undefined>): string | undefined {
  return candidates.find((value): value is string => Boolean(value && value.trim().length > 0));
}

function readResponseData(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined;
  const { response } = error as { response: unknown };
  if (typeof response !== 'object' || response === null || !('data' in response)) return undefined;
  return (response as { data: unknown }).data;
}

/**
 * Backend Result zarfindaki Turkce hata mesajini cikarir; okunamayan yanit ya da
 * ag hatasi durumunda `fallback` doner.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const parsed = apiErrorResponseSchema.safeParse(readResponseData(error));
  if (!parsed.success) return fallback;

  const { message, error: envelope, detail, title } = parsed.data;
  const validationMessage = firstNonEmpty(
    (envelope?.validationErrors ?? []).map((failure) => failure.message),
  );

  return (
    firstNonEmpty([validationMessage, envelope?.description, message, detail, title]) ?? fallback
  );
}
