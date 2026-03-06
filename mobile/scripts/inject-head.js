/**
 * Post-build script: inject AdSense + SEO meta tags into dist/index.html
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.log('dist/index.html not found, skipping injection');
  process.exit(0);
}

let html = fs.readFileSync(htmlPath, 'utf8');

const INJECT = `
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5053429721285857" crossorigin="anonymous"></script>
<!-- SEO -->
<meta name="keywords" content="stock analysis, probability, technical indicators, RSI, MACD, signal scanner, US stocks, 미국주식, 확률분석">
<meta property="og:title" content="Stock Scanner - Probability Analysis">
<meta property="og:description" content="Data-driven stock probability analysis with 10+ technical indicators">
<meta property="og:type" content="website">
`;

if (html.includes('ca-pub-5053429721285857')) {
  console.log('AdSense already present, skipping');
  process.exit(0);
}

html = html.replace('</head>', INJECT + '</head>');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Injected AdSense + SEO tags into dist/index.html');
