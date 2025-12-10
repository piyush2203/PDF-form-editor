const express = require("express");
const cors = require("cors");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve final PDFs
app.use("/output", express.static("output"));

// Convert relative → PDF absolute coords
function relToAbs(rel, pageWidth, pageHeight) {
  return {
    x: rel.xRel * pageWidth,
    y: pageHeight - rel.yRel * pageHeight - rel.hRel * pageHeight, // PDF origin bottom-left
    w: rel.wRel * pageWidth,
    h: rel.hRel * pageHeight,
  };
}

// Compute SHA-256 hash (Audit requirement)
function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

app.post("/generate-signed-pdf", async (req, res) => {
  try {
    const { pdfUrl, fields } = req.body;

    // Load original PDF
    const existingPdfBytes = fs.readFileSync(`.${pdfUrl}`);

    // Hash original PDF (Audit)
    const originalHash = sha256(existingPdfBytes);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const field of fields) {
      const coords = relToAbs(field, pageWidth, pageHeight);

      if (field.type === "signature" && field.imageUrl) {
        const signatureImage = await pdfDoc.embedPng(field.imageUrl);
        page.drawImage(signatureImage, {
          x: coords.x,
          y: coords.y,
          width: coords.w,
          height: coords.h,
        });
      }

      if (field.type === "text") {
        page.drawText(field.value || "", {
          x: coords.x,
          y: coords.y + coords.h / 2,
          size: 14,
          font,
          color: rgb(0, 0, 0),
        });
      }

      if (field.type === "date") {
        page.drawText(field.value || "", {
          x: coords.x,
          y: coords.y + coords.h / 2,
          size: 14,
          font,
          color: rgb(0, 0, 0),
        });
      }

      if (field.type === "radio") {
        page.drawCircle({
          x: coords.x + coords.w / 2,
          y: coords.y + coords.h / 2,
          size: 6,
          color: rgb(0, 0, 0),
        });
      }

      if (field.type === "image" && field.imageUrl) {
        const img = await pdfDoc.embedPng(field.imageUrl);
        page.drawImage(img, {
          x: coords.x,
          y: coords.y,
          width: coords.w,
          height: coords.h,
        });
      }
    }

    const finalPdfBytes = await pdfDoc.save();
    const finalHash = sha256(finalPdfBytes);

    const filename = `signed_${uuidv4()}.pdf`;
    const outputPath = `./output/${filename}`;
    fs.writeFileSync(outputPath, finalPdfBytes);

    res.json({
      success: true,
      signedPdfUrl: `/output/${filename}`,
      originalHash,
      finalHash,
    });

  } catch (err) {
    console.error("Error generating signed PDF:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.listen(4000, () => {
  console.log("PDF signing backend running on port 4000");
});
