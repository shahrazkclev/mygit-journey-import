import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalTheme } from "@/hooks/useGlobalTheme";
import { CampaignComposer } from "./email/CampaignComposer";
import { SimpleContactManager } from "./email/SimpleContactManager";
import { SmartListManager } from "./email/SmartListManager";
import { CampaignSettings } from "./email/CampaignSettings";
import { ProductManager } from "./email/ProductManager";
import { CampaignHistory } from "./email/CampaignHistory";
import { UnsubscribeManager } from "./email/UnsubscribeManager";
import { StyleGuide } from "./email/StyleGuide";
import { Mail, Users, List, Settings, BarChart3, UserX, Palette, Package } from "lucide-react";

export const EmailCampaignApp = () => {
  const [activeTab, setActiveTab] = useState("compose");
  
  // Initialize global theme
  useGlobalTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-email-background to-background">
      <div className="container mx-auto p-4 lg:p-6">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-email-primary mb-2">
            Email Campaign Manager
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground">
            Create, manage, and send beautiful email campaigns with smart automation
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-6">
          {/* Mobile-optimized TabsList */}
          <div className="w-full overflow-x-auto">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 bg-email-muted min-w-full lg:w-full gap-1">
              <TabsTrigger 
                value="compose" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Compose</span>
              </TabsTrigger>
              <TabsTrigger 
                value="contacts" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lists" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lists</span>
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Products</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
              <TabsTrigger 
                value="campaigns" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Campaigns</span>
              </TabsTrigger>
              <TabsTrigger 
                value="unsubscribe" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3"
              >
                <UserX className="h-4 w-4" />
                <span className="hidden sm:inline">Unsubscribe</span>
              </TabsTrigger>
              <TabsTrigger 
                value="style" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Style</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="compose" className="space-y-0">
            <CampaignComposer />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-0">
            <SimpleContactManager />
          </TabsContent>

          <TabsContent value="lists" className="space-y-0">
            <SmartListManager />
          </TabsContent>

          <TabsContent value="products" className="space-y-0">
            <ProductManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-0">
            <CampaignSettings />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-0">
            <CampaignHistory />
          </TabsContent>

          <TabsContent value="unsubscribe" className="space-y-0">
            <UnsubscribeManager />
          </TabsContent>

          <TabsContent value="style" className="space-y-0">
            <StyleGuide />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};