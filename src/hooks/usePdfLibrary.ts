import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { extractPdfText, PdfExtractionResult } from '@/lib/pdfExtractor';

export interface PdfFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
  extractedText?: string;
}

export function usePdfLibrary() {
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchPdfs = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_pdfs')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setPdfs(data || []);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      toast.error('Failed to load PDFs');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadPdf = async (file: File): Promise<PdfFile | null> => {
    if (!user) return null;
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('student-pdfs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save reference in database
      const { data, error: dbError } = await supabase
        .from('student_pdfs')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('PDF uploaded successfully');
      await fetchPdfs();
      return data;
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      const detail = error.message || error.error_description || 'Unknown error';
      toast.error(`Upload failed: ${detail}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deletePdf = async (pdf: PdfFile) => {
    if (!user) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('student-pdfs')
        .remove([pdf.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('student_pdfs')
        .delete()
        .eq('id', pdf.id);

      if (dbError) throw dbError;

      toast.success('PDF deleted');
      await fetchPdfs();
    } catch (error) {
      console.error('Error deleting PDF:', error);
      toast.error('Failed to delete PDF');
    }
  };

  const extractPdfContent = useCallback(async (
    pdf: PdfFile,
    onProgress?: (processed: number, total: number) => void
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      console.log('Extracting PDF with client-side OCR:', pdf.file_path);

      // Download the PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('student-pdfs')
        .download(pdf.file_path);

      if (downloadError || !fileData) {
        console.error('Download error:', downloadError);
        throw new Error('Failed to download PDF');
      }

      // Extract text using pdfjs-dist (client-side OCR)
      const result: PdfExtractionResult = await extractPdfText(fileData, {
        maxPages: 50, // Process up to 50 pages
        pagesPerBatch: 5, // Process 5 pages at a time for memory efficiency
        onProgress,
      });

      console.log(`Extracted ${result.pagesProcessed}/${result.pageCount} pages, text length: ${result.text.length}`);

      // Log activity (optional - fails silently if table doesn't exist)
      try {
        await supabase.from('learning_activity').insert({
          user_id: user.id,
          activity_type: 'pdf_extraction',
          activity_count: result.pagesProcessed,
        });
      } catch (e) {
        // Silently skip activity logging if it fails
      }

      // Build context with summary info
      const contextText = `[DOCUMENT: ${pdf.file_name}]
[Pages: ${result.pagesProcessed} of ${result.pageCount}]

${result.text}`;

      return contextText;
    } catch (error) {
      console.error('Error extracting PDF:', error);
      toast.error('Failed to extract PDF content');
      return null;
    }
  }, [user]);

  const getPdfVisualContext = async (pdf: PdfFile, startPage: number = 1, count: number = 10): Promise<string[]> => {
    if (!user) return [];
    
    try {
      console.log(`Generating visual context for PDF: pages ${startPage} to ${startPage + count - 1}`);
      
      // 1. Download file
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('student-pdfs')
        .download(pdf.file_path);
      
      if (downloadError) throw downloadError;
      
      // 2. Load PDF.js (using the version from package.json)
      const pdfjs = await import('pdfjs-dist');
      // Use unpkg as it mirrors NPM exactly, resolving the 404 issues with CDNJS
      const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      
      const arrayBuffer = await fileBlob.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      
      const images: string[] = [];
      const numPages = pdfDoc.numPages;
      
      // Calculate range with safety bounds
      const actualStart = Math.max(1, Math.min(startPage, numPages));
      const actualEnd = Math.min(actualStart + count - 1, numPages);
      
      console.log(`Scanning pages ${actualStart} to ${actualEnd} (Total: ${numPages})...`);
      
      for (let i = actualStart; i <= actualEnd; i++) {
        const page = await pdfDoc.getPage(i);
        
        // ULTRA-LEAN OPTIMIZATION: Smallest usable resolution to stay under tiny 13k token limits
        const viewport = page.getViewport({ scale: 0.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (!context) continue;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        } as any).promise;
        
        // Convert to lowest-quality JPEG (0.2) to minimize token footprint
        images.push(canvas.toDataURL('image/jpeg', 0.2));
      }
      
      console.log(`Generated ${images.length} page images for visual context`);
      return images;
    } catch (error) {
      console.error('Visual context error:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchPdfs();
  }, [user]);

  return {
    pdfs,
    isLoading,
    isUploading,
    uploadPdf,
    deletePdf,
    extractPdfContent,
    getPdfVisualContext,
    refreshPdfs: fetchPdfs,
  };
}
