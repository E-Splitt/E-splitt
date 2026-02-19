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

            {/* Split E-S design */}
            <g>
                {/* Left half - E */}
                <path
                    d="M 25 25 L 45 25 L 45 35 L 35 35 L 35 45 L 42 45 L 42 55 L 35 55 L 35 65 L 45 65 L 45 75 L 25 75 Z"
                    fill="url(#logoGradient)"
                />

                {/* Right half - S */}
                <path
                    d="M 55 25 L 75 25 L 75 35 L 60 35 L 60 42 L 75 42 L 75 65 L 60 65 L 60 75 L 80 75 L 80 60 L 65 60 L 65 52 L 80 52 L 80 25 Z"
                    fill="url(#logoGradient)"
                    opacity="0.8"
                />

                {/* Refined S shape logic to look like S */}
                <path
                    d="M 80 25 L 55 25 L 55 35 L 70 35 L 70 42 L 55 42 L 55 52 L 70 52 L 70 60 L 55 60 L 55 75 L 80 75 L 80 65 L 65 65 L 65 58 L 80 58 L 80 48 L 65 48 L 65 38 L 80 38 Z"
                    fill="white"
                    opacity="0"
                />

                {/* Actual S Shape */}
                <path
                    d="M 80 25 L 55 25 L 55 37 L 70 37 L 70 43 L 55 43 L 55 50 L 80 50 L 80 37 L 65 37 L 65 32 L 80 32 Z M 55 75 L 80 75 L 80 63 L 65 63 L 65 57 L 80 57 L 80 50 L 55 50 L 55 63 L 70 63 L 70 68 L 55 68 Z"
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
