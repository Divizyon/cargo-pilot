import * as XLSX from 'xlsx';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Item } from '@/lib/types/item';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDate, getExcelDateCellValue } from '@/lib/utils/format/formatDate';

// ─── Excel 365 native checkbox injection ─────────────────────────────────────
//
// Injects Microsoft's featurePropertyBag checkbox format (2023+) into an xlsx
// ZIP so that Excel 365 renders boolean cells as clickable checkboxes.
// Other Excel versions and Google Sheets show TRUE/FALSE text (still readable).
//
// Algorithm:
//  1. SheetJS writes boolean cells as <c r="I2" t="b"><v>1</v></c>
//  2. We add a checkbox xf style to styles.xml and point those cells to it via s=""
//  3. We inject featurePropertyBag.xml + wire up Content_Types and workbook.rels

function downloadXlsxWithExcel365Checkboxes(
  workbook: XLSX.WorkBook,
  fileName: string,
  boolCols: string[],
): void {
  const raw = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as Uint8Array;

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(raw);
  } catch {
    XLSX.writeFile(workbook, fileName);
    return;
  }

  const sheetKey = Object.keys(files).find((k) => /xl\/worksheets\/sheet\d+\.xml/.test(k));
  if (!sheetKey) {
    XLSX.writeFile(workbook, fileName);
    return;
  }

  // ── Step 1: patch styles.xml — append checkbox xf entry ──────────────────
  const stylesKey = 'xl/styles.xml';
  if (files[stylesKey]) {
    let stylesXml = strFromU8(files[stylesKey]);

    const countMatch = stylesXml.match(/<cellXfs count="(\d+)"/);
    const currentCount = countMatch ? parseInt(countMatch[1], 10) : 1;

    const checkboxXf =
      `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0">` +
      `<extLst><ext uri="{C7286773-470A-42A8-94C5-96B5CB345126}"` +
      ` xmlns:xfpb="http://schemas.microsoft.com/office/spreadsheetml/2022/featurepropertybag">` +
      `<xfpb:xfComplement i="0"/></ext></extLst></xf>`;

    stylesXml = stylesXml
      .replace(`<cellXfs count="${currentCount}"`, `<cellXfs count="${currentCount + 1}"`)
      .replace('</cellXfs>', checkboxXf + '</cellXfs>');

    files[stylesKey] = strToU8(stylesXml);

    // ── Step 2: add s="<checkboxXfIndex>" to boolean cells in boolCols ─────
    const checkboxXfIndex = currentCount; // newly appended xf index
    const colSet = new Set(boolCols);
    let sheetXml = strFromU8(files[sheetKey]);

    sheetXml = sheetXml.replace(
      /<c r="([A-Z]+)(\d+)"([^>]*?) t="b"/g,
      (match, col: string, row: string, attrs: string) => {
        if (!colSet.has(col)) return match;
        const cleanAttrs = attrs.replace(/\s+s="[^"]*"/, '');
        return `<c r="${col}${row}"${cleanAttrs} s="${checkboxXfIndex}" t="b"`;
      },
    );

    files[sheetKey] = strToU8(sheetXml);
  }

  // ── Step 3: create featurePropertyBag.xml ────────────────────────────────
  const fpbXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<FeaturePropertyBags xmlns="http://schemas.microsoft.com/office/spreadsheetml/2022/featurepropertybag">` +
    `<bag type="Checkbox"/>` +
    `<bag type="XFControls"><bagId k="CellControl">0</bagId></bag>` +
    `<bag type="XFComplement"><bagId k="XFControls">1</bagId></bag>` +
    `<bag type="XFComplements" extRef="XFComplementsMapperExtRef">` +
    `<a k="MappedFeaturePropertyBags"><bagId>2</bagId></a></bag>` +
    `</FeaturePropertyBags>`;
  files['xl/featurePropertyBag/featurePropertyBag.xml'] = strToU8(fpbXml);

  // ── Step 4: patch [Content_Types].xml ───────────────────────────────────
  const ctKey = '[Content_Types].xml';
  if (files[ctKey]) {
    let ctXml = strFromU8(files[ctKey]);
    const fpbOverride =
      `<Override PartName="/xl/featurePropertyBag/featurePropertyBag.xml"` +
      ` ContentType="application/vnd.ms-excel.featurepropertybag+xml"/>`;
    ctXml = ctXml.replace('</Types>', fpbOverride + '</Types>');
    files[ctKey] = strToU8(ctXml);
  }

  // ── Step 5: patch xl/_rels/workbook.xml.rels ─────────────────────────────
  const wbRelsKey = 'xl/_rels/workbook.xml.rels';
  if (files[wbRelsKey]) {
    let wbRelsXml = strFromU8(files[wbRelsKey]);
    const fpbRel =
      `<Relationship Id="rIdFPB"` +
      ` Type="http://schemas.microsoft.com/office/2022/11/relationships/FeaturePropertyBag"` +
      ` Target="featurePropertyBag/featurePropertyBag.xml"/>`;
    wbRelsXml = wbRelsXml.replace('</Relationships>', fpbRel + '</Relationships>');
    files[wbRelsKey] = strToU8(wbRelsXml);
  }

  // ── Step 6: repack and trigger download ──────────────────────────────────
  const zipped = zipSync(files);
  const blob = new Blob([zipped], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportItemsToExcel(items: Item[]): void {
  const { dateFormat } = useUnitStore.getState();

  const rows = items.map((item) => ({
    SKU: item.sku,
    'Ürün Adı': item.name,
    'Tip (koli/varil/palet)': item.productType,
    'Genişlik(cm)': item.width,
    'Yükseklik(cm)': item.height,
    'Uzunluk(cm)': item.length,
    'Ağırlık(kg)': item.weight,
    'Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)':
      item.fragility === 2 ? 2 : item.fragility === 1 ? 1 : 0,
    'İstiflenebilir (true/false)': item.isStackable ? 'true' : 'false',
    'Maks Kat': item.maxStackCount,
    'X Dönüşümü (true/false)': item.allowRotateX ? 'true' : 'false',
    'Y Dönüşümü (true/false)': item.allowRotateY ? 'true' : 'false',
    'Z Dönüşümü (true/false)': item.allowRotateZ ? 'true' : 'false',
    'Özel Notlar': item.specialNotes ?? '',
  }));

  const exportDate = new Date();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');

  const metaWs = XLSX.utils.aoa_to_sheet(
    [['Dışa Aktarma Tarihi', getExcelDateCellValue(exportDate, dateFormat)]],
    { cellDates: true },
  );
  XLSX.utils.book_append_sheet(wb, metaWs, 'Meta');

  XLSX.writeFile(wb, `CargoPilot_Urunler_${formatDate(exportDate, dateFormat)}.xlsx`);
}

export function downloadItemImportTemplate(): void {
  const headers = [
    'SKU',
    'Ürün Adı',
    'Tip (koli/varil/palet)',
    'Genişlik(cm)',
    'Yükseklik(cm)',
    'Uzunluk(cm)',
    'Ağırlık(kg)',
    'Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)',
    'İstiflenebilir (true/false)',
    'Maks Kat',
    'X Dönüşümü (true/false)',
    'Y Dönüşümü (true/false)',
    'Z Dönüşümü (true/false)',
    'Özel Notlar',
  ];
  // Boolean columns use actual boolean values → Excel 365 renders them as checkboxes
  // I=İstiflenebilir, K=X Dönüşümü, L=Y Dönüşümü, M=Z Dönüşümü
  const example = [
    'SKU001',
    'Örnek Koli',
    'koli',
    '300',
    '200',
    '100',
    '2.5',
    '0',
    true,
    '3',
    true,
    true,
    true,
    '',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Şablon');
  downloadXlsxWithExcel365Checkboxes(wb, 'CargoPilot_Urun_Import_Sablon.xlsx', [
    'I',
    'K',
    'L',
    'M',
  ]);
}

export function downloadVehicleImportTemplate(): void {
  const headers = [
    'Araç Tipi (Tır/Kamyon/Kamposet/Konteyner)',
    'Araç Adı',
    'Plaka (Tır/Kamyon/Kamposet için zorunlu)',
    'Seri No (Konteyner için zorunlu)',
    'Uzunluk (cm)',
    'Genişlik (cm)',
    'Yükseklik (cm)',
    'Maks Yük (kg)',
    'Kapı Yönü (rear/side/top/rearAndSide)',
  ];
  const example = ['Tır', 'Ana Dorse', '34ABC123', '', '1360', '240', '270', '26000', 'rear'];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Şablon');
  XLSX.writeFile(wb, 'CargoPilot_Arac_Import_Sablon.xlsx');
}
