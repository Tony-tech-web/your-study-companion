import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Bookmark, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export default function ResearchAssistant() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedArticles, setSavedArticles] = useState<SearchResult[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a research topic');
      return;
    }

    setIsSearching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [{ role: 'user', content: query }],
          mode: 'research',
          model: 'gemini-flash',
        },
      });

      if (error) throw error;

      // For now, create mock results based on the query
      // In a real implementation, this would use a search API
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: `Research on ${query}`,
          snippet: `Comprehensive research findings about ${query}. This article explores various aspects and provides detailed analysis...`,
          url: '#',
          source: 'Academic Journal',
        },
        {
          id: '2',
          title: `${query}: A Literature Review`,
          snippet: `This literature review covers the key studies and findings related to ${query} over the past decade...`,
          url: '#',
          source: 'Research Database',
        },
        {
          id: '3',
          title: `Understanding ${query}`,
          snippet: `An educational resource that breaks down the fundamentals of ${query} for students and researchers...`,
          url: '#',
          source: 'Educational Platform',
        },
      ];

      setResults(mockResults);
      toast.success('Search completed!');
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const saveArticle = (article: SearchResult) => {
    if (savedArticles.find(a => a.id === article.id)) {
      toast.error('Article already saved');
      return;
    }
    setSavedArticles([...savedArticles, article]);
    toast.success('Article saved to library');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Search className="h-8 w-8 text-accent" />
          Research Assistant
        </h1>
        <p className="text-muted-foreground">AI-powered academic research and resource discovery</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Section */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Find Scholarly Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your research topic or question..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="glass-card flex-1"
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  className="btn-gold btn-smooth"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Searches academic journals, publications, and scholarly resources
              </p>

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h3 className="font-semibold">Search Results</h3>
                  {results.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-card p-4 rounded-xl hover-lift"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-accent hover:underline cursor-pointer">
                            {result.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">{result.snippet}</p>
                          <span className="text-xs text-muted-foreground/70">{result.source}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => saveArticle(result)}
                            className="hover:text-accent"
                          >
                            <Bookmark className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-accent"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Saved Library */}
        <div>
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-accent" />
                My Research Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Save articles to your library for quick access.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedArticles.map((article) => (
                    <div
                      key={article.id}
                      className="p-3 bg-muted/30 rounded-lg"
                    >
                      <p className="text-sm font-medium truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground">{article.source}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}