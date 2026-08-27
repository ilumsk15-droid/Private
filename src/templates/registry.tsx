import type { ReactElement } from 'react';
import type { Issue, ResolvedPage } from '../schema/issue';
import { templateMeta, type TemplateId } from '../schema/templates';
import * as Covers from './covers';
import * as Front from './front';
import * as Feature from './feature';
import * as Quotes from './quotes';
import * as Talk from './talk';
import * as Data from './data';
import * as Ads from './ads';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyTemplate = (props: { data: any; page: ResolvedPage; issue: Issue }) => ReactElement;

/**
 * テンプレートID → 描画コンポーネント。
 * ページデータの template 文字列だけで誌面が決まるので、
 * 64ページをベタ書きせずに済み、並べ替えも差し替えも台割ファイルだけで完結する。
 */
export const templateRegistry: Record<TemplateId, AnyTemplate> = {
  'cover-portrait': Covers.CoverPortrait,
  'cover-headline': Covers.CoverHeadline,
  'cover-multi': Covers.CoverMulti,
  'cover-back-ad': Covers.CoverBackAd,

  'feature-door': Front.FeatureDoor,
  contents: Front.Contents,
  'editors-letter': Front.EditorsLetter,
  'section-divider': Front.SectionDivider,

  'photo-spread-full': Feature.PhotoSpreadFull,
  profile: Feature.Profile,
  'interview-long': Feature.InterviewLong,
  'interview-qa': Feature.InterviewQA,
  timeline: Feature.TimelineTemplate,
  numbers: Feature.Numbers,
  works: Feature.Works,
  'relationship-map': Feature.RelationshipMapTemplate,
  'daily-schedule': Feature.DailySchedule,
  gear: Feature.Gear,
  voices: Feature.Voices,
  'photo-gallery': Feature.PhotoGallery,

  'quote-solo': Quotes.QuoteSolo,
  'quote-collection': Quotes.QuoteCollection,
  'quote-annotated': Quotes.QuoteAnnotated,
  'video-qr': Quotes.VideoQR,
  'video-ranking': Quotes.VideoRanking,
  'video-thumbnails': Quotes.VideoThumbnails,

  'dialogue-two': Talk.DialogueTwo,
  roundtable: Talk.Roundtable,
  'ai-dialogue': Talk.AIDialogue,
  'survey-results': Talk.SurveyResults,
  'pros-cons': Talk.ProsCons,
  'editors-review': Talk.EditorsReview,
  'feature-article': Talk.FeatureArticle,
  column: Talk.Column,

  'ranking-top10': Data.RankingTop10,
  'ranking-top30': Data.RankingTop30,
  'ranking-detail': Data.RankingDetail,
  'data-chart': Data.DataAnalysis,
  'positioning-map': Data.PositioningMapTemplate,
  'comparison-table': Data.ComparisonTableTemplate,

  'ad-single': Ads.AdSingle,
  'ad-spread': Ads.AdSpread,
  'tie-up': Ads.TieUp,
  'paid-profile': Ads.PaidProfile,
  'next-issue': Ads.NextIssue,
  colophon: Ads.Colophon,
};

export function renderTemplate(page: ResolvedPage, issue: Issue): ReactElement {
  const Component = templateRegistry[page.spec.template];
  if (!Component) {
    return (
      <div className="mg-typearea tpl-error">
        <p>未定義のテンプレート: {page.spec.template}</p>
      </div>
    );
  }
  try {
    return <Component data={page.data} page={page} issue={issue} />;
  } catch (e) {
    // 1ページの不備が他ページの表示を巻き込まないよう、ここで閉じ込める
    return (
      <div className="mg-typearea tpl-error">
        <p>P{page.pageNumber}「{templateMeta[page.spec.template].label}」の描画に失敗しました</p>
        <p className="mg-caption">{(e as Error).message}</p>
      </div>
    );
  }
}
