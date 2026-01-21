import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Badge = ({ children, variant = 'neutral', className }) => {
    const variants = {
        neutral: "bg-gray-100 text-gray-600",
        success: "bg-green-100 text-green-700",
        warning: "bg-yellow-100 text-yellow-700",
        purple: "bg-purple-100 text-purple-700",
    };

    return (
        <span className={twMerge("px-2.5 py-0.5 rounded-full text-xs font-semibold", variants[variant], className)}>
            {children}
        </span>
    );
};
