/**
 * Toplu koşunun sunucuyla tek temas noktası.
 *
 * Koşu motoru bu arayüzü konuşur, axios'u değil. Sebep: aynı motor hem tarayıcıda
 * (oturum token'ı `useAuthStore`'dan, istekler Vite proxy'sinden) hem komut
 * satırında (token ortam değişkeninden, istekler doğrudan) koşmak zorunda.
 * Taşıma katmanı dışarıdan verilmezse motor tarayıcıya çivilenir ve script
 * yazılamaz.
 */

const PLAN_ENDPOINT = '/api/v1/loading-plans';

export interface SuiteClient {
  /** Planı oluşturur ve kimliğini döner; uç kimlik vermezse null. */
  createPlan(body: unknown): Promise<string | null>;
  getPlanDetail(planId: string): Promise<unknown>;
  /** Ölçüm alındıktan sonra kaydı siler. Başarısızlığı koşuyu bozmamalı. */
  deletePlan(planId: string): Promise<void>;
}

/** Motorun ihtiyaç duyduğu asgari HTTP yüzeyi. */
export interface HttpLike {
  post(url: string, body: unknown): Promise<{ data: unknown }>;
  get(url: string): Promise<{ data: unknown }>;
  delete(url: string): Promise<unknown>;
}

export function createHttpSuiteClient(http: HttpLike): SuiteClient {
  return {
    async createPlan(body) {
      const response = await http.post(PLAN_ENDPOINT, body);
      return extractPlanId(response.data);
    },
    async getPlanDetail(planId) {
      const response = await http.get(`${PLAN_ENDPOINT}/${planId}`);
      return response.data;
    },
    async deletePlan(planId) {
      await http.delete(`${PLAN_ENDPOINT}/${planId}`);
    },
  };
}

/**
 * Hata gövdesi uca göre değişiyor (ProblemDetails `detail` ya da
 * `{isSuccess,message,error:{description}}`). axios yapısal olarak okunur —
 * kütüphaneyi import etmek koşu motorunu tarayıcı yığınına bağlardı.
 */
export function describeRequestError(error: unknown): string {
  const response =
    error !== null && typeof error === 'object'
      ? (error as { response?: { data?: unknown; status?: number } }).response
      : undefined;

  const body = response?.data as
    | { detail?: string; message?: string; error?: { description?: string } }
    | undefined;

  return (
    body?.detail ??
    body?.error?.description ??
    body?.message ??
    (response?.status !== undefined ? `HTTP ${response.status}` : undefined) ??
    (error instanceof Error ? error.message : 'Bilinmeyen hata')
  );
}

/** Yanıt gövdesi uca göre `data` ya da düz string olabilir. */
export function extractPlanId(payload: unknown): string | null {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const id = (data as { id?: unknown }).id;
      if (typeof id === 'string') return id;
    }
  }
  return null;
}
