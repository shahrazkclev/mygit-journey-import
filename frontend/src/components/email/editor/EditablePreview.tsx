import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Smartphone, Monitor, Bold, Italic, List, Smile, Type, Palette, Undo, Redo, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface EditablePreviewProps {
  htmlContent: string;
  onContentUpdate: (newContent: string) => void;
}

export const EditablePreview: React.FC<EditablePreviewProps> = ({ 
  htmlContent, 
  onContentUpdate 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialHtmlRef = useRef(htmlContent);
  const selectionRangeRef = useRef<Range | null>(null);
  const [mode, setMode] = useState<'mobile' | 'desktop'>('desktop');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontControls, setShowFontControls] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  
  // Font control states
  const [currentFontFamily, setCurrentFontFamily] = useState("Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
  const [currentFontSize, setCurrentFontSize] = useState("16");
  const [currentLineHeight, setCurrentLineHeight] = useState("1.6");
  
  const emojis = ['😀', '😍', '🎉', '👍', '❤️', '🔥', '💯', '⭐', '🚀', '💼', '📧', '✅', '❗', '💡', '🎯', '📱'];
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];
  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
  
  // Font family options for email templates
  const fontOptions = [
    { value: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", label: "Inter (Modern)" },
    { value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", label: "System UI" },
    { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: "Helvetica" },
    { value: "Georgia, 'Times New Roman', Times, serif", label: "Georgia (Serif)" },
    { value: "'Courier New', Courier, monospace", label: "Courier (Monospace)" },
    { value: "'Arial Black', Arial, sans-serif", label: "Arial Black" },
    { value: "'Trebuchet MS', Arial, sans-serif", label: "Trebuchet" }
  ];

  const saveToHistory = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    
    const currentHtml = doc.documentElement.outerHTML;
    setUndoStack(prev => [...prev.slice(-9), currentHtml]); // Keep last 10 states
    setRedoStack([]); // Clear redo stack on new action
  };

  const executeCommand = (command: string, value?: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    
    saveToHistory();
    restoreSelection();
    doc.execCommand(command, false, value);
    
    // Trigger update
    const newHtml = doc.documentElement.outerHTML;
    onContentUpdate(newHtml);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    
    const currentHtml = doc.documentElement.outerHTML;
    const previousHtml = undoStack[undoStack.length - 1];
    
    setRedoStack(prev => [currentHtml, ...prev.slice(0, 9)]);
    setUndoStack(prev => prev.slice(0, -1));
    
    doc.open();
    doc.write(previousHtml);
    doc.close();
    
    onContentUpdate(previousHtml);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    
    const currentHtml = doc.documentElement.outerHTML;
    const nextHtml = redoStack[0];
    
    setUndoStack(prev => [...prev, currentHtml]);
    setRedoStack(prev => prev.slice(1));
    
    doc.open();
    doc.write(nextHtml);
    doc.close();
    
    onContentUpdate(nextHtml);
  };

  const insertBulletList = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    
    restoreSelection();
    const selection = doc.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = range.toString() || 'New bullet point';
      
      const ul = doc.createElement('ul');
      ul.style.marginLeft = '20px';
      ul.style.marginBottom = '10px';
      
      const li = doc.createElement('li');
      li.textContent = text;
      li.style.marginBottom = '5px';
      
      ul.appendChild(li);
      
      range.deleteContents();
      range.insertNode(ul);
      
      // Position cursor after the list
      range.setStartAfter(ul);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      
      const newHtml = doc.documentElement.outerHTML;
      onContentUpdate(newHtml);
    }
  };

  const insertEmoji = (emoji: string) => {
    saveToHistory();
    executeCommand('insertText', emoji);
    setShowEmojiPicker(false);
  };

  const changeTextColor = (color: string) => {
    saveToHistory();
    restoreSelection();
    executeCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const restoreSelection = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    const sel = doc.getSelection();
    if (selectionRangeRef.current && sel) {
      (doc.body as HTMLElement).focus();
      try {
        sel.removeAllRanges();
        sel.addRange(selectionRangeRef.current);
      } catch {}
    }
  };

  const applyFontSize = (px: number) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    saveToHistory();
    try { doc.execCommand('styleWithCSS', false, 'true'); } catch {}
    // Use largest size then replace <font> with <span style>
    doc.execCommand('fontSize', false, '7');
    const fonts = doc.querySelectorAll('font[size="7"]');
    fonts.forEach((fontEl) => {
      const span = doc.createElement('span');
      span.style.fontSize = `${px}px`;
      span.innerHTML = fontEl.innerHTML;
      (fontEl as HTMLElement).replaceWith(span);
    });
    const newHtml = doc.documentElement.outerHTML;
    onContentUpdate(newHtml);
  };

  const adjustFontSize = (delta: number) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const sel = doc.getSelection();
    let basePx = 16;
    if (sel && sel.anchorNode) {
      const node = sel.anchorNode.nodeType === 1 ? (sel.anchorNode as HTMLElement) : (sel.anchorNode.parentElement as HTMLElement | null);
      if (node) {
        const cs = (doc.defaultView || window).getComputedStyle(node);
        const match = cs.fontSize.match(/(\d+\.?\d*)px/);
        if (match) basePx = parseFloat(match[1]);
      }
    }
    const newPx = Math.min(40, Math.max(10, Math.round(basePx + delta)));
    applyFontSize(newPx);
  };

  // Apply global font settings to the entire email template
  const applyGlobalFontSettings = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    try {
      // Remove existing global font settings
      const existingStyle = doc.getElementById('global-font-settings');
      if (existingStyle) {
        existingStyle.remove();
      }

      // Create new style element with font settings
      const styleEl = doc.createElement('style');
      styleEl.id = 'global-font-settings';
      styleEl.type = 'text/css';
      
      // Clean CSS that won't break anything
      const css = `
        body { font-family: ${currentFontFamily} !important; font-size: ${currentFontSize}px !important; line-height: ${currentLineHeight} !important; }
        p { font-family: ${currentFontFamily} !important; font-size: ${currentFontSize}px !important; line-height: ${currentLineHeight} !important; }
        div { font-family: ${currentFontFamily} !important; font-size: ${currentFontSize}px !important; line-height: ${currentLineHeight} !important; }
        span { font-family: ${currentFontFamily} !important; font-size: ${currentFontSize}px !important; line-height: ${currentLineHeight} !important; }
        td { font-family: ${currentFontFamily} !important; font-size: ${currentFontSize}px !important; line-height: ${currentLineHeight} !important; }
        th { font-family: ${currentFontFamily} !important; font-size: ${currentFontSize}px !important; line-height: ${currentLineHeight} !important; }
        li { font-family: ${currentFontFamily} !important; font-size: ${currentFontSize}px !important; line-height: ${currentLineHeight} !important; }
        a { font-family: ${currentFontFamily} !important; font-size: ${currentFontSize}px !important; line-height: ${currentLineHeight} !important; }
        h1 { font-family: ${currentFontFamily} !important; font-size: ${Math.round(parseInt(currentFontSize) * 1.8)}px !important; line-height: 1.3 !important; }
        h2 { font-family: ${currentFontFamily} !important; font-size: ${Math.round(parseInt(currentFontSize) * 1.6)}px !important; line-height: 1.3 !important; }
        h3 { font-family: ${currentFontFamily} !important; font-size: ${Math.round(parseInt(currentFontSize) * 1.4)}px !important; line-height: 1.3 !important; }
        h4 { font-family: ${currentFontFamily} !important; font-size: ${Math.round(parseInt(currentFontSize) * 1.2)}px !important; line-height: 1.3 !important; }
        h5 { font-family: ${currentFontFamily} !important; font-size: ${parseInt(currentFontSize)}px !important; line-height: 1.3 !important; }
        h6 { font-family: ${currentFontFamily} !important; font-size: ${Math.round(parseInt(currentFontSize) * 0.9)}px !important; line-height: 1.3 !important; }
      `;
      
      styleEl.textContent = css;
      
      // Insert the style safely
      if (doc.head) {
        doc.head.appendChild(styleEl);
      } else if (doc.body) {
        doc.body.insertAdjacentElement('afterbegin', styleEl);
      }

      // Only update parent if needed and safe to do so
      const currentHtml = htmlContent;
      if (currentHtml && !currentHtml.includes('id="global-font-settings"')) {
        // Add the style to the stored HTML content for persistence
        let updatedHtml = currentHtml;
        const styleTag = `<style id="global-font-settings" type="text/css">${css}</style>`;
        
        if (updatedHtml.includes('</head>')) {
          updatedHtml = updatedHtml.replace('</head>', `${styleTag}</head>`);
        } else if (updatedHtml.includes('<body')) {
          updatedHtml = updatedHtml.replace('<body', `${styleTag}<body`);
        } else {
          updatedHtml = `${styleTag}${updatedHtml}`;
        }
        
        onContentUpdate(updatedHtml);
      }
      
      toast.success(`Font applied: ${currentFontFamily.split(',')[0].replace(/['"]/g, '')}, ${currentFontSize}px`);
      setShowFontControls(false);
      
    } catch (error) {
      console.error('Error applying font settings:', error);
      toast.error('Failed to apply font settings');
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.designMode = 'on';
      const body = doc.body;
      body.setAttribute('contenteditable', 'true');
      body.style.outline = 'none';
      // Use CSS-based formatting for execCommand outputs
      try { doc.execCommand('styleWithCSS', false, 'true'); } catch {}

      const styleEl = doc.createElement('style');
      styleEl.textContent = '*,*::before,*::after{animation:none!important;transition:none!important} a{pointer-events:none!important}';
      doc.head.appendChild(styleEl);

      let updateTimer: number | undefined;
      const scheduleUpdate = () => {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = window.setTimeout(() => {
          const newHtml = doc.documentElement.outerHTML;
          onContentUpdate(newHtml);
        }, 500);
      };

      // track selection to keep it across toolbar clicks
      const onSelectionChange = () => {
        const sel = doc.getSelection();
        if (sel && sel.rangeCount > 0) {
          try { selectionRangeRef.current = sel.getRangeAt(0).cloneRange(); } catch {}
        }
      };

      const onInput = () => scheduleUpdate();
      const onPaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') || '';
        doc.execCommand('insertText', false, text);
        scheduleUpdate();
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 'b':
              e.preventDefault();
              doc.execCommand('bold', false);
              scheduleUpdate();
              break;
            case 'i':
              e.preventDefault();
              doc.execCommand('italic', false);
              scheduleUpdate();
              break;
          }
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          doc.execCommand('insertHTML', false, '<br><br>');
          scheduleUpdate();
        }
      };

      doc.addEventListener('selectionchange', onSelectionChange);
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
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [onContentUpdate]);

  return (
    <div className="w-full px-2 sm:px-4">
      <div className="bg-muted/20 p-2 rounded-lg border">
        {/* Simple Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Email Template Editor</span>
          <div className="flex gap-1 bg-background p-0.5 rounded border">
            <Button size="sm" variant={mode === 'mobile' ? 'default' : 'ghost'} onClick={() => setMode('mobile')} className="h-6 px-2 text-xs">
              <Smartphone className="h-3 w-3" />
            </Button>
            <Button size="sm" variant={mode === 'desktop' ? 'default' : 'ghost'} onClick={() => setMode('desktop')} className="h-6 px-2 text-xs">
              <Monitor className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Enhanced Toolbar */}
        <div className="bg-background p-1.5 rounded border mb-2 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {/* Undo/Redo */}
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={undo} disabled={undoStack.length === 0}>
              <Undo className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={redo} disabled={redoStack.length === 0}>
              <Redo className="h-3 w-3" />
            </Button>
            
            <div className="h-4 w-px bg-border mx-1" />
            
            {/* Text Formatting */}
            <Button size="sm" variant="ghost" className="h-7 px-2" onMouseDown={(e)=>e.preventDefault()} onClick={() => executeCommand('bold')}>
              <Bold className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onMouseDown={(e)=>e.preventDefault()} onClick={() => executeCommand('italic')}>
              <Italic className="h-3 w-3" />
            </Button>
            
            {/* Font Size */}
            <Button size="sm" variant="ghost" className="h-7 px-2" onMouseDown={(e)=>e.preventDefault()} onClick={() => adjustFontSize(+2)}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onMouseDown={(e)=>e.preventDefault()} onClick={() => adjustFontSize(-2)}>
              <Minus className="h-3 w-3" />
            </Button>

            <div className="h-4 w-px bg-border mx-1" />
            
            {/* Global Font Controls */}
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2"
              onMouseDown={(e)=>e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setShowFontControls(!showFontControls);
                setShowColorPicker(false);
                setShowEmojiPicker(false);
              }}
            >
              <Type className="h-3 w-3" />
            </Button>
            
            {/* Color Picker */}
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2"
              onMouseDown={(e)=>e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
                setShowEmojiPicker(false);
                setShowFontControls(false);
              }}
            >
              <Palette className="h-3 w-3" />
            </Button>
            
            <Button size="sm" variant="ghost" className="h-7 px-2" onMouseDown={(e)=>e.preventDefault()} onClick={insertBulletList}>
              <List className="h-3 w-3" />
            </Button>
            
            {/* Emoji Picker */}
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2"
              onMouseDown={(e)=>e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(!showEmojiPicker);
                setShowColorPicker(false);
                setShowFontControls(false);
              }}
            >
              😀
            </Button>
            
            <span className="text-xs text-muted-foreground ml-2 hidden lg:inline">
              Select text and use font controls, or apply global settings with the Type button
            </span>
          </div>
        </div>

        {/* Simple Preview */}
        <div className="bg-background rounded">
          <div className="bg-muted/20 px-2 py-1 text-xs text-muted-foreground border-b flex items-center justify-between">
            <span>{mode === 'mobile' ? 'Mobile (375px)' : 'Desktop (1100px)'}</span>
            <span className="hidden sm:inline">Click text to edit • Use toolbar for formatting</span>
          </div>
          
          <div className={`mx-auto ${mode === 'mobile' ? 'w-full max-w-[375px]' : 'w-full max-w-[1100px]'}`}>
            <iframe
              ref={iframeRef}
              key={`${mode}-${htmlContent.length}`}
              srcDoc={htmlContent}
              className={`w-full border-0 ${mode === 'mobile' ? 'h-[400px]' : 'h-[500px]'}`}
              title="Email Editor"
              style={{ colorScheme: 'normal' }}
            />
          </div>
        </div>
      </div>

      {/* Font Controls Modal */}
      {showFontControls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowFontControls(false)}>
          <div className="bg-background border rounded-lg shadow-xl p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Font Settings</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowFontControls(false)}>×</Button>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">Font Family</Label>
                <Select value={currentFontFamily} onValueChange={setCurrentFontFamily}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map(font => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Font Size</Label>
                  <Select value={currentFontSize} onValueChange={setCurrentFontSize}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['12', '13', '14', '15', '16', '17', '18', '20', '22', '24', '28', '32'].map(size => (
                        <SelectItem key={size} value={size}>{size}px</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Line Height</Label>
                  <Select value={currentLineHeight} onValueChange={setCurrentLineHeight}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '2.0'].map(height => (
                        <SelectItem key={height} value={height}>{height}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={applyGlobalFontSettings}
                  className="w-full bg-primary hover:bg-primary/80"
                >
                  Apply Font Settings to Entire Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowColorPicker(false)}>
          <div className="bg-background border rounded-lg shadow-xl p-6 w-80 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Text Colors</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowColorPicker(false)}>×</Button>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {colors.map((color, index) => (
                  <button
                    key={index}
                    className="w-12 h-12 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:scale-105 transition-all duration-200 shadow-sm"
                    style={{ backgroundColor: color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTextColor(color);
                    }}
                    title={`Apply ${color}`}
                  />
                ))}
              </div>

              <div className="pt-4 border-t text-sm text-muted-foreground text-center">
                Select text first, then choose a color
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowEmojiPicker(false)}>
          <div className="bg-background border rounded-lg shadow-xl p-6 w-80 max-w-[90vw] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Insert Emoji</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowEmojiPicker(false)}>×</Button>
              </div>
              
              <div className="grid grid-cols-6 gap-2">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    className="w-10 h-10 hover:bg-muted rounded-lg text-xl transition-colors duration-200 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      insertEmoji(emoji);
                    }}
                    title={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t text-sm text-muted-foreground text-center">
                Click an emoji to insert it at cursor position
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};