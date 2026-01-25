import React from 'react';
import type { Article } from '../types';

// ============================================================================
// 1. CARD LOCATION
// ============================================================================
export const CardLocation: React.FC<{ article: Article }> = ({ article }) => {
    // Mock location data based on article content or defaults
    const locationName = article.category === 'World' ? 'Global Focus' : 'Local Report';
    const coords = "40.7128° N, 74.0060° W";

    // Use a high-quality monochrome map tile
    const mapBg = "https://images.unsplash.com/photo-1577086664693-894553e103f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&sat=-100&bri=10";

    return (
        <div style={{
            height: '100%', width: '100%',
            position: 'relative', overflow: 'hidden',
            background: '#e0e0e0',
            borderRadius: 'inherit'
        }}>
            {/* Map Layer */}
            <img src={mapBg} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'contrast(1.1) sepia(0.2)' }} />

            {/* Grid Overlay for "Tactical" feel */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                backgroundPosition: 'center center',
                opacity: 0.05,
                pointerEvents: 'none'
            }}></div>

            {/* Radar Pin */}
            <div style={{
                position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
                {/* Pulse Ring */}
                <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    border: '1px solid #d62828',
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    opacity: 0.5
                }}></div>
                {/* Center Dot */}
                <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: '#d62828',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}></div>
                {/* Target Line */}
                <div style={{ width: '1px', height: '40px', background: '#d62828', marginTop: '6px' }}></div>
            </div>

            {/* Top Badge */}
            <div style={{
                position: 'absolute', top: '1.5rem', left: '1.5rem',
                background: '#000', color: '#fff',
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                padding: '4px 8px', borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
                LIVE TRACKING
            </div>

            {/* Bottom Content Card */}
            <div style={{
                position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem',
                background: '#fff', padding: '1.2rem',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#999', fontWeight: 600 }}>COORDS</span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#444' }}>{coords}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.3rem 0', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, lineHeight: 1.2 }}>
                    {locationName}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: 0, lineHeight: 1.4 }}>
                    {article.headline}
                </p>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d62828', marginTop: '0.8rem', textAlign: 'right' }}>
                    VIEW REPORT →
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 2. CARD ARCHIVIST
// ============================================================================
export const CardArchivist: React.FC<{ article: Article }> = ({ article }) => {
    // Determine stamp text
    const stampText = (article.category || 'CONFIDENTIAL').toUpperCase();

    return (
        <div style={{
            height: '100%', width: '100%',
            backgroundColor: '#d8cba2', // Manila folder color
            backgroundImage: `
                radial-gradient(#c7b993 15%, transparent 16%),
                radial-gradient(#c7b993 15%, transparent 16%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'inherit',
            fontFamily: "'Courier Prime', 'Courier New', monospace",
            color: '#3d362a'
        }}>
            {/* Header: File Info */}
            <div style={{ borderBottom: '2px solid #5a5243', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.7 }}>INVESTIGATIVE REPORT</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>CASE NO. {article.id.substring(0, 6).toUpperCase()}</div>
                </div>
                <div style={{ fontSize: '0.8rem' }}>DATE: {new Date().toLocaleDateString()}</div>
            </div>

            {/* Stamp (Rotated) */}
            <div style={{
                position: 'absolute', top: '1rem', right: '1rem',
                border: '4px solid #d62828',
                color: '#d62828',
                padding: '0.2rem 1rem',
                fontSize: '1.4rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                transform: 'rotate(-15deg)',
                opacity: 0.7,
                pointerEvents: 'none',
                mixBlendMode: 'multiply',
                maskImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxmaWx0ZXIgaWQ9Im5vaXNlIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC41IiBudW1PY3RhdmVzPSIxIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC41Ii8+PC9zdmc+")' // Basic noise mask simulation
            }}>
                {stampText}
            </div>

            {/* Paperclipped Photo */}
            <div style={{
                position: 'relative',
                transform: 'rotate(1deg)',
                boxShadow: '2px 4px 8px rgba(0,0,0,0.2)',
                background: '#fff',
                padding: '8px 8px 25px 8px', // Polaroid padding
                marginBottom: '1.5rem',
                width: 'fit-content',
                maxWidth: '100%',
                marginLeft: 'auto', marginRight: 'auto'
            }}>
                {/* Visual Paperclip */}
                <div style={{
                    position: 'absolute', top: '-10px', left: '20px',
                    width: '12px', height: '35px',
                    borderRadius: '10px',
                    border: '3px solid #666',
                    borderBottom: 'none',
                    zIndex: 10
                }}></div>
                <div style={{
                    position: 'absolute', top: '-10px', left: '20px',
                    width: '12px', height: '25px',
                    borderRadius: '10px',
                    border: '3px solid #666',
                    borderTop: 'none',
                    marginTop: '10px',
                    zIndex: 1
                }}></div>

                {article.imageUrl ? (
                    <img src={article.imageUrl} style={{ display: 'block', maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.2) sepia(0.2)' }} />
                ) : (
                    <div style={{ width: '150px', height: '100px', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>[EVIDENCE A]</div>
                )}
                <div style={{ fontFamily: 'Nothing You Could Do, cursive', fontSize: '0.8rem', color: '#000', marginTop: '5px', textAlign: 'center' }}>
                    Exhibit A
                </div>
            </div>

            {/* Typewritten Body */}
            <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', textDecoration: 'underline' }}>SUBJECT: {article.headline}</h4>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.4, margin: 0, textAlign: 'justify' }}>
                    {article.content.substring(0, 150)}...
                </p>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px dotted #5a5243', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>AGENT: {article.author?.toUpperCase()}</span>
                <span>SECTOR 4</span>
            </div>
        </div>
    );
};
