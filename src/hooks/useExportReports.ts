import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface GuardPerformanceData {
  name: string;
  compliance: number;
  shiftsCompleted: number;
  totalShifts: number;
  avgRating: number;
  attendanceRate: number;
}

interface ExportData {
  guards: GuardPerformanceData[];
  reportType: 'performance' | 'patrol' | 'attendance';
  dateRange?: { start: Date; end: Date };
}

export function useExportReports() {
  const { toast } = useToast();

  const exportToPDF = useMutation({
    mutationFn: async (data: ExportData) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      doc.text("Guard Performance Report", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth / 2, 28, { align: "center" });
      
      if (data.dateRange) {
        doc.text(
          `Period: ${format(data.dateRange.start, 'MMM d, yyyy')} - ${format(data.dateRange.end, 'MMM d, yyyy')}`,
          pageWidth / 2, 34, { align: "center" }
        );
      }

      // Summary Stats
      const totalGuards = data.guards.length;
      const avgCompliance = data.guards.reduce((sum, g) => sum + g.compliance, 0) / totalGuards || 0;
      const avgAttendance = data.guards.reduce((sum, g) => sum + g.attendanceRate, 0) / totalGuards || 0;
      const totalShifts = data.guards.reduce((sum, g) => sum + g.totalShifts, 0);

      doc.setFontSize(12);
      doc.setTextColor(33, 33, 33);
      doc.text("Summary", 14, 48);
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Guards: ${totalGuards}`, 14, 56);
      doc.text(`Average Compliance: ${avgCompliance.toFixed(1)}%`, 14, 62);
      doc.text(`Average Attendance: ${avgAttendance.toFixed(1)}%`, 80, 56);
      doc.text(`Total Shifts: ${totalShifts}`, 80, 62);

      // Guard Performance Table
      const tableData = data.guards.map((guard) => [
        guard.name,
        `${guard.compliance.toFixed(1)}%`,
        `${guard.shiftsCompleted}/${guard.totalShifts}`,
        guard.avgRating.toFixed(1),
        `${guard.attendanceRate.toFixed(1)}%`,
      ]);

      autoTable(doc, {
        startY: 72,
        head: [['Guard Name', 'Compliance', 'Shifts', 'Rating', 'Attendance']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
      });

      // Top Performers
      const topPerformers = [...data.guards]
        .sort((a, b) => b.compliance - a.compliance)
        .slice(0, 5);

      const finalY = (doc as any).lastAutoTable.finalY || 150;
      
      doc.setFontSize(12);
      doc.setTextColor(33, 33, 33);
      doc.text("Top Performers", 14, finalY + 15);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Rank', 'Name', 'Compliance', 'Rating']],
        body: topPerformers.map((g, i) => [
          `#${i + 1}`,
          g.name,
          `${g.compliance.toFixed(1)}%`,
          g.avgRating.toFixed(1),
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: 255,
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Save
      const fileName = `guard-performance-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      return fileName;
    },
    onSuccess: (fileName) => {
      toast({
        title: "PDF Exported",
        description: `Report saved as ${fileName}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportToExcel = useMutation({
    mutationFn: async (data: ExportData) => {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Guard Performance Sheet
      const performanceData = data.guards.map((guard) => ({
        'Guard Name': guard.name,
        'Compliance (%)': guard.compliance,
        'Shifts Completed': guard.shiftsCompleted,
        'Total Shifts': guard.totalShifts,
        'Average Rating': guard.avgRating,
        'Attendance Rate (%)': guard.attendanceRate,
      }));

      const ws1 = XLSX.utils.json_to_sheet(performanceData);
      XLSX.utils.book_append_sheet(wb, ws1, "Performance");

      // Summary Sheet
      const totalGuards = data.guards.length;
      const avgCompliance = data.guards.reduce((sum, g) => sum + g.compliance, 0) / totalGuards || 0;
      const avgAttendance = data.guards.reduce((sum, g) => sum + g.attendanceRate, 0) / totalGuards || 0;
      const totalShifts = data.guards.reduce((sum, g) => sum + g.totalShifts, 0);

      const summaryData = [
        { 'Metric': 'Total Guards', 'Value': totalGuards },
        { 'Metric': 'Average Compliance (%)', 'Value': avgCompliance.toFixed(1) },
        { 'Metric': 'Average Attendance (%)', 'Value': avgAttendance.toFixed(1) },
        { 'Metric': 'Total Shifts', 'Value': totalShifts },
        { 'Metric': 'Report Generated', 'Value': format(new Date(), 'PPP p') },
      ];

      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, "Summary");

      // Top Performers Sheet
      const topPerformers = [...data.guards]
        .sort((a, b) => b.compliance - a.compliance)
        .slice(0, 10)
        .map((g, i) => ({
          'Rank': i + 1,
          'Guard Name': g.name,
          'Compliance (%)': g.compliance,
          'Rating': g.avgRating,
          'Attendance (%)': g.attendanceRate,
        }));

      const ws3 = XLSX.utils.json_to_sheet(topPerformers);
      XLSX.utils.book_append_sheet(wb, ws3, "Top Performers");

      // Save
      const fileName = `guard-performance-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      return fileName;
    },
    onSuccess: (fileName) => {
      toast({
        title: "Excel Exported",
        description: `Report saved as ${fileName}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    exportToPDF,
    exportToExcel,
  };
}