import { axiosInstance } from '@/lib/api/axiosInstance';
import { createHttpSuiteClient } from './suiteClient';

/**
 * Tarayıcıya bağlı tek istemci. Hem tek senaryo koşusu hem toplu koşu bunu
 * kullanır; iki ayrı yol olsaydı istek gövdesi ya da hata yorumu sessizce
 * ayrışabilirdi.
 */
export const suiteClient = createHttpSuiteClient({
  post: (url, body) => axiosInstance.post(url, body),
  get: (url) => axiosInstance.get(url),
  delete: (url) => axiosInstance.delete(url),
});
