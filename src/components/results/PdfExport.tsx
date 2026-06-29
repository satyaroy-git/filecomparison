import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/Button';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DiffResult, ColumnMapping } from '@/types';

export function PdfExport() {
  const { diffResult } = useAppStore();

  if (!diffResult) return null;

  const handleExport = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const mappings = diffResult.columnMappings;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('File Comparison Report', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 40);

    const summaryData = [
      ['Total Rows in Original (A)', String(diffResult.summary.totalRowsA)],
      ['Total Rows in Modified (B)', String(diffResult.summary.totalRowsB)],
      ['Difference Records', String(diffResult.summary.modifiedRows)],
      ['Only in Original', String(diffResult.summary.removedRows)],
      ['Only in Modified', String(diffResult.summary.addedRows)],
      ['Matched Rows', String(diffResult.summary.unchangedRows)],
      ['Comparison Time', `${diffResult.summary.comparisonTimeMs.toFixed(0)}ms`],
    ];

    autoTable(doc, {
      startY: 44,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold' } },
    });

    // Column Statistics
    const statsStartY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Column Statistics', 14, statsStartY);

    const statsData = diffResult.columnStats.map(stat => [
      stat.columnName,
      String(stat.totalCells),
      String(stat.changedCells),
      String(stat.addedCells),
      String(stat.removedCells),
      `${stat.changePercentage.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: statsStartY + 4,
      head: [['Column', 'Total', 'Changed', 'Added', 'Removed', '% Changed']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    // Difference Records (first 50 rows)
    const diffRows = diffResult.rows.filter(r => r.status === 'modified').slice(0, 50);
    if (diffRows.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Difference Records (first ${Math.min(diffRows.length, 50)} of ${diffResult.summary.modifiedRows})`, 14, 20);

      const diffHeaders = ['#A', '#B'];
      for (const m of mappings) {
        const name = m.headerA || m.headerB || 'Col';
        diffHeaders.push(`${name} (A)`);
        diffHeaders.push(`${name} (B)`);
      }

      const diffData = diffRows.map(row => {
        const rowData: string[] = [
          String(row.lineNumberA || '-'),
          String(row.lineNumberB || '-'),
        ];
        for (const cell of row.cells) {
          rowData.push(cell.valueA ?? '');
          rowData.push(cell.valueB ?? '');
        }
        return rowData;
      });

      autoTable(doc, {
        startY: 26,
        head: [diffHeaders],
        body: diffData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 6 },
        styles: { fontSize: 6, cellPadding: 1.5 },
        didParseCell: (data) => {
          // Color changed cells
          if (data.section === 'body' && data.column.index >= 2) {
            const mappingIdx = Math.floor((data.column.index - 2) / 2);
            const isOriginal = (data.column.index - 2) % 2 === 0;
            const row = diffRows[data.row.index];
            if (row && row.cells[mappingIdx]?.status === 'changed') {
              if (isOriginal) {
                data.cell.styles.fillColor = [255, 199, 206]; // Red
                data.cell.styles.textColor = [156, 0, 6];
              } else {
                data.cell.styles.fillColor = [198, 239, 206]; // Green
                data.cell.styles.textColor = [0, 97, 0];
              }
            }
          }
        },
      });
    }

    // Only in Original (first 30)
    const removedRows = diffResult.rows.filter(r => r.status === 'removed').slice(0, 30);
    if (removedRows.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Only in Original File (first ${removedRows.length} of ${diffResult.summary.removedRows})`, 14, 20);

      const headers = ['#', ...mappings.map(m => m.headerA || m.headerB || 'Col')];
      const data = removedRows.map(row => [
        String(row.lineNumberA || '-'),
        ...row.cells.map(c => c.valueA ?? ''),
      ]);

      autoTable(doc, {
        startY: 26,
        head: [headers],
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7 },
      });
    }

    // Only in Modified (first 30)
    const addedRows = diffResult.rows.filter(r => r.status === 'added').slice(0, 30);
    if (addedRows.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Only in Modified File (first ${addedRows.length} of ${diffResult.summary.addedRows})`, 14, 20);

      const headers = ['#', ...mappings.map(m => m.headerA || m.headerB || 'Col')];
      const data = addedRows.map(row => [
        String(row.lineNumberB || '-'),
        ...row.cells.map(c => c.valueB ?? ''),
      ]);

      autoTable(doc, {
        startY: 26,
        head: [headers],
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7 },
      });
    }

    doc.save('comparison-report.pdf');
  };

  return (
    <Button size="sm" variant="secondary" onClick={handleExport}>
      <FileText className="w-3.5 h-3.5" />
      Download PDF
    </Button>
  );
}
