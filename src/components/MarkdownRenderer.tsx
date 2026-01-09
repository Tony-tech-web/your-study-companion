import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="prose prose-invert prose-sm max-w-none .
                 prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight
                 prose-h1:text-2xl prose-h1:bg-gradient-to-r prose-h1:from-accent prose-h1:to-gold prose-h1:bg-clip-text prose-h1:text-transparent prose-h1:mb-4
                 prose-h2:text-xl prose-h2:text-accent prose-h2:mt-6 prose-h2:mb-3
                 prose-h3:text-lg prose-h3:text-gold/90 prose-h3:mt-4 prose-h3:mb-2
                 prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
                 prose-strong:text-gold prose-strong:font-bold
                 prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-1.5
                 prose-li:text-foreground/80
                 prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:backdrop-blur-sm prose-pre:p-4 prose-pre:rounded-xl"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </motion.div>
  );
};

export default MarkdownRenderer;
