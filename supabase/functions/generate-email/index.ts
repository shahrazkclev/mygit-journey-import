import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, subject } = await req.json();

    // Your exact JSON style guide
    const yourJsonStyle = {
      "brandIdentity": {
        "name": "Cleverpoly",
        "storeName": "Cleverpoly.Store",
        "contactEmail": "cleverpoly.store@gmail.com",
        "personality": ["Clean", "Modern", "Minimalist", "Friendly", "Trustworthy"],
        "description": "The brand aesthetic is clean and professional, using generous white space and a card-based design to create an organized and user-friendly experience. The tone should be helpful and direct."
      },
      "emailStyleGuide": {
        "layout": {
          "structure": "A single-column, centered layout with a maximum width of 600px to ensure readability on both desktop and mobile devices.",
          "spacing": "Use ample white space and padding. Maintain significant margins between different content sections to create a clear visual separation.",
          "hierarchy": "Establish a strong visual hierarchy. The main heading should be the most prominent, followed by section titles, body text, and finally, footer links."
        },
        "colorPalette": {
          "background": "#FFFFFF (White)",
          "contentCardBackground": "#F9F8F5 (A light, warm off-white or beige for distinct content sections)",
          "primaryText": "#333333 (Dark Gray for all body copy and headings)",
          "buttonBackground": "#6A7059 (A muted, professional olive/gray-green for primary buttons)",
          "buttonText": "#FFFFFF (White)",
          "accent": "#FCD34D (A warm yellow/gold for key links, or subtle emphasis)"
        },
        "typography": {
          "fontFamily": "Use a clean, modern sans-serif font like Inter, Lato, or Open Sans for all text.",
          "headings": {
            "mainTitle": {
              "style": "Large font size (e.g., 24-28px), bold weight, dark gray color. Should clearly state the email's primary purpose.",
              "placeholder": "[Email Main Title]"
            },
            "sectionTitles": {
              "style": "Medium font size (e.g., 18-20px), bold weight, dark gray color. Can be accompanied by a simple, clean icon to the left.",
              "placeholder": "[Section Title]"
            }
          },
          "bodyText": {
            "style": "Regular weight, standard size for legibility (e.g., 14-16px), dark gray color. Text should be left-aligned within the centered container.",
            "placeholder": "[Body Paragraph Text]"
          },
          "links": {
            "style": "Standard links should be the primary text color and may include a directional arrow '→'. Important brand links can use the accent color for emphasis.",
            "placeholder": "[Link Text] →"
          }
        },
        "components": {
          "header": {
            "style": "Simple and clean. Display the brand logo as text: 'Cleverpoly.Store'."
          },
          "salutation": {
            "format": "Hey {{name}},",
            "style": "Use the standard body text style. This should be the first line of the email body, followed by a line break."
          },
          "contentCards": {
            "style": "Use for the main content areas. Cards should have the 'contentCardBackground' color, rounded corners, and generous internal padding. Each card should have a clear purpose, defined by a 'sectionTitle'."
          },
          "buttons": {
            "primaryCTA": {
              "style": "Solid background using 'buttonBackground' color, white text, padded, with slightly rounded corners. The button should be prominent and clearly state its action.",
              "placeholder": "[Primary Call-to-Action Text]"
            },
            "secondaryCTA": {
              "style": "A text link with a directional arrow '→'. Use for less critical actions.",
              "placeholder": "[Secondary Call-to-Action Text] →"
            }
          },
          "footer": {
            "style": "Simple text section at the bottom. Include secondary links, contact information, and a closing salutation.",
            "content": {
              "salutation": "Best regards,",
              "brandName": "Cleverpoly",
              "contact": "If you have any questions or need assistance, feel free to contact us at cleverpoly.store@gmail.com"
            }
          }
        }
      },
      "instructionsForAI": "Based on the brand identity and email style guide provided above for 'Cleverpoly', generate an email for the following purpose. Ensure all layout, color, typography, and component styles are strictly followed. The email must begin with the salutation 'Hey {{name}},'. Fill in the placeholder content appropriately for the request."
    };

    console.log('Generating email with your exact JSON specification');

    // Direct prompt to Claude - DO WHAT THE JSON SAYS
    const systemPrompt = `YOU MUST FOLLOW THIS JSON STYLE GUIDE EXACTLY. DO NOT DEVIATE FROM IT.

${JSON.stringify(yourJsonStyle, null, 2)}

EMAIL REQUEST:
Subject: "${subject}"
Content: ${prompt}

CRITICAL REQUIREMENTS:
1. Use EXACTLY these colors: #FFFFFF background, #F9F8F5 for content cards, #333333 for text, #6A7059 for buttons, #FCD34D for accents
2. Start with "Hey {{name}}," exactly
3. Use "Cleverpoly.Store" as the header text
4. Single-column layout, 600px max width
5. Content cards with #F9F8F5 background and rounded corners
6. Clean sans-serif fonts (Inter/Lato/Open Sans)
7. Include footer with "Best regards, Cleverpoly" and contact email
8. Generous white space and padding
9. Professional, clean, minimalist design

Create a beautiful HTML email that implements EVERY specification in the JSON above. Do not add anything not specified. Follow the instructionsForAI exactly.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: systemPrompt
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const htmlContent = data.content[0]?.text || '';

    console.log('✅ Email generated following your JSON exactly');

    return new Response(JSON.stringify({ htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      htmlContent: '<html><body><h1>Error generating email</h1></body></html>'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});