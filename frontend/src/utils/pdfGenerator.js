import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to add a generic header
const addHeader = (doc, title) => {
  doc.setFillColor(15, 23, 42); // Dark background
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("RMG Blockchain Supply Chain", 15, 20);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(19, 236, 91); // Primary green
  doc.text(title, 15, 30);
};

// Helper to add footer with timestamp
const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const date = new Date().toLocaleString();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(
      `Generated on: ${date} | Cryptographically Secured & Verified`,
      15,
      doc.internal.pageSize.getHeight() - 10
    );
  }
};

export const generateOrderPDF = (order) => {
  const doc = new jsPDF();
  addHeader(doc, "Official Purchase Order Report");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("Order Information", 15, 50);

  const tableData = [
    ["Order ID", order.id || "N/A"],
    ["Seller", order.seller || "N/A"],
    ["Buyer", order.buyer || "N/A"],
    ["Amount", `${order.amount} PYUSD`],
    ["Status", order.status || "N/A"],
    ["Details", order.details || "N/A"],
  ];

  autoTable(doc, {
    startY: 55,
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  addFooter(doc);
  doc.save(`Order_${order.id || "Details"}.pdf`);
};

export const generateBatchPDF = (batch) => {
  const doc = new jsPDF();
  addHeader(doc, "Production Batch Report");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("Batch Information", 15, 50);

  const tableData = [
    ["Batch ID", batch.id || "N/A"],
    ["Order ID", batch.orderId || "N/A"],
    ["Seller", batch.seller || "N/A"],
    ["Product Info", batch.productInfo || "N/A"],
    ["Batch State", batch.state || "N/A"],
    ["QC Required", batch.reqQC ? "Yes" : "No"],
  ];

  autoTable(doc, {
    startY: 55,
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  addFooter(doc);
  doc.save(`Batch_${batch.id || "Details"}.pdf`);
};

export const generateCertificatePDF = (cert) => {
  const doc = new jsPDF();
  // Certificate specific styling
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");

  // Border
  doc.setDrawColor(19, 236, 91);
  doc.setLineWidth(2);
  doc.rect(10, 10, 190, 277);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("Official Compliance Certificate", 105, 40, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("This certifies that the following entity has been verified", 105, 55, { align: "center" });
  doc.text("on the RMG Blockchain Supply Chain Network.", 105, 62, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Factory / Seller Address:", 105, 90, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(cert.seller || cert.target || "N/A", 105, 100, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Document Hash (IPFS):", 105, 120, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(cert.certDocHash || cert.docHash || "N/A", 105, 130, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Certificate ID / Blockchain Record:", 105, 150, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const certId = cert.certificateId || cert.id || "N/A";
  doc.text(certId.toString(), 105, 160, { align: "center" });

  if (cert.txHash) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Transaction Hash:", 105, 200, { align: "center" });
    doc.setFontSize(10);
    doc.text(cert.txHash, 105, 210, { align: "center" });
  }

  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("Issued by the RMG Certifier Authority", 105, 270, { align: "center" });

  doc.save(`Certificate_${cert.seller || "RMG"}.pdf`);
};

export const generateTraceabilityPDF = (events, searchId) => {
  const doc = new jsPDF();
  addHeader(doc, `Traceability Audit Report: ${searchId}`);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("Immutable Blockchain Timeline", 15, 50);

  const tableData = events.map((e, index) => [
    index + 1,
    e.title,
    e.time,
    e.block,
    e.txHash ? `${e.txHash.substring(0, 10)}...` : "N/A"
  ]);

  autoTable(doc, {
    startY: 55,
    head: [["Step", "Event Type", "Timestamp", "Block", "Tx Hash"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  addFooter(doc);
  doc.save(`Traceability_${searchId}.pdf`);
};
