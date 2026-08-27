import { ImageFrame } from '../components/magazine/ImageFrame';
import { ArticleBody, Heading, PullQuote } from '../components/magazine/Text';
import { DataChart } from '../components/magazine/DataViz';
import { evenColumns, type TemplateProps } from './types';

const isSpread = (p: { pageNumber: number; endPageNumber: number }) => p.endPageNumber > p.pageNumber;

/** 話者ラベルは姓だけを出す。「湊 ハルキ」→「湊」。全角/半角どちらの空白でも切れる */
const shortName = (name: string) => name.split(/[\s\u3000]/)[0].slice(0, 4);

/** 話者ラベル。対談・座談会・AI対談で共通の見え方にする */
function SpeakerLine({
  speakers,
  turns,
  columns,
}: {
  speakers: { name: string; role?: string }[];
  turns: { speaker: number; text: string }[];
  columns: number;
}) {
  return (
    <div className="tpl-talk__turns mg-fit" data-columns={columns > 1 ? columns : undefined}>
      {turns.map((t, i) => {
        const sp = speakers[t.speaker];
        return (
          <p className="tpl-talk__turn" key={i}>
            <span className="tpl-talk__speaker" data-index={t.speaker}>
              {sp ? shortName(sp.name) : '—'}
            </span>
            {t.text}
          </p>
        );
      })}
    </div>
  );
}

function SpeakerRoster({ speakers }: { speakers: { name: string; role?: string }[] }) {
  return (
    <ul className="tpl-talk__roster">
      {speakers.map((s, i) => (
        <li key={s.name} data-index={i}>
          <b>{s.name}</b>
          {s.role && <span className="mg-muted">{s.role}</span>}
        </li>
      ))}
    </ul>
  );
}

/** 2名対談 */
export function DialogueTwo({ data, page }: TemplateProps<'dialogue-two'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-talk mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'DIALOGUE'} title={data.title} lead={data.lead} size="l" />
      {data.image && <ImageFrame image={data.image} className="tpl-talk__figure" />}
      <SpeakerRoster speakers={data.speakers} />
      <div className="mg-rule mg-rule--thick" />
      <SpeakerLine speakers={data.speakers} turns={data.turns} columns={spread ? 4 : 2} />
    </div>
  );
}

/** 3名以上の座談会 */
export function Roundtable({ data, page }: TemplateProps<'roundtable'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-talk tpl-talk--round mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'ROUNDTABLE'} title={data.title} lead={data.lead} />
      {data.image && <ImageFrame image={data.image} className="tpl-talk__figure" />}
      <SpeakerRoster speakers={data.speakers} />
      <div className="mg-rule mg-rule--thick" />
      <SpeakerLine speakers={data.speakers} turns={data.turns} columns={spread ? 4 : 2} />
    </div>
  );
}

/** AIバーチャル対談。AI生成であることの明示を必ず誌面に出す */
export function AIDialogue({ data, page }: TemplateProps<'ai-dialogue'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-talk tpl-talk--ai mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'AI VIRTUAL DIALOGUE'} title={data.title} lead={data.lead} />
      <p className="tpl-talk__disclosure">{data.disclosure}</p>
      <SpeakerRoster speakers={data.speakers} />
      <div className="mg-rule mg-rule--accent" />
      <SpeakerLine speakers={data.speakers} turns={data.turns} columns={spread ? 4 : 2} />
    </div>
  );
}

/** アンケート結果 */
export function SurveyResults({ data, page }: TemplateProps<'survey-results'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-survey mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'READER SURVEY'} title={data.title} lead={data.lead} />
      <div className="tpl-survey__grid mg-fit" data-columns={spread ? 4 : 2}>
        {data.questions.map((q, i) => (
          <div className="tpl-survey__item" key={i}>
            <DataChart
              type={i % 3 === 2 ? 'donut' : 'bar'}
              title={q.q}
              series={q.options}
              unit={q.unit}
              note={q.note}
            />
          </div>
        ))}
      </div>
      {data.sampleNote && <p className="tpl-survey__note mg-muted">{data.sampleNote}</p>}
    </div>
  );
}

/** 賛成・反対の比較 */
export function ProsCons({ data }: TemplateProps<'pros-cons'>) {
  return (
    <div className="tpl-proscons mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'PROS & CONS'} title={data.title} lead={data.lead} />
      <p className="tpl-proscons__topic">{data.topic}</p>
      <div className="tpl-proscons__grid mg-fit">
        {[data.pro, data.con].map((side, i) => (
          <section key={i} data-side={i === 0 ? 'pro' : 'con'}>
            <h3 className="tpl-proscons__label">{side.label}</h3>
            <ul>
              {side.points.map((p) => (
                <li key={p.title}>
                  <h4>{p.title}</h4>
                  <p>{p.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {data.conclusion && <p className="tpl-proscons__conclusion">{data.conclusion}</p>}
    </div>
  );
}

/** 編集部レビュー */
export function EditorsReview({ data, page }: TemplateProps<'editors-review'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-review mg-typearea">
      <Heading eyebrow={data.titleEn ?? "EDITORS' REVIEW"} title={data.title} lead={data.lead} />
      <ul className="tpl-review__list mg-fit" data-columns={spread ? 4 : 2}>
        {data.items.map((it) => (
          <li key={it.title}>
            {it.image && <ImageFrame image={it.image} className="tpl-review__figure" creditPlacement="none" />}
            <h3>{it.title}</h3>
            {it.subtitle && <span className="mg-muted">{it.subtitle}</span>}
            {typeof it.score === 'number' && (
              <p className="tpl-review__score">
                <span className="mg-num">{it.score.toFixed(1)}</span>
                <small>/ 5.0</small>
              </p>
            )}
            <p className="tpl-review__body">{it.body}</p>
            {it.verdict && <p className="tpl-review__verdict">{it.verdict}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 特集記事（写真＋本文の標準形） */
export function FeatureArticle({ data, page }: TemplateProps<'feature-article'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-article mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'FEATURE'} title={data.title} lead={data.lead} size="l" />
      <div className="mg-rule mg-rule--thick" />
      <div className="tpl-article__main">
        {data.images.length > 0 && (
          <div className="tpl-article__figures" data-count={data.images.length}>
            {data.images.map((img, i) => (
              <ImageFrame key={i} image={img} />
            ))}
          </div>
        )}
        <div className="tpl-article__text mg-fit">
          {data.pullQuote && <PullQuote text={data.pullQuote} />}
          <ArticleBody body={data.body} columns={spread ? evenColumns(data.columns + 1) : data.columns} dropcap />
        </div>
      </div>
    </div>
  );
}

/** コラム */
export function Column({ data }: TemplateProps<'column'>) {
  return (
    <div className="tpl-column mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'COLUMN'} title={data.title} serif />
      <div className="mg-rule" />
      <div className="tpl-column__main mg-fit">
        {data.image && <ImageFrame image={data.image} className="tpl-column__figure" />}
        <ArticleBody body={data.body} columns={2} />
      </div>
      {data.author && (
        <footer className="tpl-column__author">
          <b>{data.author.name}</b>
          {data.author.role && <span className="mg-muted">{data.author.role}</span>}
        </footer>
      )}
    </div>
  );
}

