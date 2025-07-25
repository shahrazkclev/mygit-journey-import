import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserX, Search, Download, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface UnsubscribedUser {
  id: number;
  email: string;
  unsubscribedAt: string;
  reason?: string;
  campaign?: string;
}

export const UnsubscribeManager = () => {
  const [unsubscribedUsers, setUnsubscribedUsers] = useState<UnsubscribedUser[]>([
    {
      id: 1,
      email: "user1@example.com",
      unsubscribedAt: "2024-01-15T10:30:00Z",
      reason: "Too many emails",
      campaign: "Newsletter Jan 2024"
    },
    {
      id: 2,
      email: "user2@example.com",
      unsubscribedAt: "2024-01-14T15:45:00Z",
      reason: "Not interested",
      campaign: "Product Launch"
    },
    {
      id: 3,
      email: "user3@example.com",
      unsubscribedAt: "2024-01-13T09:15:00Z",
      campaign: "Weekly Update"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = unsubscribedUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveFromList = (id: number) => {
    setUnsubscribedUsers(users => users.filter(user => user.id !== id));
    toast.success("User removed from unsubscribe list");
  };

  const handleExportList = () => {
    const csvContent = [
      "Email,Unsubscribed At,Reason,Campaign",
      ...unsubscribedUsers.map(user => 
        `${user.email},${user.unsubscribedAt},${user.reason || 'N/A'},${user.campaign || 'N/A'}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unsubscribed-users.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Unsubscribe list exported successfully!");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-soft border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{unsubscribedUsers.length}</p>
                <p className="text-sm text-muted-foreground">Total Unsubscribed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-soft border-email-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-email-warning" />
              <div>
                <p className="text-2xl font-bold">
                  {unsubscribedUsers.filter(u => 
                    new Date(u.unsubscribedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-soft border-email-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-email-accent" />
              <div>
                <p className="text-2xl font-bold">2.3%</p>
                <p className="text-sm text-muted-foreground">Unsubscribe Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Controls */}
      <Card className="shadow-soft border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-destructive" />
              <span>Unsubscribed Users</span>
            </span>
            <Button 
              onClick={handleExportList}
              variant="outline"
              className="border-email-secondary hover:bg-email-secondary"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardTitle>
          <CardDescription>
            Manage users who have unsubscribed from your email campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-email-primary/30 focus:border-email-primary"
              />
            </div>

            {/* Unsubscribed Users List */}
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No unsubscribed users found</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user.id} className="shadow-soft border-destructive/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">{user.email}</span>
                            <Badge variant="outline" className="border-destructive text-destructive">
                              Unsubscribed
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p className="flex items-center space-x-2">
                              <Calendar className="h-3 w-3" />
                              <span>Unsubscribed: {formatDate(user.unsubscribedAt)}</span>
                            </p>
                            {user.reason && (
                              <p>Reason: {user.reason}</p>
                            )}
                            {user.campaign && (
                              <p>From campaign: {user.campaign}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFromList(user.id)}
                            className="border-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Note */}
      <Card className="shadow-soft border-email-warning/20 bg-email-warning/5">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <UserX className="h-5 w-5 text-email-warning mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-email-warning">Important</p>
              <p className="text-xs text-muted-foreground">
                Users on this list will be automatically excluded from all future campaigns. 
                Always respect unsubscribe requests to maintain good sender reputation and comply with regulations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};