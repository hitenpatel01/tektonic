#!/usr/bin/env node
'use strict';

const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

const ASSET_CLASSES = ['Sovereign', 'Credit', 'High Yield', 'Emerging Markets'];

const SECTORS_BY_CLASS = {
  Sovereign: ['Government', 'Supranational', 'Agency', 'Sub-Sovereign'],
  Credit: ['Financials', 'Technology', 'Healthcare', 'Energy', 'Industrials', 'Utilities', 'Consumer Staples'],
  'High Yield': ['Energy', 'Retail', 'Telecommunications', 'Media', 'Automotive', 'Hospitality'],
  'Emerging Markets': ['Government', 'Financials', 'Energy', 'Corporate'],
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NOK', 'SEK'];
const COUNTRY_CODES = ['US', 'DE', 'GB', 'FR', 'JP', 'AU', 'CA', 'CH', 'NL', 'IT', 'ES', 'SE'];

const RATINGS_MOODYS = ['Aaa', 'Aa1', 'Aa2', 'Aa3', 'A1', 'A2', 'A3', 'Baa1', 'Baa2', 'Baa3', 'Ba1', 'Ba2', 'Ba3', 'B1', 'B2', 'B3', 'Caa1'];
const RATINGS_SP     = ['AAA', 'AA+', 'AA',  'AA-', 'A+', 'A',  'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB',  'BB-', 'B+', 'B',  'B-',  'CCC+'];

function isin() {
  const cc = faker.helpers.arrayElement(COUNTRY_CODES);
  return cc + faker.string.alphanumeric({ length: 9, casing: 'upper' }) + faker.string.numeric(1);
}

function cusip() {
  return faker.string.alphanumeric({ length: 9, casing: 'upper' });
}

function ticker(issuerName, coupon, maturity) {
  const slug = issuerName.replace(/[^a-zA-Z ]/g, '').split(' ')[0].toUpperCase().slice(0, 4);
  const d = new Date(maturity);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${slug} ${coupon.toFixed(3)} ${mm}/${dd}/${yy}`;
}

// Semi-annual bond pricing formula:
// P = C * [1 - (1+r)^-n] / r  +  F * (1+r)^-n
// C = semi-annual coupon, r = semi-annual yield, n = # semi-annual periods, F = 100
function bondPrice(couponRate, ytm, yearsToMaturity) {
  const n = Math.max(1, Math.round(yearsToMaturity * 2));
  const r = ytm / 200;
  const c = (couponRate / 200) * 100;
  if (r === 0) return c * n + 100;
  const discount = Math.pow(1 + r, -n);
  return c * (1 - discount) / r + 100 * discount;
}

function generate() {
  const assetClass = faker.helpers.arrayElement(ASSET_CLASSES);
  const sector = faker.helpers.arrayElement(SECTORS_BY_CLASS[assetClass]);
  const currency = faker.helpers.arrayElement(CURRENCIES);

  // Coupon in 0.125 increments — real bond market convention
  const coupon = Math.round(faker.number.float({ min: 0.5, max: 8.875 }) * 8) / 8;

  // Independent YTM; drives whether bond is at discount or premium
  const ytm = parseFloat(faker.number.float({ min: 0.25, max: 10.5 }).toFixed(3));

  const yearsToMaturity = faker.number.float({ min: 0.5, max: 30 });
  const msNow = Date.now();
  const maturityTs = msNow + yearsToMaturity * 365.25 * 86400 * 1000;
  const maturity = new Date(maturityTs).toISOString().slice(0, 10);

  // Mathematically correct price: ytm > coupon → discount (<100); ytm < coupon → premium (>100)
  const rawPrice = bondPrice(coupon, ytm, yearsToMaturity);
  const lastPrice = parseFloat(Math.max(50, Math.min(155, rawPrice)).toFixed(4));

  // Spread: tighter for higher-quality / sovereign bonds, wider for HY
  const spreadBps =
    assetClass === 'Sovereign'       ? faker.number.float({ min: 0.25, max: 2 })
    : assetClass === 'Credit'        ? faker.number.float({ min: 1, max: 8 })
    : assetClass === 'High Yield'    ? faker.number.float({ min: 5, max: 30 })
    :                                  faker.number.float({ min: 3, max: 20 });
  const halfSpread = spreadBps / 200;

  // Modified duration approx for DV01 = ModDur * Price * 0.0001
  const modDur = yearsToMaturity < 1 ? yearsToMaturity
    : (1 - Math.pow(1 + ytm / 200, -Math.round(yearsToMaturity * 2))) / (ytm / 200) * 0.5
      + yearsToMaturity * Math.pow(1 + ytm / 200, -Math.round(yearsToMaturity * 2)) * 0.5;
  const dv01 = parseFloat((modDur * lastPrice * 0.0001).toFixed(4));

  const ratingIdx = faker.number.int({ min: 0, max: RATINGS_MOODYS.length - 1 });
  const issuer = faker.company.name();

  return {
    isin: isin(),
    cusip: cusip(),
    ticker: ticker(issuer, coupon, maturity),
    issuer,
    coupon,
    maturity,
    currency,
    assetClass,
    sector,
    ratingMoodys: RATINGS_MOODYS[ratingIdx],
    ratingSP: RATINGS_SP[ratingIdx],
    bidPrice: parseFloat((lastPrice - halfSpread).toFixed(4)),
    askPrice: parseFloat((lastPrice + halfSpread).toFixed(4)),
    lastPrice,
    yieldToMaturity: ytm,
    dv01,
    volume24h: faker.number.int({ min: 50_000, max: 500_000_000 }),
  };
}

const records = Array.from({ length: 500 }, generate);

const outDir = path.join(__dirname, 'public', 'assets', 'data');
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'fixed-income-universe.json');
fs.writeFileSync(outFile, JSON.stringify(records, null, 2), 'utf-8');

console.log(`Generated ${records.length} records → ${outFile}`);
