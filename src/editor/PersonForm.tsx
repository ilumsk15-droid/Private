import { useState } from 'react';
import type { Person } from '../schema/person';
import { Field, ImageField, ImageList, RepeatList, TextArea, TextInput, Toggle, emptyImage } from './fields';

/**
 * 人物マスタの入力画面。
 *
 * 並び順がそのまま誌面の掲載順になる項目（年表・名言・事業など）は
 * 並べ替えできる箱に入れている。編集者が「この順で載る」と分かる形にするのが狙い。
 */

type Setter = (patch: Partial<Person>) => void;

const SECTIONS = [
  { id: 'basic', label: '基本情報' },
  { id: 'cover', label: '表紙まわり' },
  { id: 'profile', label: 'プロフィール' },
  { id: 'numbers', label: '数字' },
  { id: 'timeline', label: '年表' },
  { id: 'works', label: '事業・実績' },
  { id: 'relations', label: '相関図' },
  { id: 'interviews', label: 'インタビュー' },
  { id: 'articles', label: '記事' },
  { id: 'qa', label: 'Q&A' },
  { id: 'quotes', label: '名言' },
  { id: 'voices', label: '関係者コメント' },
  { id: 'schedule', label: '1日' },
  { id: 'gear', label: '道具' },
  { id: 'videos', label: '動画' },
  { id: 'photos', label: '写真' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export function PersonForm({ person, onChange }: { person: Person; onChange: Setter }) {
  const [section, setSection] = useState<SectionId>('basic');
  const id = person.id;

  return (
    <div className="pform">
      <nav className="pform__nav">
        {SECTIONS.map((s) => (
          <button key={s.id} data-active={section === s.id} onClick={() => setSection(s.id)}>
            {s.label}
            <em>{countOf(person, s.id)}</em>
          </button>
        ))}
      </nav>

      <div className="pform__body">
        {section === 'basic' && (
          <div className="grid2">
            <Field label="人物ID" hint="ファイル名になる。英小文字とハイフン">
              <TextInput value={person.id} onChange={(v) => onChange({ id: v })} placeholder="minato-haruki" />
            </Field>
            <Field label="氏名" hint="誌面に出る表記">
              <TextInput value={person.name} onChange={(v) => onChange({ name: v })} />
            </Field>
            <Field label="英字表記" hint="見出しのアクセントに使う">
              <TextInput value={person.nameEn} onChange={(v) => onChange({ nameEn: v })} placeholder="MINATO HARUKI" />
            </Field>
            <Field label="よみ">
              <TextInput value={person.reading} onChange={(v) => onChange({ reading: v })} placeholder="みなと・はるき" />
            </Field>
            <Field label="肩書・ジャンル" hint="表紙と柱に出る">
              <TextInput value={person.role} onChange={(v) => onChange({ role: v })} placeholder="YouTuber／経営者" />
            </Field>
            <Field label="タグ" hint="読点・カンマ区切り">
              <TextInput
                value={person.tags.join('、')}
                onChange={(v) => onChange({ tags: v.split(/[、,]/).map((s) => s.trim()).filter(Boolean) })}
              />
            </Field>
            <Field label="編集メモ" hint="誌面には出ない" wide>
              <TextArea rows={3} value={person.note} onChange={(v) => onChange({ note: v })} />
            </Field>
          </div>
        )}

        {section === 'cover' && (
          <div className="grid2">
            <Field label="表紙の大見出し" hint="改行するとそこで折り返す" wide>
              <TextArea rows={3} value={person.coverHeadline} onChange={(v) => onChange({ coverHeadline: v })} placeholder={'影響力は、\nどこから来るのか'} />
            </Field>
            <Field label="英字の見出し">
              <TextInput value={person.coverHeadlineEn} onChange={(v) => onChange({ coverHeadlineEn: v })} placeholder="THE ANATOMY OF INFLUENCE" />
            </Field>
            <Field label="サブ見出し" hint="表紙と特集扉に出る">
              <TextInput value={person.coverSubhead} onChange={(v) => onChange({ coverSubhead: v })} />
            </Field>
          </div>
        )}

        {section === 'profile' && (
          <>
            <Field label="プロフィール本文" hint="空行で段落。## で小見出し、> で引用" wide>
              <TextArea rows={12} value={person.bio} onChange={(v) => onChange({ bio: v })} />
            </Field>
            <RepeatList
              title="プロフィール項目"
              hint="生年・出身・所属など。誌面では2列で並ぶ"
              items={person.facts}
              onChange={(facts) => onChange({ facts })}
              create={() => ({ label: '', value: '' })}
              summary={(f) => `${f.label}：${f.value}`}
              render={(f, up) => (
                <div className="grid2">
                  <Field label="項目名"><TextInput value={f.label} onChange={(v) => up({ label: v })} /></Field>
                  <Field label="内容"><TextInput value={f.value} onChange={(v) => up({ value: v })} /></Field>
                </div>
              )}
            />
            <RepeatList
              title="SNS"
              items={person.sns}
              onChange={(sns) => onChange({ sns })}
              create={() => ({ platform: '', handle: '', followers: '' })}
              summary={(s) => `${s.platform} ${s.followers ?? ''}`}
              render={(s, up) => (
                <div className="grid3">
                  <Field label="プラットフォーム"><TextInput value={s.platform} onChange={(v) => up({ platform: v })} /></Field>
                  <Field label="アカウント"><TextInput value={s.handle} onChange={(v) => up({ handle: v })} /></Field>
                  <Field label="フォロワー"><TextInput value={s.followers} onChange={(v) => up({ followers: v })} /></Field>
                </div>
              )}
            />
          </>
        )}

        {section === 'numbers' && (
          <>
            <Field label="出典" hint="誌面の下に小さく出る" wide>
              <TextArea rows={2} value={person.statsSource} onChange={(v) => onChange({ statsSource: v })} />
            </Field>
            <RepeatList
              title="数字"
              hint="「数字で見る人物」に大きく出る。8個前後が収まりが良い"
              items={person.stats}
              onChange={(stats) => onChange({ stats })}
              create={() => ({ value: '', unit: '', label: '', note: '' })}
              summary={(s) => `${s.value}${s.unit ?? ''}　${s.label}`}
              render={(s, up) => (
                <div className="grid2">
                  <Field label="数値" hint="カンマ区切りも可"><TextInput value={s.value} onChange={(v) => up({ value: v })} /></Field>
                  <Field label="単位"><TextInput value={s.unit} onChange={(v) => up({ unit: v })} placeholder="万 / 本 / %" /></Field>
                  <Field label="ラベル"><TextInput value={s.label} onChange={(v) => up({ label: v })} /></Field>
                  <Field label="注記"><TextInput value={s.note} onChange={(v) => up({ note: v })} /></Field>
                </div>
              )}
            />
          </>
        )}

        {section === 'timeline' && (
          <RepeatList
            title="年表"
            hint="上から古い順に。転機は「強調」を入れると罫がアクセント色になる"
            items={person.timeline}
            onChange={(timeline) => onChange({ timeline })}
            create={() => ({ year: '', month: '', title: '', body: '', highlight: false })}
            summary={(t) => `${t.year}${t.month ? `.${t.month}` : ''}　${t.title}`}
            render={(t, up) => (
              <div className="grid2">
                <Field label="年"><TextInput value={t.year} onChange={(v) => up({ year: v })} placeholder="2017" /></Field>
                <Field label="月" hint="任意"><TextInput value={t.month} onChange={(v) => up({ month: v })} placeholder="04" /></Field>
                <Field label="見出し" wide><TextInput value={t.title} onChange={(v) => up({ title: v })} /></Field>
                <Field label="説明" wide><TextArea rows={3} value={t.body} onChange={(v) => up({ body: v })} /></Field>
                <Toggle value={t.highlight} onChange={(highlight) => up({ highlight })} label="転機として強調する" />
              </div>
            )}
          />
        )}

        {section === 'works' && (
          <RepeatList
            title="事業・活動実績"
            items={person.works}
            onChange={(works) => onChange({ works })}
            create={() => ({ name: '', category: '', since: '', body: '', metric: '' })}
            summary={(w) => `${w.name}${w.category ? `（${w.category}）` : ''}`}
            render={(w, up) => (
              <div className="grid2">
                <Field label="名称"><TextInput value={w.name} onChange={(v) => up({ name: v })} /></Field>
                <Field label="区分"><TextInput value={w.category} onChange={(v) => up({ category: v })} placeholder="D2C / 教育" /></Field>
                <Field label="開始"><TextInput value={w.since} onChange={(v) => up({ since: v })} placeholder="2022–" /></Field>
                <Field label="実績値" hint="誌面で太字になる"><TextInput value={w.metric} onChange={(v) => up({ metric: v })} /></Field>
                <Field label="説明" wide><TextArea rows={4} value={w.body} onChange={(v) => up({ body: v })} /></Field>
              </div>
            )}
          />
        )}

        {section === 'relations' && (
          <>
            <Field label="図の注記" wide>
              <TextArea rows={2} value={person.relations.note} onChange={(v) => onChange({ relations: { ...person.relations, note: v } })} />
            </Field>
            <RepeatList
              title="関係者"
              hint="角度は0=右、90=下。距離は0.2〜1.0で中心からの遠さ"
              items={person.relations.nodes}
              onChange={(nodes) => onChange({ relations: { ...person.relations, nodes } })}
              create={() => ({ name: '', role: '', relation: '', group: '', angle: 0, distance: 0.75 })}
              summary={(n) => `${n.name}　${n.relation ?? ''}`}
              render={(n, up) => (
                <div className="grid2">
                  <Field label="氏名"><TextInput value={n.name} onChange={(v) => up({ name: v })} /></Field>
                  <Field label="肩書"><TextInput value={n.role} onChange={(v) => up({ role: v })} /></Field>
                  <Field label="関係" hint="図に赤字で出る"><TextInput value={n.relation} onChange={(v) => up({ relation: v })} /></Field>
                  <Field label="強調" hint="core と書くと枠が太くなる"><TextInput value={n.group} onChange={(v) => up({ group: v })} placeholder="core / sub" /></Field>
                  <Field label="角度（度）"><TextInput type="number" value={n.angle} onChange={(v) => up({ angle: Number(v) })} /></Field>
                  <Field label="距離（0.2〜1）"><TextInput type="number" value={n.distance} onChange={(v) => up({ distance: Number(v) })} /></Field>
                </div>
              )}
            />
          </>
        )}

        {section === 'interviews' && (
          <RepeatList
            title="ロングインタビュー"
            hint="1本目が前編、2本目が後編として配置される"
            items={person.interviews}
            onChange={(interviews) => onChange({ interviews })}
            create={() => ({ title: '', titleEn: '', lead: '', pullQuote: '', body: '' })}
            summary={(iv) => iv.title.replace(/\n/g, ' ')}
            render={(iv, up) => <LongText item={iv} update={up} kindLabel="インタビュー" />}
          />
        )}

        {section === 'articles' && (
          <RepeatList
            title="読み物記事"
            hint="ターニングポイントなど、インタビュー以外の本文もの"
            items={person.articles}
            onChange={(articles) => onChange({ articles })}
            create={() => ({ title: '', titleEn: '', lead: '', pullQuote: '', body: '' })}
            summary={(a) => a.title.replace(/\n/g, ' ')}
            render={(a, up) => <LongText item={a} update={up} kindLabel="記事" />}
          />
        )}

        {section === 'qa' && (
          <RepeatList
            title="Q&A"
            hint="「これからの話」ページに使われる"
            items={person.qa}
            onChange={(qa) => onChange({ qa })}
            create={() => ({ q: '', a: '' })}
            summary={(x) => x.q}
            render={(x, up) => (
              <>
                <Field label="質問" wide><TextArea rows={2} value={x.q} onChange={(v) => up({ q: v })} /></Field>
                <Field label="回答" wide><TextArea rows={5} value={x.a} onChange={(v) => up({ a: v })} /></Field>
              </>
            )}
          />
        )}

        {section === 'quotes' && (
          <RepeatList
            title="名言"
            hint="1つ目は「名言1点見せ」ページに大きく出る。8つで名言集1見開きぶん"
            items={person.quotes}
            onChange={(quotes) => onChange({ quotes })}
            create={() => ({ text: '', source: '', context: '' })}
            summary={(q) => q.text.replace(/\n/g, ' ')}
            render={(q, up) => (
              <>
                <Field label="言葉" hint="改行するとそこで折り返す" wide>
                  <TextArea rows={3} value={q.text} onChange={(v) => up({ text: v })} />
                </Field>
                <div className="grid2">
                  <Field label="出典" hint="どの場面の発言か"><TextInput value={q.source} onChange={(v) => up({ source: v })} /></Field>
                  <Field label="補足" hint="名言集で小さく添える"><TextInput value={q.context} onChange={(v) => up({ context: v })} /></Field>
                </div>
              </>
            )}
          />
        )}

        {section === 'voices' && (
          <RepeatList
            title="関係者コメント"
            items={person.voices}
            onChange={(voices) => onChange({ voices })}
            create={() => ({ name: '', role: '', body: '', portrait: emptyImage() })}
            summary={(v) => `${v.name}　${v.role ?? ''}`}
            render={(v, up) => (
              <>
                <div className="grid2">
                  <Field label="氏名"><TextInput value={v.name} onChange={(x) => up({ name: x })} /></Field>
                  <Field label="肩書"><TextInput value={v.role} onChange={(x) => up({ role: x })} /></Field>
                </div>
                <Field label="コメント" wide><TextArea rows={4} value={v.body} onChange={(x) => up({ body: x })} /></Field>
                <ImageField personId={id} label="顔写真" image={v.portrait} onChange={(portrait) => up({ portrait })} />
              </>
            )}
          />
        )}

        {section === 'schedule' && (
          <>
            <Field label="注記" wide>
              <TextArea rows={2} value={person.scheduleNote} onChange={(v) => onChange({ scheduleNote: v })} />
            </Field>
            <RepeatList
              title="1日のスケジュール"
              items={person.schedule}
              onChange={(schedule) => onChange({ schedule })}
              create={() => ({ time: '', title: '', body: '' })}
              summary={(s) => `${s.time}　${s.title}`}
              render={(s, up) => (
                <div className="grid2">
                  <Field label="時刻"><TextInput value={s.time} onChange={(v) => up({ time: v })} placeholder="05:40" /></Field>
                  <Field label="見出し"><TextInput value={s.title} onChange={(v) => up({ title: v })} /></Field>
                  <Field label="説明" wide><TextArea rows={2} value={s.body} onChange={(v) => up({ body: v })} /></Field>
                </div>
              )}
            />
          </>
        )}

        {section === 'gear' && (
          <RepeatList
            title="愛用品・仕事道具"
            items={person.gear}
            onChange={(gear) => onChange({ gear })}
            create={() => ({ name: '', brand: '', body: '', image: emptyImage() })}
            summary={(g) => `${g.name}　${g.brand ?? ''}`}
            render={(g, up) => (
              <>
                <div className="grid2">
                  <Field label="品名"><TextInput value={g.name} onChange={(v) => up({ name: v })} /></Field>
                  <Field label="ブランド"><TextInput value={g.brand} onChange={(v) => up({ brand: v })} /></Field>
                </div>
                <Field label="説明" wide><TextArea rows={3} value={g.body} onChange={(v) => up({ body: v })} /></Field>
                <ImageField personId={id} label="写真" image={g.image} onChange={(image) => up({ image })} />
              </>
            )}
          />
        )}

        {section === 'videos' && (
          <RepeatList
            title="動画"
            hint="上から3本が「この動画から見る」ページに、以降が一覧ページに入る"
            items={person.videos}
            onChange={(videos) => onChange({ videos })}
            create={() => ({ title: '', body: '', thumbnail: emptyImage(), qr: { url: null, label: '動画を見る' }, meta: { views: '', date: '', length: '' } })}
            summary={(v) => v.title}
            render={(v, up) => (
              <>
                <Field label="タイトル" wide><TextInput value={v.title} onChange={(x) => up({ title: x })} /></Field>
                <Field label="紹介文" wide><TextArea rows={3} value={v.body} onChange={(x) => up({ body: x })} /></Field>
                <div className="grid3">
                  <Field label="公開日"><TextInput value={v.meta?.date} onChange={(x) => up({ meta: { ...v.meta, date: x } })} placeholder="2024.03" /></Field>
                  <Field label="尺"><TextInput value={v.meta?.length} onChange={(x) => up({ meta: { ...v.meta, length: x } })} placeholder="38:47" /></Field>
                  <Field label="再生数"><TextInput value={v.meta?.views} onChange={(x) => up({ meta: { ...v.meta, views: x } })} placeholder="587万回" /></Field>
                </div>
                <div className="grid2">
                  <Field label="動画URL" hint="空ならQRは出ない">
                    <TextInput value={v.qr?.url ?? ''} onChange={(x) => up({ qr: { ...(v.qr ?? { url: null }), url: x || null } })} placeholder="https://…" />
                  </Field>
                  <Field label="QRの説明文" hint="QRの下に出る">
                    <TextInput value={v.qr?.label ?? ''} onChange={(x) => up({ qr: { ...(v.qr ?? { url: null }), label: x } })} />
                  </Field>
                </div>
                <ImageField personId={id} label="サムネイル" image={v.thumbnail} onChange={(thumbnail) => up({ thumbnail })} />
              </>
            )}
          />
        )}

        {section === 'photos' && (
          <>
            <ImageField personId={id} label="表紙写真" hint="縦位置。顔が中央より少し上に来る位置がよい" image={person.photos.cover} onChange={(cover) => onChange({ photos: { ...person.photos, cover } })} />
            <ImageField personId={id} label="巻頭の見開き写真" hint="横に広い写真。顔がノド（中央）に入らない位置に" image={person.photos.heroSpread} onChange={(heroSpread) => onChange({ photos: { ...person.photos, heroSpread } })} />
            <ImageField personId={id} label="プロフィール写真" hint="縦位置" image={person.photos.portrait} onChange={(portrait) => onChange({ photos: { ...person.photos, portrait } })} />
            <ImageList personId={id} title="取材カット" hint="記事中に順番に使われる。多いほど誌面の変化がつく" images={person.photos.scenes} onChange={(scenes) => onChange({ photos: { ...person.photos, scenes } })} />
            <ImageList personId={id} title="ギャラリー写真" hint="写真ページに6枚単位で使われる" images={person.photos.gallery} onChange={(gallery) => onChange({ photos: { ...person.photos, gallery } })} />
            <ImageList personId={id} title="動画サムネイル" hint="動画に個別指定がないときの予備" images={person.photos.thumbnails} onChange={(thumbnails) => onChange({ photos: { ...person.photos, thumbnails } })} />
          </>
        )}
      </div>
    </div>
  );
}

/** インタビュー・記事で共通の入力。本文はこの画面で書くか、外部ファイルを指すか選べる */
function LongText<T extends { title: string; titleEn?: string; lead?: string; pullQuote?: string; body: string | { $ref: string } }>({
  item,
  update,
  kindLabel,
}: {
  item: T;
  update: (patch: Partial<T>) => void;
  kindLabel: string;
}) {
  const isRef = typeof item.body === 'object';
  return (
    <>
      <div className="grid2">
        <Field label="タイトル" hint="改行するとそこで折り返す" wide>
          <TextArea rows={2} value={item.title} onChange={(v) => update({ title: v } as Partial<T>)} />
        </Field>
        <Field label="英字見出し"><TextInput value={item.titleEn} onChange={(v) => update({ titleEn: v } as Partial<T>)} /></Field>
        <Field label="抜き出し文" hint="本文の上に大きく出る一文"><TextInput value={item.pullQuote} onChange={(v) => update({ pullQuote: v } as Partial<T>)} /></Field>
      </div>
      <Field label="リード文" wide><TextArea rows={3} value={item.lead} onChange={(v) => update({ lead: v } as Partial<T>)} /></Field>
      <div className="bodymode">
        <span className="fld__label">本文の入れ方</span>
        <div className="segmented segmented--sm">
          <button data-active={!isRef} onClick={() => update({ body: isRef ? '' : (item.body as string) } as Partial<T>)}>この画面で書く</button>
          <button data-active={isRef} onClick={() => update({ body: isRef ? item.body : { $ref: '' } } as Partial<T>)}>別ファイル</button>
        </div>
      </div>
      {isRef ? (
        <Field label="原稿ファイル" hint="content/ からの参照。例: @people/xxx/interview-1.md" wide>
          <TextInput value={(item.body as { $ref: string }).$ref} onChange={(v) => update({ body: { $ref: v } } as Partial<T>)} />
        </Field>
      ) : (
        <Field label={`${kindLabel}本文`} hint="空行で段落。## で小見出し、> で引用、**強調**" wide>
          <TextArea rows={16} value={item.body as string} onChange={(v) => update({ body: v } as Partial<T>)} />
        </Field>
      )}
    </>
  );
}

function countOf(p: Person, id: SectionId): string {
  const n: Partial<Record<SectionId, number>> = {
    numbers: p.stats.length,
    timeline: p.timeline.length,
    works: p.works.length,
    relations: p.relations.nodes.length,
    interviews: p.interviews.length,
    articles: p.articles.length,
    qa: p.qa.length,
    quotes: p.quotes.length,
    voices: p.voices.length,
    schedule: p.schedule.length,
    gear: p.gear.length,
    videos: p.videos.length,
    photos: p.photos.scenes.length + p.photos.gallery.length + p.photos.thumbnails.length,
  };
  return n[id] === undefined ? '' : String(n[id]);
}
