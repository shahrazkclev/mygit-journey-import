import React from 'react';

interface EmailPreviewProps {
  htmlContent: string;
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({ htmlContent }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="bg-white rounded-lg overflow-hidden shadow-lg">
          <iframe
            srcDoc={htmlContent}
            className="w-full h-96 border-0"
            title="Email Preview"
          />
        </div>
      </div>
    </div>
  );
};