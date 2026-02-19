import React from 'react';

function Test() {
    return (
        <div style={{ padding: '20px', fontSize: '24px', color: 'red' }}>
            <h1>TEST PAGE - If you see this, React is working!</h1>
            <p>Current path: {window.location.pathname}</p>
        </div>
    );
}

export default Test;
