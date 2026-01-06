import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Upload, Library, Sparkles, FileText, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePdfLibrary } from '@/hooks/usePdfLibrary';
import { toast } from 'sonner';

export default function CourseAssistant() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { pdfs, isLoading, isUploading, uploadPdf, deletePdf } = usePdfLibrary();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    for (const file of selectedFiles) {
      await uploadPdf(file);
    }
    
    setSelectedFiles([]);
    setTitle('');
    setDescription('');
    toast.success('Files uploaded successfully!');
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-accent" />
          Course Assistant
        </h1>
        <p className="text-muted-foreground">Upload materials & generate study resources</p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Materials
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            My Library
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Study Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-accent" />
                Upload Course Materials
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload your course materials to build your study library
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Material Title *</label>
                  <Input
                    placeholder="e.g., Introduction to Computer Science"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="glass-card"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
                  <Input
                    placeholder="Brief description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="glass-card"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Files *</label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">
                    <span className="text-accent cursor-pointer">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, PPT, PPTX, TXT, RTF, ODT (Max: 100MB, 10 files)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,.odt"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button 
                    variant="outline" 
                    className="mt-4 btn-smooth"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Select Files
                  </Button>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full btn-gold btn-smooth"
              >
                {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>My Library</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
                </div>
              ) : pdfs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Library className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-muted-foreground">No materials yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Upload your first course material to get started
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {pdfs.map((pdf) => (
                    <motion.div
                      key={pdf.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 glass-card rounded-xl hover-lift"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{pdf.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(pdf.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePdf(pdf)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Study Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Generate Summary', description: 'Create concise summaries from your materials' },
                  { title: 'Create Flashcards', description: 'Auto-generate flashcards for quick review' },
                  { title: 'Practice Quiz', description: 'Test your knowledge with AI-generated quizzes' },
                  { title: 'Key Concepts', description: 'Extract important concepts and definitions' },
                ].map((tool, index) => (
                  <motion.div
                    key={tool.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-card p-4 rounded-xl hover-lift cursor-pointer"
                  >
                    <h3 className="font-semibold mb-1">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}