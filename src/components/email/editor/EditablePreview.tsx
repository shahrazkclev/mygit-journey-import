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
    <div className="w-full px-1 sm:px-2 lg:px-4">
      <div className="bg-gradient-to-br from-primary/3 via-muted/30 to-secondary/3 p-1.5 sm:p-3 lg:p-4 rounded-xl shadow-sm border border-border/20">
        {/* Compact Mobile Header */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs sm:text-sm font-semibold text-foreground">Email Editor</span>
            </div>
            
            {/* Ultra-Compact Device Toggle */}
            <div className="flex items-center gap-0 bg-background/90 p-0.5 rounded-md border shadow-sm">
              <Button 
                size="sm" 
                variant={mode === 'mobile' ? 'default' : 'ghost'} 
                onClick={() => setMode('mobile')}
                className="h-6 px-1.5 text-xs font-medium"
              >
                <Smartphone className="h-2.5 w-2.5 sm:mr-1" />
                <span className="hidden sm:inline text-xs">Mobile</span>
              </Button>
              <Button 
                size="sm" 
                variant={mode === 'desktop' ? 'default' : 'ghost'} 
                onClick={() => setMode('desktop')}
                className="h-6 px-1.5 text-xs font-medium"
              >
                <Monitor className="h-2.5 w-2.5 sm:mr-1" />
                <span className="hidden sm:inline text-xs">Desktop</span>
              </Button>
            </div>
          </div>

          {/* Compact Mobile-First Toolbar */}
          <div className="bg-background/95 backdrop-blur-sm p-1 sm:p-1.5 rounded-lg border shadow-sm overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-0.5 min-w-max">
              {/* Undo/Redo - Ultra Compact */}
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 px-1 text-xs hover:bg-primary/10 mobile-focus"
                onClick={undo}
                disabled={undoStack.length === 0}
                title="Undo"
              >
                <Undo className="h-2.5 w-2.5" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 px-1 text-xs hover:bg-primary/10 mobile-focus"
                onClick={redo}
                disabled={redoStack.length === 0}
                title="Redo"
              >
                <Redo className="h-2.5 w-2.5" />
              </Button>
              
              <div className="h-4 w-px bg-border/50 mx-0.5" />
              
              {/* Text Formatting - Compact */}
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 px-1 sm:px-1.5 text-xs hover:bg-primary/10 mobile-focus"
                onClick={() => executeCommand('bold')}
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-2.5 w-2.5 sm:mr-0.5" />
                <span className="hidden md:inline text-xs">B</span>
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 px-1 sm:px-1.5 text-xs hover:bg-primary/10 mobile-focus"
                onClick={() => executeCommand('italic')}
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-2.5 w-2.5 sm:mr-0.5" />
                <span className="hidden md:inline text-xs">I</span>
              </Button>
              
              {/* Stabilized Color Picker */}
              <div className="relative">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-1 sm:px-1.5 text-xs hover:bg-primary/10 mobile-focus"
                  onClick={() => {
                    setShowColorPicker(!showColorPicker);
                    setShowEmojiPicker(false); // Close other pickers
                  }}
                  title="Text Color"
                >
                  <Palette className="h-2.5 w-2.5 sm:mr-0.5" />
                  <span className="hidden md:inline text-xs">Color</span>
                </Button>
                
                {showColorPicker && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowColorPicker(false)}
                    />
                    {/* Color Picker Panel */}
                    <div className="absolute top-7 left-0 z-50 bg-background border rounded-lg shadow-2xl p-2 grid grid-cols-5 gap-1 w-32 sm:w-36">
                      {colors.map((color, index) => (
                        <button
                          key={index}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded border-2 border-border hover:scale-110 transition-transform active:scale-95"
                          style={{ backgroundColor: color }}
                          onClick={() => changeTextColor(color)}
                          title={`Color: ${color}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 px-1 sm:px-1.5 text-xs hover:bg-primary/10 mobile-focus"
                onClick={insertBulletList}
                title="Bullet List"
              >
                <List className="h-2.5 w-2.5 sm:mr-0.5" />
                <span className="hidden md:inline text-xs">List</span>
              </Button>
              
              {/* Stabilized Emoji Picker */}
              <div className="relative">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-1 sm:px-1.5 text-xs hover:bg-primary/10 mobile-focus"
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowColorPicker(false); // Close other pickers
                  }}
                  title="Insert Emoji"
                >
                  <Smile className="h-2.5 w-2.5 sm:mr-0.5" />
                  <span className="hidden md:inline text-xs">😀</span>
                </Button>
                
                {showEmojiPicker && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowEmojiPicker(false)}
                    />
                    {/* Emoji Panel */}
                    <div className="absolute top-7 left-0 z-50 bg-background border rounded-lg shadow-2xl p-2 grid grid-cols-4 sm:grid-cols-5 gap-1 w-36 sm:w-40 max-h-28 overflow-y-auto scrollbar-hide">
                      {emojis.map((emoji, index) => (
                        <button
                          key={index}
                          className="hover:bg-muted/70 p-1 rounded text-sm sm:text-base transition-all hover:scale-110 mobile-focus active:scale-95"
                          onClick={() => insertEmoji(emoji)}
                          title={`Insert ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="h-4 w-px bg-border/50 mx-1 hidden lg:block" />
              <span className="text-xs text-muted-foreground px-1 hidden xl:inline whitespace-nowrap">
                Tap to edit • Ctrl+B/I • Ctrl+Z/Y
              </span>
            </div>
          </div>
        </div>

        {/* Compact Preview Container */}
        <div className="bg-background rounded-xl overflow-hidden shadow-lg border border-border/30 relative">
          {/* Minimalist Device Frame */}
          <div className="bg-gradient-to-r from-muted/40 to-muted/20 px-2 py-1 text-xs text-muted-foreground border-b border-border/20 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs">
              {mode === 'mobile' ? <Smartphone className="h-2.5 w-2.5" /> : <Monitor className="h-2.5 w-2.5" />}
              {mode === 'mobile' ? 'Mobile (390px)' : 'Desktop (1200px)'}
            </span>
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            </div>
          </div>
          
          <div className={`mx-auto transition-all duration-500 ease-in-out ${
            mode === 'mobile' 
              ? 'w-full max-w-[375px] border-l border-r border-primary/5' 
              : 'w-full max-w-[1100px]'
          }`}>
            <iframe
              ref={iframeRef}
              srcDoc={initialHtmlRef.current}
              className={`w-full border-0 transition-all duration-500 ease-in-out ${
                mode === 'mobile' 
                  ? 'h-[400px] sm:h-[480px]' 
                  : 'h-[500px] sm:h-[580px] lg:h-[650px]'
              }`}
              title="Interactive Email Editor"
              style={{ 
                colorScheme: 'normal',
                background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'
              }}
            />
          </div>
        </div>
        
        {/* Compact Mobile Helper */}
        <div className="mt-2 text-xs text-muted-foreground text-center sm:hidden bg-muted/10 py-1.5 px-2 rounded-lg">
          💡 Swipe toolbar • Tap text to edit
        </div>
        
        {/* Desktop Helper */}
        <div className="mt-2 text-xs text-muted-foreground text-center hidden sm:block">
          🎨 Professional email editor • Ctrl+B/I shortcuts • Undo/Redo available
        </div>
      </div>
    </div>
  );
};