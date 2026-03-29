import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../lib/utils';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, icon, children, ...props }, ref) => {
    const variants = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20",
      secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/10",
      outline: "bg-transparent border border-white/20 text-white hover:bg-white/5",
      ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-white/5",
      danger: "bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-500/20",
    };

    const sizes = {
      sm: "px-4 py-2 text-[10px]",
      md: "px-6 py-3 text-xs",
      lg: "px-8 py-4 text-sm",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        disabled={isLoading || props.disabled}
        className={cn(
          "relative flex items-center justify-center gap-2 font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        <motion.div
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
        />
        
        {isLoading ? (
          <div className="flex items-center gap-2">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full" 
            />
            <span className="text-[10px] opacity-70">Processing</span>
          </div>
        ) : (
          <>
            {icon && (
              <motion.span 
                initial={{ x: 0 }}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="group-hover:scale-110 transition-transform duration-300"
              >
                {icon}
              </motion.span>
            )}
            <span className="relative z-10">{children}</span>
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
