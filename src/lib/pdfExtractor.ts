import * as pdfjs from 'pdfjs-dist';

// Set up the worker - use CDN for compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  pagesProcessed: number;
}

/**
 * Extract text from a PDF file using pdfjs-dist
 * Processes pages in modules to optimize memory and speed
 */
export async function extractPdfText(
  file: File | Blob,
  options: {
    maxPages?: number;
    pagesPerBatch?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<PdfExtractionResult> {
  const { maxPages = 50, pagesPerBatch = 5, onProgress } = options;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  const totalPages = pdf.numPages;
  const pagesToProcess = Math.min(totalPages, maxPages);
  
  let fullText = '';
  let pagesProcessed = 0;

  // Process pages in batches for memory efficiency
  for (let batchStart = 1; batchStart <= pagesToProcess; batchStart += pagesPerBatch) {
    const batchEnd = Math.min(batchStart + pagesPerBatch - 1, pagesToProcess);
    const batchPromises: Promise<string>[] = [];

    for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
      batchPromises.push(extractPageText(pdf, pageNum));
    }

    const batchResults = await Promise.all(batchPromises);
    
    for (let i = 0; i < batchResults.length; i++) {
      const pageNum = batchStart + i;
      fullText += `\n--- Page ${pageNum} ---\n${batchResults[i]}\n`;
      pagesProcessed++;
      onProgress?.(pagesProcessed, pagesToProcess);
    }
  }

  return {
    text: fullText.trim(),
    pageCount: totalPages,
    pagesProcessed,
  };
}

async function extractPageText(pdf: pdfjs.PDFDocumentProxy, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const textContent = await page.getTextContent();
  
  // Reconstruct text with proper spacing
  let lastY = -1;
  let text = '';
  
  for (const item of textContent.items) {
    // Type guard for text items (they have 'str' property)
    if ('str' in item && 'transform' in item) {
      const str = item.str as string;
      const transform = item.transform as number[];
      const y = transform[5];
      
      // Add newline when Y position changes significantly (new line)
      if (lastY !== -1 && Math.abs(lastY - y) > 5) {
        text += '\n';
      } else if (text && !text.endsWith(' ') && !text.endsWith('\n')) {
        text += ' ';
      }
      
      text += str;
      lastY = y;
    }
  }
  
  return text.trim();
}

/**
 * Download PDF from URL and extract text
 */
export async function extractPdfFromUrl(
  url: string,
  options?: Parameters<typeof extractPdfText>[1]
): Promise<PdfExtractionResult> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to download PDF');
  const blob = await response.blob();
  return extractPdfText(blob, options);
}
