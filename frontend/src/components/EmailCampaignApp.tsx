
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
import { Mail, Users, List, Settings, History, UserX, Palette, Package } from "lucide-react";

export const EmailCampaignApp = () => {
  const [activeTab, setActiveTab] = useState("compose");
  
  // Initialize global theme
  useGlobalTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-email-background to-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-email-primary mb-2">
            Email Campaign Manager
          </h1>
          <p className="text-lg text-muted-foreground">
            Create, manage, and send beautiful email campaigns with smart automation
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-email-muted">
            <TabsTrigger value="compose" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Compose</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Contacts</span>
            </TabsTrigger>
            <TabsTrigger value="lists" className="flex items-center space-x-2">
              <List className="h-4 w-4" />
              <span>Lists</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="unsubscribe" className="flex items-center space-x-2">
              <UserX className="h-4 w-4" />
              <span>Unsubscribe</span>
            </TabsTrigger>
            <TabsTrigger value="style" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Style</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <CampaignComposer />
          </TabsContent>

          <TabsContent value="contacts">
            <SimpleContactManager />
          </TabsContent>

          <TabsContent value="lists">
            <SmartListManager />
          </TabsContent>

          <TabsContent value="settings">
            <CampaignSettings />
          </TabsContent>

          <TabsContent value="history">
            <CampaignHistory />
          </TabsContent>

          <TabsContent value="unsubscribe">
            <UnsubscribeManager />
          </TabsContent>

          <TabsContent value="style">
            <StyleGuide />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
