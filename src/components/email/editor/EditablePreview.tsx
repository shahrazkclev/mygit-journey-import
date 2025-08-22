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

      // Save and restore cursor position
      const saveCursorPosition = () => {
        const selection = doc.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(body);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        return preCaretRange.toString().length;
      };

      const restoreCursorPosition = (offset: number) => {
        const selection = doc.getSelection();
        if (!selection) return;

        const walker = doc.createTreeWalker(
          body,
          NodeFilter.SHOW_TEXT
        );

        let currentOffset = 0;
        let node: Node | null;

        while (node = walker.nextNode()) {
          const textLength = node.textContent?.length || 0;
          if (currentOffset + textLength >= offset) {
            const range = doc.createRange();
            range.setStart(node, offset - currentOffset);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
          }
          currentOffset += textLength;
        }
      };

      // Debounced content update to parent with cursor preservation
      let updateTimer: number | undefined;
      const scheduleUpdate = () => {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = window.setTimeout(() => {
          const cursorPos = saveCursorPosition();
          const newHtml = doc.documentElement.outerHTML;
          onContentUpdate(newHtml);
          
          // Restore cursor after a brief delay to allow DOM update
          if (cursorPos !== null) {
            setTimeout(() => restoreCursorPosition(cursorPos), 10);
          }
        }, 300);
      };

      const onInput = () => scheduleUpdate();
      const onPaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') || '';
        doc.execCommand('insertText', false, text);
        scheduleUpdate();
      };
      const onKeyDown = (e: KeyboardEvent) => {
        // Keep structure intact: block formatting keys and Enter creating new blocks
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
  }, [htmlContent, onContentUpdate]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="bg-muted/50 p-6 rounded-lg">
        <div className="bg-background rounded-lg overflow-hidden shadow-lg border relative min-h-[600px]">
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            className="w-full h-[600px] border-0"
            title="Editable Email Preview"
            style={{ colorScheme: 'normal' }}
          />
        </div>
      </div>
    </div>
  );
};