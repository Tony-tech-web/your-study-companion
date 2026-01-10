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

      // Log activity
      try {
        await supabase.from('learning_activity').insert({
          user_id: user.id,
          activity_type: 'pdf_extraction',
          activity_count: result.pagesProcessed,
        });
      } catch (e) {
        console.log('Activity logging skipped');
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
    refreshPdfs: fetchPdfs,
  };
}
