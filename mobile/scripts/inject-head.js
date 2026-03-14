/**
 * Post-build script: inject SEO meta tags into dist/index.html.
 * AdSense is loaded lazily by the web ad slot component.
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.log('dist/index.html not found, skipping injection');
  process.exit(0);
}

let html = fs.readFileSync(htmlPath, 'utf8');
const LEGACY_ADSENSE_RE = /\s*<!-- Google AdSense -->\s*<script[^>]*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>\s*/i;
const hadLegacyAdSense = LEGACY_ADSENSE_RE.test(html);

if (hadLegacyAdSense) {
  html = html.replace(LEGACY_ADSENSE_RE, '\n');
}

const INJECT = `
<!-- SEO -->
<meta name="keywords" content="stock analysis, probability, technical indicators, RSI, MACD, signal scanner, US stocks, 미국주식, 확률분석">
<meta property="og:title" content="Stock Scanner - Probability Analysis">
<meta property="og:description" content="Data-driven stock probability analysis with 10+ technical indicators">
<meta property="og:type" content="website">
`;

if (html.includes('Stock Scanner - Probability Analysis')) {
  if (hadLegacyAdSense) {
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('Removed legacy AdSense tag from dist/index.html');
    process.exit(0);
  }
  console.log('SEO tags already present, skipping');
  process.exit(0);
}

html = html.replace('</head>', INJECT + '</head>');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Injected SEO tags into dist/index.html');
