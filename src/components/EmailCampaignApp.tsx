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
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
      {/* Header */}
      <div className="border-b-2 border-border/50 bg-card/98 backdrop-blur-md sticky top-0 z-50 theme-shadow-lg depth-20">
        <div className="container-dynamic px-4 sm:px-fluid-lg py-3 sm:py-fluid-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-fluid-md">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-fluid-3xl font-extrabold text-foreground mb-1 sm:mb-fluid-xs leading-tight">
                Customer Management
              </h1>
              <p className="text-xs sm:text-fluid-sm text-muted-foreground font-medium">
                Create, manage, and act with customers
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container-dynamic px-3 sm:px-fluid-lg py-3 sm:py-fluid-md">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-fluid-lg">
          {/* Navigation Tabs */}
          <div className="bg-card rounded-fluid border-2 border-border/60 p-2 sm:p-fluid-sm theme-shadow-md hover:theme-shadow-lg transition-shadow duration-200">
            <TabsList className="flex md:grid md:grid-cols-6 w-full bg-transparent gap-1 sm:gap-fluid-sm h-auto overflow-x-auto scrollbar-hide -mx-1 px-1">
              <TabsTrigger
                value="compose" 
                className="flex items-center justify-center gap-1 sm:gap-fluid-sm text-xs sm:text-fluid-sm font-semibold px-2 sm:px-fluid-md py-2 sm:py-fluid-md rounded-fluid touch-target min-w-[60px] sm:min-w-[var(--tab-min-width)] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:theme-shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 hover:bg-muted/60 hover:theme-shadow-sm transition-colors duration-200 flex-shrink-0 border-2 border-transparent"
              >
                <Mail className="icon-fluid" />
                <span className="hidden sm:inline">Compose</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="contacts" 
                className="flex items-center justify-center gap-1 sm:gap-fluid-sm text-xs sm:text-fluid-sm font-semibold px-2 sm:px-fluid-md py-2 sm:py-fluid-md rounded-fluid touch-target min-w-[60px] sm:min-w-[var(--tab-min-width)] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:theme-shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 hover:bg-muted/60 hover:theme-shadow-sm transition-colors duration-200 flex-shrink-0 border-2 border-transparent"
              >
                <Users className="icon-fluid" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="lists" 
                className="flex items-center justify-center gap-1 sm:gap-fluid-sm text-xs sm:text-fluid-sm font-semibold px-2 sm:px-fluid-md py-2 sm:py-fluid-md rounded-fluid touch-target min-w-[60px] sm:min-w-[var(--tab-min-width)] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:theme-shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 hover:bg-muted/60 hover:theme-shadow-sm transition-colors duration-200 flex-shrink-0 border-2 border-transparent"
              >
                <List className="icon-fluid" />
                <span className="hidden sm:inline">Lists</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="products" 
                className="flex items-center justify-center gap-1 sm:gap-fluid-sm text-xs sm:text-fluid-sm font-semibold px-2 sm:px-fluid-md py-2 sm:py-fluid-md rounded-fluid touch-target min-w-[60px] sm:min-w-[var(--tab-min-width)] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:theme-shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 hover:bg-muted/60 hover:theme-shadow-sm transition-colors duration-200 flex-shrink-0 border-2 border-transparent"
              >
                <Package className="icon-fluid" />
                <span className="hidden sm:inline">Products</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="automation" 
                className="flex items-center justify-center gap-1 sm:gap-fluid-sm text-xs sm:text-fluid-sm font-semibold px-2 sm:px-fluid-md py-2 sm:py-fluid-md rounded-fluid touch-target min-w-[60px] sm:min-w-[var(--tab-min-width)] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:theme-shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/50 hover:bg-muted/60 hover:theme-shadow-sm transition-colors duration-200 flex-shrink-0 border-2 border-transparent"
              >
                <Zap className="icon-fluid" />
                <span className="hidden sm:inline">Automation</span>
              </TabsTrigger>

              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={activeTab === "settings" ? "default" : "ghost"}
                    className="flex items-center justify-center gap-fluid-sm text-fluid-sm px-fluid-md py-fluid-md rounded-fluid touch-target min-w-[var(--tab-min-width)] w-full md:w-auto flex-shrink-0"
                  >
                    <Settings className="icon-fluid" />
                    <span className="hidden sm:inline">Settings</span>
                    <ChevronDown className="icon-fluid" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 md:w-48 bg-popover border shadow-lg">
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("integration");
                    }}
                    className="flex items-center gap-2 cursor-pointer touch-target"
                  >
                    <Link className="h-4 w-4 flex-shrink-0" />
                    <span>Integration</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("style");
                    }}
                    className="flex items-center gap-2 cursor-pointer touch-target"
                  >
                    <Palette className="h-4 w-4 flex-shrink-0" />
                    <span>Style & Branding</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("tag-rules");
                    }}
                    className="flex items-center gap-2 cursor-pointer touch-target"
                  >
                    <Tags className="h-4 w-4 flex-shrink-0" />
                    <span>Tag Rules</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("lock-tags");
                    }}
                    className="flex items-center gap-2 cursor-pointer touch-target"
                  >
                    <Lock className="h-4 w-4 flex-shrink-0" />
                    <span>Lock Tags</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsSubTab("unsubscribe");
                    }}
                    className="flex items-center gap-2 cursor-pointer touch-target"
                  >
                    <UserX className="h-4 w-4 flex-shrink-0" />
                    <span>Unsubscribe</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TabsList>
          </div>

          {/* Tab Contents */}
          <TabsContent value="compose" className="space-y-0 bg-card rounded-fluid border-2 border-border/60 theme-shadow-lg p-4 sm:p-fluid-xl">
            <CampaignComposer />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-0 bg-card rounded-fluid border-2 border-border/60 theme-shadow-lg p-fluid-xl">
            <SimpleContactManager />
          </TabsContent>

          <TabsContent value="lists" className="space-y-0 bg-card rounded-fluid border-2 border-border/60 theme-shadow-lg p-fluid-xl">
            <SmartListManager />
          </TabsContent>

          <TabsContent value="products" className="space-y-0 bg-card rounded-fluid border-2 border-border/60 theme-shadow-lg p-fluid-xl">
            <ProductManager />
          </TabsContent>

          <TabsContent value="automation" className="space-y-0 bg-card rounded-fluid border-2 border-border/60 theme-shadow-lg p-fluid-xl">
            <AutomationCampaigns />
          </TabsContent>

          <TabsContent value="settings" className="space-y-0">
            <div className="bg-card rounded-fluid border-2 border-border/60 theme-shadow-lg">
              {/* Settings Sub-Navigation */}
              <div className="border-b-2 border-border/40 bg-gradient-to-br from-muted/20 via-transparent to-muted/10 px-3 sm:px-fluid-md md:px-fluid-xl py-3 sm:py-fluid-md md:py-fluid-lg">
                <div className="flex items-center gap-2 sm:gap-fluid-md mb-3 sm:mb-fluid-md md:mb-fluid-lg">
                  <Settings className="h-5 w-5 sm:icon-fluid text-muted-foreground flex-shrink-0" />
                  <h2 className="text-lg sm:text-fluid-xl md:text-fluid-2xl font-bold">Settings</h2>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-fluid-sm md:gap-fluid-md overflow-x-auto scrollbar-hide pb-1">
                  <Button
                    variant={settingsSubTab === "integration" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("integration")}
                    size="sm"
                    className="flex items-center gap-fluid-xs md:gap-fluid-sm touch-target flex-shrink-0 text-fluid-xs md:text-fluid-sm"
                  >
                    <Link className="icon-fluid flex-shrink-0" />
                    <span className="whitespace-nowrap">Integration</span>
                  </Button>
                  <Button
                    variant={settingsSubTab === "style" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("style")}
                    size="sm"
                    className="flex items-center gap-fluid-xs md:gap-fluid-sm touch-target flex-shrink-0 text-fluid-xs md:text-fluid-sm"
                  >
                    <Palette className="icon-fluid flex-shrink-0" />
                    <span className="whitespace-nowrap">Style & Branding</span>
                  </Button>
                  <Button
                    variant={settingsSubTab === "tag-rules" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("tag-rules")}
                    size="sm"
                    className="flex items-center gap-fluid-xs md:gap-fluid-sm touch-target flex-shrink-0 text-fluid-xs md:text-fluid-sm"
                  >
                    <Tags className="icon-fluid flex-shrink-0" />
                    <span className="whitespace-nowrap">Tag Rules</span>
                  </Button>
                  <Button
                    variant={settingsSubTab === "lock-tags" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("lock-tags")}
                    size="sm"
                    className="flex items-center gap-fluid-xs md:gap-fluid-sm touch-target flex-shrink-0 text-fluid-xs md:text-fluid-sm"
                  >
                    <Lock className="icon-fluid flex-shrink-0" />
                    <span className="whitespace-nowrap">Lock Tags</span>
                  </Button>
                  <Button
                    variant={settingsSubTab === "unsubscribe" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("unsubscribe")}
                    size="sm"
                    className="flex items-center gap-fluid-xs md:gap-fluid-sm touch-target flex-shrink-0 text-fluid-xs md:text-fluid-sm"
                  >
                    <UserX className="icon-fluid flex-shrink-0" />
                    <span className="whitespace-nowrap">Unsubscribe</span>
                  </Button>
                </div>
              </div>
              
              {/* Settings Content */}
              <div className="p-4 sm:p-fluid-xl">
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