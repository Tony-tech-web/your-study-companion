import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const PageLoading = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <div className="absolute inset-0 blur-xl bg-accent/20 rounded-full" />
        <Sparkles className="h-12 w-12 text-accent relative z-10" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-center"
      >
        <h3 className="text-lg font-display font-bold tracking-tight">Elizade AI</h3>
        <p className="text-sm text-muted-foreground animate-pulse">Preparing your workspace...</p>
      </motion.div>

      {/* Modern gradient loading bar at the top */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-accent/20 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-full bg-accent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.div>
    </div>
  );
};

export default PageLoading;
