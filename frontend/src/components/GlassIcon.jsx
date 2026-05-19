import React from 'react';

export default function GlassIcon({ name, size = 32, color = 'currentColor', style }) {
  const getIcon = () => {
    switch (name) {
      case 'plan':
      case 'document':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L18 8V20C18 21.1046 17.1046 22 16 22H8C6.89543 22 6 21.1046 6 20V4C6 2.89543 6.89543 2 8 2H12Z" fill={color} fillOpacity="0.4" />
            <path d="M4 6H14C15.1046 6 16 6.89543 16 8V20C16 21.1046 15.1046 22 14 22H4C2.89543 22 2 21.1046 2 20V8C2 6.89543 2.89543 6 4 6Z" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'scrap':
      case 'delete':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 3H14V5H10V3Z" fill={color} fillOpacity="0.4" />
            <path d="M5 5H19V8H5V5Z" fill={color} fillOpacity="0.4" />
            <path d="M6 8H18L16.5 21H7.5L6 8Z" fill={color} fillOpacity="0.95" />
            <path d="M10 12L14 16M14 12L10 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case 'edit':
      case 'pencil':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="3" fill={color} fillOpacity="0.4" />
            <path d="M7 17L17 7M14 7L17 7V10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.95" />
            <path d="M7 17L9 15L9 17L7 17Z" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'rd':
      case 'flask':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2H14V8L19.5 18C20 19 19.5 20.5 18 20.5H6C4.5 20.5 4 19 4.5 18L10 8V2Z" fill={color} fillOpacity="0.4" />
            <path d="M6 13L18 13L19.5 18C20 19 19.5 20.5 18 20.5H6C4.5 20.5 4 19 4.5 18L6 13Z" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'dashboard':
      case 'card':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 3H18C19.6569 3 21 4.34315 21 6V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6C3 4.34315 4.34315 3 6 3Z" fill={color} fillOpacity="0.4" />
            <path d="M4 8H20V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'users':
      case 'member':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="7" r="5" fill={color} fillOpacity="0.95" />
            <path d="M4 21C4 16.5817 7.58172 13 12 13C16.4183 13 20 16.5817 20 21H4Z" fill={color} fillOpacity="0.4" />
          </svg>
        );
      case 'settings':
      case 'setting':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="2" strokeOpacity="0.4" strokeDasharray="3 4"/>
            <circle cx="12" cy="12" r="6" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'audit':
      case 'search':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10.5" cy="10.5" r="7.5" fill={color} fillOpacity="0.95" />
            <path d="M16 16L22 22" stroke={color} strokeWidth="4" strokeLinecap="round" strokeOpacity="0.4" />
          </svg>
        );
      case 'database':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="3" width="16" height="6" rx="3" fill={color} fillOpacity="0.4" />
            <rect x="4" y="9" width="16" height="6" rx="3" fill={color} fillOpacity="0.7" />
            <rect x="4" y="15" width="16" height="6" rx="3" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'shield':
      case 'security':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 5V11C4 16.18 7.41 21 12 22C16.59 21 20 16.18 20 11V5L12 2Z" fill={color} fillOpacity="0.4" />
            <path d="M12 22C16.59 21 20 16.18 20 11V5L12 2V22Z" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'clock':
      case 'history':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.4" />
            <path d="M12 6V12L16 14" stroke={color} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.95" />
          </svg>
        );
      case 'export':
      case 'inbox':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14" stroke={color} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.4"/>
            <path d="M12 4V15M12 4L8 8M12 4L16 8" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.95"/>
          </svg>
        );
      case 'component':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="5" width="20" height="14" rx="3" fill={color} fillOpacity="0.4" />
            <rect x="2" y="9" width="20" height="4" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'check':
      case 'success':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.4" />
            <path d="M7 12L10 15L17 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.95" />
          </svg>
        );
      case 'warning':
      case 'alert':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L22 20H2L12 2Z" fill={color} fillOpacity="0.4" />
            <path d="M12 9V13" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.95" />
            <circle cx="12" cy="17" r="1.2" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'refresh':
      case 'reload':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12C4 7.58 7.58 4 12 4C14.76 4 17.21 5.35 18.73 7.43L21 5V11H15L17.37 8.63C16.27 7.01 14.26 6 12 6C8.69 6 6 8.69 6 12H4Z" fill={color} fillOpacity="0.95" />
            <path d="M20 12C20 16.42 16.42 20 12 20C9.24 20 6.79 18.65 5.27 16.57L3 19V13H9L6.63 15.37C7.73 16.99 9.74 18 12 18C15.31 18 18 15.31 18 12H20Z" fill={color} fillOpacity="0.4" />
          </svg>
        );
      case 'add':
      case 'plus':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.4" />
            <path d="M12 7V17M7 12H17" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.95" />
          </svg>
        );
      case 'save':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 21H5C4.44772 21 4 20.5523 4 20V4C4 3.44772 4.44772 3 5 3H16L20 7V20C20 20.5523 19.5523 21 19 21Z" fill={color} fillOpacity="0.4" />
            <path d="M17 21V13H7V21M7 3V8H15V3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.95" />
          </svg>
        );
      case 'close':
      case 'cross':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.4" />
            <path d="M9 9L15 15M15 9L9 15" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.95" />
          </svg>
        );
      case 'arrow-left':
      case 'back':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.4" />
            <path d="M13 8L9 12L13 16" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.95" />
          </svg>
        );
      case 'camera':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 8C4 6.89543 4.89543 6 6 6H7.17157C7.70201 6 8.21071 5.78929 8.58579 5.41421L9.41421 4.58579C9.78929 4.21071 10.298 4 10.8284 4H13.1716C13.702 4 14.2107 4.21071 14.5858 4.58579L15.4142 5.41421C15.7893 5.78929 16.298 6 16.8284 6H18C19.1046 6 20 6.89543 20 8V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V8Z" fill={color} fillOpacity="0.4" />
            <circle cx="12" cy="13" r="4" fill={color} fillOpacity="0.95" />
          </svg>
        );
      case 'folder':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 7C3 5.89543 3.89543 5 5 5H9.58579C10.1162 5 10.6249 5.21071 11 5.58579L12.4142 7H19C20.1046 7 21 7.89543 21 9V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V7Z" fill={color} fillOpacity="0.4" />
            <path d="M3 10H21V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V10Z" fill={color} fillOpacity="0.95" />
          </svg>
        );
      default:
        // Default circle
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.95" />
            <circle cx="12" cy="12" r="5" fill={color} fillOpacity="0.4" />
          </svg>
        );
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {getIcon()}
    </div>
  );
}
