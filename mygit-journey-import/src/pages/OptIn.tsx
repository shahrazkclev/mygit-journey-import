import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

// For opt-in page, we still use the admin user ID directly since this is a public page
// but we need to map it to the real admin user
const ADMIN_USER_ID = "3e01343e-9ad5-452e-95ac-d16c58c6cae2";

export default function OptIn() {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState(nameParam);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasOptedIn, setHasOptedIn] = useState(false);
  const [protectedTags, setProtectedTags] = useState<string[]>([]);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const { toast } = useToast();

  const tags = searchParams.get("tags")?.split(",").map(tag => tag.toLowerCase().trim()) || [];
  const product = searchParams.get("product")?.toLowerCase().trim();
  const campaign = searchParams.get("campaign") || "General Opt-in";
  const nameParam = searchParams.get("name") || "";

  useEffect(() => {
    // Clear password field to prevent autofill
    setPassword("");
  }, []);

  useEffect(() => {
    // Check if user has already opted in for any of these specific tags
    const sessionOptedTags = sessionStorage.getItem("opted_in_tags");
    if (sessionOptedTags) {
      const optedTagsArray = JSON.parse(sessionOptedTags);
      const currentTags = [...tags];
      if (product) currentTags.push(product);
      
      // Check if any of the current tags were already opted in
      const hasOverlappingTags = currentTags.some(tag => optedTagsArray.includes(tag));
      
      if (hasOverlappingTags && currentTags.length > 0) {
        setHasOptedIn(true);
      }
    }

    // Name is already prefilled from URL parameter in useState initialization

    // Check for protected tags
    checkProtectedTags();
  }, [nameParam, tags, product]);

  const checkProtectedTags = async () => {
    try {
      const allTags = [...tags];
      if (product) allTags.push(product);

      if (allTags.length === 0) return;

      const { data: tagRules, error } = await supabase
        .from('tag_rules')
        .select('add_tags, protected, password')
        .eq('user_id', ADMIN_USER_ID)
        .eq('protected', true);

      if (error) throw error;

      const protectedTagsList: string[] = [];
      tagRules?.forEach(rule => {
        if (rule.add_tags) {
          rule.add_tags.forEach((tag: string) => {
            if (allTags.includes(tag) && !protectedTagsList.includes(tag)) {
              protectedTagsList.push(tag);
            }
          });
        }
      });

      setProtectedTags(protectedTagsList);
      setRequiresPassword(protectedTagsList.length > 0);
    } catch (error) {
      console.error('Error checking protected tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasOptedIn) {
      toast({
        title: "Already opted in",
        description: "You've already opted in during this session.",
        variant: "destructive"
      });
      return;
    }

    if (!name || !email) {
      toast({
        title: "Missing information",
        description: "Please fill in both name and email.",
        variant: "destructive"
      });
      return;
    }

    // Validate password for protected tags
    if (requiresPassword && protectedTags.length > 0) {
      if (!password) {
        toast({
          title: "Password required",
          description: `Password is required for protected tags: ${protectedTags.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      // Verify password against protected tag rules
      try {
        const { data: tagRules, error } = await supabase
          .from('tag_rules')
          .select('add_tags, password')
          .eq('user_id', ADMIN_USER_ID)
          .eq('protected', true);

        if (error) throw error;

        let passwordValid = false;
        for (const rule of tagRules || []) {
          if (rule.add_tags) {
            const hasProtectedTag = rule.add_tags.some((tag: string) => protectedTags.includes(tag));
            if (hasProtectedTag && rule.password === password) {
              passwordValid = true;
              break;
            }
          }
        }

        if (!passwordValid) {
          toast({
            title: "Invalid password",
            description: "The password provided is incorrect for the protected tags.",
            variant: "destructive"
          });
          return;
        }
      } catch (error) {
        console.error('Error validating password:', error);
        toast({
          title: "Error",
          description: "Failed to validate password. Please try again.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare tags for webhook (already normalized)
      const allTags = [...tags];
      if (product) allTags.push(product);

      // Send webhook to Make.com for opt-in processing
      // Create form data with individual variables
      const formData = new FormData();
      formData.append('action', 'optin');
      formData.append('email', email.toLowerCase().trim());
      formData.append('name', name.trim());
      formData.append('tags', allTags.join(','));
      
      // Only send password if user entered one (for protected tags)
      if (password && password.trim()) {
        formData.append('password', password.trim());
      }

      console.log('Sending opt-in webhook with form data:', {
        action: 'optin',
        email: email.toLowerCase().trim(),
        name: name.trim(),
        tags: allTags.join(','),
        password: password && password.trim() ? password.trim() : 'none'
      });
      
      const response = await fetch('https://hook.us2.make.com/fyfqkxjbgnnq4w72wqvd8csdp4flalwv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status}`);
      }

      console.log('Opt-in webhook sent successfully');

      // Add new tags to existing opted-in tags for this session
      const sessionOptedTags = sessionStorage.getItem("opted_in_tags");
      const existingOptedTags = sessionOptedTags ? JSON.parse(sessionOptedTags) : [];
      const updatedOptedTags = [...new Set([...existingOptedTags, ...allTags])];
      sessionStorage.setItem("opted_in_tags", JSON.stringify(updatedOptedTags));
      setHasOptedIn(true);
      setIsSuccess(true);

      toast({
        title: "Success!",
        description: "You've successfully opted in. Thank you!",
      });

    } catch (error: any) {
      console.error('Error sending opt-in webhook:', error);
      toast({
        title: "Error",
        description: "Failed to opt in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasOptedIn && isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">You're all set!</h2>
            <p className="text-muted-foreground">
              Thanks for joining! You'll receive updates soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasOptedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Already opted in</h2>
            <p className="text-muted-foreground">
              You've already opted in during this session. Thank you!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Join Our Community
          </CardTitle>
          <CardDescription>
            {campaign && `Opt in for: ${campaign}`}
            {tags.length > 0 && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-2 justify-center">
                  {tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            {requiresPassword && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for protected tags"
                  autoComplete="off"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Password required for: {protectedTags.join(', ')}
                </p>
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Opting in..." : "Opt In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}