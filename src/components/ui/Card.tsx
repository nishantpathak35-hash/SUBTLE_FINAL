import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hoverable?: boolean;
}

export const Card = ({ children, className, delay = 0, hoverable = true }: CardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.98 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ 
      duration: 1.2, 
      delay, 
      ease: [0.16, 1, 0.3, 1],
      opacity: { duration: 0.8 },
      scale: { duration: 1 }
    }}
    whileHover={hoverable ? { y: -4, transition: { duration: 0.4, ease: "easeOut" } } : {}}
    className={cn(
      "relative bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden group transition-all duration-700",
      hoverable && "hover:border-white/10 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] hover:bg-white/[0.01]",
      className
    )}
  >
    {/* Dynamic Background Glow */}
    <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[100px] group-hover:bg-indigo-500/10 transition-all duration-1000 pointer-events-none" />
    <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px] group-hover:bg-blue-500/10 transition-all duration-1000 pointer-events-none" />
    
    <div className="relative z-10">{children}</div>
  </motion.div>
);
