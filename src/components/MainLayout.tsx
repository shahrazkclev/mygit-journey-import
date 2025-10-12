import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGlobalTheme } from "@/hooks/useGlobalTheme";
import { useAuth } from "@/contexts/AuthContext";
import { EmailCampaignApp } from "./EmailCampaignApp";
import { ReviewsManager } from "./reviews/ReviewsManager";
import ProductLinks from "../pages/ProductLinks";
import { Users, Star, Menu, X, LogOut, Link } from "lucide-react";


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
      id: "product-links",
      name: "Product Links",
      icon: Link,
      component: ProductLinks
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
        w-64 bg-gradient-to-br from-email-background via-white to-email-muted/20 border-r border-email-primary/20 shadow-xl shadow-email-primary/10 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-email-primary/20 bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5">
            <h2 className="text-xl font-bold text-email-secondary flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-br from-email-primary to-email-accent rounded-lg shadow-sm">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span>Business Dashboard</span>
            </h2>
            <p className="text-sm text-email-secondary/80 mt-2">
              Manage all aspects of your business
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-3">
            {panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <Button
                  key={panel.id}
                  variant={activePanel === panel.id ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 h-12 text-left transition-all duration-200 ${
                    activePanel === panel.id 
                      ? "bg-gradient-to-r from-email-primary to-email-accent text-white shadow-lg hover:shadow-xl" 
                      : "hover:bg-email-primary/10 hover:text-email-primary border border-transparent hover:border-email-primary/20"
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
          <div className="p-4 border-t border-email-primary/20 space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-3 h-10 border-email-primary/30 text-email-secondary hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Sign Out</span>
            </Button>
            <div className="bg-gradient-to-r from-email-primary/5 to-email-accent/5 rounded-lg p-3 border border-email-primary/20">
              <p className="text-xs text-email-secondary/80 text-center font-medium">
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