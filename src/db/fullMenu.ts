export interface MenuSeedItem {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  dietType: "veg" | "non-veg";
  isAvailable: boolean;
}

export const fullMenuData: MenuSeedItem[] = [
  // 1. Appetizers
  {
    name: "Konjeenaro",
    description: "Deliciously crispy Italian-style fried mozzarella and herb bites, perfect for starting your meal.",
    price: 190.00,
    category: "Appetizers",
    imageUrl: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Mexican Potato",
    description: "Baked loaded potato wedges dusted with Mexican spices and served with a zesty cream dip.",
    price: 210.00,
    category: "Appetizers",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chilli Paneer",
    description: "Spicy stir-fried crispy paneer cubes tossed with fresh peppers in a sharp soy-chilli glaze.",
    price: 190.00,
    category: "Appetizers",
    imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chilli Chicken",
    description: "Crispy batter-fried chicken bits tossed with sliced capsicum and rich soy-chilli gravy.",
    price: 210.00,
    category: "Appetizers",
    imageUrl: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },

  // 2. Frites (Served with House Dip)
  {
    name: "Salted Fries",
    description: "Golden crusted, perfectly salted classic potato fries served hot with our house dip.",
    price: 150.00,
    category: "Frites",
    imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Peri Peri Fries",
    description: "Crispy golden potato fries tossed in spicy, tangy Peri Peri seasoning.",
    price: 170.00,
    category: "Frites",
    imageUrl: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Masala Fries",
    description: "Classic fries tossed in a spicy blend of aromatic Indian street spices.",
    price: 170.00,
    category: "Frites",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Melted Fries",
    description: "Sizzling golden fries loaded with an abundance of premium melted mozzarella cheese.",
    price: 190.00,
    category: "Frites",
    imageUrl: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Nachos",
    description: "Crispy tortilla chips topped with fresh tomato salsa, jalapeños, and warm cheese dip.",
    price: 210.00,
    category: "Frites",
    imageUrl: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 3. Bagel (Served with Fries & House Dip)
  {
    name: "Spinach Corn Bagel",
    description: "Freshly baked bagel stuffed with cream cheese, savory spinach, and sweet corn.",
    price: 210.00,
    category: "Bagel",
    imageUrl: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Mushroom Cheese Bagel",
    description: "Warm bagel packed with garlic-sautéed mushrooms and melted mozzarella cheese.",
    price: 210.00,
    category: "Bagel",
    imageUrl: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chicken Bagel",
    description: "Toasted bagel featuring grilled chicken breast slices, fresh greens, and house dressing.",
    price: 230.00,
    category: "Bagel",
    imageUrl: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },

  // 4. Hot Dog
  {
    name: "Paneer Tikka Hot Dog",
    description: "Soft hot dog bun stuffed with marinated tandoori paneer tikka, onions, and mint chutney.",
    price: 170.00,
    category: "Hot Dog",
    imageUrl: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Corn Spinach Hot Dog",
    description: "Savory hot dog loaded with a delicious spinach and sweet corn cheese filling.",
    price: 170.00,
    category: "Hot Dog",
    imageUrl: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Smoke Mushroom Hot Dog",
    description: "Grilled mushroom chunks tossed in smoky hickory BBQ sauce inside a soft hot dog bun.",
    price: 170.00,
    category: "Hot Dog",
    imageUrl: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chicken Tikka Hot Dog",
    description: "Toasted bun filled with smoky chicken tikka pieces, crisp red onions, and savory dressing.",
    price: 190.00,
    category: "Hot Dog",
    imageUrl: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },

  // 5. Between Breads (Served with House Dip)
  {
    name: "Veg Club Panini",
    description: "Classic double-layered panini stuffed with garden-fresh veggies and creamy house spread.",
    price: 190.00,
    category: "Between Breads",
    imageUrl: "https://images.unsplash.com/photo-1520174691701-bc555a3404ca?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Paneer Panini",
    description: "Grilled panini packed with spiced cottage cheese slabs, sweet onions, and crisp peppers.",
    price: 210.00,
    category: "Between Breads",
    imageUrl: "https://images.unsplash.com/photo-1520174691701-bc555a3404ca?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Mushroom Panini",
    description: "Panini loaded with garlic-herb sautéed mushrooms and a rich layer of melted cheese.",
    price: 210.00,
    category: "Between Breads",
    imageUrl: "https://images.unsplash.com/photo-1520174691701-bc555a3404ca?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chicken Panini",
    description: "Slices of seasoned grilled chicken breast and crisp lettuce layered inside a warm panini.",
    price: 210.00,
    category: "Between Breads",
    imageUrl: "https://images.unsplash.com/photo-1520174691701-bc555a3404ca?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },
  {
    name: "Chilly Pesto Panini",
    description: "A fiery twist with vibrant green basil pesto, cheese, and spicy fresh green chillies.",
    price: 210.00,
    category: "Between Breads",
    imageUrl: "https://images.unsplash.com/photo-1520174691701-bc555a3404ca?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 6. Burgers (Served with House Dip)
  {
    name: "Veggie Burger",
    description: "Served with house dip. Crispy mixed vegetable patty, fresh lettuce, and tomato on sesame buns.",
    price: 150.00,
    category: "Burgers",
    imageUrl: "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chicken Burger",
    description: "Served with house dip. Golden crispy crusted chicken breast, melted cheddar, and house sauce.",
    price: 170.00,
    category: "Burgers",
    imageUrl: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },
  {
    name: "Mexican Burger",
    description: "Served with house dip. Spicy bean patty topped with chunky jalapeños, salsa, and cream cheese.",
    price: 190.00,
    category: "Burgers",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 7. Pizza
  {
    name: "3 Cheese Pizza",
    description: "Artesanal stone-baked pizza layered with mozzarella, rich cheddar, and processed cheese.",
    price: 210.00,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Exotica Veg Pizza",
    description: "Pizza loaded with exotic olives, bell peppers, golden sweet corn, and fresh baby corn.",
    price: 230.00,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Mushroom Pizza",
    description: "Earthy garlic mushrooms, herbs, and melted mozzarella on our signature tomato base.",
    price: 230.00,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Peri Peri Pizza",
    description: "Spicy peppers, onions, and baby corn drizzled with hot peri peri chili seasoning.",
    price: 230.00,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Paneer Tikka Pizza",
    description: "Marinated clay-oven roasted paneer tikka, red onion cubes, and sweet bell peppers.",
    price: 250.00,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Veggie Cheesy Pizza",
    description: "Loaded with dynamic garden veggies and double layers of cheese.",
    price: 270.00,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chicken Tikka Pizza",
    description: "Clay-oven baked spiced chicken tikka bits, red onions, and hot jalapeños.",
    price: 270.00,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },
  {
    name: "Peri Peri Chicken Pizza",
    description: "Spicy shredded peri peri chicken, red onions, and bird's eye chillies over mozzarella.",
    price: 270.00,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },

  // 8. Garlic Breads
  {
    name: "Cheese Garlic Bread",
    description: "Toasted baguettes topped with whipped garlic butter, parsley, and baked gooey cheese.",
    price: 150.00,
    category: "Garlic Breads",
    imageUrl: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Herb Garlic Bread",
    description: "Toasted baguettes flavored with fresh rosemary, thyme, oregano, and baked garlic paste.",
    price: 170.00,
    category: "Garlic Breads",
    imageUrl: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Herb Cheese Garlic Bread",
    description: "Garlic bread topped with rich Italian herb seasonings and an abundance of melted mozzarella.",
    price: 190.00,
    category: "Garlic Breads",
    imageUrl: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Exotic Cheese Garlic Bread",
    description: "Gooey cheesy garlic bread topped with premium black olives, sweet corn, and jalapeños.",
    price: 210.00,
    category: "Garlic Breads",
    imageUrl: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 9. Pasta
  {
    name: "Penne Alfredo",
    description: "Penne pasta tossed in our ultra-creamy butter, garlic, and parmesan white sauce.",
    price: 210.00,
    category: "Pasta",
    imageUrl: "https://images.unsplash.com/photo-1555949258-ebc762fe463f?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Penne Arrabiata",
    description: "Penne pasta simmered in a spicy tomato concassé with garlic, chilli, and basil.",
    price: 210.00,
    category: "Pasta",
    imageUrl: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Mac N Cheese",
    description: "Classic macaroni baked in an incredibly rich, bubbly blend of dynamic cheeses.",
    price: 250.00,
    category: "Pasta",
    imageUrl: "https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Pesto Pasta",
    description: "Al dente pasta coated in fresh homemade basil pesto, olive oil, and toasted pine nuts.",
    price: 230.00,
    category: "Pasta",
    imageUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Primavera Pasta",
    description: "Light and healthy pasta tossed with dynamic fresh green vegetables and herbs.",
    price: 230.00,
    category: "Pasta",
    imageUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Lasagna",
    description: "Layers of pasta sheets baked with rich tomato-veggie ragù, bechamel, and mozzarella.",
    price: 270.00,
    category: "Pasta",
    imageUrl: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 10. Speciality Pasta
  {
    name: "Stuff Mushroom",
    description: "Handcrafted gourmet pasta parcels filled with cheese-stuffed wild forest mushrooms.",
    price: 290.00,
    category: "Speciality Pasta",
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Classic Cannelloni",
    description: "Pasta tubes rolled with spinach and ricotta, baked in rich marinara and bechamel.",
    price: 270.00,
    category: "Speciality Pasta",
    imageUrl: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Classmate Special",
    description: "Our chef's signature gourmet pasta preparation featuring exquisite cheeses and spices.",
    price: 290.00,
    category: "Speciality Pasta",
    imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 11. Stroganoff
  {
    name: "Veg Stroganoff",
    description: "Fresh garden vegetables cooked in a rich, tangy sour-cream and mushroom herb sauce.",
    price: 210.00,
    category: "Stroganoff",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Mushroom Stroganoff",
    description: "Earthy white mushrooms and onions simmered in a velvety, spiced sour cream sauce.",
    price: 210.00,
    category: "Stroganoff",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chef Special Stroganoff",
    description: "Gourmet stroganoff prepared with exotic greens, specialty herbs, and double cream.",
    price: 230.00,
    category: "Stroganoff",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 12. Spaghetti
  {
    name: "Spaghetti (Aglio e Olio)",
    description: "Long pasta strands tossed in premium olive oil, golden toasted garlic slivers, and chili flakes.",
    price: 220.00,
    category: "Spaghetti",
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3bb64d0be5e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Spaghetti Siciliana",
    description: "Spaghetti tossed in a traditional Sicilian sauce of red tomatoes, capers, olives, and basil.",
    price: 230.00,
    category: "Spaghetti",
    imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 13. Chef's Special
  {
    name: "Pesto Cottage Cheese",
    description: "Grilled cottage cheese blocks marinated in fresh basil pesto, served with sautéed greens.",
    price: 290.00,
    category: "Chef's Special",
    imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Creamy Mushroom Rice",
    description: "Arborio-style rice simmered with wild forest mushrooms and a velvety cream reduction.",
    price: 270.00,
    category: "Chef's Special",
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Peri Peri Chicken Marinate",
    description: "Juicy chicken breast marinated in fiery peri peri spice, grilled to perfection.",
    price: 270.00,
    category: "Chef's Special",
    imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },
  {
    name: "Pesto Chicken",
    description: "Tender grilled chicken breasts basted in smooth homemade basil pesto sauce.",
    price: 290.00,
    category: "Chef's Special",
    imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },
  {
    name: "Grilled Chicken",
    description: "Perfectly seasoned, flame-grilled chicken breast served with steamed veggies.",
    price: 250.00,
    category: "Chef's Special",
    imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },

  // 14. Rice Meals
  {
    name: "Hub Rice",
    description: "Our cafe's special spiced aromatic rice tossed with chopped bell peppers.",
    price: 210.00,
    category: "Rice Meals",
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Veg Thai Curry",
    description: "Aromatic sweet-spicy green coconut milk curry loaded with exotic veggies, served with steamed jasmine rice.",
    price: 250.00,
    category: "Rice Meals",
    imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Hot Chilli Garlic Sauce with Rice",
    description: "Spicy stir-fried vegetables in pungent szechuan chilli garlic sauce, served with rice.",
    price: 250.00,
    category: "Rice Meals",
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Hub Makhani",
    description: "Soft paneer cubes cooked in a sweet-spicy, buttery tomato gravy, served with makhani rice.",
    price: 270.00,
    category: "Rice Meals",
    imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chicken Saoji Rice",
    description: "Spicy, authentic regional Saoji chicken gravy served over aromatic rice.",
    price: 270.00,
    category: "Rice Meals",
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },

  // 15. Wraps
  {
    name: "Veggie Wrap",
    description: "Whole wheat tortilla rolled with crunchy garden greens, carrots, and sweet mayo.",
    price: 170.00,
    category: "Wraps",
    imageUrl: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Paneer Wrap",
    description: "Warm flatbread rolled with marinated paneer tikka cubes, crisp red onions, lettuce, and tangy herb dressing.",
    price: 170.00,
    category: "Wraps",
    imageUrl: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chicken Wrap",
    description: "Warm wrap stuffed with seasoned chicken strips, crispy onions, and garlic aioli.",
    price: 190.00,
    category: "Wraps",
    imageUrl: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },

  // 16. Sizzlers
  {
    name: "Italian Sizzler",
    description: "Hot iron platter with herbed rice, penne pasta, sautéed exotic veggies, and marinara.",
    price: 270.00,
    category: "Sizzlers",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Continental Sizzler",
    description: "Sizzling platter loaded with paneer steak, boiled veggies, potato wedges, and pepper gravy.",
    price: 290.00,
    category: "Sizzlers",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chicken Sizzler",
    description: "Sizzling platter featuring grilled chicken breasts, thick pepper sauce, fries, and veggies.",
    price: 310.00,
    category: "Sizzlers",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },

  // 17. Add-ons
  {
    name: "Veggies",
    description: "Extra portion of grilled or steamed seasonal garden vegetables.",
    price: 30.00,
    category: "Add-ons",
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Cheese",
    description: "Extra slice or shred of premium cheddar or mozzarella cheese.",
    price: 30.00,
    category: "Add-ons",
    imageUrl: "https://images.unsplash.com/photo-1552763440-4793eb3dedec?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Mushroom",
    description: "Extra helping of seasoned forest sautéed mushrooms.",
    price: 30.00,
    category: "Add-ons",
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chicken",
    description: "An extra portion of grilled or seasoned chicken breast strips.",
    price: 50.00,
    category: "Add-ons",
    imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
    dietType: "non-veg",
    isAvailable: true
  },
  {
    name: "Multigrain Panini",
    description: "Substitute with a high-fiber, healthy multigrain bread loaf.",
    price: 80.00,
    category: "Add-ons",
    imageUrl: "https://images.unsplash.com/photo-1520174691701-bc555a3404ca?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 18. Mocktails
  {
    name: "Mint-to-be Mojito",
    description: "Citrus cooling drink muddled with fresh mint, lime slices, sugar, and club soda.",
    price: 150.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Blue Virgin Mojito",
    description: "Refreshing blue curaçao extract, lime, sparkling soda, and mint leaves on crushed ice.",
    price: 150.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Pan Mojito",
    description: "A unique sweet mocktail featuring cool betel-leaf (paan) syrup and fresh lime.",
    price: 130.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Blue Ginger Mojito",
    description: "Zesty orange blue curaçao mocktail spiked with warm fresh ginger root juices.",
    price: 130.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Raspberry Mojito",
    description: "Cooling muddled mint and lime cocktail infused with sweet raspberry crush.",
    price: 130.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Watermelon Mojito",
    description: "Fruity watermelon nectar shaken with ice cold mint sprigs and lime slices.",
    price: 130.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Green Apple Mojito",
    description: "Sparkling sweet-tart green apple syrup shaken with mint, soda, and lime juices.",
    price: 130.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Peach Passion Fruit Mojito",
    description: "A tropical fusion of aromatic peaches, passion fruit syrup, lime, and cooling mint.",
    price: 130.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Spicy Mango Mojito",
    description: "Mango puree seasoned with mild chili flakes, fresh mint leaves, and lime soda.",
    price: 130.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Bubble Gum Mojito",
    description: "A sweet nostalgia trip with bubble gum flavor, lemon slices, and sparkling water.",
    price: 130.00,
    category: "Mocktails",
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 19. Our Speciality
  {
    name: "Red Mojito",
    description: "Red Bull energy drink poured over mixed berry infusions, lime, and crushed mint.",
    price: 170.00,
    category: "Our Speciality",
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Sex on the Beach",
    description: "Refreshing peach, cranberry, and orange juices served over crushed ice and soda.",
    price: 150.00,
    category: "Our Speciality",
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Oraki Mojito",
    description: "Our house special mixed citrus and passion fruit mojito with high carbonation.",
    price: 150.00,
    category: "Our Speciality",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 20. Fruit Base
  {
    name: "Lychee Rasp",
    description: "Exotic lychee fruit nectar combined with sweet raspberry syrup over ice.",
    price: 150.00,
    category: "Fruit Base",
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Yellow Quench",
    description: "A zesting combination of sweet pineapple juice, lemon, and a touch of passionfruit.",
    price: 150.00,
    category: "Fruit Base",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Screwdriver",
    description: "Classic screwdriver with sweet double-squeezed orange juice and ginger ale.",
    price: 150.00,
    category: "Fruit Base",
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Frutilla",
    description: "Vibrant and creamy strawberry mocktail blended with sweet citrus elements.",
    price: 150.00,
    category: "Fruit Base",
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Pina Colada",
    description: "Rich, blended sweet beverage of smooth coconut milk and tangy pineapple nectar.",
    price: 170.00,
    category: "Fruit Base",
    imageUrl: "https://images.unsplash.com/photo-1546171751-70948e261448?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Custard Melon",
    description: "A sweet drink of blended musk melon and vanilla custard cream on ice.",
    price: 170.00,
    category: "Fruit Base",
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 21. Shakes
  {
    name: "Chocolate Shake",
    description: "Thick, creamy chocolate milkshake topped with Belgian chocolate syrup.",
    price: 130.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Caramel Shake",
    description: "Creamy milkshake blended with sweet butterscotch and liquid caramel.",
    price: 130.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Hazelnut Shake",
    description: "A sweet chocolate-hazelnut infusion blended with rich vanilla gelato.",
    price: 130.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Butterscotch Shake",
    description: "Milky shake packed with sweet crunchy butterscotch praline chips.",
    price: 130.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Kit-Kat Shake",
    description: "Rich cocoa shake blended with milk and loaded with crunchy crushed Kit-Kat wafer crumbs.",
    price: 150.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Oreo Shake",
    description: "Decadent cream-rich milkshake blended with classic Oreo cookies.",
    price: 150.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Choco Hazelnut Shake",
    description: "Thick double-chocolate shake infused with sweet nutella hazelnut spread.",
    price: 150.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chocolate Brownie Shake",
    description: "Gourmet thick shake blended with whole chocolate fudge brownie chunks.",
    price: 170.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Walnut Brownie Shake",
    description: "Delicious fudge shake blended with walnuts and freshly baked brownie bits.",
    price: 170.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Sweet Devil",
    description: "Our signature dark, double chocolate fudge and vanilla swirl monster milkshake.",
    price: 170.00,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 22. Desserts
  {
    name: "Pancake",
    description: "Three fluffy golden buttermilk pancakes drizzled with sweet maple syrup.",
    price: 170.00,
    category: "Desserts",
    imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Chocolate Pancake",
    description: "Fluffy pancakes topped with hot chocolate fudge syrup and rich chocolate chips.",
    price: 190.00,
    category: "Desserts",
    imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Nutella Pancake",
    description: "Fluffy stacked pancakes generously smothered with hot nutella spread.",
    price: 190.00,
    category: "Desserts",
    imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Banana Pancake",
    description: "Buttermilk pancakes layered with caramelized fresh banana slices and maple syrup.",
    price: 170.00,
    category: "Desserts",
    imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Sizzling Brownie",
    description: "Hot iron platter featuring a warm chocolate brownie topped with cold vanilla bean scoop.",
    price: 200.00,
    category: "Desserts",
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 23. Other Beverages
  {
    name: "Red Bull",
    description: "Premium, ice cold energy drink served straight from the can.",
    price: 150.00,
    category: "Other Beverages",
    imageUrl: "https://images.unsplash.com/photo-1622543953490-0b70e13bc5e5?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Hell",
    description: "Ice cold popular energy drink served chilled.",
    price: 90.00,
    category: "Other Beverages",
    imageUrl: "https://images.unsplash.com/photo-1622543953490-0b70e13bc5e5?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Ginger Ale",
    description: "Crisp ginger-infused carbonated beverage.",
    price: 95.00,
    category: "Other Beverages",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },

  // 24. Winter Special
  {
    name: "Veg Cheese Momo (Steam)",
    description: "Served with rich house dip. Steamed dumplings stuffed with veggies and gooey cheese.",
    price: 150.00,
    category: "Winter Special",
    imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Paneer Momo (Steam)",
    description: "Steamed dumplings stuffed with soft, seasoned grated cottage cheese.",
    price: 170.00,
    category: "Winter Special",
    imageUrl: "https://images.unsplash.com/photo-1625220194771-7ebedd0b4a1b?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Veg Cheese Momo (Fried)",
    description: "Crisp golden fried dumplings filled with rich spiced veggies and melted mozzarella.",
    price: 170.00,
    category: "Winter Special",
    imageUrl: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Paneer Momo (Fried)",
    description: "Crispy fried parcels filled with spiced paneer and deep fried to perfection.",
    price: 190.00,
    category: "Winter Special",
    imageUrl: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Hot & Sour Soup",
    description: "Tangy and spicy thick broth packed with mushrooms, bamboo shoots, and green onions.",
    price: 150.00,
    category: "Winter Special",
    imageUrl: "https://images.unsplash.com/photo-1547592165-e1d17fed6006?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Manchow Soup",
    description: "Pungent vegetable dark broth with crispy noodles and fresh coriander garnish.",
    price: 170.00,
    category: "Winter Special",
    imageUrl: "https://images.unsplash.com/photo-1547592165-e1d17fed6006?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Corn Soup",
    description: "Rich, creamy soup made with crushed golden sweet corn kernels and herbs.",
    price: 190.00,
    category: "Winter Special",
    imageUrl: "https://images.unsplash.com/photo-1547592165-e1d17fed6006?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Hot Chocolate",
    description: "Warm thick Belgian dark chocolate milk topped with fluffy marshmallows.",
    price: 170.00,
    category: "Winter Special",
    imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  },
  {
    name: "Cinnamon Hot Chocolate",
    description: "Rich warm chocolate drink spiked with sweet freshly grated cinnamon bark.",
    price: 190.00,
    category: "Winter Special",
    imageUrl: "https://images.unsplash.com/photo-1577003833619-76bbd39a2760?auto=format&fit=crop&w=600&q=80",
    dietType: "veg",
    isAvailable: true
  }
];
