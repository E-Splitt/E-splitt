import React from 'react';

const ESplitLogo = ({ size = 32, className = '' }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
            </defs>

            {/* Split E design */}
            <g>
                {/* Left half of E */}
                <path
                    d="M 20 20 L 45 20 L 45 30 L 30 30 L 30 45 L 42 45 L 42 55 L 30 55 L 30 70 L 45 70 L 45 80 L 20 80 Z"
                    fill="url(#logoGradient)"
                />

                {/* Right half of E (slightly offset) */}
                <path
                    d="M 55 20 L 80 20 L 80 30 L 70 30 L 70 45 L 78 45 L 78 55 L 70 55 L 70 70 L 80 70 L 80 80 L 55 80 Z"
                    fill="url(#logoGradient)"
                    opacity="0.8"
                />

                {/* Split line in the middle */}
                <line
                    x1="50"
                    y1="15"
                    x2="50"
                    y2="85"
                    stroke="white"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                />
            </g>
        </svg>
    );
};

export default ESplitLogo;
