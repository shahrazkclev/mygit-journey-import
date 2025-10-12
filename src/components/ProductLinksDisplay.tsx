import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, Video, Download, ExternalLink } from 'lucide-react';
import { useProductLinks } from '@/hooks/useProductLinks';

interface ProductLinksDisplayProps {
  productTag?: string;
  productName?: string;
  showTitle?: boolean;
}

export const ProductLinksDisplay: React.FC<ProductLinksDisplayProps> = ({
  productTag,
  productName,
  showTitle = true
}) => {
  const { productLinks, loading, getProductLinkByTag, getProductLinkByProductName } = useProductLinks();

  if (loading) {
    return <div className="text-center py-4">Loading product links...</div>;
  }

  // Find the product link
  let productLink = null;
  if (productTag) {
    productLink = getProductLinkByTag(productTag);
  } else if (productName) {
    productLink = getProductLinkByProductName(productName);
  }

  if (!productLink) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No product links found
      </div>
    );
  }

  return (
    <Card className="w-full">
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Product Links
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Download Link */}
        {productLink.download_url && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Download className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-blue-800">Download</div>
                <div className="text-sm text-blue-600">Get the product files</div>
              </div>
            </div>
            <Button
              onClick={() => window.open(productLink.download_url, '_blank')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}

        {/* Video Guide Link */}
        {productLink.video_guide_url && (
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Video className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <div className="font-medium text-red-800">Video Guide</div>
                <div className="text-sm text-red-600">Watch the tutorial</div>
              </div>
            </div>
            <Button
              onClick={() => window.open(productLink.video_guide_url, '_blank')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Watch
            </Button>
          </div>
        )}

        {/* Description */}
        {productLink.description && (
          <div className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg">
            {productLink.description}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
