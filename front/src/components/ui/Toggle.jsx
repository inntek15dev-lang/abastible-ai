import React from 'react';
import './Toggle.css';

export default function Toggle({ checked, onChange, disabled }) {
    return (
        <label className={`toggle-switch ${disabled ? 'disabled' : ''}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
            />
            <span className="slider round"></span>
        </label>
    );
}
