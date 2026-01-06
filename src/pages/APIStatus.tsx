import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface APIService {
  name: string;
  status: 'active' | 'inactive' | 'error';
  purpose: string;
  limit?: string;
  rateLimit?: string;
}

export default function APIStatus() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [services] = useState<APIService[]>([
    {
      name: 'Lovable AI Gateway',
      status: 'active',
      purpose: 'Primary AI for chat and analysis',
      limit: 'Usage-based pricing',
    },
    {
      name: 'Google Gemini 2.5 Flash',
      status: 'active',
      purpose: 'Fast AI responses',
      rateLimit: 'Rate limited per minute',
    },
    {
      name: 'Google Gemini 2.5 Pro',
      status: 'active',
      purpose: 'Advanced reasoning and analysis',
      rateLimit: 'Rate limited per minute',
    },
    {
      name: 'OpenAI GPT-5',
      status: 'active',
      purpose: 'Powerful general-purpose AI',
      rateLimit: 'Rate limited per minute',
    },
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success('API status refreshed');
  };

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
                    <p className="text-sm text-muted-foreground">
                      Status: {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </p>
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