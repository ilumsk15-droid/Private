import { ImageFrame } from '../components/magazine/ImageFrame';
import { QRBlock } from '../components/magazine/QRBlock';
import { magazineConfig } from '../config/magazine.config';
import type { TemplateProps } from './types';

/**
 * 表紙系。誌名ロゴの位置・級数は誌としての顔なので、
 * 3種類の表紙テンプレートで共通の Masthead を使い、必ず同じ骨格で出る。
 */
function Masthead({ issueLine, dateLine }: { issueLine?: string; dateLine?: string }) {
  return (
    <div className="tpl-cover__masthead">
      <h1 className="tpl-cover__logo">{magazineConfig.magazine.titleEn}</h1>
      <div className="tpl-cover__meta">
        {issueLine && <span>{issueLine}</span>}
        {dateLine && <span>{dateLine}</span>}
      </div>
    </div>
  );
}

function CoverLines({ lines }: { lines: { text: string; emphasis: 'xl' | 'l' | 'm' | 's'; accent: boolean }[] }) {
  if (!lines.length) return null;
  return (
    <ul className="tpl-cover__lines">
      {lines.map((l, i) => (
        <li key={i} data-emphasis={l.emphasis} data-accent={l.accent ? 'true' : undefined}>
          {l.text}
        </li>
      ))}
    </ul>
  );
}

function CoverFooter({ priceLine, barcode }: { priceLine?: string; barcode?: boolean }) {
  return (
    <div className="tpl-cover__footer">
      {priceLine && <span className="tpl-cover__price">{priceLine}</span>}
      {barcode && <span className="tpl-cover__barcode" aria-label="バーコード位置" />}
    </div>
  );
}

export function CoverPortrait({ data }: TemplateProps<'cover-portrait'>) {
  return (
    <div className="tpl-cover tpl-cover--portrait">
      <ImageFrame image={data.image} fill creditPlacement="none" className="mg-bleed-layer" />
      <div className="mg-scrim" />
      <div className="mg-layer tpl-cover__inner">
        <Masthead issueLine={data.issueLine} dateLine={data.dateLine} />
        <div className="tpl-cover__headline">
          {data.headlineEn && <span className="tpl-cover__headline-en">{data.headlineEn}</span>}
          <h2>{data.headline}</h2>
          {data.subhead && <p>{data.subhead}</p>}
        </div>
        <CoverLines lines={data.coverLines} />
        <CoverFooter priceLine={data.priceLine} barcode={data.barcode} />
      </div>
      {data.image.credit && <span className="mg-credit mg-credit--overlay">{data.image.credit}</span>}
    </div>
  );
}

export function CoverHeadline({ data }: TemplateProps<'cover-headline'>) {
  return (
    <div className="tpl-cover tpl-cover--headline">
      <ImageFrame image={data.image} fill creditPlacement="none" className="mg-bleed-layer" />
      <div className="mg-scrim mg-scrim--full" />
      <div className="mg-layer tpl-cover__inner">
        <Masthead issueLine={data.issueLine} dateLine={data.dateLine} />
        <div className="tpl-cover__bigtype">
          {data.kicker && <span className="tpl-cover__kicker">{data.kicker}</span>}
          <h2>{data.headline}</h2>
          {data.headlineEn && <span className="tpl-cover__headline-en">{data.headlineEn}</span>}
          {data.subhead && <p className="tpl-cover__sub">{data.subhead}</p>}
        </div>
        <CoverLines lines={data.coverLines} />
        <CoverFooter priceLine={data.priceLine} barcode={data.barcode} />
      </div>
    </div>
  );
}

export function CoverMulti({ data }: TemplateProps<'cover-multi'>) {
  return (
    <div className="tpl-cover tpl-cover--multi">
      <div className="mg-bleed-layer tpl-cover__mosaic" data-count={data.images.length}>
        {data.images.map((img, i) => (
          <ImageFrame key={i} image={img} creditPlacement="none" className="tpl-cover__tile" />
        ))}
      </div>
      <div className="mg-scrim" />
      <div className="mg-layer tpl-cover__inner">
        <Masthead issueLine={data.issueLine} dateLine={data.dateLine} />
        <div className="tpl-cover__headline">
          {data.headlineEn && <span className="tpl-cover__headline-en">{data.headlineEn}</span>}
          <h2>{data.headline}</h2>
          {data.names.length > 0 && <p className="tpl-cover__names">{data.names.join('／')}</p>}
        </div>
        <CoverLines lines={data.coverLines} />
        <CoverFooter priceLine={data.priceLine} barcode={data.barcode} />
      </div>
    </div>
  );
}

export function CoverBackAd({ data }: TemplateProps<'cover-back-ad'>) {
  return (
    <div className="tpl-cover tpl-backad" data-theme={data.theme}>
      {data.image && <ImageFrame image={data.image} fill creditPlacement="none" className="mg-bleed-layer" />}
      <div className="mg-layer mg-typearea tpl-backad__inner">
        <span className="tpl-ad__label">{data.label}</span>
        <div className="mg-grow" />
        {data.copy && <p className="tpl-backad__copy">{data.copy}</p>}
        <div className="tpl-backad__foot">
          <div>
            <p className="tpl-backad__brand">{data.brand}</p>
            {data.body && <p className="tpl-backad__body">{data.body}</p>}
            {data.url && <p className="tpl-backad__url">{data.url}</p>}
          </div>
          {data.qr && <QRBlock qr={data.qr} />}
        </div>
      </div>
    </div>
  );
}
