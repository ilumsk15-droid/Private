import type { Person } from '../schema/person';
import type { IssueMeta } from '../issue/generate';

/**
 * ローカルAPI（vite-plugin-content-api）への薄いラッパー。
 * サーバが無い環境（ビルド済みの静的配信など）ではすべて失敗するので、
 * 呼び出し側は isApiAvailable() を見て編集UIを出すか決める。
 */

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (payload as { issues?: string[] }).issues;
    throw new Error(
      [(payload as { error?: string }).error ?? `HTTP ${res.status}`, ...(detail ?? [])].join('\n'),
    );
  }
  return payload as T;
}

export const api = {
  ping: () => call<Record<string, string>>('/api/content'),

  listPeople: () => call<{ people: string[] }>('/api/people'),
  getPerson: (id: string) => call<Person>(`/api/people/${id}`),
  savePerson: (person: Person) =>
    call<{ ok: true }>(`/api/people/${person.id}`, { method: 'PUT', body: JSON.stringify(person) }),
  deletePerson: (id: string) => call<{ ok: true }>(`/api/people/${id}`, { method: 'DELETE' }),

  listIssues: () => call<{ issues: string[] }>('/api/issues'),
  generateIssue: (input: { personId: string; recipeId: string; meta: IssueMeta; overwrite?: boolean }) =>
    call<{ ok: true; id: string; pageCount: number; notes: string[]; draftPages: number[] }>(
      '/api/issues/generate',
      { method: 'POST', body: JSON.stringify(input) },
    ),
  deleteIssue: (id: string) => call<{ ok: true }>(`/api/issues/${id}`, { method: 'DELETE' }),

  listImages: () => call<{ images: string[] }>('/api/images'),
  uploadImage: (personId: string, name: string, dataUrl: string) =>
    call<{ ok: true; src: string }>('/api/images', {
      method: 'POST',
      body: JSON.stringify({ personId, name, dataUrl }),
    }),
};

/** File を data URL にする（画像アップロード用） */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
