import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import qrcode from 'qrcode';

// Helper to check if file exists
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
};

export const generatePDFReport = async (response) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure reports directory exists
      const reportsDir = './reports';
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `Inspection_Report_${response._id}.pdf`;
      const filePath = path.join(reportsDir, fileName);

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // --- HEADER SECTION ---
      // Primary College Header (ERP Style - Minimalist / Professional)
      doc
        .fillColor('#002B49')
        .fontSize(20)
        .text('METROPOLITAN INSTITUTE OF TECHNOLOGY', { align: 'center' })
        .fontSize(10)
        .text('Affiliated to State Technical University | ISO 9001:2015 Certified Campus', { align: 'center' })
        .moveDown(0.5);

      // Horizontal line
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#0B5ED7')
        .lineWidth(2)
        .stroke()
        .moveDown(1.5);

      // Title
      doc
        .fillColor('#333333')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('INFRASTRUCTURE INSPECTION & COMPLIANCE REPORT', { align: 'center' })
        .font('Helvetica')
        .fontSize(10)
        .moveDown(1.5);

      // Info Table Structure
      const infoTop = doc.y;
      
      // Column 1
      doc
        .font('Helvetica-Bold')
        .text('Inspection ID:', 50, infoTop)
        .font('Helvetica')
        .text(response._id.toString(), 150, infoTop)
        .font('Helvetica-Bold')
        .text('Building Name:', 50, infoTop + 18)
        .font('Helvetica')
        .text(response.assignment.building.name, 150, infoTop + 18)
        .font('Helvetica-Bold')
        .text('Room Number:', 50, infoTop + 36)
        .font('Helvetica')
        .text(response.assignment.roomNumber, 150, infoTop + 36)
        .font('Helvetica-Bold')
        .text('Category Type:', 50, infoTop + 54)
        .font('Helvetica')
        .text(response.assignment.category.name, 150, infoTop + 54);

      // Column 2
      doc
        .font('Helvetica-Bold')
        .text('Date & Time:', 320, infoTop)
        .font('Helvetica')
        .text(new Date(response.submitTime).toLocaleString(), 420, infoTop)
        .font('Helvetica-Bold')
        .text('Auditor In-charge:', 320, infoTop + 18)
        .font('Helvetica')
        .text(response.auditor.profile?.fullName || response.auditor.username, 420, infoTop + 18)
        .font('Helvetica-Bold')
        .text('Compliance Rate:', 320, infoTop + 36)
        .font('Helvetica-Bold')
        .fillColor(response.complianceScore >= 80 ? '#2E7D32' : response.complianceScore >= 50 ? '#EF6C00' : '#C62828')
        .text(`${response.complianceScore}%`, 420, infoTop + 36)
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .text('Audit Status:', 320, infoTop + 54)
        .font('Helvetica')
        .text(response.status, 420, infoTop + 54);

      doc.moveDown(3);

      // --- GPS GEOLOCATION METADATA ---
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#002B49')
        .text('GPS Location Verification Metadata', 50, doc.y)
        .moveDown(0.5);

      const gpsTop = doc.y;
      doc
        .rect(50, gpsTop, 495, 45)
        .fillColor('#F7F9FC')
        .fill()
        .strokeColor('#DDDDDD')
        .lineWidth(1)
        .stroke();

      doc
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Coordinates:', 60, gpsTop + 8)
        .font('Helvetica')
        .text(`${response.gpsMetadata.latitude.toFixed(6)}, ${response.gpsMetadata.longitude.toFixed(6)}`, 130, gpsTop + 8)
        .font('Helvetica-Bold')
        .text('Accuracy Radius:', 60, gpsTop + 24)
        .font('Helvetica')
        .text(`${response.gpsMetadata.accuracy.toFixed(1)} meters`, 140, gpsTop + 24);

      doc
        .font('Helvetica-Bold')
        .text('Geofence Verification:', 310, gpsTop + 8)
        .fillColor(response.gpsMetadata.isInsideGeofence ? '#2E7D32' : '#C62828')
        .text(response.gpsMetadata.isInsideGeofence ? 'VERIFIED (Within Radius)' : 'WARNING (Outside Radius)', 420, gpsTop + 8)
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .text('Audit Started At:', 310, gpsTop + 24)
        .font('Helvetica')
        .text(new Date(response.startTime).toLocaleTimeString(), 390, gpsTop + 24);

      doc.moveDown(3);

      // --- CHECKLIST TABLE ---
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#002B49')
        .text('Inspection Checklist Parameters & Responses', 50, doc.y)
        .moveDown(0.5);

      // Table Header
      let tableTop = doc.y;
      doc
        .rect(50, tableTop, 495, 20)
        .fillColor('#0B5ED7')
        .fill();

      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Parameter Question', 60, tableTop + 5, { width: 220 })
        .text('Type', 280, tableTop + 5, { width: 60 })
        .text('Response', 350, tableTop + 5, { width: 70 })
        .text('Remarks / Observations', 430, tableTop + 5, { width: 110 });

      let currentY = tableTop + 20;
      doc.fillColor('#333333').font('Helvetica');

      // Draw rows
      response.answers.forEach((ans, idx) => {
        // Fetch question template info
        const q = response.assignment.category.checklist.find(
          (item) => item.questionId === ans.questionId
        );
        const questionText = q ? q.text : 'Unknown parameter';
        const questionType = q ? q.type : 'Yes/No';

        // Row background alternating colors
        if (idx % 2 === 1) {
          doc
            .rect(50, currentY, 495, 24)
            .fillColor('#F7F9FC')
            .fill();
        }

        doc
          .fillColor('#333333')
          .text(questionText, 60, currentY + 6, { width: 210, height: 16 })
          .text(questionType, 280, currentY + 6, { width: 60 })
          .font('Helvetica-Bold')
          .fillColor(ans.value === 'Yes' ? '#2E7D32' : ans.value === 'No' ? '#C62828' : '#333333')
          .text(ans.value || '-', 350, currentY + 6, { width: 70 })
          .font('Helvetica')
          .fillColor('#333333')
          .text(ans.remarks || 'No remarks', 430, currentY + 6, { width: 110, height: 16 });

        // Bottom cell border
        doc
          .moveTo(50, currentY + 24)
          .lineTo(545, currentY + 24)
          .strokeColor('#EAF3FF')
          .lineWidth(0.5)
          .stroke();

        currentY += 24;

        // Auto Page break handling (rough limit)
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      });

      doc.moveDown(2.5);

      // --- SIGNATURES & QR VERIFICATION ---
      // Generate QR verification code
      const qrDataUrl = `http://college-erp.portal/verify/audit/${response._id}`;
      const qrImageBuffer = await qrcode.toBuffer(qrDataUrl);

      // Signature & QR positioning (Keep at bottom)
      if (doc.y > 620) {
        doc.addPage();
      }

      const footerTop = 700;

      // QR Code Box
      doc.image(qrImageBuffer, 50, footerTop - 45, { width: 75 });
      doc
        .fontSize(7)
        .fillColor('#666666')
        .text('Scan QR code to verify validity of this document on college portal.', 50, footerTop + 35, { width: 100 });

      // Auditor Signature Line
      doc
        .moveTo(250, footerTop + 10)
        .lineTo(370, footerTop + 10)
        .strokeColor('#CCCCCC')
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(9)
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .text('Auditor In-Charge', 255, footerTop + 15)
        .font('Helvetica')
        .fontSize(8)
        .text(response.auditor.profile?.fullName || response.auditor.username, 255, footerTop + 27);

      // Approving Authority Line
      doc
        .moveTo(420, footerTop + 10)
        .lineTo(540, footerTop + 10)
        .strokeColor('#CCCCCC')
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(9)
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .text('Approving Authority', 425, footerTop + 15)
        .font('Helvetica')
        .fontSize(8)
        .text(response.reviewedBy ? response.reviewedBy.username : 'Pending Approval', 425, footerTop + 27);

      // End document
      doc.end();

      writeStream.on('finish', () => {
        resolve(filePath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};
