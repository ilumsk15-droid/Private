import type { ReactElement } from 'react';
import type { Issue, ResolvedPage } from '../schema/issue';
import type { TemplateData, TemplateId } from '../schema/templates';

export interface TemplateProps<K extends TemplateId = TemplateId> {
  data: TemplateData<K>;
  page: ResolvedPage;
  issue: Issue;
}

export type TemplateComponent<K extends TemplateId = TemplateId> = (props: TemplateProps<K>) => ReactElement;

/**
 * 見開きの段数は必ず偶数にする。
 * 奇数だと中央の段が綴じ位置（ノド）をまたいでしまい、
 * 印刷したときに読めない列ができるため。
 */
export const evenColumns = (n: number) => (n % 2 === 0 ? n : n + 1);
