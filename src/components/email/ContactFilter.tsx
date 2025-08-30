import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Filter, Plus, X, Tag, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";

interface FilterRule {
  id: string;
  type: 'has_tags' | 'not_has_tags' | 'in_lists' | 'not_in_lists';
  values: string[];
  operator?: 'and' | 'or';
}

interface ContactFilterProps {
  onFilterChange: (contactIds: string[]) => void;
  availableTags: string[];
  availableLists: Array<{ id: string; name: string }>;
  allContacts: Array<{ id: string; tags?: string[] }>;
}

export const ContactFilter = ({ onFilterChange, availableTags, availableLists, allContacts }: ContactFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [globalOperator, setGlobalOperator] = useState<'and' | 'or'>('and');
  const [contactListMemberships, setContactListMemberships] = useState<Record<string, string[]>>({});

  // Load contact list memberships
  useEffect(() => {
    loadContactListMemberships();
  }, []);

  const loadContactListMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('contact_id, list_id');

      if (error) throw error;

      const memberships: Record<string, string[]> = {};
      data?.forEach(item => {
        if (!memberships[item.contact_id]) {
          memberships[item.contact_id] = [];
        }
        memberships[item.contact_id].push(item.list_id);
      });

      setContactListMemberships(memberships);
    } catch (error) {
      console.error('Error loading contact list memberships:', error);
    }
  };

  const addFilter = () => {
    const newFilter: FilterRule = {
      id: Date.now().toString(),
      type: 'has_tags',
      values: [],
      operator: 'or'
    };
    setFilters([...filters, newFilter]);
  };

  const removeFilter = (filterId: string) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  const updateFilter = (filterId: string, updates: Partial<FilterRule>) => {
    setFilters(filters.map(f => f.id === filterId ? { ...f, ...updates } : f));
  };

  const addValueToFilter = (filterId: string, value: string) => {
    const filter = filters.find(f => f.id === filterId);
    if (filter && !filter.values.includes(value)) {
      updateFilter(filterId, { values: [...filter.values, value] });
    }
  };

  const removeValueFromFilter = (filterId: string, value: string) => {
    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      updateFilter(filterId, { values: filter.values.filter(v => v !== value) });
    }
  };

  const applyFilters = () => {
    let filteredContactIds: string[] = [];

    if (filters.length === 0) {
      filteredContactIds = allContacts.map(c => c.id);
    } else {
      const results = filters.map(filter => {
        return allContacts.filter(contact => {
          switch (filter.type) {
            case 'has_tags':
              if (filter.operator === 'and') {
                return filter.values.every(tag => contact.tags?.includes(tag));
              } else {
                return filter.values.some(tag => contact.tags?.includes(tag));
              }
            
            case 'not_has_tags':
              if (filter.operator === 'and') {
                return filter.values.every(tag => !contact.tags?.includes(tag));
              } else {
                return !filter.values.some(tag => contact.tags?.includes(tag));
              }
            
            case 'in_lists':
              const contactLists = contactListMemberships[contact.id] || [];
              if (filter.operator === 'and') {
                return filter.values.every(listId => contactLists.includes(listId));
              } else {
                return filter.values.some(listId => contactLists.includes(listId));
              }
            
            case 'not_in_lists':
              const contactListsNot = contactListMemberships[contact.id] || [];
              if (filter.operator === 'and') {
                return filter.values.every(listId => !contactListsNot.includes(listId));
              } else {
                return !filter.values.some(listId => contactListsNot.includes(listId));
              }
            
            default:
              return true;
          }
        }).map(c => c.id);
      });

      // Apply global operator between filters
      if (globalOperator === 'and') {
        filteredContactIds = results.reduce((acc, current) => 
          acc.filter(id => current.includes(id))
        , results[0] || []);
      } else {
        filteredContactIds = [...new Set(results.flat())];
      }
    }

    onFilterChange(filteredContactIds);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setFilters([]);
    onFilterChange(allContacts.map(c => c.id));
  };

  const getFilterTypeLabel = (type: FilterRule['type']) => {
    switch (type) {
      case 'has_tags': return 'Has tags';
      case 'not_has_tags': return 'Does not have tags';
      case 'in_lists': return 'In lists';
      case 'not_in_lists': return 'Not in lists';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filter
          {filters.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {filters.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Contact Filter</DialogTitle>
          <DialogDescription>
            Create complex filters to target specific segments of your contacts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Global Operator */}
          {filters.length > 1 && (
            <div className="flex items-center space-x-2">
              <Label>Match:</Label>
              <Select value={globalOperator} onValueChange={(value: 'and' | 'or') => setGlobalOperator(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">All filters</SelectItem>
                  <SelectItem value="or">Any filter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filters */}
          <div className="space-y-4">
            {filters.map((filter, index) => (
              <Card key={filter.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Filter {index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(filter.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Filter Type */}
                    <div>
                      <Label className="text-xs">Condition</Label>
                      <Select
                        value={filter.type}
                        onValueChange={(value: FilterRule['type']) => updateFilter(filter.id, { type: value, values: [] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="has_tags">Has tags</SelectItem>
                          <SelectItem value="not_has_tags">Does not have tags</SelectItem>
                          <SelectItem value="in_lists">In lists</SelectItem>
                          <SelectItem value="not_in_lists">Not in lists</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator */}
                    <div>
                      <Label className="text-xs">Match</Label>
                      <Select
                        value={filter.operator}
                        onValueChange={(value: 'and' | 'or') => updateFilter(filter.id, { operator: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="or">Any selected</SelectItem>
                          <SelectItem value="and">All selected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Values */}
                    <div>
                      <Label className="text-xs">Values</Label>
                      <Select
                        onValueChange={(value) => addValueToFilter(filter.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select values..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filter.type.includes('tags') ? (
                            availableTags
                              .filter(tag => tag && tag.trim().length > 0)
                              .map(tag => (
                                <SelectItem key={tag} value={tag}>
                                  <div className="flex items-center space-x-2">
                                    <Tag className="h-3 w-3" />
                                    <span>{tag}</span>
                                  </div>
                                </SelectItem>
                              ))
                          ) : (
                            availableLists
                              .filter(list => list.id && list.id.trim().length > 0)
                              .map(list => (
                                <SelectItem key={list.id} value={list.id}>
                                  <div className="flex items-center space-x-2">
                                    <List className="h-3 w-3" />
                                    <span>{list.name}</span>
                                  </div>
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Selected Values */}
                  {filter.values.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Selected:</Label>
                      <div className="flex flex-wrap gap-2">
                        {filter.values.map(value => {
                          const displayValue = filter.type.includes('lists') 
                            ? availableLists.find(l => l.id === value)?.name || value
                            : value;
                          
                          return (
                            <Badge
                              key={value}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => removeValueFromFilter(filter.id, value)}
                            >
                              {displayValue} <X className="h-3 w-3 ml-1" />
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Add Filter Button */}
          <Button variant="outline" onClick={addFilter} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>

          {/* Actions */}
          <div className="flex space-x-2 pt-4 border-t">
            <Button onClick={applyFilters} className="flex-1">
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear All
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};