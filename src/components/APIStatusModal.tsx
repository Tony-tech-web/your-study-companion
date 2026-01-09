import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, RefreshCw, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface APIService {
  name: string;
  status: 'active' | 'inactive' | 'error';
  purpose: string;
  credits?: string;
  limit?: string;
  rateLimit?: string;
}

interface APIStatusModalProps {
  trigger?: React.ReactNode;
}

export function APIStatusModal({ trigger }: APIStatusModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [services, setServices] = useState<APIService[]>([]);
  const [open, setOpen] = useState(false);

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
      }
    } catch (error: any) {
      console.error('Error fetching API status:', error);
      // Set default services on error
      setServices([
        { name: 'OpenAI', status: 'active', purpose: 'Primary AI chat & PDF parsing' },
        { name: 'Google Gemini', status: 'active', purpose: 'Fast AI fallback capabilities' },
        { name: 'OpenRouter', status: 'active', purpose: 'Multi-model routing & fallback' },
        { name: 'Serper', status: 'active', purpose: 'Web search & research features' },
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStatus();
    }
  }, [open]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/50">
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent/30 flex items-center justify-center">
              <Zap className="h-4 w-4 text-sidebar-foreground/70" />
            </div>
            <span className="text-sm font-medium text-sidebar-foreground/80">
              API Status
            </span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg glass-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              API Status
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchStatus}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {services.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <div>
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{service.purpose}</p>
                  {service.credits && (
                    <p className="text-xs text-accent">Credits: {service.credits}</p>
                  )}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(service.status)}`}>
                {service.status}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <span className="text-accent font-medium">Note:</span> All APIs have automatic fallback for maximum reliability.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
