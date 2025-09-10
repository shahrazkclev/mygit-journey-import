import { supabase } from "@/integrations/supabase/client";

export const bulkImportProducts = async (userId: string) => {
  const products = [
    { name: "The Lazy Motion Library", category: "premium", price: 99 },
    { name: "Advanced 3d Product Animation Course", category: "course", price: 40 },
    { name: "Textify: Callouts & Titles", category: "tools", price: 25 },
    { name: "H2O droplet Simulation", category: "effects", price: 20 },
    { name: "Pack of 5 Handmade motions", category: "animations", price: 15 },
    { name: "Animated Arrays", category: "animations", price: 10 },
    { name: "Cloth Printing", category: "effects", price: 10 },
    { name: "Ice Off", category: "effects", price: 9 },
    { name: "Cloth On Path", category: "effects", price: 8 },
    { name: "Easy Grid", category: "tools", price: 8 },
    { name: "Motion Path", category: "animations", price: 8 },
    { name: "Knitting", category: "effects", price: 8 },
    { name: "Unfold", category: "effects", price: 7 },
    { name: "The Sprayer", category: "effects", price: 7 },
    { name: "Water-bender", category: "effects", price: 7 },
    { name: "MeshGen", category: "tools", price: 6 },
    { name: "Soft Balls", category: "effects", price: 6 },
    { name: "Shift Line A & B", category: "effects", price: 5 },
    { name: "Projector", category: "effects", price: 5 },
    { name: "Slideshow A", category: "effects", price: 5 },
    { name: "Bubbles on Path", category: "effects", price: 5 },
    { name: "Things on Path", category: "effects", price: 5 },
    { name: "The Tornado", category: "effects", price: 5 },
    { name: "360 Loop", category: "animations", price: 4 },
    { name: "Auto Animate", category: "animations", price: 4 },
    { name: "Swirls", category: "effects", price: 4 },
    { name: "Good Shapekeys", category: "tools", price: 4 },
    { name: "Roll on Path", category: "effects", price: 4 },
    { name: "Motion Domain", category: "animations", price: 4 },
    { name: "Ripples", category: "effects", price: 4 },
    { name: "Slideshow B", category: "effects", price: 4 },
    { name: "Sprinkles", category: "effects", price: 4 },
    { name: "Levitate", category: "effects", price: 3 },
    { name: "Gear Platform", category: "effects", price: 3 },
    { name: "Wheel", category: "effects", price: 3 },
    { name: "Pop up Pro", category: "effects", price: 3 }
  ];

  try {
    // First, check if products already exist to avoid duplicates
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('name')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching existing products:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const existingProductNames = new Set(existingProducts?.map(p => p.name) || []);
    
    // Filter out products that already exist
    const newProducts = products.filter(product => !existingProductNames.has(product.name));

    if (newProducts.length === 0) {
      return { success: true, message: 'All products already exist in the database' };
    }

    // Prepare products for insertion
    const productsToInsert = newProducts.map(product => ({
      ...product,
      user_id: userId,
      description: `${product.category} - ${product.name}`,
      sku: product.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()
    }));

    // Insert products
    const { data, error } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (error) {
      console.error('Error inserting products:', error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      message: `Successfully added ${newProducts.length} products to the database`,
      data 
    };

  } catch (error) {
    console.error('Error in bulk import:', error);
    return { success: false, error: 'Failed to import products' };
  }
};