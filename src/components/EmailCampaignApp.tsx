import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Users, Settings, UserX, Sparkles, Send, Wifi, User, Package, Palette } from "lucide-react";
import { CampaignComposer } from "./email/CampaignComposer";
import { EmailListManager } from "./email/EmailListManager";
import { ContactManager } from "./email/ContactManager";
import { ProductManager } from "./email/ProductManager";
import { CampaignSettings } from "./email/CampaignSettings";
import { UnsubscribeManager } from "./email/UnsubscribeManager";
import { StyleGuide } from "./email/StyleGuide";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";
import { setCssThemeFromHex } from "@/lib/theme";

export const EmailCampaignApp = () => {
  const [activeTab, setActiveTab] = useState("compose");

  // Apply latest saved theme globally on app mount
  useEffect(() => {
    const applySavedTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('style_guides')
          .select('page_theme_primary, page_theme_secondary, page_theme_accent, brand_name')
          .eq('user_id', DEMO_USER_ID)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) return;
        if (data && data.length > 0) {
          const g = data[0];
          setCssThemeFromHex(g.page_theme_primary, g.page_theme_secondary, g.page_theme_accent);
          if (g.brand_name) {
            document.title = `${g.brand_name} – Email Campaign Manager`;
          }
        }
      } catch {}
    };
    applySavedTheme();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <Card className="shadow-soft border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <CardTitle className="text-2xl font-bold text-primary flex items-center space-x-2">
                  <Mail className="h-6 w-6" />
                  <span>AI Email Campaign Manager</span>
                </CardTitle>
                <CardDescription className="text-lg">
                  Create, manage, and send AI-powered email campaigns with style
                </CardDescription>
              </div>
              <Badge 
                variant="outline" 
                className="border-accent text-accent bg-accent/10"
              >
                <Wifi className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            </div>
          </CardHeader>
        </Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7 lg:w-fit lg:grid-cols-7 bg-card shadow-soft">
              <TabsTrigger value="compose" className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Compose</span>
              </TabsTrigger>
              <TabsTrigger value="lists" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Lists</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
               <TabsTrigger value="products" className="flex items-center space-x-2">
                 <Package className="h-4 w-4" />
                 <span className="hidden sm:inline">Products</span>
               </TabsTrigger>
              <TabsTrigger value="style" className="flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Style</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
              <TabsTrigger value="unsubscribe" className="flex items-center space-x-2">
                <UserX className="h-4 w-4" />
                <span className="hidden sm:inline">Unsubscribe</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-6">
              <Card className="shadow-soft border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>AI Email Composer</span>
                  </CardTitle>
                  <CardDescription>
                    Generate beautiful, personalized email campaigns with AI assistance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CampaignComposer />
                </CardContent>
              </Card>
          </TabsContent>

            <TabsContent value="lists" className="space-y-6">
              <Card className="shadow-soft border-secondary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-secondary" />
                    <span>Email Lists</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your email lists and subscriber data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmailListManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-6">
              <Card className="shadow-soft border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <span>Contact Management</span>
                  </CardTitle>
                  <CardDescription>
                    Manage contacts, track purchases, and assign to lists
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContactManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              <Card className="shadow-soft border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    <span>Product Catalog</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your product catalog and track customer purchases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductManager />
                </CardContent>
               </Card>
             </TabsContent>
             <TabsContent value="settings" className="space-y-6">
               <Card className="shadow-soft border-accent/20">
                 <CardHeader>
                   <CardTitle className="flex items-center space-x-2">
                     <Settings className="h-5 w-5 text-accent" />
                     <span>Campaign Settings</span>
                   </CardTitle>
                   <CardDescription>
                     Configure sending patterns, pacing, and Make.com integration
                   </CardDescription>
                 </CardHeader>
                <CardContent>
                  <CampaignSettings />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unsubscribe" className="space-y-6">
              <Card className="shadow-soft border-destructive/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserX className="h-5 w-5 text-destructive" />
                    <span>Unsubscribe Management</span>
                  </CardTitle>
                  <CardDescription>
                    View and manage unsubscribed email addresses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UnsubscribeManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="style" className="space-y-6">
              <Card className="shadow-soft border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Send className="h-5 w-5 text-primary" />
                    <span>Style Guide</span>
                  </CardTitle>
                  <CardDescription>
                    Define your brand style for consistent AI-generated emails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StyleGuide />
                </CardContent>
              </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};