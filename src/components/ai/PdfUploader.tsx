import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PdfUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  className?: string;
}

export function PdfUploader({ onUpload, isUploading, className }: PdfUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      return;
    }
    await onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-card p-6 rounded-xl border-2 border-dashed transition-all duration-300',
        isDragging ? 'border-accent bg-accent/10' : 'border-border',
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          ) : (
            <FileText className="h-8 w-8 text-accent" />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-lg">Upload PDF Document</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop or click to upload
          </p>
        </div>
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          variant="outline"
          className="glass-card"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Select PDF'}
        </Button>
      </div>
    </motion.div>
  );
}
