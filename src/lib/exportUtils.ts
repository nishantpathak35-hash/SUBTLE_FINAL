import * as XLSX from 'xlsx';
import { generateBOQPDF } from './pdfGenerator';

export const exportToExcel = (boq: any) => {
  const companyName = "THE SUBTE INFRA PRIVATE LIMITED";
  const boqTitle = boq.name;
  const clientName = boq.client?.name || "N/A";
  const date = new Date(boq.createdAt).toLocaleDateString();

  const headers = [
    ["Company:", companyName],
    ["BOQ Title:", boqTitle],
    ["Client:", clientName],
    ["Date:", date],
    [],
    ["S.No", "Description", "Category", "Unit", "Quantity", "Rate", "GST %", "GST Amount", "Total Amount", "Vendor"]
  ];

  const data = boq.lineItems.map((item: any, index: number) => [
    index + 1,
    item.description || item.item?.name,
    item.category || item.item?.category,
    item.unit || item.item?.unit,
    item.quantity,
    item.rate,
    item.gstRate || 0,
    item.gstAmount || 0,
    item.amount,
    item.vendor?.name || "N/A"
  ]);

  const footer = [
    [],
    ["", "", "", "", "", "", "", "Total Cost:", boq.totalCost],
    ["", "", "", "", "", "", "", "Total GST:", boq.gstAmount || 0],
    ["", "", "", "", "", "", "", "Total Value:", boq.totalValue],
    ["", "", "", "", "", "", "", "Total Margin:", `${boq.totalMargin?.toFixed(2)}%`]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...data, ...footer]);
  
  // Basic styling (column widths)
  const wscols = [
    { wch: 5 },  // S.No
    { wch: 40 }, // Description
    { wch: 15 }, // Category
    { wch: 10 }, // Unit
    { wch: 10 }, // Quantity
    { wch: 12 }, // Rate
    { wch: 10 }, // GST %
    { wch: 12 }, // GST Amount
    { wch: 15 }, // Total Amount
    { wch: 20 }  // Vendor
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "BOQ");
  XLSX.writeFile(workbook, `${boqTitle.replace(/\s+/g, '_')}_BOQ.xlsx`);
};

export const exportToPDF = async (boq: any) => {
  try {
    const settingsRes = await fetch('/api/settings');
    const settings = settingsRes.ok ? await settingsRes.json() : {};
    
    // Ensure data exists for items
    const lineItems = (boq.lineItems || []).map((item: any) => ({
      description: item.description || item.item?.name || "No Description",
      quantity: item.quantity || 0,
      unit: item.unit || item.item?.unit || "Nos",
      rate: item.rate || 0,
      gstRate: item.gstRate || 0,
      gstAmount: item.gstAmount || 0,
      amount: item.amount || 0
    }));

    const boqData = {
      title: boq.name || "Untitled BOQ",
      client: {
        name: boq.client?.name || "N/A",
        email: boq.client?.email || "N/A"
      },
      lineItems,
      subTotal: boq.totalCost || 0,
      gstAmount: boq.gstAmount || 0,
      totalValue: boq.totalValue || 0,
      createdAt: boq.createdAt || new Date().toISOString()
    };

    console.log("Generating BOQ PDF with data:", boqData);
    generateBOQPDF(boqData, settings);
  } catch (error) {
    console.error("Failed to export BOQ PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  }
};
