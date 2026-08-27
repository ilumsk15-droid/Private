import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { personSchema } from './src/schema/person';
import { issueSchema } from './src/schema/issue';
import { findRecipe } from './src/issue/recipe';
import { generateIssue, GENERATOR_VERSION, type IssueMeta } from './src/issue/generate';

/**
 * アプリから content/ と public/images/ を読み書きするためのローカルAPI。
 *
 * 誌面の中身をブラウザのストレージではなくリポジトリのファイルとして持つのが要点。
 * こうしておくと、アプリで編集した結果がそのまま git の差分になり、
 * npm run validate / export:pdf といった既存の仕組みが何も変えずに使える。
 *
 * 開発サーバとプレビューサーバの両方に載せているので、
 * PDF出力（プレビューサーバ経由）でも最新の内容が出る。
 */

const ROOT = process.cwd();
const CONTENT = resolve(ROOT, 'content');
const IMAGES = resolve(ROOT, 'public/images');

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const safeId = (v: unknown): string | null => (typeof v === 'string' && ID.test(v) ? v : null);

function walk(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return walk(full, base);
    return [relative(base, full).split('\\').join('/')];
  });
}

function readAllContent(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rel of walk(CONTENT)) {
    if (!/\.(json|md)$/.test(rel)) continue;
    out[rel] = readFileSync(resolve(CONTENT, rel), 'utf8');
  }
  return out;
}

function listImages(): string[] {
  return walk(IMAGES).map((rel) => `/images/${rel}`);
}

const writeJson = (file: string, data: unknown) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

async function body(req: Connect.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const send = (res: import('node:http').ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
};

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

export function contentApi(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/')) return next();
    const [path] = url.split('?');
    const method = req.method ?? 'GET';

    void (async () => {
      try {
        // ---- 全コンテンツの取得（アプリの表示に使う） ----
        if (path === '/api/content' && method === 'GET') {
          return send(res, 200, readAllContent());
        }
        if (path === '/api/images' && method === 'GET') {
          return send(res, 200, { images: listImages() });
        }

        // ---- 人物マスタ ----
        if (path === '/api/people' && method === 'GET') {
          const dir = resolve(CONTENT, 'people');
          const ids = existsSync(dir)
            ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
            : [];
          return send(res, 200, { people: ids.sort() });
        }
        const person = /^\/api\/people\/([^/]+)$/.exec(path);
        if (person) {
          const id = safeId(decodeURIComponent(person[1]));
          if (!id) return send(res, 400, { error: 'IDは英小文字・数字・ハイフンのみです' });
          const file = resolve(CONTENT, 'people', `${id}.json`);
          if (method === 'GET') {
            if (!existsSync(file)) return send(res, 404, { error: '人物データがありません' });
            return send(res, 200, JSON.parse(readFileSync(file, 'utf8')));
          }
          if (method === 'PUT') {
            const parsed = personSchema.safeParse(await body(req));
            if (!parsed.success) {
              return send(res, 400, {
                error: '人物データの形式が正しくありません',
                issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
              });
            }
            if (parsed.data.id !== id) return send(res, 400, { error: 'URLのIDと本文のIDが一致しません' });
            writeJson(file, parsed.data);
            return send(res, 200, { ok: true, id });
          }
          if (method === 'DELETE') {
            if (existsSync(file)) rmSync(file);
            return send(res, 200, { ok: true });
          }
        }

        // ---- 号 ----
        if (path === '/api/issues' && method === 'GET') {
          const ids = existsSync(CONTENT)
            ? readdirSync(CONTENT, { withFileTypes: true })
                .filter((d) => d.isDirectory() && existsSync(resolve(CONTENT, d.name, 'issue.json')))
                .map((d) => d.name)
            : [];
          return send(res, 200, { issues: ids.sort() });
        }

        if (path === '/api/issues/generate' && method === 'POST') {
          const payload = (await body(req)) as {
            personId?: string;
            recipeId?: string;
            meta?: IssueMeta;
            overwrite?: boolean;
          };
          const personId = safeId(payload.personId);
          const issueId = safeId(payload.meta?.id);
          if (!personId || !issueId) return send(res, 400, { error: '人物IDと号IDを指定してください' });

          const recipe = findRecipe(payload.recipeId ?? '');
          if (!recipe) return send(res, 400, { error: '台割レシピが見つかりません' });

          const personFile = resolve(CONTENT, 'people', `${personId}.json`);
          if (!existsSync(personFile)) return send(res, 404, { error: '人物データがありません' });
          const p = personSchema.parse(JSON.parse(readFileSync(personFile, 'utf8')));

          const issueDir = resolve(CONTENT, issueId);
          if (existsSync(resolve(issueDir, 'issue.json')) && !payload.overwrite) {
            return send(res, 409, { error: `${issueId} はすでに存在します`, needsOverwrite: true });
          }

          const result = generateIssue({ person: p, recipe, meta: payload.meta as IssueMeta });
          writeJson(resolve(issueDir, 'issue.json'), result.issue);
          writeJson(resolve(issueDir, 'source.json'), {
            personId,
            recipeId: recipe.id,
            generatedAt: new Date().toISOString(),
            generatorVersion: GENERATOR_VERSION,
          });
          return send(res, 200, {
            ok: true,
            id: issueId,
            pageCount: result.issue.pages.length,
            notes: result.notes,
            draftPages: result.draftPages,
          });
        }

        const issue = /^\/api\/issues\/([^/]+)$/.exec(path);
        if (issue) {
          const id = safeId(decodeURIComponent(issue[1]));
          if (!id) return send(res, 400, { error: '号IDが不正です' });
          const dir = resolve(CONTENT, id);
          if (method === 'PUT') {
            const parsed = issueSchema.safeParse(await body(req));
            if (!parsed.success) {
              return send(res, 400, {
                error: '号データの形式が正しくありません',
                issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
              });
            }
            writeJson(resolve(dir, 'issue.json'), parsed.data);
            return send(res, 200, { ok: true });
          }
          if (method === 'DELETE') {
            if (existsSync(dir) && statSync(dir).isDirectory()) rmSync(dir, { recursive: true });
            return send(res, 200, { ok: true });
          }
        }

        // ---- 画像アップロード ----
        if (path === '/api/images' && method === 'POST') {
          const payload = (await body(req)) as { personId?: string; name?: string; dataUrl?: string };
          const personId = safeId(payload.personId);
          if (!personId) return send(res, 400, { error: '人物IDが不正です' });
          const m = /^data:([^;]+);base64,(.+)$/.exec(payload.dataUrl ?? '');
          if (!m) return send(res, 400, { error: '画像データを読み取れません' });
          const ext = EXT_BY_MIME[m[1]];
          if (!ext) return send(res, 400, { error: `対応していない形式です: ${m[1]}` });
          const base = (payload.name ?? 'photo')
            .replace(/\.[a-z0-9]+$/i, '')
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .slice(0, 48) || 'photo';
          const dir = resolve(IMAGES, 'people', personId);
          mkdirSync(dir, { recursive: true });
          let name = `${base}.${ext}`;
          let n = 2;
          while (existsSync(resolve(dir, name))) name = `${base}-${n++}.${ext}`;
          writeFileSync(resolve(dir, name), Buffer.from(m[2], 'base64'));
          return send(res, 200, { ok: true, src: `/images/people/${personId}/${name}` });
        }

        return send(res, 404, { error: `未対応のエンドポイント: ${method} ${path}` });
      } catch (e) {
        return send(res, 500, { error: (e as Error).message });
      }
    })();
  };

  return {
    name: 'magazine-content-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
