import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const generatePaper = async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 size

  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const italicFont = await doc.embedFont(StandardFonts.HelveticaOblique);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const drawText = (
    text: string,
    opts: { size?: number; font?: any; color?: any; indent?: number; center?: boolean }
  ) => {
    const size = opts.size || 10;
    const font = opts.font || regularFont;
    const color = opts.color || rgb(0, 0, 0);
    const indent = opts.indent || 0;
    const x = opts.center ? (width - font.widthOfTextAtSize(text, size)) / 2 : margin + indent;
    page.drawText(text, { x, y, size, font, color });
    y -= size + 5;
  };

  const gap = (px = 6) => { y -= px; };
  const drawLine = () => {
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0, 0, 0) });
    y -= 8;
  };

  // ─── HEADER ──────────────────────────────────────────────
  drawText('Roll no.', { center: true, font: regularFont, size: 10 });
  gap(4);
  drawText('International Institute of Information Technology, Naya Raipur', { center: true, font: boldFont, size: 11 });
  drawText('Department of Electronics and Communication Engineering', { center: true, font: boldFont, size: 10 });
  drawText('B. Tech. 6th Semester End-Sem-Examination (May 04, 2026)', { center: true, font: boldFont, size: 10 });
  drawText('Subject: VLSI Technology and Design, Code: EC304C', { center: true, font: boldFont, size: 10 });
  gap(6);
  drawLine();

  // Time and Marks on same row
  page.drawText('Time: 3 Hr', { x: margin, y, size: 10, font: boldFont, color: rgb(0, 0, 0) });
  page.drawText('Max. Marks: 50', { x: width - margin - 100, y, size: 10, font: boldFont, color: rgb(0, 0, 0) });
  y -= 16;

  drawText('• Assume any missing data suitably.', { size: 9.5, font: italicFont });
  drawText('• Answer must be to the point and justify the marks allotted.', { size: 9.5, font: italicFont });
  gap(10);
  drawLine();

  // ─── PART A ──────────────────────────────────────────────
  drawText('PART-A', { center: true, font: boldFont, size: 12 });
  gap(6);
  drawText('Q.1.  Attempt any six [6×5]', { font: boldFont, size: 10.5 });
  gap(4);

  const questions = [
    ['(a)', 'What is meant by single crystal silicon? Explain the Czochralski (CZ) method for', '     silicon crystal growth.'],
    ['(b)', 'What are the different types of capacitances in a CMOS inverter?'],
    ['(c)(i)', 'Explain and derive the expression for propagation delay of CMOS inverter.'],
    ['  (ii)', 'Discuss velocity saturation effect and hot carrier effect.'],
    ['(d)', 'Derive the expression for switching inversion voltage (Vm) of a CMOS inverter. How is this'],
    ['     ', 'inversion voltage influenced by the relative sizing (W/L ratios) of the nMOS and pMOS'],
    ['     ', 'transistors in the inverter?'],
    ['(e)', 'Prove that NMOS pass strong "0" and weak "1", however PMOS pass strong "1" and weak "0".'],
    ['(f)(i)', 'What makes dynamic CMOS circuits faster than static CMOS circuits? Compare static'],
    ['      ', 'CMOS and dynamic CMOS.'],
    ['  (ii)', 'Design a half adder using pass transistor logic.'],
    ['(g)', 'Explain the sources of power dissipation in VLSI circuits. Derive the expression for'],
    ['     ', 'dynamic power dissipation in CMOS circuits and discuss factors affecting it.'],
    ['(h)', 'Discuss on the characteristics and working of the Transmission gate and Implement a'],
    ['     ', '4:1 multiplexer using transmission logic gate.'],
  ];

  for (const parts of questions) {
    const [prefix, ...lines] = parts;
    page.drawText(prefix, { x: margin, y, size: 9.5, font: boldFont, color: rgb(0, 0, 0) });
    if (lines[0]) {
      page.drawText(lines[0], { x: margin + 32, y, size: 9.5, font: regularFont, color: rgb(0, 0, 0) });
    }
    y -= 14;
    for (let i = 1; i < lines.length; i++) {
      page.drawText(lines[i], { x: margin + 32, y, size: 9.5, font: regularFont, color: rgb(0, 0, 0) });
      y -= 14;
    }
    gap(2);
  }

  gap(8);
  drawLine();

  // ─── PART B ──────────────────────────────────────────────
  drawText('PART-B', { center: true, font: boldFont, size: 12 });
  gap(6);
  drawText('Q.2.  Attempt any two [10×2]', { font: boldFont, size: 10.5 });
  gap(4);

  const partBQuestions = [
    '(a) Write short notes on given processes used in VLSI circuit design',
    '    (i) Oxidation  (ii) Ion Implantation  (iii) Annealing  (iv) Photolithography  (v) Etching',
    '',
    '(b) Explain CMOS fabrication steps in detail with neat diagrams.',
    '    Discuss the role of each step in achieving the final CMOS device structure.',
    '',
    '(c) Explain MOSFET scaling approaches:',
    '    (i) Constant field scaling  (ii) Constant voltage scaling',
    '    What are the effects of scaling on device parameters and power dissipation?',
  ];

  for (const line of partBQuestions) {
    if (line === '') { gap(6); continue; }
    const isLabel = line.startsWith('(');
    drawText(line, { size: 9.5, font: isLabel ? boldFont : regularFont, indent: 0 });
    gap(2);
  }

  gap(16);
  drawLine();

  // Footer
  drawText('*** All the Best ***', { center: true, font: boldFont, size: 10.5, color: rgb(0.2, 0.2, 0.7) });

  // ─── SAVE ─────────────────────────────────────────────────
  const outPath = path.resolve(__dirname, '../../vlsi_question_paper.pdf');
  const bytes = await doc.save();
  fs.writeFileSync(outPath, bytes);
  console.log(`✅ PDF generated: ${outPath} (${Math.round(bytes.length / 1024)} KB)`);
};

generatePaper().catch(console.error);
