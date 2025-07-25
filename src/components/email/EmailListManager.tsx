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

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
};

type Contact = {
  id: number;
  email: string;
  name: string;
  tags: string[];
  source: string;
  lastContacted: string;
  purchasedProducts: Product[];
  dateAdded: string;
  listId: number;
};

export const EmailListManager = () => {
  const [products, setProducts] = useState<Product[]>([
    { id: 1, name: "Premium Course", price: 299, category: "Education" },
    { id: 2, name: "Starter Package", price: 99, category: "Software" },
    { id: 3, name: "Consultation Call", price: 150, category: "Service" },
    { id: 4, name: "Advanced Toolkit", price: 499, category: "Software" }
  ]);

  const [lists, setLists] = useState([
    { id: 1, name: "Newsletter Subscribers", count: 1250, lastUpdated: "2024-01-15" },
    { id: 2, name: "Customer List", count: 890, lastUpdated: "2024-01-14" },
    { id: 3, name: "Prospects", count: 345, lastUpdated: "2024-01-13" }
  ]);
  
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, email: "john@example.com", name: "John Doe", tags: ["customer", "premium"], source: "website", lastContacted: "2024-01-10", purchasedProducts: [products[0], products[2]], dateAdded: "2023-12-01", listId: 2 },
    { id: 2, email: "sarah@example.com", name: "Sarah Wilson", tags: ["lead", "newsletter"], source: "social media", lastContacted: "2024-01-08", purchasedProducts: [], dateAdded: "2024-01-05", listId: 1 },
    { id: 3, email: "mike@example.com", name: "Mike Johnson", tags: ["prospect"], source: "referral", lastContacted: "never", purchasedProducts: [products[1]], dateAdded: "2024-01-12", listId: 3 },
  ]);
  
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [newListName, setNewListName] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
    category: ""
  });
  const [newContact, setNewContact] = useState({
    email: "",
    name: "",
    tags: "",
    source: "",
    listId: 1,
    selectedProducts: [] as number[]
  });

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

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      toast.error("Please fill in product name and price");
      return;
    }
    const product: Product = {
      id: Date.now(),
      name: newProduct.name,
      price: newProduct.price,
      category: newProduct.category || "General"
    };
    setProducts([...products, product]);
    setNewProduct({ name: "", price: 0, category: "" });
    setIsAddingProduct(false);
    toast.success("Product added successfully!");
  };

  const handleAddContact = () => {
    if (!newContact.email || !newContact.name) {
      toast.error("Please fill in email and name");
      return;
    }
    const selectedProductObjects = products.filter(p => newContact.selectedProducts.includes(p.id));
    const contact: Contact = {
      id: Date.now(),
      email: newContact.email,
      name: newContact.name,
      tags: newContact.tags.split(",").map(tag => tag.trim()).filter(Boolean),
      source: newContact.source || "manual",
      lastContacted: "never",
      purchasedProducts: selectedProductObjects,
      dateAdded: new Date().toISOString().split('T')[0],
      listId: newContact.listId
    };
    setContacts([...contacts, contact]);
    setNewContact({ email: "", name: "", tags: "", source: "", listId: 1, selectedProducts: [] });
    setIsAddingContact(false);
    toast.success("Contact added successfully!");
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
  };

  const handleUpdateContact = () => {
    if (!editingContact) return;
    setContacts(contacts.map(c => c.id === editingContact.id ? editingContact : c));
    setEditingContact(null);
    toast.success("Contact updated successfully!");
  };

  const handleDeleteContact = (id: number) => {
    setContacts(contacts.filter(contact => contact.id !== id));
    toast.success("Contact deleted");
  };

  const getUniqueContactsFromLists = () => {
    if (selectedLists.length === 0) return [];
    const contactsFromSelectedLists = contacts.filter(contact => 
      selectedLists.includes(contact.listId)
    );
    // Remove duplicates by email
    const uniqueContacts = contactsFromSelectedLists.reduce((acc, contact) => {
      if (!acc.find(c => c.email === contact.email)) {
        acc.push(contact);
      }
      return acc;
    }, [] as Contact[]);
    return uniqueContacts;
  };

  const filteredContacts = contacts.filter(contact => {
    if (selectedLists.length > 0 && !selectedLists.includes(contact.listId)) return false;
    if (filterTag !== "all" && !contact.tags.includes(filterTag)) return false;
    if (filterProduct !== "all") {
      if (filterProduct === "no_purchases" && contact.purchasedProducts.length > 0) return false;
      if (filterProduct !== "no_purchases" && !contact.purchasedProducts.some(p => p.id.toString() === filterProduct)) return false;
    }
    if (searchQuery && !contact.email.toLowerCase().includes(searchQuery.toLowerCase()) && !contact.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const allTags = Array.from(new Set(contacts.flatMap(contact => contact.tags)));
  const allCategories = Array.from(new Set(products.map(product => product.category)));

  const getListName = (listId: number) => {
    return lists.find(list => list.id === listId)?.name || "Unknown List";
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contacts" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Contact Management</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center space-x-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Product Management</span>
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
                  <Label htmlFor="listFilter">Lists (Multiple Selection)</Label>
                  <div className="space-y-2">
                    {lists.map((list) => (
                      <label key={list.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedLists.includes(list.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLists([...selectedLists, list.id]);
                            } else {
                              setSelectedLists(selectedLists.filter(id => id !== list.id));
                            }
                          }}
                          className="rounded border-email-primary/30"
                        />
                        <span className="text-sm">{list.name}</span>
                      </label>
                    ))}
                  </div>
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
                  <Label htmlFor="purchaseFilter">Product Filter</Label>
                  <Select value={filterProduct} onValueChange={setFilterProduct}>
                    <SelectTrigger className="border-email-primary/30 focus:border-email-primary">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contacts</SelectItem>
                      <SelectItem value="no_purchases">No Purchases</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          Purchased: {product.name}
                        </SelectItem>
                      ))}
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
                  onClick={() => setIsAddingContact(true)}
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
                    <TableHead>Purchased Products</TableHead>
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
                        <div className="flex flex-wrap gap-1">
                          {contact.purchasedProducts.length > 0 ? (
                            contact.purchasedProducts.map((product) => (
                              <Badge key={product.id} variant="default" className="text-xs bg-email-success/20 text-email-success">
                                {product.name} - ${product.price}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No purchases
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditContact(contact)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.id)}>
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

          {/* Add Contact Dialog */}
          {isAddingContact && (
            <Card className="shadow-soft border-email-primary/20">
              <CardHeader>
                <CardTitle>Add New Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newEmail">Email</Label>
                    <Input
                      id="newEmail"
                      value={newContact.email}
                      onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newName">Name</Label>
                    <Input
                      id="newName"
                      value={newContact.name}
                      onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newTags">Tags (comma-separated)</Label>
                    <Input
                      id="newTags"
                      value={newContact.tags}
                      onChange={(e) => setNewContact({...newContact, tags: e.target.value})}
                      placeholder="customer, premium"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newSource">Source</Label>
                    <Input
                      id="newSource"
                      value={newContact.source}
                      onChange={(e) => setNewContact({...newContact, source: e.target.value})}
                      placeholder="website, social media"
                    />
                  </div>
                    <div>
                      <Label htmlFor="newListId">List</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={newContact.listId}
                        onChange={(e) => setNewContact({...newContact, listId: parseInt(e.target.value)})}
                      >
                        {lists.map((list) => (
                          <option key={list.id} value={list.id}>{list.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Purchased Products (optional)</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {products.map((product) => (
                        <label key={product.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newContact.selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewContact({...newContact, selectedProducts: [...newContact.selectedProducts, product.id]});
                              } else {
                                setNewContact({...newContact, selectedProducts: newContact.selectedProducts.filter(id => id !== product.id)});
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{product.name} - ${product.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleAddContact}>Add Contact</Button>
                    <Button variant="outline" onClick={() => setIsAddingContact(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Edit Contact Dialog */}
            {editingContact && (
              <Card className="shadow-soft border-email-primary/20">
                <CardHeader>
                  <CardTitle>Edit Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editEmail">Email</Label>
                      <Input
                        id="editEmail"
                        value={editingContact.email}
                        onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="editName">Name</Label>
                      <Input
                        id="editName"
                        value={editingContact.name}
                        onChange={(e) => setEditingContact({...editingContact, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="editTags">Tags (comma-separated)</Label>
                      <Input
                        id="editTags"
                        value={editingContact.tags.join(", ")}
                        onChange={(e) => setEditingContact({...editingContact, tags: e.target.value.split(",").map(tag => tag.trim())})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="editSource">Source</Label>
                      <Input
                        id="editSource"
                        value={editingContact.source}
                        onChange={(e) => setEditingContact({...editingContact, source: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Purchased Products</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {products.map((product) => (
                        <label key={product.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editingContact.purchasedProducts.some(p => p.id === product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingContact({
                                  ...editingContact, 
                                  purchasedProducts: [...editingContact.purchasedProducts, product]
                                });
                              } else {
                                setEditingContact({
                                  ...editingContact, 
                                  purchasedProducts: editingContact.purchasedProducts.filter(p => p.id !== product.id)
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{product.name} - ${product.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleUpdateContact}>Update Contact</Button>
                    <Button variant="outline" onClick={() => setEditingContact(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {/* Product Management Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card className="shadow-soft border-email-secondary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5 text-email-secondary" />
                  <span>Products ({products.length})</span>
                </div>
                <Button 
                  size="sm"
                  onClick={() => setIsAddingProduct(true)}
                  className="bg-email-secondary hover:bg-email-secondary/80 text-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="border-email-accent/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>${product.price}</span>
                            <Badge variant="outline" className="border-email-accent text-email-accent">
                              {product.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contacts.filter(c => c.purchasedProducts.some(p => p.id === product.id)).length} customers
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add Product Form */}
          {isAddingProduct && (
            <Card className="shadow-soft border-email-secondary/20">
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="Premium Course"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productPrice">Price ($)</Label>
                    <Input
                      id="productPrice"
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                      placeholder="299"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productCategory">Category</Label>
                    <Input
                      id="productCategory"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      placeholder="Education"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleAddProduct}>Add Product</Button>
                  <Button variant="outline" onClick={() => setIsAddingProduct(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
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
                          onClick={() => setSelectedLists([list.id])}
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