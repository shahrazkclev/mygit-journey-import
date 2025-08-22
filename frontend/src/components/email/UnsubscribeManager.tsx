import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserX, Search, Download, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UnsubscribedUser {
  id: string;
  email: string;
  unsubscribed_at?: string;
  created_at?: string;
  reason?: string;
  user_id?: string;
}

export const UnsubscribeManager = () => {
  const [unsubscribedUsers, setUnsubscribedUsers] = useState<UnsubscribedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Load unsubscribe data from database
  useEffect(() => {
    loadUnsubscribeData();
  }, []);

  // Add a test button for debugging
  const addTestUnsubscribe = async () => {
    try {
      const testData = {
        email: 'test@example.com',
        unsubscribed_at: new Date().toISOString(),
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'Testing unsubscribe display'
      };
      
      console.log('🧪 Adding test unsubscribe:', testData);
      
      const { data, error } = await supabase
        .from('unsubscribes')
        .insert(testData)
        .select();

      console.log('📊 Insert result:', { data, error });

      if (error) throw error;

      toast.success("Test unsubscribe added!");
      loadUnsubscribeData(); // Reload data
    } catch (error: any) {
      console.error('❌ Error adding test unsubscribe:', error);
      toast.error("Failed to add test unsubscribe: " + error.message);
    }
  };

  const loadUnsubscribeData = async () => {
    try {
      console.log('🔍 Loading unsubscribe data from Supabase...');
      
      // First, let's try to get the current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id);
      
      // Try different approaches to get the data
      console.log('🔍 Attempt 1: Query all columns to see structure');
      const { data: allData, error: allError } = await supabase
        .from('unsubscribes')
        .select('*');
      
      console.log('📊 All data query:', { data: allData, error: allError });
      
      // Try with specific columns that might exist
      console.log('🔍 Attempt 2: Query with expected columns');
      const { data, error } = await supabase
        .from('unsubscribes')
        .select('id, email, name, unsubscribed_at, reason, user_id, created_at')
        .order('created_at', { ascending: false });

      console.log('📊 Supabase query result:', { data, error });

      if (error) {
        console.error('❌ Supabase error:', error);
        
        // If we have an error, try a simpler query
        console.log('🔍 Attempt 3: Simpler query');
        const { data: simpleData, error: simpleError } = await supabase
          .from('unsubscribes')
          .select('*');
        
        console.log('📊 Simple query result:', { data: simpleData, error: simpleError });
        
        if (!simpleError && simpleData) {
          setUnsubscribedUsers(simpleData);
          console.log(`✅ Found ${simpleData.length} unsubscribed users (simple query)`);
          return;
        }
        
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} unsubscribed users`);
      setUnsubscribedUsers(data || []);
    } catch (error: any) {
      console.error('❌ Error loading unsubscribe data:', error);
      toast.error("Failed to load unsubscribe data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = unsubscribedUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveFromList = async (id: string) => {
    try {
      const { error } = await supabase
        .from('unsubscribes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUnsubscribedUsers(users => users.filter(user => user.id !== id));
      toast.success("User removed from unsubscribe list");
    } catch (error: any) {
      toast.error("Failed to remove user: " + error.message);
      console.error('Error removing user:', error);
    }
  };

  const handleExportList = () => {
    const csvContent = [
      "Email,Unsubscribed At,Reason",
      ...unsubscribedUsers.map(user => 
        `${user.email},${user.unsubscribed_at},${user.reason || 'N/A'}`
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
                    new Date(u.unsubscribed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
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
              className="border-email-secondary hover:bg-email-secondary mr-2"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={addTestUnsubscribe}
              variant="outline"
              className="border-blue-500 hover:bg-blue-500"
            >
              🧪 Add Test
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
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading unsubscribe data...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
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
                              <span>Unsubscribed: {formatDate(user.unsubscribed_at)}</span>
                            </p>
                            {user.reason && (
                              <p>Reason: {user.reason}</p>
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