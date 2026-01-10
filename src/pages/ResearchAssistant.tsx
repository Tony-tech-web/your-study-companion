import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bookmark, ExternalLink, Loader2, Sparkles, Lightbulb, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
}

interface AIInsight {
  summary: string;
  projectIdeas: string[];
  relatedTopics: string[];
}

export default function ResearchAssistant() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [savedArticles, setSavedArticles] = useState<SearchResult[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  // Load saved articles from database
  useEffect(() => {
    const loadSavedArticles = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('research_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        if (data) {
          const articles: SearchResult[] = data
            .filter(item => item.results)
            .flatMap(item => {
              const results = item.results as any;
              if (Array.isArray(results)) {
                return results.map((r: any, idx: number) => ({
                  id: `${item.id}-${idx}`,
                  title: r.title || item.query,
                  snippet: r.snippet || '',
                  url: r.url || '#',
                  source: r.source || 'Saved Research'
                }));
              }
              return [];
            });
          setSavedArticles(articles.slice(0, 10));
        }
      } catch (error) {
        console.error('Error loading saved articles:', error);
      } finally {
        setIsLoadingLibrary(false);
      }
    };

    loadSavedArticles();
  }, [user]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a research topic');
      return;
    }

    setIsSearching(true);
    setAiInsights(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('research-search', {
        body: { query, userId: user?.id },
      });

      if (error) throw error;

      if (data) {
        setResults(data.results || []);
        setAiInsights(data.insights || null);
        toast.success('Research complete!');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const saveArticle = async (article: SearchResult) => {
    if (!user) {
      toast.error('Please sign in to save articles');
      return;
    }

    if (savedArticles.find(a => a.id === article.id)) {
      toast.error('Article already saved');
      return;
    }

    try {
      const { error } = await supabase.from('research_history').insert({
        user_id: user.id,
        query: article.title,
        results: [{ title: article.title, snippet: article.snippet, url: article.url, source: article.source }],
      });

      if (error) throw error;

      setSavedArticles([article, ...savedArticles]);
      toast.success('Article saved to library');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save article');
    }
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
        <p className="text-muted-foreground">AI-powered project discovery & research insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Discover Projects & Research</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search for projects, research topics, or ideas..."
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
                Searches the web for projects, generates unique ideas, and provides AI insights
              </p>
            </CardContent>
          </Card>

          {/* AI Insights */}
          {aiInsights && (
            <Card className="glass-card border-accent/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">{aiInsights.summary}</p>
                </div>

                {aiInsights.projectIdeas.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-accent" />
                      Unique Project Ideas
                    </h4>
                    <ul className="space-y-2">
                      {aiInsights.projectIdeas.map((idea, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="text-sm p-2 bg-accent/10 rounded-lg"
                        >
                          {idea}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiInsights.relatedTopics.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Related Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiInsights.relatedTopics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-muted/50 rounded-full cursor-pointer hover:bg-muted"
                          onClick={() => setQuery(topic)}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                        <a 
                          href={result.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-accent hover:underline"
                        >
                          {result.title}
                        </a>
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
                          onClick={() => window.open(result.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          )}
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
              {isLoadingLibrary ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : savedArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Save articles to your library for quick access.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedArticles.map((article) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 bg-muted/30 rounded-lg group"
                    >
                      <p className="text-sm font-medium truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground">{article.source}</p>
                    </motion.div>
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
