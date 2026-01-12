import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bookmark, ExternalLink, Loader2, Sparkles, Lightbulb, Trash2, Edit2, X, Check, Code, BookOpen, Github } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  isGitHub?: boolean;
}

interface AIInsight {
  summary: string;
  projectIdeas: Array<{ title: string; description: string; basedOn?: string }>;
  relatedTopics: string[];
  existingProjects?: string[];
  gaps?: string[];
}

interface SavedArticle {
  id: string;
  query: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  created_at: string;
}

type SearchMode = 'academic' | 'projects';

export default function ResearchAssistant() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [searchMode, setSearchMode] = useState<SearchMode>('academic');
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Load saved articles from database
  useEffect(() => {
    loadSavedArticles();
  }, [user]);

  const loadSavedArticles = async () => {
    if (!user) return;
    setIsLoadingLibrary(true);
    
    try {
      const { data, error } = await supabase
        .from('research_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const articles: SavedArticle[] = data.flatMap(item => {
          const results = item.results as any;
          if (Array.isArray(results) && results.length > 0) {
            return results.map((r: any, idx: number) => ({
              id: `${item.id}-${idx}`,
              parentId: item.id,
              query: item.query,
              title: r.title || item.query,
              snippet: r.snippet || '',
              url: r.url || '#',
              source: r.source || 'Saved Research',
              created_at: item.created_at,
            }));
          }
          return [{
            id: item.id,
            parentId: item.id,
            query: item.query,
            title: item.query,
            snippet: item.ai_summary || '',
            url: '#',
            source: 'Research Query',
            created_at: item.created_at,
          }];
        });
        setSavedArticles(articles.slice(0, 20));
      }
    } catch (error) {
      console.error('Error loading saved articles:', error);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a research topic');
      return;
    }

    setIsSearching(true);
    setAiInsights(null);
    setResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('research-search', {
        body: { 
          query, 
          userId: user?.id,
          searchMode, // Pass mode to backend
        },
      });

      if (error) throw error;

      if (data) {
        setResults(data.results || []);
        
      // Process AI insights
        if (data.insights || data.projectIdeas) {
          setAiInsights({
            summary: typeof data.insights === 'string' ? data.insights : '',
            projectIdeas: Array.isArray(data.projectIdeas) ? data.projectIdeas : [],
            relatedTopics: Array.isArray(data.relatedTopics) ? data.relatedTopics : [],
            existingProjects: Array.isArray(data.existingProjects) ? data.existingProjects : [],
            gaps: Array.isArray(data.gaps) ? data.gaps : [],
          });
        }
        
        toast.success(`Found ${data.results?.length || 0} results!`);
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

    if (savedArticles.find(a => a.url === article.url)) {
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

      await loadSavedArticles();
      toast.success('Article saved to library');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save article');
    }
  };

  const deleteArticle = async (article: SavedArticle) => {
    if (!user) return;

    try {
      // Extract the parent ID (before the dash)
      const parentId = article.id.includes('-') ? article.id.split('-')[0] : article.id;
      
      const { error } = await supabase
        .from('research_history')
        .delete()
        .eq('id', parentId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedArticles(prev => prev.filter(a => !a.id.startsWith(parentId)));
      toast.success('Article removed');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete article');
    }
  };

  const startEdit = (article: SavedArticle) => {
    setEditingId(article.id);
    setEditTitle(article.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveEdit = async (article: SavedArticle) => {
    if (!user || !editTitle.trim()) return;

    try {
      const parentId = article.id.includes('-') ? article.id.split('-')[0] : article.id;
      
      // Get current record
      const { data: current } = await supabase
        .from('research_history')
        .select('results')
        .eq('id', parentId)
        .single();

      if (current?.results && Array.isArray(current.results)) {
        const idx = article.id.includes('-') ? parseInt(article.id.split('-')[1]) : 0;
        const updatedResults = [...(current.results as any[])];
        if (updatedResults[idx]) {
          updatedResults[idx] = { ...(updatedResults[idx] as object), title: editTitle.trim() };
        }

        const { error } = await supabase
          .from('research_history')
          .update({ results: updatedResults, query: editTitle.trim() })
          .eq('id', parentId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('research_history')
          .update({ query: editTitle.trim() })
          .eq('id', parentId)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      await loadSavedArticles();
      setEditingId(null);
      setEditTitle('');
      toast.success('Article updated');
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to update article');
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
        <p className="text-muted-foreground">AI-powered research for all disciplines</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Discover Research & Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Mode Tabs */}
              <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="academic" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Academic Research
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Project Search
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="academic" className="mt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Search for academic papers, journals, and scholarly articles across all fields.
                  </p>
                </TabsContent>
                <TabsContent value="projects" className="mt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Find existing projects on GitHub and implementations for computer science topics.
                  </p>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2">
                <Input
                  placeholder={searchMode === 'projects' 
                    ? "e.g., machine learning image classification Python" 
                    : "e.g., impact of social media on mental health"}
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
            </CardContent>
          </Card>

          {/* AI Insights */}
          <AnimatePresence>
            {aiInsights && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="glass-card border-accent/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {aiInsights.summary && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Summary</h4>
                        <p className="text-sm text-muted-foreground">{aiInsights.summary}</p>
                      </div>
                    )}

                    {searchMode === 'projects' && aiInsights.existingProjects && aiInsights.existingProjects.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Github className="h-4 w-4" />
                          Existing Projects Found
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {aiInsights.existingProjects.map((project, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-muted/50 rounded-lg">
                              {project}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiInsights.projectIdeas.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-accent" />
                          {searchMode === 'projects' ? 'Improvement Ideas' : 'Research Ideas'}
                        </h4>
                        <ul className="space-y-2">
                          {aiInsights.projectIdeas.map((idea, idx) => (
                            <motion.li
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="text-sm p-3 bg-accent/10 rounded-lg"
                            >
                              <strong>{idea.title}</strong>
                              <p className="text-muted-foreground mt-1">{idea.description}</p>
                              {idea.basedOn && (
                                <p className="text-xs text-accent mt-1">Based on: {idea.basedOn}</p>
                              )}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiInsights.gaps && aiInsights.gaps.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Research Gaps</h4>
                        <ul className="space-y-1">
                          {aiInsights.gaps.map((gap, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">• {gap}</li>
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
                              className="px-2 py-1 text-xs bg-muted/50 rounded-full cursor-pointer hover:bg-muted transition-colors"
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          {results.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Search Results</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {results.length} found
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-4 rounded-xl hover-lift"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {result.isGitHub && <Github className="h-4 w-4 text-muted-foreground" />}
                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-accent hover:underline"
                          >
                            {result.title}
                          </a>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{result.snippet}</p>
                        <span className="text-xs text-muted-foreground/70">{result.source}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveArticle(result)}
                          className="hover:text-accent"
                          title="Save to library"
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-accent"
                          onClick={() => window.open(result.url, '_blank')}
                          title="Open link"
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
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {savedArticles.map((article) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 bg-muted/30 rounded-lg group"
                    >
                      {editingId === article.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(article);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <Button size="icon" variant="ghost" onClick={() => saveEdit(article)} className="h-7 w-7">
                            <Check className="h-3 w-3 text-green-500" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-7 w-7">
                            <X className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <a
                              href={article.url !== '#' ? article.url : undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-sm font-medium truncate block ${article.url !== '#' ? 'hover:text-accent cursor-pointer' : ''}`}
                            >
                              {article.title}
                            </a>
                            <p className="text-xs text-muted-foreground">{article.source}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEdit(article)}
                              className="h-6 w-6"
                              title="Edit"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteArticle(article)}
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
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
