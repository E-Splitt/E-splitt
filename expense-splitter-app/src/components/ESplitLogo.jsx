import React from 'react';

const ESplitLogo = ({ size = 32, className = '' }) => (
    <span className={`brand-mark ${className}`} style={{ width: size, height: size }} aria-hidden="true">
        <span />
        <span />
    </span>
);

export default ESplitLogo;
