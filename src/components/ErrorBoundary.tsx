import React from "react";

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props:any){ super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(){ return { hasError: true }; }
    componentDidCatch(err:any, info:any){ console.error("[ErrorBoundary]", err, info); }
    render(){ return this.state.hasError ? <div style={{padding:24}}>Ой. Что-то сломалось.</div> : this.props.children; }
}
