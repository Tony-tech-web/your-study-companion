import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Hash, FileText, Upload, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PDF {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  matric_number: string | null;
  phone_number: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPdfs();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile(data as Profile);
    }
    setLoading(false);
  };

  const fetchPdfs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('student_pdfs')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    if (data) {
      setPdfs(data as PDF[]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);

    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('student-pdfs')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Failed to upload file');
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from('student_pdfs')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
      });

    if (dbError) {
      toast.error('Failed to save file record');
    } else {
      toast.success('PDF uploaded successfully!');
      fetchPdfs();
    }

    setUploading(false);
  };

  const handleDeletePdf = async (pdf: PDF) => {
    if (!user) return;

    const { error: storageError } = await supabase.storage
      .from('student-pdfs')
      .remove([pdf.file_path]);

    if (storageError) {
      toast.error('Failed to delete file');
      return;
    }

    const { error: dbError } = await supabase
      .from('student_pdfs')
      .delete()
      .eq('id', pdf.id);

    if (dbError) {
      toast.error('Failed to delete record');
    } else {
      toast.success('PDF deleted successfully');
      if (selectedPdf === pdf.id) setSelectedPdf(null);
      fetchPdfs();
    }
  };

  const getPdfUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('student-pdfs')
      .createSignedUrl(filePath, 3600);
    
    return data?.signedUrl;
  };

  const handleViewPdf = async (pdf: PDF) => {
    const url = await getPdfUrl(pdf.file_path);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Failed to load PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold">Personal Details</h1>
        <p className="text-muted-foreground">View your profile and manage your study materials</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              Student Profile
            </CardTitle>
            <CardDescription>Your registered student information</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{profile?.full_name || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">School Email</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Matriculation Number</p>
                  <p className="font-medium">{profile?.matric_number || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium">{profile?.phone_number || 'Not set'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* PDF Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Study Materials
                </CardTitle>
                <CardDescription>Upload and manage your PDF study materials</CardDescription>
              </div>
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Button className="btn-gold" disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pdfs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No PDFs uploaded yet</p>
                <p className="text-sm">Upload your study materials to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pdfs.map((pdf) => (
                  <motion.div
                    key={pdf.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium truncate max-w-[200px] md:max-w-md">{pdf.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {pdf.file_size ? `${(pdf.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'} •{' '}
                          {new Date(pdf.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewPdf(pdf)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePdf(pdf)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
