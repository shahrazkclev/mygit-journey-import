import React from 'react';

interface EmailPreviewProps {
  htmlContent: string;
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({ htmlContent }) => {
  // Clean HTML content to remove any editor artifacts
  const cleanedHTML = htmlContent.replace(/ring-\d+|ring-blue-\d+|ring-offset-\d+|bg-blue-\d+\/\d+/g, '');
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="bg-background rounded-lg overflow-hidden shadow-lg border">
          <iframe
            srcDoc={cleanedHTML}
            className="w-full h-96 border-0"
            title="Email Preview"
            style={{ colorScheme: 'normal' }}
          />
        </div>
      </div>
    </div>
  );
};