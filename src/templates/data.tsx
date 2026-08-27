import { ImageFrame } from '../components/magazine/ImageFrame';
import { ArticleBody, Heading, QuoteBlock } from '../components/magazine/Text';
import { ComparisonTable, PositioningMap, RankingList } from '../components/magazine/Lists';
import { DataChart, StatGrid } from '../components/magazine/DataViz';
import { evenColumns, type TemplateProps } from './types';

const isSpread = (p: { pageNumber: number; endPageNumber: number }) => p.endPageNumber > p.pageNumber;

/** TOP10。顔写真つきで1件ずつ読ませる */
export function RankingTop10({ data, page }: TemplateProps<'ranking-top10'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-rank mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'RANKING'} title={data.title} lead={data.lead} size="l" />
      <div className="mg-rule mg-rule--thick" />
      <div className="mg-grow mg-fit">
        <RankingList items={data.items} variant="detailed" columns={spread ? 2 : 1} />
      </div>
      {data.criteria && <p className="tpl-rank__criteria mg-muted">{data.criteria}</p>}
    </div>
  );
}

/** TOP30。一覧性を優先した詰めた組み */
export function RankingTop30({ data, page }: TemplateProps<'ranking-top30'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-rank tpl-rank--compact mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'RANKING 30'} title={data.title} lead={data.lead} />
      <div className="mg-rule mg-rule--thick" />
      <div className="mg-grow mg-fit">
        <RankingList items={data.items} variant="compact" columns={spread ? evenColumns(data.columns + 1) : data.columns} />
      </div>
      {data.criteria && <p className="tpl-rank__criteria mg-muted">{data.criteria}</p>}
    </div>
  );
}

/** ランキング詳細。1位や注目枠を1ページ使って掘る */
export function RankingDetail({ data }: TemplateProps<'ranking-detail'>) {
  return (
    <div className="tpl-rankdetail mg-typearea">
      <header className="tpl-rankdetail__head">
        <span className="tpl-rankdetail__rank mg-num">{String(data.rank).padStart(2, '0')}</span>
        <div>
          {data.titleEn && <span className="mg-title-en">{data.titleEn}</span>}
          <h2 className="mg-title">{data.name}</h2>
          {data.category && <span className="mg-muted">{data.category}</span>}
        </div>
      </header>
      {data.image && <ImageFrame image={data.image} className="tpl-rankdetail__figure" />}
      {data.quote && <QuoteBlock text={data.quote.text} source={data.quote.source} size="s" />}
      <div className="mg-rule" />
      <div className="tpl-rankdetail__main mg-fit">
        <ArticleBody body={data.body} columns={2} />
      </div>
      {data.stats.length > 0 && <StatGrid stats={data.stats} columns={data.stats.length > 3 ? 4 : 3} />}
    </div>
  );
}

/** グラフ・データ分析 */
export function DataAnalysis({ data, page }: TemplateProps<'data-chart'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-data mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'DATA'} title={data.title} lead={data.lead} />
      <div className="tpl-data__grid mg-fit" data-columns={spread ? 4 : 2}>
        {data.charts.map((c, i) => (
          <DataChart key={i} type={c.type} title={c.title} series={c.series} unit={c.unit} note={c.note} />
        ))}
      </div>
      {data.source && <p className="tpl-data__source mg-muted">{data.source}</p>}
    </div>
  );
}

/** 勢力図・ポジショニングマップ */
export function PositioningMapTemplate({ data }: TemplateProps<'positioning-map'>) {
  return (
    <div className="tpl-posmap mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'POSITIONING'} title={data.title} lead={data.lead} />
      <div className="mg-grow tpl-posmap__field">
        <PositioningMap axes={data.axes} points={data.points} />
      </div>
      <div className="tpl-posmap__axes mg-muted">
        <span>横軸：{data.axes.x.label}</span>
        <span>縦軸：{data.axes.y.label}</span>
      </div>
      {data.note && <p className="mg-caption">{data.note}</p>}
    </div>
  );
}

/** 比較表 */
export function ComparisonTableTemplate({ data }: TemplateProps<'comparison-table'>) {
  return (
    <div className="tpl-compare mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'COMPARISON'} title={data.title} lead={data.lead} />
      <div className="mg-grow mg-fit">
        <ComparisonTable head={data.head} rows={data.rows} />
      </div>
      {data.note && <p className="mg-caption">{data.note}</p>}
    </div>
  );
}
