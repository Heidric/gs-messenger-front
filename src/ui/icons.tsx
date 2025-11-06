import * as React from "react";

export function PhoneIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M6.6 10.8a15.05 15.05 0 006.6 6.6l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.56 3.58.56a1 1 0 011 1V20a1 1 0 01-1 1C11.4 21 3 12.6 3 2a1 1 0 011-1h3.48a1 1 0 011 1c0 1.25.19 2.46.56 3.58a1 1 0 01-.24 1.02L6.6 10.8z"/>
        </svg>
    );
}

export function VideoIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M3 6a2 2 0 012-2h8a2 2 0 012 2v2.5l3.2-2a1 1 0 011.8.84v8.32a1 1 0 01-1.8.84L15 15.5V18a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/>
        </svg>
    );
}

export function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
            <path
                d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    );
}
