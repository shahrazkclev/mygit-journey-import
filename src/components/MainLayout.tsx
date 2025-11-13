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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-3 right-3 sm:top-4 sm:right-4 z-50 depth-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="touch-target bg-white backdrop-blur-sm border-2 border-primary/30 theme-shadow-lg hover:theme-shadow-xl transition-shadow duration-200 p-2.5 sm:p-3"
        >
          {sidebarOpen ? <X className="h-5 w-5 sm:icon-fluid" /> : <Menu className="h-5 w-5 sm:icon-fluid" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40 depth-40
        w-[280px] sm:w-[300px] lg:sidebar-width bg-card/95 backdrop-blur-sm border-r-2 border-border/60 theme-shadow-lg transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        max-w-[85vw] sm:max-w-[320px] lg:max-w-none
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 sm:p-fluid-lg border-b-2 border-border/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
            <h2 className="text-lg sm:text-fluid-xl font-bold text-slate-900 flex items-center gap-2 sm:gap-fluid-md mb-2 sm:mb-fluid-sm">
              <div className="p-2 sm:p-fluid-sm bg-blue-100 rounded-fluid theme-shadow-sm border-2 border-blue-300">
                <Users className="h-5 w-5 sm:icon-fluid text-blue-700" />
              </div>
              <span className="truncate">Business Dashboard</span>
            </h2>
            <p className="text-xs sm:text-fluid-sm text-slate-700 font-semibold">
              Manage all aspects of your business
            </p>
          </div>

          {/* Logged In Status - Above Navigation */}
          <div className="px-3 sm:px-fluid-md pt-3 sm:pt-fluid-md pb-2 sm:pb-fluid-sm">
            <div className="bg-slate-50 rounded-fluid p-3 sm:p-fluid-md border-2 border-slate-300 theme-shadow-md backdrop-blur-sm hover:theme-shadow-lg transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-fluid-sm mb-2 sm:mb-fluid-sm">
                <div className="relative">
                  <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/60"></div>
                  <div className="absolute inset-0 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                </div>
                <p className="text-[10px] sm:text-fluid-xs font-bold text-slate-700 uppercase tracking-wide">
                  Logged in as
                </p>
              </div>
              <p className="text-xs sm:text-fluid-sm font-bold text-slate-900 truncate break-all">
                {user.email}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 sm:p-fluid-md space-y-2 sm:space-y-fluid-sm overflow-y-auto">
            {panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <Button
                  key={panel.id}
                  variant={activePanel === panel.id ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 sm:gap-fluid-md touch-target text-left transition-colors duration-200 rounded-fluid text-sm sm:text-base ${
                    activePanel === panel.id 
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground theme-shadow-lg hover:theme-shadow-xl border-2 border-primary/50" 
                      : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 text-muted-foreground hover:text-foreground hover:border-2 hover:border-primary/30 hover:theme-shadow-sm"
                  }`}
                  onClick={() => {
                    setActivePanel(panel.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5 sm:icon-fluid flex-shrink-0" />
                  <span className="font-bold truncate">{panel.name}</span>
                </Button>
              );
            })}
          </nav>

          {/* Footer - Sticky Sign Out */}
          <div className="mt-auto p-3 sm:p-fluid-md border-t-2 border-border/40 bg-muted/10 sticky bottom-0 z-10">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 sm:gap-fluid-md touch-target text-sm sm:text-base text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-fluid transition-colors duration-200 hover:border-2 hover:border-destructive/30 hover:theme-shadow-sm"
              onClick={logout}
            >
              <LogOut className="h-5 w-5 sm:icon-fluid flex-shrink-0" />
              <span className="font-semibold">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-30 lg:hidden backdrop-blur-md depth-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 w-full lg:w-auto bg-gradient-to-br from-background via-muted/10 to-background">
        <ActiveComponent />
      </div>
    </div>
  );
};