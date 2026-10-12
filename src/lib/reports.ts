// src/lib/reports.ts — build CSV / PDF reports and hand them to the share sheet.
// Needs: npx expo install expo-print expo-sharing
import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type Table = { title: string; head: string[]; rows: (string | number)[][] };

const esc = (v: string | number) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const csvCell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export const toCsv = (t: Table) => [t.head, ...t.rows].map((r) => r.map(csvCell).join(',')).join('\n');

export function toHtml(title: string, tables: Table[]) {
  const when = new Date().toLocaleString();
  const body = tables.map((t) => `<h2>${esc(t.title)}</h2><table><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${
    t.rows.length ? t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${t.head.length}">No data</td></tr>`
  }</table>`).join('');
  return `<html><head><meta charset="utf-8"/><style>body{font-family:Helvetica,Arial,sans-serif;padding:24px;color:#0b2a4a}h1{font-size:20px;margin:0}h2{font-size:14px;margin:22px 0 6px}p{color:#51657a;font-size:12px;margin:4px 0 0}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #cfe0ec;padding:6px 8px;text-align:left}th{background:#eef5fb}</style></head><body><h1>Aqua Systemtech · ${esc(title)}</h1><p>Generated ${esc(when)}</p>${body}</body></html>`;
}

/** Create the file and open the share sheet (or download / print dialog on web). */
export async function exportReport(name: string, format: 'pdf' | 'csv', tables: Table[]) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  if (format === 'csv') {
    const csv = tables.map((t) => (tables.length > 1 ? `# ${t.title}\n` : '') + toCsv(t)).join('\n\n');
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = `${name}-${stamp}.csv`; a.click(); URL.revokeObjectURL(url);
      return;
    }
    await Share.share({ title: `${name}.csv`, message: csv });
    return;
  }
  const html = toHtml(name, tables);
  if (Platform.OS === 'web') { await Print.printAsync({ html }); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: name, UTI: 'com.adobe.pdf' });
  else await Print.printAsync({ uri });
}