import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGlobalTheme } from "@/hooks/useGlobalTheme";
import { useAuth } from "@/contexts/AuthContext";
import { EmailCampaignApp } from "./EmailCampaignApp";
import { ReviewsManager } from "./reviews/ReviewsManager";
import { DatabaseManager } from "./DatabaseManager";
import { Users, Star, Menu, X, LogOut, Database } from "lucide-react";


export const MainLayout = () => {
  const [activePanel, setActivePanel] = useState("customers");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  
  // Initialize global theme
  useGlobalTheme();

  if (!user) {
    return <div>Loading...</div>;
  }

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
    },
    {
      id: "database",
      name: "Database Manager",
      icon: Database,
      component: DatabaseManager
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
          className="bg-gradient-to-r from-email-background via-white to-email-muted/20 backdrop-blur-sm border border-email-primary/20 shadow-xl shadow-email-primary/10 hover:shadow-2xl transition-all duration-200"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40
        w-72 bg-card border-r border-border/50 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-border/50">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span>Business Dashboard</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage all aspects of your business
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1.5">
            {panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <Button
                  key={panel.id}
                  variant={activePanel === panel.id ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 h-12 text-left transition-all duration-200 rounded-xl ${
                    activePanel === panel.id 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => {
                    setActivePanel(panel.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{panel.name}</span>
                </Button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border/50 space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </Button>
            <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Logged in as {user.email}
              </p>
            </div>
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