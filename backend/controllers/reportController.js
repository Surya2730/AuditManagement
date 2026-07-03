import AuditResponse from '../models/AuditResponse.js';
import Assignment from '../models/Assignment.js';
import GPSLog from '../models/GPSLog.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// @desc    Generate PDF report for an audit
// @route   GET /api/reports/:responseId/pdf
// @access  Private
export const generatePDFReport = async (req, res) => {
  try {
    const response = await AuditResponse.findById(req.params.responseId)
      .populate({
        path: 'assignment',
        populate: { path: 'location' },
      })
      .populate('auditor', 'username profile')
      .populate('reviewedBy', 'username profile');

    if (!response) {
      return res.status(404).json({ message: 'Audit response not found' });
    }

    // Auth check for Auditor
    if (
      req.user.role === 'Auditor' &&
      response.auditor._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const location = response.assignment.location;
    const auditor = response.auditor;
    const gpsLogs = await GPSLog.find({ assignment: response.assignment._id }).sort({ timestamp: 1 });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=BIT_Audit_Report_${response._id}.pdf`
    );
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill('#0B5ED7');
    doc.fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('BANNARI AMMAN INSTITUTE OF TECHNOLOGY', 50, 22, { align: 'center' });
    doc.font('Helvetica')
      .fontSize(10)
      .text('Smart Infrastructure Audit & Inspection Management System', 50, 44, { align: 'center' });
    doc.fontSize(9)
      .text('Sathyamangalam, Erode District, Tamil Nadu — 638401', 50, 58, { align: 'center' });
    doc.moveDown();

    // ── Report Title ─────────────────────────────────────────────────────
    doc.fillColor('#000000').moveDown(3);
    doc.rect(50, 100, doc.page.width - 100, 30).fill('#EAF3FF');
    doc.fillColor('#0B5ED7').font('Helvetica-Bold').fontSize(13)
      .text('INFRASTRUCTURE INSPECTION REPORT', 50, 108, { align: 'center' });

    doc.moveDown(2.5);

    // ── Summary Table ────────────────────────────────────────────────────
    const tableTop = 145;
    const col1 = 50, col2 = 200, col3 = 340, col4 = 490;

    const drawRow = (label1, val1, label2, val2, y) => {
      doc.rect(col1, y, 140, 22).stroke('#dee2e6');
      doc.rect(col2, y, 130, 22).stroke('#dee2e6');
      doc.rect(col3, y, 140, 22).stroke('#dee2e6');
      doc.rect(col4, y, 65, 22).stroke('#dee2e6');

      doc.fillColor('#555').font('Helvetica-Bold').fontSize(8).text(label1, col1 + 4, y + 7);
      doc.fillColor('#000').font('Helvetica').text(String(val1), col2 + 4, y + 7, { width: 120 });
      doc.fillColor('#555').font('Helvetica-Bold').text(label2, col3 + 4, y + 7);
      doc.fillColor('#000').font('Helvetica').text(String(val2), col4 + 4, y + 7, { width: 60 });
    };

    drawRow('Location:', location.name, 'Report ID:', response._id.toString().slice(-8).toUpperCase(), tableTop);
    drawRow(
      'Auditor:',
      auditor.profile?.fullName || auditor.username,
      'Submission:',
      response.submitTime ? new Date(response.submitTime).toLocaleDateString('en-IN') : 'N/A',
      tableTop + 24
    );
    drawRow(
      'Employee ID:',
      auditor.profile?.employeeId || '—',
      'Status:',
      response.status,
      tableTop + 48
    );
    drawRow(
      'Department:',
      auditor.profile?.department || '—',
      'Compliance:',
      `${response.complianceScore}%`,
      tableTop + 72
    );
    drawRow(
      'Scheduled Date:',
      response.assignment.scheduledDate
        ? new Date(response.assignment.scheduledDate).toLocaleDateString('en-IN')
        : 'N/A',
      'GPS Pings:',
      `${response.totalGpsPings || 0}`,
      tableTop + 96
    );
    drawRow(
      'GPS at Submission:',
      `${response.gpsMetadata.latitude?.toFixed(5)}, ${response.gpsMetadata.longitude?.toFixed(5)}`,
      'Deviations:',
      `${response.totalDeviations || 0}`,
      tableTop + 120
    );

    // ── Compliance Score Bar ─────────────────────────────────────────────
    doc.moveDown(9);
    const score = response.complianceScore || 0;
    const barColor = score >= 80 ? '#198754' : score >= 60 ? '#ffc107' : '#dc3545';

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333')
      .text(`Compliance Score: ${score}%`, 50, doc.y);
    doc.rect(50, doc.y + 4, 495, 14).fill('#e9ecef');
    doc.rect(50, doc.y + 4, Math.round(4.95 * score), 14).fill(barColor);
    doc.moveDown(2.5);

    // ── Checklist Answers ────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0B5ED7')
      .text('INSPECTION CHECKLIST RESPONSES', 50, doc.y);
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#0B5ED7');
    doc.moveDown(0.5);

    const checklistByCategory = {};
    location.checklist.forEach((q) => {
      const cat = q.category || 'General';
      if (!checklistByCategory[cat]) checklistByCategory[cat] = [];
      checklistByCategory[cat].push(q);
    });

    let qIndex = 1;
    for (const [category, questions] of Object.entries(checklistByCategory)) {
      // Check remaining page space
      if (doc.y > 680) doc.addPage();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0B5ED7')
        .text(`  ${category}`, 50, doc.y + 6);
      doc.rect(50, doc.y - 2, 495, 18).stroke('#0B5ED7').fillOpacity(0.05).fill('#EAF3FF').fillOpacity(1);
      doc.moveDown(1.2);

      for (const q of questions) {
        if (doc.y > 700) doc.addPage();

        const ans = response.answers.find((a) => a.questionId === q.questionId);
        const value = ans?.value || '—';
        const remarks = ans?.remarks || '';

        const ansColor =
          value === 'Yes' ? '#198754' :
          value === 'No' ? '#dc3545' :
          '#000000';

        doc.font('Helvetica').fontSize(8).fillColor('#333')
          .text(`${qIndex}. ${q.question}`, 60, doc.y, { continued: false, width: 340 });
        doc.font('Helvetica-Bold').fillColor(ansColor)
          .text(`${value}`, 420, doc.y - 10, { width: 125 });

        if (remarks) {
          doc.font('Helvetica').fontSize(7).fillColor('#777')
            .text(`   Remark: ${remarks}`, 65, doc.y, { width: 350 });
        }

        doc.moveDown(0.4);
        qIndex++;
      }
      doc.moveDown(0.5);
    }

    // ── GPS Summary ──────────────────────────────────────────────────────
    if (gpsLogs.length > 0) {
      if (doc.y > 620) doc.addPage();
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0B5ED7')
        .text('GPS TRACKING SUMMARY', 50, doc.y);
      doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#0B5ED7');
      doc.moveDown(0.8);

      const deviations = gpsLogs.filter((g) => g.isDeviationEvent);
      doc.font('Helvetica').fontSize(9).fillColor('#333')
        .text(`Total GPS pings recorded: ${gpsLogs.length}`, 50, doc.y);
      doc.text(`Deviation events: ${deviations.length}`, 50, doc.y);
      doc.text(
        `Tracking started: ${gpsLogs[0]?.timestamp ? new Date(gpsLogs[0].timestamp).toLocaleString('en-IN') : 'N/A'}`,
        50, doc.y
      );
      doc.text(
        `Last ping: ${gpsLogs[gpsLogs.length - 1]?.timestamp ? new Date(gpsLogs[gpsLogs.length - 1].timestamp).toLocaleString('en-IN') : 'N/A'}`,
        50, doc.y
      );

      if (deviations.length > 0 && doc.y < 680) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#dc3545')
          .text('Deviation Events:', 50, doc.y);
        deviations.slice(0, 5).forEach((d, i) => {
          doc.font('Helvetica').fontSize(8).fillColor('#555')
            .text(
              `${i + 1}. ${new Date(d.timestamp).toLocaleString('en-IN')} — ${Math.round(d.distanceFromLocation)}m from ${location.name}`,
              60, doc.y
            );
        });
      }
    }

    // ── Geotagged Visit Photo ────────────────────────────────────────────
    if (response.visitImage) {
      const localPath = path.join(process.cwd(), response.visitImage.startsWith('/') ? response.visitImage.slice(1) : response.visitImage);
      if (fs.existsSync(localPath)) {
        if (doc.y > 550) doc.addPage();
        doc.moveDown();
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0B5ED7').text('GEOTAGGED VISIT PHOTO VERIFICATION', 50, doc.y);
        doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#0B5ED7');
        doc.moveDown(0.8);
        
        try {
          doc.image(localPath, 50, doc.y, { fit: [250, 150] });
          doc.moveDown(10); // push down Y after image
        } catch (imageErr) {
          console.error('Error drawing image in PDF:', imageErr.message);
          doc.font('Helvetica-Oblique').fontSize(8).fillColor('#dc3545').text('Could not render visit image in PDF format.', 50, doc.y);
        }
      }
    }

    // ── Reviewer Remarks ─────────────────────────────────────────────────
    if (response.reviewedBy && doc.y < 700) {
      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0B5ED7').text('REVIEWER REMARKS', 50, doc.y);
      doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#0B5ED7');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9).fillColor('#333')
        .text(`Reviewed by: ${response.reviewedBy.username}`, 50, doc.y)
        .text(`Status: ${response.status}`, 50, doc.y)
        .text(`Remarks: ${response.reviewRemarks || 'None'}`, 50, doc.y);
    }

    // ── Footer ───────────────────────────────────────────────────────────
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill('#F7F9FC');
      doc.font('Helvetica').fontSize(7).fillColor('#6c757d')
        .text(
          `Bannari Amman Institute of Technology | Estate & Quality Management Cell | Generated: ${new Date().toLocaleString('en-IN')} | Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 28,
          { align: 'center', width: doc.page.width - 100 }
        );
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
