"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
    children: React.ReactNode;
    className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Reset visibility when route changes
        setIsVisible(false);

        // Small delay to create smooth transition effect
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 50);

        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <div
            className={`transition-all duration-300 ease-out ${isVisible
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-8 opacity-0'
                } ${className}`}
        >
            {children}
        </div>
    );
}