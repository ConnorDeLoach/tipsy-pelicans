"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface InstagramEmbedProps {
  html: string;
  className?: string;
}

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

export function InstagramEmbed({ html, className }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (containerRef.current && html) {
      // Inject HTML content
      containerRef.current.innerHTML = html;

      // Process embeds if script is already loaded
      if (window.instgrm) {
        window.instgrm.Embeds.process();
        setIsLoaded(true);
      }
    }
  }, [html]);

  return (
    <div className={className}>
      {/* Load Instagram Embed Script globally once */}
      <Script
        src="//www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => {
          if (window.instgrm) {
            window.instgrm.Embeds.process();
            setIsLoaded(true);
          }
        }}
      />

      <div
        ref={containerRef}
        className={`instagram-embed-container transition-opacity duration-500 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {!isLoaded && (
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg animate-pulse">
          <p className="text-muted-foreground text-sm">Loading embed...</p>
        </div>
      )}
    </div>
  );
}
