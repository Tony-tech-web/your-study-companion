import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Failed to upload PDF');
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

  const extractPdfContent = async (pdf: PdfFile): Promise<string | null> => {
    if (!user) return null;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            filePath: pdf.file_path,
            userId: user.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error extracting PDF:', error);
      toast.error('Failed to extract PDF content');
      return null;
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
    refreshPdfs: fetchPdfs,
  };
}
