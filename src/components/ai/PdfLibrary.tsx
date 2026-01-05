import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Trash2, BookOpen, ClipboardCheck, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PdfFile } from '@/hooks/usePdfLibrary';
import { formatDistanceToNow } from 'date-fns';

interface PdfLibraryProps {
  pdfs: PdfFile[];
  isLoading: boolean;
  onSelect: (pdf: PdfFile, mode: 'teach' | 'test') => void;
  onDelete: (pdf: PdfFile) => void;
  selectedPdfId?: string;
}

export function PdfLibrary({ pdfs, isLoading, onSelect, onDelete, selectedPdfId }: PdfLibraryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (pdfs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="font-semibold text-lg">No PDFs Yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload a PDF to start learning
        </p>
      </div>
    );
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3 pr-4">
        {pdfs.map((pdf, index) => (
          <motion.div
            key={pdf.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`glass-card hover-lift transition-all duration-300 ${
                selectedPdfId === pdf.id ? 'ring-2 ring-accent' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{pdf.file_name}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{formatFileSize(pdf.file_size)}</span>
                      <span>•</span>
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(pdf.uploaded_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 glass-card btn-smooth"
                    onClick={() => onSelect(pdf, 'teach')}
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    Learn
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 glass-card btn-smooth"
                    onClick={() => onSelect(pdf, 'test')}
                  >
                    <ClipboardCheck className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(pdf)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
}
