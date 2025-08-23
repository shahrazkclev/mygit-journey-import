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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold text-foreground mb-2">
            Email Campaign Manager
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Create, manage, and send email campaigns
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full bg-muted/50 p-1 rounded-lg">
              <TabsTrigger
                value="compose" 
                className="flex flex-col lg:flex-row items-center gap-2 text-xs lg:text-sm p-2 rounded-md"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Compose</span>
              </TabsTrigger>
              <TabsTrigger 
                value="contacts" 
                className="flex flex-col lg:flex-row items-center gap-2 text-xs lg:text-sm p-2 rounded-md"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Contacts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lists" 
                className="flex flex-col lg:flex-row items-center gap-2 text-xs lg:text-sm p-2 rounded-md"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Lists</span>
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="flex flex-col lg:flex-row items-center gap-2 text-xs lg:text-sm p-2 rounded-md"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Products</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex flex-col lg:flex-row items-center gap-2 text-xs lg:text-sm p-2 rounded-md"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Settings</span>
              </TabsTrigger>
              <TabsTrigger 
                value="campaigns" 
                className="flex flex-col lg:flex-row items-center gap-2 text-xs lg:text-sm p-2 rounded-md"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Campaigns</span>
              </TabsTrigger>
              <TabsTrigger 
                value="unsubscribe" 
                className="flex flex-col lg:flex-row items-center gap-2 text-xs lg:text-sm p-2 rounded-md"
              >
                <UserX className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Unsubscribe</span>
              </TabsTrigger>
              <TabsTrigger 
                value="style" 
                className="flex flex-col lg:flex-row items-center gap-2 text-xs lg:text-sm p-2 rounded-md"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Style</span>
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