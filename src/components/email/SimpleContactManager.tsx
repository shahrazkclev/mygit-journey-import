import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/ui/tag-input";
import { Trash2, Plus, Tag, Users, Link, ChevronDown, ChevronRight, Edit, Upload, FileSpreadsheet, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EditContactDialog } from "./EditContactDialog";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  created_at: string;
}

// Match DB schema for contacts
interface DbContact {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  tags: string[] | null;
}

export const SimpleContactManager = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreContacts, setHasMoreContacts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalContacts, setTotalContacts] = useState(0);
  const CONTACTS_PER_PAGE = 50;
  const [isMakeIntegrationOpen, setIsMakeIntegrationOpen] = useState(false);
  
  // Bulk operations state
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false);
  const [showBulkListDialog, setShowBulkListDialog] = useState(false);
  const [bulkTags, setBulkTags] = useState('');
  const [bulkTagsToRemove, setBulkTagsToRemove] = useState('');
  const [emailLists, setEmailLists] = useState<any[]>([]);
  const [selectedBulkLists, setSelectedBulkLists] = useState<string[]>([]);
  const [selectedBulkListsToRemove, setSelectedBulkListsToRemove] = useState<string[]>([]);
  const [bulkTagOperation, setBulkTagOperation] = useState<'add' | 'remove'>('add');
  const [bulkListOperation, setBulkListOperation] = useState<'add' | 'remove'>('add');

  // Edit contact state
  const [showEditContactDialog, setShowEditContactDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Contact lists tracking
  const [contactLists, setContactLists] = useState<Record<string, any[]>>({});

  // Add contact form state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    tags: ""
  });

  // CSV import state
  const [showCsvImportDialog, setShowCsvImportDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvMapping, setCsvMapping] = useState({
    email: 0,
    name: 1,
    phone: 2,
    tags: 3
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Make.com webhook URL
  const [webhookUrl] = useState(() => 
    `https://mixifcnokcmxarpzwfiy.supabase.co/functions/v1/sync-contacts`
  );

  useEffect(() => {
    if (user?.id) {
      loadContacts();
      loadEmailLists();
      loadContactLists();
      loadAllTags();
    }
  }, [user?.id]);

  // Listen for contact updates from other components
  useEffect(() => {
    const handleContactsUpdated = () => {
      console.log('🔄 Reloading contacts due to external update...');
      loadContacts();
    };

    window.addEventListener('contactsUpdated', handleContactsUpdated);
    return () => window.removeEventListener('contactsUpdated', handleContactsUpdated);
  }, []);

  useEffect(() => {
    debouncedSearch(searchTerm, tagFilter);
  }, [searchTerm, tagFilter, debouncedSearch]);

  // Generate name from email if no name provided
  const generateNameFromEmail = (email: string): string => {
    const localPart = email.split('@')[0];
    // Convert dots, dashes, underscores to spaces and capitalize
    return localPart
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  };

  const loadContacts = async (page: number = 1, reset: boolean = true) => {
    try {
      if (reset) {
        setIsLoading(true);
        setCurrentPage(1);
      } else {
        setIsLoadingMore(true);
      }

      console.log(`🔄 Loading contacts page ${page}...`);

      const from = (page - 1) * CONTACTS_PER_PAGE;
      const to = from + CONTACTS_PER_PAGE - 1;

      // Get total count first
      const { count: totalCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('status', 'subscribed');

      setTotalContacts(totalCount || 0);

      // Load contacts with pagination
      const { data, error } = await supabase
        .from('contacts')
        .select('id, user_id, created_at, updated_at, email, first_name, last_name, status, tags')
        .eq('user_id', user?.id)
        .eq('status', 'subscribed')
        .order('created_at', { ascending: false })
        .range(from, to);

      console.log('📊 Contacts query result:', { data, error, count: data?.length, total: totalCount });

      if (error) {
        console.error('Error loading contacts:', error);
        toast.error("Failed to load contacts");
        return;
      }

      const dbContacts: DbContact[] = data || [];
      // Map DB rows to UI shape
      const uiContacts: Contact[] = dbContacts.map(c => {
        let name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
        // If no name, generate from email
        if (!name && c.email) {
          name = generateNameFromEmail(c.email);
        }
        
        return {
          id: c.id,
          name: name || 'Unknown',
          email: c.email,
          phone: "", // No phone column in DB; keep UI consistent
          tags: c.tags ?? [],
          created_at: c.created_at,
        };
      });

      const filteredUiContacts = uiContacts.filter(c => !(c.tags || []).some(t => (t || '').trim().toLowerCase() === 'unsub'));
      
      if (reset) {
        setContacts(filteredUiContacts);
      } else {
        setContacts(prev => [...prev, ...filteredUiContacts]);
      }
      
      setHasMoreContacts(filteredUiContacts.length === CONTACTS_PER_PAGE);
      setCurrentPage(page);
      
      console.log(`✅ Loaded ${filteredUiContacts.length} contacts for page ${page}`);
      
      // Load all tags separately for filter suggestions
      if (reset) {
        await loadAllTags();
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadAllTags = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('tags')
        .eq('user_id', user?.id)
        .eq('status', 'subscribed');

      if (error) {
        console.error('Error loading tags:', error);
        return;
      }

      const tags = new Set<string>();
      data?.forEach(contact => {
        contact.tags?.forEach((tag: string) => {
          if (tag && tag.trim()) {
            tags.add(tag.trim());
          }
        });
      });
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadMoreContacts = () => {
    if (!isLoadingMore && hasMoreContacts) {
      loadContacts(currentPage + 1, false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchQuery: string, tagQuery: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (searchQuery.trim() || tagQuery.trim()) {
            searchContacts(searchQuery, tagQuery);
          } else {
            loadContacts(1, true); // Reset to first page if no search
          }
        }, 300); // 300ms delay
      };
    })(),
    []
  );

  const loadEmailLists = async () => {
    try {
      const { data, error } = await supabase
        .from('email_lists')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading email lists:', error);
        return;
      }

      setEmailLists(data || []);
    } catch (error) {
      console.error('Error loading email lists:', error);
    }
  };

  const loadContactLists = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select(`
          contact_id,
          email_lists!inner(id, name, list_type)
        `);

      if (error) {
        console.error('Error loading contact lists:', error);
        return;
      }

      // Group lists by contact ID
      const contactListsMap: Record<string, any[]> = {};
      data?.forEach((item: any) => {
        if (!contactListsMap[item.contact_id]) {
          contactListsMap[item.contact_id] = [];
        }
        contactListsMap[item.contact_id].push(item.email_lists);
      });

      setContactLists(contactListsMap);
    } catch (error) {
      console.error('Error loading contact lists:', error);
    }
  };


  const searchContacts = async (searchQuery: string = searchTerm, tagQuery: string = tagFilter) => {
    try {
      setIsLoading(true);
      console.log(`🔍 Searching contacts: "${searchQuery}", tag: "${tagQuery}"`);

      let query = supabase
        .from('contacts')
        .select('id, user_id, created_at, updated_at, email, first_name, last_name, status, tags')
        .eq('user_id', user?.id)
        .eq('status', 'subscribed')
        .order('created_at', { ascending: false })
        .limit(100); // Limit search results to 100

      // Add search filters
      if (searchQuery.trim()) {
        query = query.or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
      }

      if (tagQuery.trim()) {
        const filterTags = tagQuery.split(',').map(tag => tag.trim()).filter(Boolean);
        query = query.contains('tags', filterTags);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching contacts:', error);
        toast.error("Failed to search contacts");
        return;
      }

      const dbContacts: DbContact[] = data || [];
      const uiContacts: Contact[] = dbContacts.map(c => {
        let name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
        if (!name && c.email) {
          name = generateNameFromEmail(c.email);
        }
        
        return {
          id: c.id,
          name: name || 'Unknown',
          email: c.email,
          phone: "",
          tags: c.tags ?? [],
          created_at: c.created_at,
        };
      });

      const filteredUiContacts = uiContacts.filter(c => !(c.tags || []).some(t => (t || '').trim().toLowerCase() === 'unsub'));
      setContacts(filteredUiContacts);
      setFilteredContacts(filteredUiContacts);
      setHasMoreContacts(false); // Disable pagination for search results
      
      console.log(`✅ Found ${filteredUiContacts.length} contacts matching search`);
    } catch (error) {
      console.error('Error searching contacts:', error);
      toast.error("Failed to search contacts");
    } finally {
      setIsLoading(false);
    }
  };

  const filterContacts = () => {
    // If we have search terms, use dynamic search
    if (searchTerm.trim() || tagFilter.trim()) {
      searchContacts();
      return;
    }

    // Otherwise, use local filtering for loaded contacts
    let filtered = contacts;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(contact => {
        // Check name fields
        const firstNameMatch = contact.name?.toLowerCase().includes(searchLower);
        const nameMatch = contact.name?.toLowerCase().includes(searchLower);
        const emailMatch = contact.email?.toLowerCase().includes(searchLower);
        const phoneMatch = contact.phone?.includes(searchTerm);
        
        // Check tags with better matching
        const tagMatch = contact.tags?.some(tag => {
          const tagLower = tag.toLowerCase();
          return tagLower.includes(searchLower) || 
                 tagLower.split(' ').some(word => word.startsWith(searchLower)) ||
                 tagLower.split(':').some(part => part.trim().startsWith(searchLower));
        });
        
        return firstNameMatch || nameMatch || emailMatch || phoneMatch || tagMatch;
      });
    }

    if (tagFilter) {
      // Parse comma-separated tags from TagInput
      const filterTags = tagFilter.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
      
      filtered = filtered.filter(contact =>
        contact.tags?.some(contactTag => 
          filterTags.some(filterTag => 
            contactTag.toLowerCase().includes(filterTag)
          )
        )
      );
    }

    setFilteredContacts(filtered);
  };

  const handleAddContact = async () => {
    if (!newContact.email) {
      toast.error("Email is required");
      return;
    }

    setIsLoading(true);
    try {
      const newTags = newContact.tags
        .split(',')
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => tag.length > 0);

      // Split name into first_name and last_name, or generate from email if no name
      let firstName = '';
      let lastName = '';
      
      if (newContact.name.trim()) {
        const nameTrimmed = newContact.name.trim();
        const [first, ...rest] = nameTrimmed.split(/\s+/);
        firstName = first;
        lastName = rest.join(" ");
      } else {
        // Generate name from email if no name provided
        const generatedName = generateNameFromEmail(newContact.email);
        const [first, ...rest] = generatedName.split(/\s+/);
        firstName = first;
        lastName = rest.join(" ");
      }

      // Check if contact already exists
      const { data: existingContact, error: selectError } = await supabase
        .from('contacts')
        .select('id, tags, first_name, last_name')
        .eq('user_id', user?.id)
        .eq('email', newContact.email)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing contact:', selectError);
        toast.error("Failed to check existing contact");
        return;
      }

      if (existingContact) {
        // Contact exists - merge tags and update
        const existingTags = existingContact.tags || [];
        const mergedTags = [...new Set([...existingTags, ...newTags])]; // Remove duplicates
        
        // Update name if it was empty or if new name is provided
        const updatedFirstName = existingContact.first_name || firstName;
        const updatedLastName = existingContact.last_name || lastName;

        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            first_name: updatedFirstName || null,
            last_name: updatedLastName || null,
            tags: mergedTags.length ? mergedTags : null,
            status: 'subscribed' // Ensure they're subscribed if re-adding
          })
          .eq('id', existingContact.id);

        if (updateError) {
          console.error('Error updating existing contact:', updateError);
          toast.error("Failed to update existing contact");
          return;
        }

        toast.success(`Contact updated! Added ${newTags.length} new tag(s) to existing contact.`);
      } else {
        // Contact doesn't exist - create new one
        const { error: insertError } = await supabase
          .from('contacts')
          .insert({
            user_id: user?.id,
            email: newContact.email,
            first_name: firstName || null,
            last_name: lastName || null,
            status: 'subscribed',
            tags: newTags.length ? newTags : null
          });

        if (insertError) {
          console.error('Error adding new contact:', insertError);
          toast.error("Failed to add new contact");
          return;
        }

        toast.success("New contact added successfully!");
      }

      setNewContact({ name: "", email: "", phone: "", tags: "" });
      setIsAddDialogOpen(false);
      loadContacts();
    } catch (error) {
      console.error('Error handling contact:', error);
      toast.error("Failed to process contact");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        console.error('Error deleting contact:', error);
        toast.error("Failed to delete contact");
        return;
      }

      toast.success("Contact deleted successfully!");
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error("Failed to delete contact");
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard!");
  };

  const handleSelectContact = (contactId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (isSelected) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    } else {
      setSelectedContacts(new Set());
    }
  };

  // CSV Import Functions
  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's a CSV file by extension or MIME type
      const isCsv = file.name.toLowerCase().endsWith('.csv') || 
                   file.type === 'text/csv' || 
                   file.type === 'application/csv' ||
                   file.type === 'text/plain';
      
      if (isCsv) {
        setCsvFile(file);
        previewCsv(file);
      } else {
        toast.error('Please select a valid CSV file');
      }
    }
  };

  const previewCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const preview = lines.slice(0, 6).map(line => 
        line.split(',').map(cell => cell.replace(/"/g, '').trim())
      );
      setCsvPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsImporting(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header row if exists
        const dataLines = lines.slice(1);
        // First, fetch all existing contacts in one query to avoid individual lookups
        const { data: existingContacts, error: fetchError } = await supabase
          .from('contacts')
          .select('id, email, tags, first_name, last_name')
          .eq('user_id', user?.id);

        if (fetchError) {
          console.error('Error fetching existing contacts:', fetchError);
          toast.error('Failed to fetch existing contacts');
          setIsImporting(false);
          return;
        }

        // Create a map for quick lookup
        const existingContactsMap = new Map();
        existingContacts?.forEach(contact => {
          existingContactsMap.set(contact.email.toLowerCase(), contact);
        });
        
        console.log(`📋 Found ${existingContacts?.length || 0} existing contacts for lookup`);

        let successCount = 0;
        let failureCount = 0;
        const contactsToInsert = [];
        const contactsToUpdate = [];
        
        // Set total count for progress tracking
        setImportProgress({ current: 0, total: dataLines.length });

        for (let i = 0; i < dataLines.length; i++) {
          const line = dataLines[i];
          
          // Update progress
          setImportProgress({ current: i + 1, total: dataLines.length });
          try {
            const cells = line.split(',').map(cell => cell.replace(/"/g, '').trim());
            
            const email = cells[csvMapping.email] || '';
            let name = cells[csvMapping.name] || '';
            const phone = cells[csvMapping.phone] || '';
            const tagsString = cells[csvMapping.tags] || '';

            if (!email) {
              failureCount++;
              continue;
            }

            // Generate name from email if no name provided
            if (!name) {
              name = generateNameFromEmail(email);
            }

            const tags = tagsString
              .split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0);

            // Split name into first_name and last_name
            const [firstName, ...rest] = name.split(/\s+/);
            const lastName = rest.join(" ");

            // Check if contact already exists using our map
            const existingContact = existingContactsMap.get(email.toLowerCase());
            console.log(`🔍 Checking for existing contact: ${email} -> ${existingContact ? 'FOUND' : 'NOT FOUND'}`);

            if (existingContact) {
              // Contact exists - prepare for update (always update, even if same data)
              const existingTags = existingContact.tags || [];
              const newTags = [...new Set([...existingTags, ...tags])]; // Remove duplicates
              
              console.log(`🔄 Updating existing contact ${email}:`, {
                existingTags,
                newTagsFromCSV: tags,
                mergedTags: newTags,
                willUpdate: true // Always update, even if data is the same
              });
              
              contactsToUpdate.push({
                id: existingContact.id,
                first_name: firstName || existingContact.first_name || null,
                last_name: lastName || existingContact.last_name || null,
                tags: newTags.length ? newTags : null
              });
            } else {
              // Contact doesn't exist - prepare for insert
              contactsToInsert.push({
                user_id: user?.id,
                email: email,
                first_name: firstName || null,
                last_name: lastName || null,
                tags: tags.length ? tags : null
              });
            }
          } catch (error) {
            console.error('Error processing line:', error);
            failureCount++;
          }
        }

        // Batch insert new contacts
        if (contactsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('contacts')
            .insert(contactsToInsert);

          if (insertError) {
            console.error('Error inserting contacts:', insertError);
            failureCount += contactsToInsert.length;
          } else {
            successCount += contactsToInsert.length;
          }
        }

        // Batch update existing contacts
        for (const contactUpdate of contactsToUpdate) {
          console.log(`📝 Updating contact ${contactUpdate.id} with tags:`, contactUpdate.tags);
          
          const { error: updateError } = await supabase
            .from('contacts')
            .update({
              first_name: contactUpdate.first_name,
              last_name: contactUpdate.last_name,
              tags: contactUpdate.tags
            })
            .eq('id', contactUpdate.id);

          if (updateError) {
            console.error('❌ Error updating contact:', updateError);
            failureCount++;
          } else {
            console.log(`✅ Successfully updated contact ${contactUpdate.id}`);
            successCount++;
          }
        }

        // Show detailed success message
        const totalProcessed = contactsToInsert.length + contactsToUpdate.length;
        if (totalProcessed > 0) {
          const insertCount = contactsToInsert.length;
          const updateCount = contactsToUpdate.length;
          toast.success(`✅ Import completed! ${insertCount} new contacts added, ${updateCount} existing contacts updated${failureCount > 0 ? `, ${failureCount} failed` : ''}`);
        } else {
          toast.error(`❌ Import failed! ${failureCount} contacts failed to import`);
        }
        
        // Close dialog and reset state
        setShowCsvImportDialog(false);
        setCsvFile(null);
        setCsvPreview([]);
        setImportProgress({ current: 0, total: 0 });
        
        // Reload contacts to show updated data
        await loadContacts();
      };

      reader.readAsText(csvFile);
    } catch (error) {
      console.error('Error reading CSV file:', error);
      toast.error('Failed to read CSV file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkAddTags = async () => {
    if (selectedContacts.size === 0) {
      toast.error("Please select contacts");
      return;
    }

    if (bulkTagOperation === 'add' && !bulkTags.trim()) {
      toast.error("Please enter tags to add");
      return;
    }

    if (bulkTagOperation === 'remove' && !bulkTagsToRemove.trim()) {
      toast.error("Please enter tags to remove");
      return;
    }

    try {
      if (bulkTagOperation === 'add') {
        const tagsToAdd = bulkTags.split(',').map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0);
        
        for (const contactId of selectedContacts) {
          const contact = contacts.find(c => c.id === contactId);
          if (contact) {
            const existingTags = contact.tags || [];
            const newTags = [...new Set([...existingTags, ...tagsToAdd])];
            
            const { error } = await supabase
              .from('contacts')
              .update({ tags: newTags })
              .eq('id', contactId);

            if (error) throw error;
          }
        }
        toast.success(`Added tags to ${selectedContacts.size} contacts`);
      } else {
        const tagsToRemove = bulkTagsToRemove.split(',').map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0);
        
        for (const contactId of selectedContacts) {
          const contact = contacts.find(c => c.id === contactId);
          if (contact) {
            const existingTags = contact.tags || [];
            const newTags = existingTags.filter(tag => !tagsToRemove.includes(tag));
            
            const { error } = await supabase
              .from('contacts')
              .update({ tags: newTags })
              .eq('id', contactId);

            if (error) throw error;
          }
        }
        toast.success(`Removed tags from ${selectedContacts.size} contacts`);
      }

      setBulkTags('');
      setBulkTagsToRemove('');
      setSelectedContacts(new Set());
      setShowBulkTagDialog(false);
      loadContacts();
    } catch (error) {
      console.error('Error managing bulk tags:', error);
      toast.error("Failed to manage tags");
    }
  };

  const handleBulkAddToLists = async () => {
    if (selectedContacts.size === 0) {
      toast.error("Please select contacts");
      return;
    }

    const listsToProcess = bulkListOperation === 'add' ? selectedBulkLists : selectedBulkListsToRemove;
    
    if (listsToProcess.length === 0) {
      toast.error(`Please select lists to ${bulkListOperation}`);
      return;
    }

    try {
      if (bulkListOperation === 'add') {
        const memberships = [];
        for (const contactId of selectedContacts) {
          for (const listId of selectedBulkLists) {
            memberships.push({
              contact_id: contactId,
              list_id: listId
            });
          }
        }

        const { error } = await supabase
          .from('contact_lists')
          .upsert(memberships, { onConflict: 'contact_id,list_id' });

        if (error) throw error;
        toast.success(`Added ${selectedContacts.size} contacts to ${selectedBulkLists.length} lists`);
      } else {
        // Remove from lists
        for (const contactId of selectedContacts) {
          for (const listId of selectedBulkListsToRemove) {
            const { error } = await supabase
              .from('contact_lists')
              .delete()
              .eq('contact_id', contactId)
              .eq('list_id', listId);

            if (error) throw error;
          }
        }
        toast.success(`Removed ${selectedContacts.size} contacts from ${selectedBulkListsToRemove.length} lists`);
      }

      setSelectedBulkLists([]);
      setSelectedBulkListsToRemove([]);
      setSelectedContacts(new Set());
      setShowBulkListDialog(false);
      loadContactLists(); // Reload to show updated lists
    } catch (error) {
      console.error('Error managing contacts in lists:', error);
      toast.error("Failed to manage contacts in lists");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) {
      toast.error("Please select contacts to delete");
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedContacts.size} contact(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Delete contacts from the database
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', Array.from(selectedContacts));

      if (error) {
        console.error('Error deleting contacts:', error);
        toast.error("Failed to delete contacts");
        return;
      }

      // Also remove from contact_lists if they exist
      await supabase
        .from('contact_lists')
        .delete()
        .in('contact_id', Array.from(selectedContacts));

      toast.success(`Successfully deleted ${selectedContacts.size} contact(s)`);
      setSelectedContacts(new Set());
      loadContacts();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast.error("Failed to delete contacts");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading contacts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Make.com Integration Info */}
      <Card className="shadow-soft border-email-primary/20 bg-gradient-to-br from-email-background to-background">
        <Collapsible open={isMakeIntegrationOpen} onOpenChange={setIsMakeIntegrationOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-email-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Link className="h-5 w-5 text-email-primary" />
                  <span className="text-email-primary">Make.com Integration</span>
                </div>
                {isMakeIntegrationOpen ? (
                  <ChevronDown className="h-4 w-4 text-email-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-email-primary" />
                )}
              </CardTitle>
              <CardDescription>
                Use this webhook URL in Make.com to automatically sync contacts from Google Sheets
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="border-email-primary/30"
                />
                <Button
                  onClick={copyWebhookUrl}
                  variant="outline"
                  className="border-email-primary hover:bg-email-primary/10 text-email-primary"
                >
                  Copy
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                <p><strong>Expected JSON format:</strong></p>
                <pre className="bg-email-muted/30 p-2 rounded text-xs mt-2 border border-email-primary/10">
{`{
  "email": "customer@example.com",
  "name": "John Doe",
  "phone": "+1234567890", 
  "tags": ["customer", "premium", "lazy-motion-library"],
  "action": "create"
}`}
                </pre>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Contacts Management */}
      <Card className="shadow-xl shadow-email-primary/10 bg-gradient-to-br from-email-background via-white to-email-muted/20 border border-email-primary/20">
        <CardHeader className="bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 border-b border-email-primary/20">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-email-primary to-email-accent rounded-lg shadow-sm">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="text-email-secondary font-semibold">
                  Contacts ({filteredContacts.length} loaded, {totalContacts} total)
                </span>
                {selectedContacts.size > 0 && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-email-accent to-email-primary text-white shadow-sm">
                    {selectedContacts.size} selected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-email-secondary/80 mt-2">
                Manage your contacts with tag-based organization. Names auto-generated from emails when missing.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setTagFilter('');
                  loadContacts(1, true);
                }}
                className="border-email-primary text-email-primary hover:bg-email-primary/10"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              {selectedContacts.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkTagDialog(true)}
                    className="border-email-accent text-email-accent hover:bg-email-accent/10"
                  >
                    <Tag className="h-4 w-4 mr-1" />
                    Manage Tags
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkListDialog(true)}
                    className="border-email-secondary text-email-secondary hover:bg-email-secondary/10"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Manage Lists
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="border-red-500 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                </>
              )}
              
              {/* CSV Import Button */}
              <Dialog open={showCsvImportDialog} onOpenChange={setShowCsvImportDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-email-primary text-email-primary hover:bg-email-primary/10"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Contacts from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file with contacts. Names will be auto-generated from emails if missing.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="csv-file">Select CSV File</Label>
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvFileChange}
                        className="border-email-primary/30 focus:border-email-primary"
                      />
                    </div>

                    {csvPreview.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-email-primary">CSV Preview</h3>
                        <div className="bg-email-muted/20 rounded-lg p-3 border border-email-primary/10 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                {csvPreview[0]?.map((header, index) => (
                                  <th key={index} className="text-left p-2 border-b border-email-primary/20">
                                    Column {index + 1}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {csvPreview.slice(0, 5).map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="p-2 border-b border-email-primary/10">
                                      {cell || '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <Label>Email Column</Label>
                            <select
                              value={csvMapping.email}
                              onChange={(e) => setCsvMapping({...csvMapping, email: parseInt(e.target.value)})}
                              className="w-full p-2 border border-email-primary/30 rounded-md focus:border-email-primary"
                            >
                              {csvPreview[0]?.map((_, index) => (
                                <option key={index} value={index}>Column {index + 1}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Name Column (Optional)</Label>
                            <select
                              value={csvMapping.name}
                              onChange={(e) => setCsvMapping({...csvMapping, name: parseInt(e.target.value)})}
                              className="w-full p-2 border border-email-primary/30 rounded-md focus:border-email-primary"
                            >
                              <option value={-1}>Auto-generate from email</option>
                              {csvPreview[0]?.map((_, index) => (
                                <option key={index} value={index}>Column {index + 1}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Phone Column (Optional)</Label>
                            <select
                              value={csvMapping.phone}
                              onChange={(e) => setCsvMapping({...csvMapping, phone: parseInt(e.target.value)})}
                              className="w-full p-2 border border-email-primary/30 rounded-md focus:border-email-primary"
                            >
                              <option value={-1}>Skip</option>
                              {csvPreview[0]?.map((_, index) => (
                                <option key={index} value={index}>Column {index + 1}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Tags Column (Optional)</Label>
                            <select
                              value={csvMapping.tags}
                              onChange={(e) => setCsvMapping({...csvMapping, tags: parseInt(e.target.value)})}
                              className="w-full p-2 border border-email-primary/30 rounded-md focus:border-email-primary"
                            >
                              <option value={-1}>Skip</option>
                              {csvPreview[0]?.map((_, index) => (
                                <option key={index} value={index}>Column {index + 1}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button
                        onClick={handleCsvImport}
                        disabled={!csvFile || isImporting}
                        className="flex-1 bg-email-primary hover:bg-email-primary/90"
                      >
                        {isImporting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {importProgress.total > 0 ? (
                              `Processing ${importProgress.current}/${importProgress.total}...`
                            ) : (
                              'Importing...'
                            )}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Import Contacts
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCsvImportDialog(false)}
                        className="flex-1"
                        disabled={isImporting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-email-primary text-email-primary hover:bg-email-primary/10">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>
                      Add a new contact with tags for better organization. Name will be auto-generated from email if not provided.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name (Optional)</Label>
                      <Input
                        id="name"
                        value={newContact.name}
                        onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                        placeholder="John Doe (auto-generated from email if empty)"
                        className="border-email-primary/30 focus:border-email-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                        placeholder="john.doe@example.com"
                        className="border-email-primary/30 focus:border-email-primary"
                      />
                      {newContact.email && !newContact.name && (
                        <div className="text-xs text-muted-foreground flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          Name will be: {generateNameFromEmail(newContact.email)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                        placeholder="+1234567890"
                        className="border-email-primary/30 focus:border-email-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <TagInput
                        value={newContact.tags}
                        onChange={(value) => setNewContact({...newContact, tags: value})}
                        suggestions={allTags}
                        placeholder="customer, premium, lazy-motion-library"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleAddContact} 
                        disabled={isLoading}
                        className="flex-1 bg-email-primary hover:bg-email-primary/90"
                      >
                        {isLoading ? "Adding..." : "Add Contact"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAddDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          {/* Search and Filter Section */}
          <div className="bg-gradient-to-br from-email-background via-white to-email-muted/30 rounded-xl p-6 border border-email-primary/20 shadow-lg shadow-email-primary/10 mt-4">
            <div className="flex flex-col space-y-5">
              <div className="flex items-center space-x-2">
                <div className="w-1 h-6 bg-gradient-to-b from-email-primary to-email-accent rounded-full"></div>
                <h3 className="text-lg font-semibold text-email-primary">Search & Filter</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="search-contacts" className="text-sm font-medium text-email-secondary flex items-center space-x-2">
                    <div className="w-2 h-2 bg-email-accent rounded-full"></div>
                    <span>Search Contacts</span>
                  </Label>
                  <Input
                    id="search-contacts"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-email-primary/30 focus:border-email-primary focus:ring-2 focus:ring-email-primary/20 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="filter-tags" className="text-sm font-medium text-email-secondary flex items-center space-x-2">
                    <div className="w-2 h-2 bg-email-accent rounded-full"></div>
                    <span>Filter by Tag</span>
                  </Label>
                  <Input
                    id="filter-tags"
                    placeholder="Enter tag to filter..."
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="border-email-primary/30 focus:border-email-primary focus:ring-2 focus:ring-email-primary/20 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Clear Search Button */}
              {(searchTerm || tagFilter) && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setTagFilter('');
                      loadContacts(1, true); // Reset to first page
                    }}
                    variant="outline"
                    size="sm"
                    className="border-email-secondary text-email-secondary hover:bg-email-secondary/10"
                  >
                    Clear Search & Show All
                  </Button>
                </div>
              )}
            </div>
          </div>


          {/* Contacts List */}
          <div className="space-y-3">
            {filteredContacts.length > 0 && (
              <div className="flex items-center p-4 bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 rounded-xl border border-email-primary/20 shadow-sm">
                <input
                  type="checkbox"
                  checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-email-primary focus:ring-2 focus:ring-email-primary/20 border-email-primary/30 rounded"
                />
                <Label className="ml-3 text-sm font-semibold text-email-primary cursor-pointer">
                  Select All ({filteredContacts.length})
                </Label>
              </div>
            )}
            
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className={`group flex items-center justify-between p-5 border rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                  selectedContacts.has(contact.id) 
                    ? 'bg-gradient-to-r from-email-primary/10 via-email-accent/5 to-email-primary/10 border-email-primary/40 shadow-md' 
                    : 'bg-gradient-to-r from-white via-email-muted/20 to-white border-email-primary/20 shadow-sm hover:border-email-primary/30'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={(e) => handleSelectContact(contact.id, e.target.checked)}
                    className="h-4 w-4 text-email-primary focus:ring-email-primary border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-gray-600 break-all">{contact.email}</p>
                        {contact.phone && (
                          <p className="text-sm text-gray-500">{contact.phone}</p>
                        )}
                      </div>
                    </div>
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contact.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-email-accent/20 text-email-accent">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {contactLists[contact.id] && contactLists[contact.id].length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs text-gray-500 mr-1">Lists:</span>
                        {contactLists[contact.id].map(list => (
                          <Badge key={list.id} variant="outline" className="text-xs border-email-secondary/30 text-email-secondary">
                            <Users className="h-3 w-3 mr-1" />
                            {list.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingContact(contact);
                      setShowEditContactDialog(true);
                    }}
                    className="text-email-primary hover:text-white hover:bg-email-primary shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteContact(contact.id)}
                    className="text-red-600 hover:text-white hover:bg-red-500 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {contacts.length === 0 ? (
                  <div>
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>No contacts yet. Add your first contact or import from CSV!</p>
                  </div>
                ) : (
                  "No contacts match your filters"
                )}
              </div>
            )}
            
            {/* Pagination Info and Load More Button */}
            {!searchTerm && !tagFilter && (
              <div className="mt-6 pt-4 border-t border-email-primary/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-email-muted">
                    Showing {contacts.length} of {totalContacts} contacts
                  </div>
                  {hasMoreContacts && (
                    <Button
                      onClick={loadMoreContacts}
                      disabled={isLoadingMore}
                      variant="outline"
                      size="sm"
                      className="border-email-primary text-email-primary hover:bg-email-primary/10"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-email-primary mr-2"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Load More ({CONTACTS_PER_PAGE} more)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Add Tags Dialog */}
      <Dialog open={showBulkTagDialog} onOpenChange={setShowBulkTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags for Selected Contacts</DialogTitle>
            <DialogDescription>
              Add or remove tags for {selectedContacts.size} selected contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Operation</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="add-tags"
                    name="tagOperation"
                    checked={bulkTagOperation === 'add'}
                    onChange={() => setBulkTagOperation('add')}
                  />
                  <Label htmlFor="add-tags">Add Tags</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="remove-tags"
                    name="tagOperation"
                    checked={bulkTagOperation === 'remove'}
                    onChange={() => setBulkTagOperation('remove')}
                  />
                  <Label htmlFor="remove-tags">Remove Tags</Label>
                </div>
              </div>
            </div>
            
            {bulkTagOperation === 'add' ? (
              <div className="space-y-2">
                <Label htmlFor="bulkTags">Tags to Add</Label>
                <TagInput
                  value={bulkTags}
                  onChange={setBulkTags}
                  suggestions={allTags}
                  placeholder="premium, newsletter, product-customer"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="bulkTagsRemove">Tags to Remove</Label>
                <TagInput
                  value={bulkTagsToRemove}
                  onChange={setBulkTagsToRemove}
                  suggestions={allTags}
                  placeholder="premium, newsletter, product-customer"
                />
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button onClick={handleBulkAddTags} className="flex-1 bg-email-accent hover:bg-email-accent/80">
                {bulkTagOperation === 'add' ? 'Add Tags' : 'Remove Tags'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkTagDialog(false);
                  setBulkTags('');
                  setBulkTagsToRemove('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add to Lists Dialog */}
      <Dialog open={showBulkListDialog} onOpenChange={setShowBulkListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Contacts in Lists</DialogTitle>
            <DialogDescription>
              Add or remove {selectedContacts.size} selected contacts from email lists
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Operation</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="add-to-lists"
                    name="listOperation"
                    checked={bulkListOperation === 'add'}
                    onChange={() => setBulkListOperation('add')}
                  />
                  <Label htmlFor="add-to-lists">Add to Lists</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="remove-from-lists"
                    name="listOperation"
                    checked={bulkListOperation === 'remove'}
                    onChange={() => setBulkListOperation('remove')}
                  />
                  <Label htmlFor="remove-from-lists">Remove from Lists</Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Select Lists:</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {emailLists.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No email lists found. Create some lists first.
                  </p>
                ) : (
                  emailLists
                    .filter(list => {
                      if (bulkListOperation === 'remove') {
                        // For remove, only show lists that at least one selected contact is in
                        return Array.from(selectedContacts).some(contactId => 
                          contactLists[contactId]?.some(cl => cl.id === list.id)
                        );
                      }
                      return true; // For add, show all lists
                    })
                    .map(list => {
                      const isContactInList = Array.from(selectedContacts).some(contactId => 
                        contactLists[contactId]?.some(cl => cl.id === list.id)
                      );
                      const isDisabled = bulkListOperation === 'add' && isContactInList;
                      
                      return (
                        <div key={list.id} className={`flex items-center space-x-3 ${isDisabled ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            id={`bulk-list-${bulkListOperation}-${list.id}`}
                            disabled={isDisabled}
                            checked={
                              bulkListOperation === 'add' 
                                ? selectedBulkLists.includes(list.id)
                                : selectedBulkListsToRemove.includes(list.id)
                            }
                            onChange={(e) => {
                              if (bulkListOperation === 'add') {
                                if (e.target.checked) {
                                  setSelectedBulkLists([...selectedBulkLists, list.id]);
                                } else {
                                  setSelectedBulkLists(selectedBulkLists.filter(id => id !== list.id));
                                }
                              } else {
                                if (e.target.checked) {
                                  setSelectedBulkListsToRemove([...selectedBulkListsToRemove, list.id]);
                                } else {
                                  setSelectedBulkListsToRemove(selectedBulkListsToRemove.filter(id => id !== list.id));
                                }
                              }
                            }}
                            className="h-4 w-4 text-email-primary focus:ring-email-primary border-gray-300 rounded"
                          />
                          <Label htmlFor={`bulk-list-${bulkListOperation}-${list.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium">{list.name}</div>
                            {list.description && (
                              <div className="text-sm text-muted-foreground">{list.description}</div>
                            )}
                            <div className="text-xs text-email-secondary">
                              {list.list_type === 'dynamic' ? 'Dynamic' : 'Static'} List
                              {isDisabled && ' (Already added)'}
                            </div>
                          </Label>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleBulkAddToLists} 
                className="flex-1 bg-email-secondary hover:bg-email-secondary/80"
                disabled={
                  (bulkListOperation === 'add' && selectedBulkLists.length === 0) || 
                  (bulkListOperation === 'remove' && selectedBulkListsToRemove.length === 0) ||
                  emailLists.length === 0
                }
              >
                {bulkListOperation === 'add' ? 'Add to Lists' : 'Remove from Lists'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkListDialog(false);
                  setSelectedBulkLists([]);
                  setSelectedBulkListsToRemove([]);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      {editingContact && (
        <EditContactDialog
          contact={{
            id: editingContact.id,
            email: editingContact.email,
            first_name: editingContact.name.split(' ')[0] || '',
            last_name: editingContact.name.split(' ').slice(1).join(' ') || null,
            status: 'subscribed', // default status
            tags: editingContact.tags
          }}
          isOpen={showEditContactDialog}
          onClose={() => {
            setShowEditContactDialog(false);
            setEditingContact(null);
          }}
          onContactUpdated={() => {
            loadContacts();
            setShowEditContactDialog(false);
            setEditingContact(null);
          }}
        />
      )}
    </div>
  );
};