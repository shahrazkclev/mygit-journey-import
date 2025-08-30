import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

export default function OptIn() {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasOptedIn, setHasOptedIn] = useState(false);
  const { toast } = useToast();

  const tags = searchParams.get("tags")?.split(",") || [];
  const product = searchParams.get("product");
  const campaign = searchParams.get("campaign") || "General Opt-in";
  const nameParam = searchParams.get("name") || "";

  useEffect(() => {
    // Check if user has already opted in this session
    const sessionOptIn = sessionStorage.getItem("opted_in_session");
    if (sessionOptIn) {
      setHasOptedIn(true);
    }

    // Prefill name if provided in URL
    if (nameParam) {
      setName(nameParam);
    }
  }, [nameParam]);

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

    setIsSubmitting(true);

    try {
      // Create the contact with tags
      const allTags = [...tags];
      if (product) allTags.push(product);

      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: DEMO_USER_ID,
          email: email.toLowerCase().trim(),
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' ') || null,
          status: 'subscribed',
          tags: allTags.length > 0 ? allTags : null
        });

      if (error) {
        // If it's a duplicate email, update the existing record
        if (error.code === '23505') {
          const { error: updateError } = await supabase
            .from('contacts')
            .update({
              tags: allTags.length > 0 ? allTags : null,
              status: 'subscribed'
            })
            .eq('email', email.toLowerCase().trim())
            .eq('user_id', DEMO_USER_ID);

          if (updateError) throw updateError;
        } else {
          throw error;
        }
      }

      // Mark as opted in for this session
      sessionStorage.setItem("opted_in_session", "true");
      setHasOptedIn(true);
      setIsSuccess(true);
      
      toast({
        title: "Successfully opted in!",
        description: `Welcome ${name}! You've been added to our contact list.`
      });

    } catch (error: any) {
      console.error('Error adding contact:', error);
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
            <p className="text-muted-foreground mb-4">
              Thanks for opting in. You'll receive updates about {campaign}.
            </p>
            {tags.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">You're subscribed to:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
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