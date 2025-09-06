import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserX, Search, Download, Trash2, Calendar, UserCheck, Filter, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UnsubscribedUser {
  id: string;
  email: string;
  unsubscribed_at?: string;
  created_at?: string;
  reason?: string;
  user_id?: string;
  contact?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    tags?: string[];
  } | null;
}

export const UnsubscribeManager = () => {
  const [unsubscribedUsers, setUnsubscribedUsers] = useState<UnsubscribedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterReason, setFilterReason] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [filterByTags, setFilterByTags] = useState<string>("");

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
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id);
      
      // Query unsubscribes with demo user filter
      const { data, error } = await supabase
        .from('unsubscribes')
        .select('*')
        .eq('user_id', '550e8400-e29b-41d4-a716-446655440000');

      console.log('📊 Basic query result:', { data, error, count: data?.length });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      // Get contact details from unsubscribed_contacts table
      let enrichedData = data;
      if (data && data.length > 0) {
        const emails = data.map(u => u.email);
        const { data: unsubscribedContacts } = await supabase
          .from('unsubscribed_contacts')
          .select('email, first_name, last_name, tags')
          .in('email', emails)
          .eq('user_id', '550e8400-e29b-41d4-a716-446655440000');

        // Map unsubscribed contacts to unsubscribes
        enrichedData = data.map(unsub => ({
          ...unsub,
          contact: unsubscribedContacts?.find(c => c.email === unsub.email) || { 
            id: '', 
            email: unsub.email, 
            first_name: '', 
            last_name: '', 
            tags: [] 
          }
        }));
      }

      setUnsubscribedUsers(enrichedData);
      console.log(`✅ Found ${enrichedData.length} unsubscribed users`);
      return;

      // If no data, it might be due to RLS. Let's try bypassing with service role
      if (!data || data.length === 0) {
        console.log('⚠️ No data found - might be RLS policy issue');
        console.log('💡 You may need to:');
        console.log('1. Update RLS policy to allow reading unsubscribes');
        console.log('2. Or ensure user_id matches when creating unsubscribe records');
        
        // For now, let's try with user context
        const { data: userData, error: userError } = await supabase
          .from('unsubscribes')
          .select('*')
          .eq('user_id', user?.id);
        
        console.log('📊 User-specific query:', { data: userData, error: userError });
        
        // Get contact details for user-specific data
        let enrichedUserData = userData;
        if (userData && userData.length > 0) {
          const emails = userData.map(u => u.email);
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id, email, first_name, last_name, tags')
            .in('email', emails);

          enrichedUserData = userData.map(unsub => ({
            ...unsub,
            contact: contacts?.find(c => c.email === unsub.email) || null
          }));
        }
        
        setUnsubscribedUsers(enrichedUserData || []);
        console.log(`✅ Found ${enrichedUserData?.length || 0} unsubscribed users for current user`);
        return;
      }
    } catch (error: any) {
      console.error('❌ Error loading unsubscribe data:', error);
      toast.error("Failed to load unsubscribe data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = unsubscribedUsers.filter(user => {
    // Search filter
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contact?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contact?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Reason filter
    const matchesReason = filterReason === "all" || 
      (filterReason === "no-reason" && !user.reason) ||
      user.reason?.toLowerCase().includes(filterReason.toLowerCase());

    // Date filter
    const userDate = new Date(user.unsubscribed_at || user.created_at || '');
    const now = new Date();
    const matchesDate = filterDateRange === "all" ||
      (filterDateRange === "7d" && userDate > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
      (filterDateRange === "30d" && userDate > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) ||
      (filterDateRange === "90d" && userDate > new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));

    // Tags filter
    const matchesTags = !filterByTags || 
      user.contact?.tags?.some(tag => 
        tag.toLowerCase().includes(filterByTags.toLowerCase())
      );

    return matchesSearch && matchesReason && matchesDate && matchesTags;
  });

  const handleRemoveFromList = async (id: string) => {
    try {
      const { error } = await supabase
        .from('unsubscribes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUnsubscribedUsers(users => users.filter(user => user.id !== id));
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast.success("User removed from unsubscribe list");
    } catch (error: any) {
      toast.error("Failed to remove user: " + error.message);
      console.error('Error removing user:', error);
    }
  };

  const handleRestoreUser = async (user: UnsubscribedUser) => {
    try {
      // Use the new handle_restore_contact function
      const { error } = await supabase.rpc('handle_restore_contact', {
        p_email: user.email,
        p_user_id: '550e8400-e29b-41d4-a716-446655440000'
      });

      if (error) throw error;

      setUnsubscribedUsers(users => users.filter(u => u.id !== user.id));
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
      toast.success(`${user.email} has been restored to active subscribers`);
    } catch (error: any) {
      toast.error("Failed to restore user: " + error.message);
      console.error('Error restoring user:', error);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select users to restore");
      return;
    }

    try {
      const usersToRestore = unsubscribedUsers.filter(user => selectedUsers.has(user.id));
      
      // Use the new handle_restore_contact function for each user
      const promises = usersToRestore.map(user => 
        supabase.rpc('handle_restore_contact', {
          p_email: user.email,
          p_user_id: '550e8400-e29b-41d4-a716-446655440000'
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        console.error('❌ Errors restoring contacts:', errors);
        toast.error(`Failed to restore ${errors.length} users`);
      } else {
        toast.success(`${usersToRestore.length} users restored successfully`);
      }

      setUnsubscribedUsers(users => users.filter(user => !selectedUsers.has(user.id)));
      setSelectedUsers(new Set());
    } catch (error: any) {
      toast.error("Failed to restore users: " + error.message);
      console.error('Error in bulk restore:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const handleExportList = () => {
    const csvContent = [
      "Email,First Name,Last Name,Tags,Unsubscribed At,Reason",
      ...filteredUsers.map(user => 
        `${user.email},${user.contact?.first_name || 'N/A'},${user.contact?.last_name || 'N/A'},"${user.contact?.tags?.join(';') || 'N/A'}",${user.unsubscribed_at},${user.reason || 'N/A'}`
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
    if (!dateString) return 'Unknown';
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
                  {unsubscribedUsers.filter(u => {
                    const date = u.unsubscribed_at || u.created_at;
                    return date && new Date(date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  }).length}
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
              <span>Unsubscribed Users ({filteredUsers.length})</span>
            </span>
            <div className="flex items-center space-x-2">
              {selectedUsers.size > 0 && (
                <Button 
                  onClick={handleBulkRestore}
                  variant="outline"
                  className="border-green-500 hover:bg-green-500 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore ({selectedUsers.size})
                </Button>
              )}
              <Button 
                onClick={handleExportList}
                variant="outline"
                className="border-email-secondary hover:bg-email-secondary"
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
            </div>
          </CardTitle>
          <CardDescription>
            Manage users who have unsubscribed from your email campaigns. Use filters to find specific users and restore them if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-email-primary/30 focus:border-email-primary"
                />
              </div>
              
              <Select value={filterReason} onValueChange={setFilterReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reasons</SelectItem>
                  <SelectItem value="no-reason">No reason given</SelectItem>
                  <SelectItem value="email">Email link</SelectItem>
                  <SelectItem value="manual">Manual unsubscribe</SelectItem>
                  <SelectItem value="spam">Marked as spam</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Filter by tags..."
                value={filterByTags}
                onChange={(e) => setFilterByTags(e.target.value)}
                className="border-email-primary/30 focus:border-email-primary"
              />

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {filteredUsers.length} results
                </span>
              </div>
            </div>

            {/* Select All Checkbox */}
            {filteredUsers.length > 0 && (
              <div className="flex items-center space-x-2 p-2 border rounded">
                <Checkbox
                  checked={selectedUsers.size === filteredUsers.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm">
                  Select all ({filteredUsers.length} users)
                </span>
              </div>
            )}

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
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <span className="font-medium">{user.email}</span>
                                <Badge variant="outline" className="border-destructive text-destructive">
                                  Unsubscribed
                                </Badge>
                              </div>
                              
                              {/* Contact Details */}
                              {user.contact && (
                                <div className="text-sm text-muted-foreground">
                                  <p className="font-medium">
                                    {user.contact.first_name} {user.contact.last_name}
                                  </p>
                                </div>
                              )}

                              {/* Tags */}
                              {user.contact?.tags && user.contact.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {user.contact.tags.map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <div className="text-sm text-muted-foreground space-y-1">
                                <p className="flex items-center space-x-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>Unsubscribed: {formatDate(user.unsubscribed_at || user.created_at || '')}</span>
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
                                onClick={() => handleRestoreUser(user)}
                                className="border-green-500 hover:bg-green-500 hover:text-white"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Restore
                              </Button>
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