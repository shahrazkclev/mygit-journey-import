import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor, Bold, Italic, List, Smile, Type, Palette, Undo, Redo } from 'lucide-react';

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
  const [mode, setMode] = useState<'mobile' | 'desktop'>('desktop');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  
  const emojis = ['😀', '😍', '🎉', '👍', '❤️', '🔥', '💯', '⭐', '🚀', '💼', '📧', '✅', '❗', '💡', '🎯', '📱', '✨', '🌟', '💎', '🎪'];
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'];

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
    executeCommand('foreColor', color);
    setShowColorPicker(false);
  };

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
        // Enhanced formatting shortcuts
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
            case 'u':
              e.preventDefault();
              doc.execCommand('underline', false);
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
  }, []);

  return (
    <div className="w-full px-1 sm:px-3 lg:px-6">
      <div className="bg-gradient-to-br from-primary/5 via-muted/40 to-secondary/5 p-2 sm:p-4 lg:p-6 rounded-2xl shadow-sm border border-border/20">
        {/* Mobile-Optimized Header */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Email Editor</span>
            </div>
            
            {/* Compact Device Toggle */}
            <div className="flex items-center gap-0.5 bg-background/80 p-0.5 rounded-lg border shadow-sm">
              <Button 
                size="sm" 
                variant={mode === 'mobile' ? 'default' : 'ghost'} 
                onClick={() => setMode('mobile')}
                className="h-7 px-2 text-xs font-medium"
              >
                <Smartphone className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">Mobile</span>
              </Button>
              <Button 
                size="sm" 
                variant={mode === 'desktop' ? 'default' : 'ghost'} 
                onClick={() => setMode('desktop')}
                className="h-7 px-2 text-xs font-medium"
              >
                <Monitor className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">Desktop</span>
              </Button>
            </div>
          </div>

          {/* Mobile-First Formatting Toolbar */}
          <div className="bg-background/90 backdrop-blur-sm p-1.5 sm:p-2 rounded-xl border shadow-lg overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-0.5 sm:gap-1 min-w-max">
              {/* Undo/Redo */}
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 px-1.5 sm:px-2 text-xs hover:bg-primary/10 mobile-focus"
                onClick={undo}
                disabled={undoStack.length === 0}
              >
                <Undo className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 px-1.5 sm:px-2 text-xs hover:bg-primary/10 mobile-focus"
                onClick={redo}
                disabled={redoStack.length === 0}
              >
                <Redo className="h-3 w-3" />
              </Button>
              
              <div className="h-5 w-px bg-border/50 mx-0.5" />
              
              {/* Text Formatting */}
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 px-1.5 sm:px-2 text-xs hover:bg-primary/10 mobile-focus"
                onClick={() => executeCommand('bold')}
              >
                <Bold className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">Bold</span>
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 px-1.5 sm:px-2 text-xs hover:bg-primary/10 mobile-focus"
                onClick={() => executeCommand('italic')}
              >
                <Italic className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">Italic</span>
              </Button>
              
              {/* Color Picker */}
              <div className="relative">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 px-1.5 sm:px-2 text-xs hover:bg-primary/10 mobile-focus"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  <Palette className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Color</span>
                </Button>
                
                {showColorPicker && (
                  <div className="absolute top-8 left-0 z-50 bg-background border rounded-lg shadow-xl p-2 grid grid-cols-5 gap-1 w-40">
                    {colors.map((color, index) => (
                      <button
                        key={index}
                        className="w-6 h-6 rounded border-2 border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => changeTextColor(color)}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 px-1.5 sm:px-2 text-xs hover:bg-primary/10 mobile-focus"
                onClick={insertBulletList}
              >
                <List className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">List</span>
              </Button>
              
              {/* Enhanced Emoji Picker */}
              <div className="relative">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 px-1.5 sm:px-2 text-xs hover:bg-primary/10 mobile-focus"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Emoji</span>
                </Button>
                
                {showEmojiPicker && (
                  <div className="absolute top-8 left-0 z-50 bg-background border rounded-lg shadow-xl p-3 grid grid-cols-5 gap-1 w-48 max-h-32 overflow-y-auto scrollbar-hide">
                    {emojis.map((emoji, index) => (
                      <button
                        key={index}
                        className="hover:bg-muted/70 p-1.5 rounded-lg text-base transition-all hover:scale-110 mobile-focus"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="h-5 w-px bg-border/50 mx-1 hidden lg:block" />
              <span className="text-xs text-muted-foreground px-1 hidden lg:inline whitespace-nowrap">
                Tap to edit • Ctrl+B/I • Ctrl+Z/Y to undo/redo
              </span>
            </div>
          </div>
        </div>

        {/* Ultra-Responsive Preview Container */}
        <div className="bg-background rounded-2xl overflow-hidden shadow-2xl border border-border/30 relative email-editor-gradient">
          {/* Enhanced Device Frame */}
          <div className="bg-gradient-to-r from-muted/50 to-muted/30 px-3 py-2 text-xs text-muted-foreground border-b border-border/20 flex items-center justify-between backdrop-blur-sm">
            <span className="flex items-center gap-1">
              {mode === 'mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
              {mode === 'mobile' ? 'Mobile View (390px)' : 'Desktop View (1200px)'}
            </span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
            </div>
          </div>
          
          <div className={`mx-auto transition-all duration-700 ease-in-out ${
            mode === 'mobile' 
              ? 'w-full max-w-[390px] border-l-2 border-r-2 border-primary/10' 
              : 'w-full max-w-[1200px]'
          }`}>
            <iframe
              ref={iframeRef}
              srcDoc={initialHtmlRef.current}
              className={`w-full border-0 transition-all duration-700 ease-in-out ${
                mode === 'mobile' 
                  ? 'h-[450px] sm:h-[550px]' 
                  : 'h-[550px] sm:h-[650px] lg:h-[750px]'
              }`}
              title="Interactive Email Editor"
              style={{ 
                colorScheme: 'normal',
                background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'
              }}
            />
          </div>
        </div>
        
        {/* Enhanced Mobile Helper Text */}
        <div className="mt-4 text-xs text-muted-foreground text-center sm:hidden bg-muted/20 py-2 px-3 rounded-lg">
          💡 Swipe toolbar horizontally • Tap any text to edit • Use formatting buttons for style
        </div>
        
        {/* Desktop Helper Text */}
        <div className="mt-3 text-xs text-muted-foreground text-center hidden sm:block">
          🎨 Professional email editor with live preview • Use Ctrl+B/I for quick formatting • Undo/Redo available
        </div>
      </div>
    </div>
  );
};