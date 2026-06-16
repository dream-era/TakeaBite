import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface OrderItem {
  quantity: number;
  price: number;
  menu_items: { name: string };
}

export function generateReceiptPDF(orderData: any, restaurantData: any, tableLabel?: string) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  const restName = restaurantData?.name || "Restaurant";
  doc.text(restName, doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const address = restaurantData?.address || "";
  const phone = restaurantData?.phone ? `Phone: ${restaurantData.phone}` : "";
  if (address) doc.text(address, doc.internal.pageSize.getWidth() / 2, 26, { align: "center" });
  if (phone) doc.text(phone, doc.internal.pageSize.getWidth() / 2, 32, { align: "center" });

  // Divider
  doc.setLineWidth(0.5);
  doc.line(15, 38, doc.internal.pageSize.getWidth() - 15, 38);

  // Order Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`RECEIPT`, doc.internal.pageSize.getWidth() / 2, 46, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const orderNumber = orderData?.daily_order_number ? `#${orderData.daily_order_number}` : (orderData?.id?.substring(0, 8).toUpperCase() || 'N/A');
  
  const formattedDate = orderData?.created_at 
    ? new Date(orderData.created_at).toLocaleString() 
    : new Date().toLocaleString();

  doc.text(`Order No: ${orderNumber}`, 15, 56);
  if (tableLabel) doc.text(`Table: ${tableLabel}`, 15, 62);
  doc.text(`Date: ${formattedDate}`, doc.internal.pageSize.getWidth() - 15, 56, { align: "right" });

  // Items Table
  const tableData = (orderData?.order_items || []).map((item: OrderItem) => [
    item.menu_items?.name || "Item",
    item.quantity.toString(),
    `Rs ${item.price.toFixed(2)}`,
    `Rs ${(item.price * item.quantity).toFixed(2)}`
  ]);

  const subtotal = (orderData?.order_items || []).reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
  const processingFee = orderData?.payment_method === 'online' ? subtotal * 0.02 : 0;
  const grandTotal = subtotal + processingFee;

  (doc as any).autoTable({
    startY: 70,
    head: [['Item', 'Qty', 'Price', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: 200 },
    bodyStyles: { fontSize: 10 },
    margin: { left: 15, right: 15 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  doc.setFontSize(10);
  doc.text(`Subtotal:`, 130, finalY);
  doc.text(`Rs ${subtotal.toFixed(2)}`, doc.internal.pageSize.getWidth() - 15, finalY, { align: "right" });

  let nextY = finalY + 6;
  if (processingFee > 0) {
    doc.text(`Online Fee (2%):`, 130, nextY);
    doc.text(`Rs ${processingFee.toFixed(2)}`, doc.internal.pageSize.getWidth() - 15, nextY, { align: "right" });
    nextY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Grand Total:`, 130, nextY + 2);
  doc.text(`Rs ${grandTotal.toFixed(2)}`, doc.internal.pageSize.getWidth() - 15, nextY + 2, { align: "right" });

  // Payment Status
  const statusY = nextY + 16;
  doc.setLineWidth(0.5);
  doc.line(15, statusY - 6, doc.internal.pageSize.getWidth() - 15, statusY - 6);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const payMethod = orderData?.payment_method === 'cash' ? 'CASH AT COUNTER' : 'ONLINE PAYMENT';
  const payStatus = orderData?.payment_method === 'cash' 
    ? 'PENDING PAYMENT' 
    : (orderData?.payment_status === 'paid' ? 'PAID' : 'PROCESSING');

  doc.text(`Payment Method: ${payMethod}`, 15, statusY);
  doc.text(`Status: ${payStatus}`, doc.internal.pageSize.getWidth() - 15, statusY, { align: "right" });

  doc.setFontSize(10);
  doc.text("Thank you for your visit!", doc.internal.pageSize.getWidth() / 2, statusY + 20, { align: "center" });

  // Save
  doc.save(`TakeaBite-Order-${orderNumber.replace('#', '')}.pdf`);
}
