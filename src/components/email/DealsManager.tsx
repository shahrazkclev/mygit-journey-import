import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Percent, Edit, Trash2, ExternalLink, Image } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Deal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  original_price: number | null;
  discounted_price: number | null;
  buy_link: string | null;
  ad_image_url: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DealsManager: React.FC = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [newDeal, setNewDeal] = useState({
    title: '',
    description: '',
    discount_percent: '',
    original_price: '',
    discounted_price: '',
    buy_link: '',
    ad_image_url: '',
    expires_at: ''
  });
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
      toast.error('Failed to load deals');
    }
  };

  const addDeal = async () => {
    if (!newDeal.title) {
      toast.error('Deal title is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deals')
        .insert([{
          user_id: user?.id,
          title: newDeal.title,
          description: newDeal.description || null,
          discount_percent: newDeal.discount_percent ? parseInt(newDeal.discount_percent) : null,
          original_price: newDeal.original_price ? parseFloat(newDeal.original_price) : null,
          discounted_price: newDeal.discounted_price ? parseFloat(newDeal.discounted_price) : null,
          buy_link: newDeal.buy_link || null,
          ad_image_url: newDeal.ad_image_url || null,
          expires_at: newDeal.expires_at || null
        }])
        .select()
        .single();

      if (error) throw error;

      setDeals(prev => [data, ...prev]);
      setNewDeal({
        title: '',
        description: '',
        discount_percent: '',
        original_price: '',
        discounted_price: '',
        buy_link: '',
        ad_image_url: '',
        expires_at: ''
      });
      setShowAddDeal(false);
      toast.success('Deal added successfully');
    } catch (error) {
      console.error('Error adding deal:', error);
      toast.error('Failed to add deal');
    }
  };

  const updateDeal = async () => {
    if (!editingDeal || !editingDeal.title) {
      toast.error('Deal title is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deals')
        .update({
          title: editingDeal.title,
          description: editingDeal.description || null,
          discount_percent: editingDeal.discount_percent,
          original_price: editingDeal.original_price,
          discounted_price: editingDeal.discounted_price,
          buy_link: editingDeal.buy_link || null,
          ad_image_url: editingDeal.ad_image_url || null,
          is_active: editingDeal.is_active,
          expires_at: editingDeal.expires_at || null
        })
        .eq('id', editingDeal.id)
        .select()
        .single();

      if (error) throw error;

      setDeals(prev => prev.map(d => d.id === editingDeal.id ? data : d));
      setEditingDeal(null);
      toast.success('Deal updated successfully');
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error('Failed to update deal');
    }
  };

  const deleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;

      setDeals(prev => prev.filter(d => d.id !== dealId));
      toast.success('Deal deleted successfully');
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Failed to delete deal');
    }
  };

  const toggleDealStatus = async (deal: Deal) => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .update({ is_active: !deal.is_active })
        .eq('id', deal.id)
        .select()
        .single();

      if (error) throw error;

      setDeals(prev => prev.map(d => d.id === deal.id ? data : d));
      toast.success(`Deal ${deal.is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error toggling deal status:', error);
      toast.error('Failed to update deal status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-email-primary">Deals Management</h2>
        <Dialog open={showAddDeal} onOpenChange={setShowAddDeal}>
          <DialogTrigger asChild>
            <Button className="bg-email-primary hover:bg-email-primary/80">
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="50% Off Premium Package"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDeal.description}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Deal description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_percent">Discount %</Label>
                  <Input
                    id="discount_percent"
                    type="number"
                    value={newDeal.discount_percent}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, discount_percent: e.target.value }))}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="original_price">Original Price</Label>
                  <Input
                    id="original_price"
                    type="number"
                    step="0.01"
                    value={newDeal.original_price}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, original_price: e.target.value }))}
                    placeholder="99.99"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discounted_price">Discounted Price</Label>
                  <Input
                    id="discounted_price"
                    type="number"
                    step="0.01"
                    value={newDeal.discounted_price}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, discounted_price: e.target.value }))}
                    placeholder="49.99"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expires At</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={newDeal.expires_at}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, expires_at: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buy_link" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Buy Link
                </Label>
                <Input
                  id="buy_link"
                  value={newDeal.buy_link}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, buy_link: e.target.value }))}
                  placeholder="https://example.com/buy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad_image_url" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Ad Image URL
                </Label>
                <Input
                  id="ad_image_url"
                  value={newDeal.ad_image_url}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, ad_image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddDeal(false)}>
                  Cancel
                </Button>
                <Button onClick={addDeal}>
                  Add Deal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-xl shadow-email-primary/10 bg-gradient-to-br from-email-background via-white to-email-muted/20 border border-email-primary/20">
        <CardHeader className="bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 border-b border-email-primary/20">
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-email-primary to-email-accent rounded-lg shadow-sm">
              <Percent className="h-5 w-5 text-white" />
            </div>
            <span className="text-email-secondary font-semibold">Deals ({deals.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {deals.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No deals found. Add your first deal above.
              </p>
            ) : (
              deals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-email-muted/20 transition-colors border-email-primary/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-email-accent/20 rounded-full flex items-center justify-center">
                      <Percent className="h-5 w-5 text-email-accent" />
                    </div>
                    <div>
                      <div className="font-medium text-email-primary flex items-center gap-2">
                        {deal.title}
                        <span className={`px-2 py-1 text-xs rounded-full ${deal.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {deal.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {deal.discount_percent && `${deal.discount_percent}% off • `}
                        {deal.original_price && `$${deal.original_price} → `}
                        {deal.discounted_price && `$${deal.discounted_price} • `}
                        {deal.expires_at && `Expires: ${new Date(deal.expires_at).toLocaleDateString()}`}
                      </div>
                      {deal.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {deal.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDealStatus(deal)}
                      className={deal.is_active ? "border-red-500 text-red-500 hover:bg-red-50" : "border-green-500 text-green-500 hover:bg-green-50"}
                    >
                      {deal.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingDeal(deal)}
                      className="border-email-secondary text-email-secondary hover:bg-email-secondary/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDeal(deal.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Deal Dialog */}
      <Dialog open={editingDeal !== null} onOpenChange={() => setEditingDeal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          {editingDeal && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Deal Title *</Label>
                <Input
                  id="edit-title"
                  value={editingDeal.title}
                  onChange={(e) => setEditingDeal(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="50% Off Premium Package"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingDeal.description || ''}
                  onChange={(e) => setEditingDeal(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Deal description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-discount_percent">Discount %</Label>
                  <Input
                    id="edit-discount_percent"
                    type="number"
                    value={editingDeal.discount_percent || ''}
                    onChange={(e) => setEditingDeal(prev => prev ? { ...prev, discount_percent: parseInt(e.target.value) || null } : null)}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-original_price">Original Price</Label>
                  <Input
                    id="edit-original_price"
                    type="number"
                    step="0.01"
                    value={editingDeal.original_price || ''}
                    onChange={(e) => setEditingDeal(prev => prev ? { ...prev, original_price: parseFloat(e.target.value) || null } : null)}
                    placeholder="99.99"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-discounted_price">Discounted Price</Label>
                  <Input
                    id="edit-discounted_price"
                    type="number"
                    step="0.01"
                    value={editingDeal.discounted_price || ''}
                    onChange={(e) => setEditingDeal(prev => prev ? { ...prev, discounted_price: parseFloat(e.target.value) || null } : null)}
                    placeholder="49.99"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expires_at">Expires At</Label>
                  <Input
                    id="edit-expires_at"
                    type="datetime-local"
                    value={editingDeal.expires_at ? new Date(editingDeal.expires_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditingDeal(prev => prev ? { ...prev, expires_at: e.target.value || null } : null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-buy_link" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Buy Link
                </Label>
                <Input
                  id="edit-buy_link"
                  value={editingDeal.buy_link || ''}
                  onChange={(e) => setEditingDeal(prev => prev ? { ...prev, buy_link: e.target.value } : null)}
                  placeholder="https://example.com/buy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ad_image_url" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Ad Image URL
                </Label>
                <Input
                  id="edit-ad_image_url"
                  value={editingDeal.ad_image_url || ''}
                  onChange={(e) => setEditingDeal(prev => prev ? { ...prev, ad_image_url: e.target.value } : null)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingDeal(null)}>
                  Cancel
                </Button>
                <Button onClick={updateDeal}>
                  Update Deal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
