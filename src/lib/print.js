export const PDF_PAGE_SIZES = ['A4', 'A3', 'Letter', 'Legal'];
export const PDF_ORIENTATIONS = [
  { value: 'portrait', label: 'Vertical' },
  { value: 'landscape', label: 'Horizontal' }
];
export const PDF_SCALE_OPTIONS = [
  { value: '50', label: '50%' },
  { value: '60', label: '60%' },
  { value: '70', label: '70%' },
  { value: '80', label: '80%' },
  { value: '90', label: '90%' },
  { value: '100', label: '100%' },
  { value: '110', label: '110%' },
  { value: '120', label: '120%' },
  { value: 'fit', label: 'Todo 1 Página' }
];

export function safeFileName(value) {
  return String(value || 'fecobi-reporte')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function startPdfPrint({ bodyClass, title, pageSize = 'A4', orientation = 'portrait', scale = '100', afterPrint }) {
  const previousTitle = document.title;
  const previousScale = document.documentElement.style.getPropertyValue('--pdf-scale');
  const bodyClasses = String(bodyClass || '').split(/\s+/).filter(Boolean);
  const fitOnePage = String(scale) === 'fit';
  const isBracketPrint = bodyClasses.includes('printing-bracket');
  const isContinuousBracket = bodyClasses.includes('printing-bracket-continuous');
  const isContinuousLetter = bodyClasses.includes('bracket-continuous-letter');
  const isContinuousLegal = bodyClasses.includes('bracket-continuous-legal');
  const isContinuousR32Plus = bodyClasses.includes('bracket-continuous-r32plus');
  const isTabularR32 = bodyClasses.includes('bracket-tabular-r32');
  const isFaceBracket = bodyClasses.includes('printing-bracket-face');
  const isScoreSheets = bodyClasses.includes('printing-score-sheets');
  // v4.0: continuous bracket exports use fixed vertical one-page presets.
  // Letter is used when the bracket starts in Octavos/R16; Legal is used for
  // Dieciseisavos/R32 or larger brackets. Each preset needs its own scale.
  // v4.1: increase fixed continuous bracket subreports by ~35% after
  // reviewing the Letter PDF output; the previous preset left too much unused
  // page space and made match cards hard to read.
  const scaleNumber = fitOnePage
    ? (isFaceBracket ? 0.37 : isContinuousR32Plus ? 0.205 : isContinuousLetter ? 0.45 : isContinuousLegal ? 0.38 : isTabularR32 ? 0.3375 : isBracketPrint ? 0.27 : 0.45)
    : Math.max(0.5, Math.min(1.25, Number(scale || 100) / 100));
  const orientationClass = "pdf-orientation-" + orientation;
  const pageSizeClass = "pdf-page-" + String(pageSize).toLowerCase();
  const styleId = 'fecobi-dynamic-print-style';
  const oldStyle = document.getElementById(styleId);
  if (oldStyle) oldStyle.remove();
  const style = document.createElement('style');
  style.id = styleId;
  const pageMargin = isScoreSheets ? '2.5mm 2.5mm 2.5mm 2.5mm' : (fitOnePage ? (isContinuousBracket || isFaceBracket ? '3mm 3mm 3mm 3mm' : isBracketPrint ? '4mm 4mm 4mm 4mm' : '6mm 6mm 6mm 6mm') : '8mm 8mm 10mm 8mm');
  style.textContent = `@media print { @page { size: ${pageSize} ${orientation}; margin: ${pageMargin}; } }`;
  document.head.appendChild(style);
  document.title = safeFileName(title);
  document.documentElement.style.setProperty('--pdf-scale', String(scaleNumber));
  document.body.classList.add('printing-pdf', 'pdf-force-light', ...bodyClasses, orientationClass, pageSizeClass);
  if (fitOnePage) document.body.classList.add('pdf-fit-one-page');
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-pdf', 'pdf-force-light', ...bodyClasses, orientationClass, pageSizeClass, 'pdf-fit-one-page');
      document.title = previousTitle;
      if (previousScale) document.documentElement.style.setProperty('--pdf-scale', previousScale);
      else document.documentElement.style.removeProperty('--pdf-scale');
      const dynamicStyle = document.getElementById(styleId);
      if (dynamicStyle) dynamicStyle.remove();
      if (afterPrint) afterPrint();
    }, 700);
  }, 100);
}
