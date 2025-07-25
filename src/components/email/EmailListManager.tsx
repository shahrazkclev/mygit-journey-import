import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, Users, Trash2, Plus, FileText, Filter, Eye, Tag, Calendar, ShoppingCart, Mail } from "lucide-react";
import { toast } from "sonner";

type Contact = {
  id: number;
  email: string;
  name: string;
  tags: string[];
  source: string;
  lastContacted: string;
  purchaseStatus: string;
  dateAdded: string;
  listId: number;
};

export const EmailListManager = () => {
  const [lists, setLists] = useState([
    { id: 1, name: "Newsletter Subscribers", count: 1250, lastUpdated: "2024-01-15" },
    { id: 2, name: "Customer List", count: 890, lastUpdated: "2024-01-14" },
    { id: 3, name: "Prospects", count: 345, lastUpdated: "2024-01-13" }
  ]);
  
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, email: "john@example.com", name: "John Doe", tags: ["customer", "premium"], source: "website", lastContacted: "2024-01-10", purchaseStatus: "purchased", dateAdded: "2023-12-01", listId: 2 },
    { id: 2, email: "sarah@example.com", name: "Sarah Wilson", tags: ["lead", "newsletter"], source: "social media", lastContacted: "2024-01-08", purchaseStatus: "not purchased", dateAdded: "2024-01-05", listId: 1 },
    { id: 3, email: "mike@example.com", name: "Mike Johnson", tags: ["prospect"], source: "referral", lastContacted: "never", purchaseStatus: "not purchased", dateAdded: "2024-01-12", listId: 3 },
  ]);
  
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [newListName, setNewListName] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterPurchase, setFilterPurchase] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv") {
        toast.error("Please upload a CSV file");
        return;
      }
      setCsvFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  const handleUploadCSV = () => {
    if (!csvFile) {
      toast.error("Please select a CSV file first");
      return;
    }
    // Simulate CSV processing
    toast.info("CSV processing requires Supabase backend integration");
  };

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast.error("Please enter a list name");
      return;
    }
    const newList = {
      id: Date.now(),
      name: newListName,
      count: 0,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setLists([...lists, newList]);
    setNewListName("");
    toast.success("Email list created successfully!");
  };

  const handleDeleteList = (id: number) => {
    setLists(lists.filter(list => list.id !== id));
    setContacts(contacts.filter(contact => contact.listId !== id));
    toast.success("Email list deleted");
  };

  const filteredContacts = contacts.filter(contact => {
    if (selectedList && contact.listId !== selectedList) return false;
    if (filterTag !== "all" && !contact.tags.includes(filterTag)) return false;
    if (filterPurchase !== "all" && contact.purchaseStatus !== filterPurchase) return false;
    if (searchQuery && !contact.email.toLowerCase().includes(searchQuery.toLowerCase()) && !contact.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const allTags = Array.from(new Set(contacts.flatMap(contact => contact.tags)));

  const getListName = (listId: number) => {
    return lists.find(list => list.id === listId)?.name || "Unknown List";
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contacts" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Contact Management</span>
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>List Management</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-6">
          {/* Filters and Search */}
          <Card className="shadow-soft border-email-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-email-primary" />
                <span>Filter Contacts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-email-primary/30 focus:border-email-primary"
                  />
                </div>
                <div>
                  <Label htmlFor="listFilter">List</Label>
                  <Select value={selectedList?.toString() || "all"} onValueChange={(value) => setSelectedList(value === "all" ? null : parseInt(value))}>
                    <SelectTrigger className="border-email-primary/30 focus:border-email-primary">
                      <SelectValue placeholder="All Lists" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Lists</SelectItem>
                      {lists.map((list) => (
                        <SelectItem key={list.id} value={list.id.toString()}>{list.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tagFilter">Tag</Label>
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger className="border-email-primary/30 focus:border-email-primary">
                      <SelectValue placeholder="All Tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchaseFilter">Purchase Status</Label>
                  <Select value={filterPurchase} onValueChange={setFilterPurchase}>
                    <SelectTrigger className="border-email-primary/30 focus:border-email-primary">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="purchased">Purchased</SelectItem>
                      <SelectItem value="not purchased">Not Purchased</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Table */}
          <Card className="shadow-soft border-email-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-email-accent" />
                  <span>Contacts ({filteredContacts.length})</span>
                </div>
                <Button 
                  size="sm"
                  className="bg-email-primary hover:bg-email-primary/80 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>List</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Last Contacted</TableHead>
                    <TableHead>Purchase Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground">{contact.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-email-accent text-email-accent">
                          {getListName(contact.listId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{contact.source}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{contact.lastContacted}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={contact.purchaseStatus === "purchased" ? "default" : "outline"}
                          className={contact.purchaseStatus === "purchased" ? "bg-email-secondary text-foreground" : ""}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          {contact.purchaseStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Tag className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lists" className="space-y-6">
          {/* Create New List */}
          <Card className="shadow-soft border-email-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-email-primary" />
                <span>Create New List</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="listName">List Name</Label>
                  <Input
                    id="listName"
                    placeholder="Enter list name..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="border-email-primary/30 focus:border-email-primary"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleCreateList}
                    className="bg-email-primary hover:bg-email-primary/80 text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CSV Upload */}
          <Card className="shadow-soft border-email-secondary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-email-secondary" />
                <span>Import from CSV</span>
              </CardTitle>
              <CardDescription>
                Upload a CSV file with columns: email, name, tags (comma-separated), source, purchase_status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csvFile">Select CSV File</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="border-email-secondary/30 focus:border-email-secondary"
                  />
                </div>
                {csvFile && (
                  <div className="flex items-center justify-between p-3 bg-email-secondary/10 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-email-secondary" />
                      <span className="text-sm">{csvFile.name}</span>
                      <Badge variant="outline" className="border-email-secondary text-email-secondary">
                        {(csvFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <Button 
                      onClick={handleUploadCSV}
                      size="sm"
                      className="bg-email-secondary hover:bg-email-secondary/80 text-foreground"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Email Lists */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Users className="h-5 w-5 text-email-accent" />
              <span>Your Email Lists</span>
            </h3>
            
            {lists.map((list) => {
              const listContactCount = contacts.filter(contact => contact.listId === list.id).length;
              return (
                <Card key={list.id} className="shadow-soft border-email-accent/20 hover:shadow-glow transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{list.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{listContactCount} contacts</span>
                          </span>
                          <span>Updated {list.lastUpdated}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="border-email-accent text-email-accent">
                          Active
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedList(list.id)}
                          className="border-email-primary hover:bg-email-primary hover:text-primary-foreground"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Contacts
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-email-secondary hover:bg-email-secondary"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteList(list.id)}
                          className="border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};