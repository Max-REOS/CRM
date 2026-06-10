// REOS JARVIS — Document Generation
const path = require('path');
const fs = require('fs');
const { ipcMain, shell } = require('electron');

const REOS_GOLD = 'C9A84C';
const REOS_BLACK = '080808';
const REOS_OFF_WHITE = 'FAF8F3';

module.exports = function registerDocHandlers(docsDir) {
  ipcMain.handle('generate-docx', async (e, { type, content, filename, language }) => {
    try {
      const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle, TableRow, TableCell, Table, WidthType } = require('docx');

      const isEN = language === 'EN';
      const dateStr = new Date().toLocaleDateString(isEN ? 'en-GB' : 'de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

      const paragraphs = [
        new Paragraph({
          text: 'REOS GROUP',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: content.title || type, bold: true, size: 28, color: REOS_BLACK })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 400 }
        }),
        new Paragraph({
          text: dateStr,
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 600 }
        }),
        ...(content.sections || [{ heading: '', body: content.body || content }]).map(section => [
          section.heading ? new Paragraph({
            text: section.heading,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }) : null,
          ...(section.body || '').split('\n').filter(Boolean).map(line =>
            new Paragraph({
              children: [new TextRun({ text: line, size: 22 })],
              spacing: { before: 100, after: 100 }
            })
          )
        ].filter(Boolean)).flat()
      ];

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      const outDir = path.join(docsDir, new Date().toISOString().slice(0, 10));
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, filename || `REOS_${type}_${language || 'DE'}_${Date.now()}.docx`);

      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outPath, buffer);
      return { path: outPath };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('generate-xlsx', async (e, { sheetData, filename }) => {
    try {
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData || [['REOS Platform GmbH']]);
      XLSX.utils.book_append_sheet(wb, ws, 'REOS');

      const outDir = path.join(docsDir, new Date().toISOString().slice(0, 10));
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, filename || `REOS_Data_${Date.now()}.xlsx`);
      XLSX.writeFile(wb, outPath);
      return { path: outPath };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('generate-pptx', async (e, { slides, filename }) => {
    try {
      const pptxgen = require('pptxgenjs');
      const pres = new pptxgen();
      pres.defineLayout({ name: 'REOS', width: 13.33, height: 7.5 });
      pres.layout = 'REOS';

      for (const slide of (slides || [])) {
        const s = pres.addSlide();
        s.background = { color: REOS_BLACK };
        if (slide.title) {
          s.addText(slide.title, {
            x: 0.5, y: 0.4, w: 12.3, h: 1.2,
            fontSize: 36, bold: true, color: REOS_GOLD, fontFace: 'Georgia',
            align: 'left'
          });
        }
        if (slide.body) {
          s.addText(slide.body, {
            x: 0.5, y: 1.8, w: 12.3, h: 5.2,
            fontSize: 18, color: 'FAF8F3', fontFace: 'Calibri',
            align: 'left', valign: 'top', wrap: true
          });
        }
        // Gold line
        s.addShape(pres.ShapeType.rect, {
          x: 0.5, y: 1.5, w: 4, h: 0.04,
          fill: { color: REOS_GOLD }
        });
      }

      const outDir = path.join(docsDir, new Date().toISOString().slice(0, 10));
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, filename || `REOS_Deck_${Date.now()}.pptx`);
      await pres.writeFile({ fileName: outPath });
      return { path: outPath };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('open-docs-dir', async (e, subpath) => {
    const dir = subpath ? path.join(docsDir, subpath) : docsDir;
    shell.openPath(dir);
    return true;
  });
};
