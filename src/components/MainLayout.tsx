import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGlobalTheme } from "@/hooks/useGlobalTheme";
import { EmailCampaignApp } from "./EmailCampaignApp";
import { ReviewsManager } from "./reviews/ReviewsManager";
import { Users, Star, Menu, X } from "lucide-react";


export const MainLayout = () => {
  const [activePanel, setActivePanel] = useState("customers");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Initialize global theme
  useGlobalTheme();

  const panels = [
    {
      id: "customers",
      name: "Customers",
      icon: Users,
      component: EmailCampaignApp
    },
    {
      id: "reviews",
      name: "Reviews Manager",
      icon: Star,
      component: ReviewsManager
    }
  ];

  const ActiveComponent = panels.find(p => p.id === activePanel)?.component || EmailCampaignApp;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-background/80 backdrop-blur-sm border shadow-lg"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40
        w-64 bg-card border-r shadow-lg transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-foreground">
              Business Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage all aspects of your business
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <Button
                  key={panel.id}
                  variant={activePanel === panel.id ? "default" : "ghost"}
                  className="w-full justify-start gap-3 h-12 text-left"
                  onClick={() => {
                    setActivePanel(panel.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span>{panel.name}</span>
                </Button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Business Management Platform
            </p>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1">
        <ActiveComponent />
      </div>
    </div>
  );
};