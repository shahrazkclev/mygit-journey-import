import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Users, Settings, UserX, Sparkles, Send, Wifi } from "lucide-react";
import { CampaignComposer } from "./email/CampaignComposer";
import { EmailListManager } from "./email/EmailListManager";
import { CampaignSettings } from "./email/CampaignSettings";
import { UnsubscribeManager } from "./email/UnsubscribeManager";
import { StyleGuide } from "./email/StyleGuide";

export const EmailCampaignApp = () => {
  const [activeTab, setActiveTab] = useState("compose");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-email-primary/5">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <Card className="shadow-soft border-email-primary/20 bg-gradient-soft">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <CardTitle className="text-2xl font-bold text-email-primary flex items-center space-x-2">
                  <Mail className="h-6 w-6" />
                  <span>AI Email Campaign Manager</span>
                </CardTitle>
                <CardDescription className="text-lg">
                  Create, manage, and send AI-powered email campaigns with style
                </CardDescription>
              </div>
              <Badge 
                variant="outline" 
                className="border-email-success text-email-success bg-email-success/10"
              >
                <Wifi className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            </div>
          </CardHeader>
        </Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-fit lg:grid-cols-5 bg-card shadow-soft">
              <TabsTrigger value="compose" className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Compose</span>
              </TabsTrigger>
              <TabsTrigger value="lists" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Lists</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
              <TabsTrigger value="unsubscribe" className="flex items-center space-x-2">
                <UserX className="h-4 w-4" />
                <span className="hidden sm:inline">Unsubscribe</span>
              </TabsTrigger>
              <TabsTrigger value="style" className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Style</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-6">
              <Card className="shadow-soft border-email-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-email-primary" />
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
              <Card className="shadow-soft border-email-secondary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-email-secondary" />
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

            <TabsContent value="settings" className="space-y-6">
              <Card className="shadow-soft border-email-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-email-accent" />
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
              <Card className="shadow-soft border-email-warning/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Send className="h-5 w-5 text-email-warning" />
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