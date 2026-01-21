import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = ({ className, ...props }) => {
    return (
        <input
            className={twMerge(
                "w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pucho-purple/50 focus:border-pucho-purple transition-all duration-300",
                className
            )}
            {...props}
        />
    );
};
