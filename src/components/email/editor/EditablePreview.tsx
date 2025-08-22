import React, { useRef, useEffect } from 'react';


interface EditablePreviewProps {
  htmlContent: string;
  onContentUpdate: (newContent: string) => void;
}

export const EditablePreview: React.FC<EditablePreviewProps> = ({ 
  htmlContent, 
  onContentUpdate 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      // Make the whole body editable like a notepad
      doc.designMode = 'on';
      const body = doc.body;
      body.setAttribute('contenteditable', 'true');
      body.style.outline = 'none';
      body.style.caretColor = 'auto';

      // Disable transitions/animations to avoid jumpiness and prevent link navigation
      const styleEl = doc.createElement('style');
      styleEl.textContent = '*,*::before,*::after{animation:none!important;transition:none!important} a{pointer-events:none!important}';
      doc.head.appendChild(styleEl);

      // Simple debounced update without cursor manipulation
      let updateTimer: number | undefined;
      const scheduleUpdate = () => {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = window.setTimeout(() => {
          const newHtml = doc.documentElement.outerHTML;
          onContentUpdate(newHtml);
        }, 500); // Longer delay to reduce updates
      };

      const onInput = () => scheduleUpdate();
      const onPaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') || '';
        doc.execCommand('insertText', false, text);
        scheduleUpdate();
      };
      const onKeyDown = (e: KeyboardEvent) => {
        // Keep structure intact: block formatting keys
        if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          doc.execCommand('insertText', false, '\n');
          scheduleUpdate();
        }
      };

      body.addEventListener('input', onInput);
      body.addEventListener('paste', onPaste as any);
      body.addEventListener('keydown', onKeyDown);
    };

    iframe.addEventListener('load', handleLoad);

    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [onContentUpdate]);

  return (
    <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4">
      <div className="bg-muted/50 p-3 sm:p-4 lg:p-6 rounded-lg">
        <div className="bg-background rounded-lg overflow-hidden shadow-lg border relative min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] border-0"
            title="Editable Email Preview"
            style={{ colorScheme: 'normal' }}
          />
        </div>
      </div>
    </div>
  );
};