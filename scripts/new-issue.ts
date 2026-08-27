/**
 * 人物マスタと台割レシピから新しい号を生成する。
 *
 *   npm run new:issue -- --person=minato-haruki --id=issue-002 --line="ISSUE 002" \
 *                        --title="影響力のつくり方" --date="2026年5月28日"
 *   npm run new:issue -- --list                  … 人物とレシピの一覧
 *   npm run new:issue -- ... --recipe=extended-96 --force
 *
 * アプリの「号をつくる」画面と同じ関数を使っているので、結果は同じになる。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { personSchema } from '../src/schema/person';
import { findRecipe, recipes } from '../src/issue/recipe';
import { GENERATOR_VERSION, generateIssue } from '../src/issue/generate';

const args = process.argv.slice(2);
const value = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const flag = (name: string) => args.includes(`--${name}`);

const CONTENT = resolve(process.cwd(), 'content');
const peopleDir = resolve(CONTENT, 'people');
const listPeople = () =>
  existsSync(peopleDir) ? readdirSync(peopleDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')) : [];

if (flag('list') || args.length === 0) {
  console.log('\n人物マスタ (content/people/):');
  for (const id of listPeople()) {
    const p = personSchema.parse(JSON.parse(readFileSync(resolve(peopleDir, `${id}.json`), 'utf8')));
    console.log(`  ${id.padEnd(20)} ${p.name}`);
  }
  console.log('\n台割レシピ:');
  for (const r of recipes) console.log(`  ${r.id.padEnd(20)} ${r.pageCount}P  ${r.label} — ${r.description}`);
  console.log('\n例: npm run new:issue -- --person=minato-haruki --id=issue-002 --line="ISSUE 002" --title="特集タイトル" --date="2026年5月28日"\n');
  process.exit(0);
}

const personId = value('person');
const issueId = value('id');
if (!personId || !issueId) {
  console.error('--person と --id は必須です。--list で候補を確認できます。');
  process.exit(1);
}

const personFile = resolve(peopleDir, `${personId}.json`);
if (!existsSync(personFile)) {
  console.error(`人物データが見つかりません: ${personFile}`);
  process.exit(1);
}
const person = personSchema.parse(JSON.parse(readFileSync(personFile, 'utf8')));

const recipe = findRecipe(value('recipe') ?? 'standard-64');
if (!recipe) {
  console.error(`レシピが見つかりません: ${value('recipe')}`);
  process.exit(1);
}

const issueDir = resolve(CONTENT, issueId);
if (existsSync(resolve(issueDir, 'issue.json')) && !flag('force')) {
  console.error(`${issueId} はすでに存在します。上書きするなら --force を付けてください。`);
  process.exit(1);
}

const { issue, notes, draftPages } = generateIssue({
  person,
  recipe,
  meta: {
    id: issueId,
    issueLine: value('line') ?? issueId.toUpperCase().replace('-', ' '),
    title: value('title') ?? person.coverHeadline ?? person.name,
    subtitle: value('subtitle') ?? `巻頭大特集：${person.name}`,
    releaseDate: value('date') ?? new Date().toLocaleDateString('ja-JP'),
    priceLine: value('price') ?? '¥1,800 (税込)',
    dateLine: value('dateline'),
    editorInChief: value('editor'),
    publisher: value('publisher'),
  },
});

const writeJson = (file: string, data: unknown) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};
writeJson(resolve(issueDir, 'issue.json'), issue);
writeJson(resolve(issueDir, 'source.json'), {
  personId,
  recipeId: recipe.id,
  generatedAt: new Date().toISOString(),
  generatorVersion: GENERATOR_VERSION,
});

console.log(`\n✔ ${issueId} を生成しました（${issue.pages.length}エントリ / ${recipe.pageCount}P・${recipe.label}）`);
console.log(`  content/${issueId}/issue.json`);
if (notes.length) {
  console.log('\n  気づいたこと:');
  for (const n of notes) console.log(`   ・${n}`);
}
if (draftPages.length) {
  console.log(`\n  雛形のまま（要入稿）: ${draftPages.length}ページ  P${draftPages.join(', P')}`);
}
console.log('\n  次は: npm run preview で確認 → 原稿を入れる → npm run validate\n');
