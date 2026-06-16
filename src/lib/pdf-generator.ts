import html2canvas from 'html2canvas';

export async function downloadReceiptImage(elementId: string, orderNumber: string) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  try {
    // Add a slight delay to ensure all fonts and images are rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const canvas = await html2canvas(element, {
      scale: 3, // High resolution for mobile sharing
      useCORS: true,
      allowTaint: false, // Must be false to allow toDataURL
      backgroundColor: "#FFFFFF", // Give a white background instead of null to prevent black transparency bugs
    });
    
    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = image;
    link.download = `TakeaBite-Receipt-${orderNumber.replace('#', '')}.png`;
    link.click();
  } catch (err) {
    console.error("Failed to generate receipt image:", err);
  }
}
