import { Bot, Upload, Trash2, RefreshCw, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PdfFile } from '@/hooks/usePdfLibrary';

interface QuickActionsGridProps {
  pdfs: PdfFile[];
  onClearSession: () => void;
  onUpload: (file: File) => void;
  onSelectPdf: (pdf: PdfFile) => void;
  onDeletePdf: (pdf: PdfFile) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showStartChat?: boolean;
}

export function QuickActionsGrid({ 
  pdfs, 
  onClearSession, 
  onUpload, 
  onSelectPdf, 
  onDeletePdf,
  onRefresh,
  isRefreshing = false,
  showStartChat = true
}: QuickActionsGridProps) {
  return (
    <div className="h-full overflow-y-auto p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Library className="h-5 w-5 text-accent" />
            Library
          </h2>
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* General Chat Card */}
        {showStartChat && (
          <div 
            onClick={onClearSession}
            className="glass-card p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-accent/5 transition-all hover:scale-105 group border border-white/5"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 mb-4 group-hover:bg-blue-500/30 transition-colors">
              <Bot className="h-7 w-7" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Start AI Chat</h3>
            <p className="text-sm text-muted-foreground">Get instant help with your studies</p>
          </div>
        )}

        {/* Upload Card */}
        <div 
          onClick={() => document.getElementById('grid-pdf-upload')?.click()}
          className="glass-card p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-accent/5 transition-all hover:scale-105 group border border-white/5"
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500 mb-4 group-hover:bg-orange-500/30 transition-colors">
            <Upload className="h-7 w-7" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Upload Material</h3>
          <p className="text-sm text-muted-foreground">Add new PDFs to your library</p>
          <input
            type="file"
            id="grid-pdf-upload"
            className="hidden"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
        </div>

        {/* PDF Cards */}
        {pdfs.map((pdf, idx) => {
          const colors = [
            { bg: 'bg-green-500/20', text: 'text-green-500', hover: 'group-hover:bg-green-500/30' },
            { bg: 'bg-purple-500/20', text: 'text-purple-500', hover: 'group-hover:bg-purple-500/30' },
            { bg: 'bg-pink-500/20', text: 'text-pink-500', hover: 'group-hover:bg-pink-500/30' },
            { bg: 'bg-yellow-500/20', text: 'text-yellow-500', hover: 'group-hover:bg-yellow-500/30' },
          ];
          const color = colors[idx % colors.length];

          return (
            <div 
              key={pdf.id}
              className="glass-card p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-accent/5 transition-all hover:scale-105 group border border-white/5 relative"
              onClick={() => onSelectPdf(pdf)}
            >
                {/* Delete Button */}
              <div 
                className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onDeletePdf(pdf); }}
              >
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/20 rounded-full">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className={`w-14 h-14 rounded-2xl ${color.bg} flex items-center justify-center ${color.text} mb-4 ${color.hover} transition-colors`}>
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-lg mb-1 truncate w-full px-2" title={pdf.file_name}>
                {pdf.file_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {(pdf.file_size ? (pdf.file_size / 1024 / 1024).toFixed(2) : '0')} MB • PDF
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
