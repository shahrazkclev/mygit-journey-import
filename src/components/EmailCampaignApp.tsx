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
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-dots-subtle bg-dots opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-background/60"></div>
      
      <div className="relative z-10 container mx-auto p-4 lg:p-6">
        <div className="mb-6 lg:mb-8 text-center">
          <h1 className="text-3xl lg:text-5xl font-bold gradient-text mb-3 animate-fade-in">
            Email Campaign Manager
          </h1>
          <p className="text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in">
            Create, manage, and send beautiful email campaigns with smart automation and professional design
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-6">
          {/* Enhanced TabsList with glass morphism */}
          <div className="w-full overflow-x-auto">
            <TabsList className="glass hover-lift grid grid-cols-4 lg:grid-cols-8 min-w-full lg:w-full gap-1 p-1 rounded-xl border shadow-soft">
              <TabsTrigger
                value="compose" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow hover:bg-muted/50"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Compose</span>
              </TabsTrigger>
              <TabsTrigger 
                value="contacts" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow hover:bg-muted/50"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Contacts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lists" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow hover:bg-muted/50"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Lists</span>
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow hover:bg-muted/50"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Products</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow hover:bg-muted/50"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Settings</span>
              </TabsTrigger>
              <TabsTrigger 
                value="campaigns" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow hover:bg-muted/50"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Campaigns</span>
              </TabsTrigger>
              <TabsTrigger 
                value="unsubscribe" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow hover:bg-muted/50"
              >
                <UserX className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Unsubscribe</span>
              </TabsTrigger>
              <TabsTrigger 
                value="style" 
                className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-2 text-xs lg:text-sm p-2 lg:p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow hover:bg-muted/50"
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