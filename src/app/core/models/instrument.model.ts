export type AssetClass = 'Sovereign' | 'Credit' | 'High Yield' | 'Emerging Markets';

export interface Instrument {
  isin: string;
  cusip: string;
  ticker: string;
  issuer: string;
  coupon: number;
  maturity: string;
  currency: string;
  assetClass: AssetClass;
  sector: string;
  ratingMoodys: string;
  ratingSP: string;
  bidPrice: number;
  askPrice: number;
  lastPrice: number;
  yieldToMaturity: number;
  dv01: number;
  volume24h: number;
}
