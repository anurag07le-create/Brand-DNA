import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = ({ children, variant = 'primary', className, ...props }) => {
    const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-300 ease-out active:scale-95";

    const variants = {
        primary: "bg-pucho-purple text-white shadow-glow hover:bg-opacity-90 hover:-translate-y-0.5",
        secondary: "bg-white text-pucho-dark border border-gray-200 hover:bg-gray-50 hover:shadow-subtl",
        danger: "bg-red-50 text-red-600 hover:bg-red-100",
        ghost: "text-gray-500 hover:text-pucho-purple hover:bg-purple-50"
    };

    return (
        <button
            className={twMerge(baseStyles, variants[variant], className)}
            {...props}
        >
            {children}
        </button>
    );
};
