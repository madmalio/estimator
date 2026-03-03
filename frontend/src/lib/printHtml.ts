function collectStyles(): string {
  const chunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        chunks.push(rule.cssText);
      }
    } catch {
      // Ignore stylesheets we can't read.
    }
  }

  return chunks.join('\n');
}

export function buildPrintDocumentHtml(printSectionSelector = '.print-only'): string {
  const section = document.querySelector(printSectionSelector);
  if (!section) {
    throw new Error('Print section not found');
  }

  const styles = collectStyles();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${styles}</style>
  </head>
  <body>
    ${section.outerHTML}
  </body>
</html>`;
}
