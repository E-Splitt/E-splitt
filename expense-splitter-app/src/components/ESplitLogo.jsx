import React from 'react';

const ESplitLogo = ({ size = 22, className = '' }) => (
    <svg
        className={`esplit-mark ${className}`}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M4.5 5.5 12 19.5l7.5-14" />
        <path d="M12 19.5c.2-6.4 2.8-10.6 7.5-14" />
    </svg>
);

export default ESplitLogo;
