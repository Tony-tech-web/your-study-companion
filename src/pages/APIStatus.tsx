import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface APIService {
  name: string;
  status: 'active' | 'inactive' | 'error';
  purpose: string;
  credits?: string;
  limit?: string;
  rateLimit?: string;
}

export default function APIStatus() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [services, setServices] = useState<APIService[]>([]);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { mode: 'status' }
      });

      if (error) throw error;

      if (data && data.services) {
        const mappedServices: APIService[] = data.services.map((s: any) => ({
          name: s.name,
          status: s.status,
          purpose: s.purpose,
          credits: s.credits,
          limit: s.id === 'serper' ? '2,500 requests/month' : undefined,
          rateLimit: s.id === 'openrouter' ? '-1 requests per 10s' : undefined
        }));
        setServices(mappedServices);
        toast.success('API status updated');
      }
    } catch (error: any) {
      console.error('Error fetching API status:', error);
      const msg = error.message || error.error_description || 'Unknown error';
      toast.error(`Failed to fetch API status: ${msg}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);
  
  const handleRefresh = fetchStatus;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-500/20 text-green-500',
      inactive: 'bg-yellow-500/20 text-yellow-500',
      error: 'bg-red-500/20 text-red-500',
    };
    return colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-accent" />
            API Status
          </h1>
          <p className="text-muted-foreground">Monitor connected AI services</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-smooth"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Connected Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4 rounded-xl hover-lift"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Purpose: {service.purpose}
                    </p>
                    {service.credits && (
                      <p className="text-sm text-muted-foreground font-medium text-accent">
                        Credits: {service.credits}
                      </p>
                    )}
                    {service.limit && (
                      <p className="text-sm text-muted-foreground">
                        Limit: {service.limit}
                      </p>
                    )}
                    {service.rateLimit && (
                      <p className="text-sm text-muted-foreground">
                        Rate Limit: {service.rateLimit}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(service.status)}`}>
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </span>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>About API Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              Lovable AI Gateway provides the primary chat functionality through multiple AI models
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              Google Gemini models are available for fast and advanced AI tasks
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              OpenAI GPT-5 is available for powerful general-purpose AI capabilities
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              All API keys are securely managed through Lovable Cloud
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}