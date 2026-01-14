import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'solid' | 'outline' | 'minimal' | 'capsule' | 'dot' | 'gradient';
    size?: 'sm' | 'md' | 'lg';
    color?: 'stone' | 'blue' | 'green' | 'red' | 'amber';
    clickable?: boolean;
    icon?: React.ReactNode;
}

/**
 * Tag Component
 * A flexible tag component with multiple preset styles for different contexts.
 */
export const Tag = ({
    variant = 'solid',
    size = 'md',
    color = 'stone',
    clickable = false,
    className,
    children,
    icon,
    ...props
}: TagProps) => {

    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors border whitespace-nowrap";

    // Size Maps
    const sizeStyles = {
        sm: "text-[10px] px-1.5 py-0.5 min-h-[20px] gap-1",
        md: "text-[11px] px-2.5 py-1 min-h-[24px] gap-1.5",
        lg: "text-xs px-3 py-1.5 min-h-[28px] gap-2"
    };

    // Color Maps (Simplified for demo, expandable)
    const colorMaps = {
        stone: {
            solid: "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200",
            outline: "bg-transparent text-stone-500 border-stone-300 hover:text-stone-700 hover:border-stone-400",
            minimal: "bg-transparent text-stone-600 border-transparent hover:bg-stone-50",
            capsule: "bg-stone-800 text-stone-50 border-stone-800 hover:bg-stone-700",
            dot: "text-stone-600 border-transparent bg-transparent pl-0",
            gradient: "bg-gradient-to-br from-stone-100 to-stone-200 text-stone-700 border-stone-200"
        },
        blue: {
            solid: "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100",
            outline: "bg-transparent text-blue-500 border-blue-200 hover:text-blue-600 hover:border-blue-300",
            minimal: "bg-transparent text-blue-600 border-transparent hover:bg-blue-50",
            capsule: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
            dot: "text-blue-600 border-transparent bg-transparent pl-0",
            gradient: "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200"
        },
        // ... (can add others if needed, using stone/blue as primary for now)
    };

    // Fallback to stone if color not found (or specific color implementation pending)
    const selectedColor = colorMaps[color as keyof typeof colorMaps] || colorMaps.stone;

    // Variant Styles
    const variantStyles = {
        solid: "rounded-md",
        outline: "rounded-md border",
        minimal: "rounded-md",
        capsule: "rounded-full shadow-sm hover:shadow",
        dot: "rounded-none p-0 h-auto",
        gradient: "rounded-md shadow-sm"
    };

    const styles = cn(
        baseStyles,
        sizeStyles[size],
        selectedColor[variant],
        variantStyles[variant],
        clickable && "cursor-pointer active:scale-95 select-none",
        !clickable && "cursor-default",
        className
    );

    return (
        <span className={styles} {...props}>
            {variant === 'dot' && (
                <span className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1.5",
                    color === 'stone' ? 'bg-stone-400' : `bg-${color}-500`
                )} />
            )}
            {icon && <span className="opacity-70">{icon}</span>}
            {children}
        </span>
    );
};
