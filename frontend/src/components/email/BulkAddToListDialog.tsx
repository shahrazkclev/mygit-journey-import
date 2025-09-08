import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailList {
  id: string;
  name: string;
  description?: string;
}

interface BulkAddToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContactIds: string[];
  emailLists: EmailList[];
  onSuccess: () => void;
}

export const BulkAddToListDialog = ({ open, onOpenChange, selectedContactIds, emailLists, onSuccess }: BulkAddToListDialogProps) => {
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkAdd = async () => {
    if (!selectedListId || selectedContactIds.length === 0) {
      toast.error("Please select a list and contacts");
      return;
    }

    setIsLoading(true);
    try {
      // Check which contacts are already in the list
      const { data: existingData } = await supabase
        .from('contact_lists')
        .select('contact_id')
        .eq('list_id', selectedListId)
        .in('contact_id', selectedContactIds);

      const existingContactIds = existingData?.map(item => item.contact_id) || [];
      const newContactIds = selectedContactIds.filter(id => !existingContactIds.includes(id));

      if (newContactIds.length === 0) {
        toast.error("All selected contacts are already in this list");
        return;
      }

      const insertData = newContactIds.map(contactId => ({
        contact_id: contactId,
        list_id: selectedListId
      }));

      const { error } = await supabase
        .from('contact_lists')
        .insert(insertData);

      if (error) throw error;

      toast.success(`Added ${newContactIds.length} contact(s) to the list`);
      onSuccess();
      onOpenChange(false);
      setSelectedListId("");
    } catch (error) {
      console.error('Error adding contacts to list:', error);
      toast.error("Failed to add contacts to list");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contacts to List</DialogTitle>
          <DialogDescription>
            Add {selectedContactIds.length} selected contact(s) to an email list
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Email List</label>
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a list..." />
              </SelectTrigger>
              <SelectContent>
                {emailLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleBulkAdd} disabled={isLoading || !selectedListId}>
            {isLoading ? "Adding..." : `Add to List`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};