import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGlobalTheme } from "@/hooks/useGlobalTheme";
import { CampaignComposer } from "./email/CampaignComposer";
import { SimpleContactManager } from "./email/SimpleContactManager";
import { SmartListManager } from "./email/SmartListManager";
import { CampaignSettings } from "./email/CampaignSettings";
import { ProductManager } from "./email/ProductManager";
import { CampaignHistory } from "./email/CampaignHistory";
import { AutomationCampaigns } from "./email/AutomationCampaigns";
import { UnsubscribeManager } from "./email/UnsubscribeManager";
import { StyleGuide } from "./email/StyleGuide";
import { TagRulesManager } from "./email/TagRulesManager";
import { LockTagsManager } from "./email/LockTagsManager";
import { Mail, Users, List, Settings, BarChart3, Package, ChevronDown, Palette, UserX, Link, Tags, Lock, Zap } from "lucide-react";

export const EmailCampaignApp = () => {
  const [activeTab, setActiveTab] = useState("compose");
  const [settingsSubTab, setSettingsSubTab] = useState("integration");
  
  // Initialize global theme
  useGlobalTheme();

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                Customer Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Create, manage, and act with customers
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation Tabs */}
          <div className="bg-card rounded-2xl border border-border/50 p-2 shadow-sm">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full bg-transparent gap-2 h-auto">
              <TabsTrigger
                value="compose" 
                className="flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/50 transition-all duration-200"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Compose</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="contacts" 
                className="flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/50 transition-all duration-200"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="lists" 
                className="flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/50 transition-all duration-200"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lists</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="products" 
                className="flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/50 transition-all duration-200"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Products</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="automation" 
                className="flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/50 transition-all duration-200"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Automation</span>
              </TabsTrigger>

              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={activeTab === "settings" ? "default" : "ghost"}
                    className="flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-xl w-full"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover border shadow-lg">
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("integration");
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Link className="h-4 w-4" />
                    Integration
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("style");
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Palette className="h-4 w-4" />
                    Style & Branding
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("tag-rules");
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Tags className="h-4 w-4" />
                    Tag Rules
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("lock-tags");
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                    Lock Tags
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("unsubscribe");
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <UserX className="h-4 w-4" />
                    Unsubscribe
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TabsList>
          </div>

          {/* Tab Contents */}
          <TabsContent value="compose" className="space-y-0 bg-card rounded-2xl border border-border/50 shadow-sm p-8">
            <CampaignComposer />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-0 bg-card rounded-2xl border border-border/50 shadow-sm p-8">
            <SimpleContactManager />
          </TabsContent>

          <TabsContent value="lists" className="space-y-0 bg-card rounded-2xl border border-border/50 shadow-sm p-8">
            <SmartListManager />
          </TabsContent>

          <TabsContent value="products" className="space-y-0 bg-card rounded-2xl border border-border/50 shadow-sm p-8">
            <ProductManager />
          </TabsContent>

          <TabsContent value="automation" className="space-y-0 bg-card rounded-2xl border border-border/50 shadow-sm p-8">
            <AutomationCampaigns />
          </TabsContent>

          <TabsContent value="settings" className="space-y-0">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
              {/* Settings Sub-Navigation */}
              <div className="border-b border-border/50 px-8 py-6">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">Settings</h2>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant={settingsSubTab === "integration" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("integration")}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Link className="h-4 w-4" />
                    Integration
                  </Button>
                  <Button
                    variant={settingsSubTab === "style" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("style")}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    Style & Branding
                  </Button>
                  <Button
                    variant={settingsSubTab === "tag-rules" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("tag-rules")}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Tags className="h-4 w-4" />
                    Tag Rules
                  </Button>
                  <Button
                    variant={settingsSubTab === "lock-tags" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("lock-tags")}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    Lock Tags
                  </Button>
                  <Button
                    variant={settingsSubTab === "unsubscribe" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("unsubscribe")}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <UserX className="h-4 w-4" />
                    Unsubscribe
                  </Button>
                </div>
              </div>
              
              {/* Settings Content */}
              <div className="p-8">
                {settingsSubTab === "integration" && <CampaignSettings />}
                {settingsSubTab === "style" && <StyleGuide />}
                {settingsSubTab === "tag-rules" && <TagRulesManager />}
                {settingsSubTab === "lock-tags" && <LockTagsManager />}
                {settingsSubTab === "unsubscribe" && <UnsubscribeManager />}
              </div>
            </div>
          </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  };