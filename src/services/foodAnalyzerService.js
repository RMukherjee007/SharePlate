const path = require('path');

/**
 * Complete mapping of all 101 Kaggle/ETHZ Food-101 classes to:
 * - Clean human-readable name
 * - SharePlate category ('Prepared_Meals', 'Baked_Goods', 'Produce', 'Dairy', 'Refrigerated', 'Dry_Goods', 'Beverages')
 * - Safe shelf life hours ('12', '24', '48')
 * - Dietary tags ('Vegan', 'Gluten-Free', 'Halal', 'Dairy-Free', 'Nut-Free')
 */
const FOOD101_MAPPING = {
  apple_pie: { name: 'Apple Pie', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  baby_back_ribs: { name: 'Barbecue Ribs', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  baklava: { name: 'Baklava Pastry', category: 'Baked_Goods', expiry: '48', tags: [] },
  beef_carpaccio: { name: 'Sliced Beef Platter', category: 'Refrigerated', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  beef_tartare: { name: 'Seasoned Beef Dish', category: 'Refrigerated', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  beet_salad: { name: 'Fresh Beet Salad', category: 'Produce', expiry: '24', tags: ['Gluten-Free', 'Nut-Free'] },
  beignets: { name: 'Beignets / Fried Pastries', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  bibimbap: { name: 'Rice & Vegetable Bowl (Bibimbap)', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  bread_pudding: { name: 'Bread Pudding', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  breakfast_burrito: { name: 'Breakfast Burrito / Wrap', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  bruschetta: { name: 'Tomato Bruschetta Bread', category: 'Baked_Goods', expiry: '12', tags: ['Vegan', 'Dairy-Free', 'Nut-Free'] },
  caesar_salad: { name: 'Caesar Salad', category: 'Produce', expiry: '24', tags: ['Nut-Free'] },
  cannoli: { name: 'Cannoli Pastry', category: 'Baked_Goods', expiry: '24', tags: [] },
  caprese_salad: { name: 'Tomato & Mozzarella Caprese Salad', category: 'Produce', expiry: '24', tags: ['Gluten-Free', 'Nut-Free'] },
  carrot_cake: { name: 'Cake', isCake: true, specificCake: 'Carrot / Frosted Cake', category: 'Baked_Goods', expiry: '24', tags: [] },
  ceviche: { name: 'Chilled Seafood Ceviche', category: 'Refrigerated', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  cheesecake: { name: 'Cheesecake', isCake: true, specificCake: 'Cheesecake / Cream Cake', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  cheese_plate: { name: 'Assorted Cheese Platter', category: 'Dairy', expiry: '24', tags: ['Gluten-Free', 'Nut-Free'] },
  chicken_curry: { name: 'Chicken Curry', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  chicken_quesadilla: { name: 'Chicken Quesadilla', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  chicken_wings: { name: 'Cooked Chicken Wings', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  chocolate_cake: { name: 'Chocolate Cake', isCake: true, specificCake: 'Chocolate Cake', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  chocolate_mousse: { name: 'Chocolate Mousse Dessert', category: 'Dairy', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  churros: { name: 'Churros Pastries', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  clam_chowder: { name: 'Cream Soup / Chowder', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  club_sandwich: { name: 'Club Sandwich', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  crab_cakes: { name: 'Savory Patties / Cutlets', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  creme_brulee: { name: 'Custard Dessert', category: 'Dairy', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  croque_madame: { name: 'Toasted Cheese Sandwich', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  cup_cakes: { name: 'Cupcakes / Frosted Cake', isCake: true, specificCake: 'Vanilla / Frosted Cupcake', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  deviled_eggs: { name: 'Prepared Eggs Tray', category: 'Refrigerated', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  donuts: { name: 'Donuts', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  dumplings: { name: 'Steamed / Pan-Fried Dumplings', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  edamame: { name: 'Fresh Edamame Beans', category: 'Produce', expiry: '24', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  eggs_benedict: { name: 'Breakfast Egg Platter', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  escargots: { name: 'Cooked Appetizer Tray', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  falafel: { name: 'Falafel Platter', category: 'Prepared_Meals', expiry: '24', tags: ['Vegan', 'Dairy-Free', 'Nut-Free'] },
  filet_mignon: { name: 'Cooked Steak / Meat Entree', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  fish_and_chips: { name: 'Battered Fish & Fries', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  foie_gras: { name: 'Prepared Savory Entree', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  french_fries: { name: 'French Fries / Roasted Potatoes', category: 'Prepared_Meals', expiry: '12', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  french_onion_soup: { name: 'Hot Soup Bowl', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  french_toast: { name: 'French Toast', category: 'Baked_Goods', expiry: '12', tags: ['Nut-Free'] },
  fried_calamari: { name: 'Crispy Fried Appetizer', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  fried_rice: { name: 'Cooked Rice / Biryani', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  frozen_yogurt: { name: 'Yogurt / Soft Serve', category: 'Dairy', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  garlic_bread: { name: 'Garlic Bread Loaves', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  gnocchi: { name: 'Potato Gnocchi Pasta', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  greek_salad: { name: 'Fresh Greek Salad', category: 'Produce', expiry: '24', tags: ['Gluten-Free', 'Nut-Free'] },
  grilled_cheese_sandwich: { name: 'Grilled Cheese Sandwich', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  grilled_salmon: { name: 'Grilled Salmon / Fish Fillet', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  guacamole: { name: 'Fresh Avocado Guacamole', category: 'Produce', expiry: '12', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  gyoza: { name: 'Dumplings / Gyoza', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  hamburger: { name: 'Burger / Sandwich', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  hot_and_sour_soup: { name: 'Hot Soup', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  hot_dog: { name: 'Hot Dog / Sausage Roll', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  huevos_rancheros: { name: 'Egg & Tortilla Meal', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  hummus: { name: 'Chickpea Hummus Tray', category: 'Refrigerated', expiry: '24', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  ice_cream: { name: 'Ice Cream / Chilled Dessert', category: 'Dairy', expiry: '12', tags: ['Gluten-Free'] },
  lasagna: { name: 'Baked Lasagna Tray', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  lobster_bisque: { name: 'Creamy Soup Bowl', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  lobster_roll_sandwich: { name: 'Sub Roll Sandwich', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  macaroni_and_cheese: { name: 'Macaroni & Cheese Tray', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  macarons: { name: 'Bakery Macarons / Cookies', category: 'Baked_Goods', expiry: '48', tags: ['Gluten-Free'] },
  miso_soup: { name: 'Miso / Vegetable Soup', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  mussels: { name: 'Cooked Seafood Platter', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  nachos: { name: 'Tortilla Chips & Nachos', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  omelette: { name: 'Cooked Omelette Tray', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  onion_rings: { name: 'Crispy Onion Rings', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  oysters: { name: 'Chilled Seafood Platter', category: 'Refrigerated', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  pad_thai: { name: 'Stir-Fried Noodles (Pad Thai)', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free'] },
  paella: { name: 'Spiced Rice Pilaf / Paella', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  pancakes: { name: 'Pancakes Stack', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  panna_cotta: { name: 'Cream Dessert / Panna Cotta', category: 'Dairy', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  peking_duck: { name: 'Roasted Poultry Platter', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  pho: { name: 'Noodle Soup Bowl', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  pizza: { name: 'Pizza', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  pork_chop: { name: 'Grilled Meat Entree', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  poutine: { name: 'Loaded Potato & Gravy Tray', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  prime_rib: { name: 'Roast Beef Entree', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  pulled_pork_sandwich: { name: 'BBQ Sandwich / Burger', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  ramen: { name: 'Ramen Noodle Bowl', category: 'Prepared_Meals', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  ravioli: { name: 'Stuffed Pasta / Ravioli', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  red_velvet_cake: { name: 'Red Velvet / Layered Cake', isCake: true, specificCake: 'Red Velvet / Frosted Cake', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  risotto: { name: 'Savory Rice / Risotto', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  samosa: { name: 'Samosas / Savory Pastries', category: 'Prepared_Meals', expiry: '24', tags: ['Vegan', 'Dairy-Free', 'Nut-Free'] },
  sashimi: { name: 'Chilled Fish Platter', category: 'Refrigerated', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  scallops: { name: 'Seared Seafood Entree', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  seaweed_salad: { name: 'Fresh Green Salad', category: 'Produce', expiry: '24', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  shrimp_and_grits: { name: 'Warm Savory Bowl', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  spaghetti_bolognese: { name: 'Spaghetti & Tomato Sauce', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  spaghetti_carbonara: { name: 'Creamy Pasta / Noodles', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  spring_rolls: { name: 'Vegetable Spring Rolls', category: 'Prepared_Meals', expiry: '12', tags: ['Vegan', 'Dairy-Free', 'Nut-Free'] },
  steak: { name: 'Grilled Steak Entree', category: 'Prepared_Meals', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  strawberry_shortcake: { name: 'Vanilla & Cream Cake', isCake: true, specificCake: 'Vanilla / Sponge Cake', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  sushi: { name: 'Sushi Rolls Platter', category: 'Refrigerated', expiry: '12', tags: ['Dairy-Free', 'Nut-Free'] },
  tacos: { name: 'Tacos Platter', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  takoyaki: { name: 'Savory Dumpling Balls', category: 'Prepared_Meals', expiry: '12', tags: ['Nut-Free'] },
  tiramisu: { name: 'Tiramisu / Layered Cake', isCake: true, specificCake: 'Layered Cream Cake', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] },
  tuna_tartare: { name: 'Chilled Salad / Tartare', category: 'Refrigerated', expiry: '12', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  waffles: { name: 'Baked Waffles', category: 'Baked_Goods', expiry: '24', tags: ['Nut-Free'] }
};

/**
 * Google ImageNet ViT & Text Catalog for raw fruits, vegetables, bakery loaves, dry goods, and beverages
 * that complement Food-101's prepared dishes.
 */
const FOOD_ITEM_CATALOG = [
  { name: 'Vanilla Cake', aliases: ['vanilla cake', 'sponge cake', 'white cake', 'birthday cake', 'buttercream cake', 'cream cake'], category: 'Baked_Goods', baseShelfHours: 24, expiryOption: '24', tags: ['Nut-Free'] },
  { name: 'Chocolate Cake', aliases: ['chocolate cake', 'fudge cake', 'brownie', 'brownies'], category: 'Baked_Goods', baseShelfHours: 24, expiryOption: '24', tags: ['Nut-Free'] },
  { name: 'Cake / Bakery Cake', aliases: ['cake', 'cakes', 'cupcake', 'cupcakes', 'cheesecake', 'shortcake', 'pastry cake', 'trifle'], category: 'Baked_Goods', baseShelfHours: 24, expiryOption: '24', tags: ['Nut-Free'] },
  { name: 'Bread Loaves & Rolls', aliases: ['bread', 'loaf', 'loaves', 'french loaf', 'sourdough', 'baguette', 'rolls', 'bun', 'buns', 'toast', 'dough', 'bagel', 'pretzel'], category: 'Baked_Goods', baseShelfHours: 24, expiryOption: '24', tags: ['Vegan', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Bakery Pastries & Donuts', aliases: ['donut', 'donuts', 'doughnut', 'pastry', 'pastries', 'croissant', 'muffin', 'muffins', 'cookie', 'cookies', 'bakery', 'bakeshop', 'bakehouse', 'waffle', 'pancake'], category: 'Baked_Goods', baseShelfHours: 24, expiryOption: '24', tags: ['Nut-Free'] },
  { name: 'Sandwiches & Wraps', aliases: ['sandwich', 'sandwiches', 'sub', 'wrap', 'wraps', 'panini', 'burger', 'cheeseburger', 'hot dog', 'hotdog'], category: 'Prepared_Meals', baseShelfHours: 12, expiryOption: '12', tags: ['Nut-Free'] },
  { name: 'Pizza', aliases: ['pizza', 'pizzas', 'flatbread'], category: 'Prepared_Meals', baseShelfHours: 12, expiryOption: '12', tags: ['Nut-Free'] },
  { name: 'Dry Pantry Staples & Grains', aliases: ['sack', 'sacks', 'basmati', 'raw rice', 'uncooked rice', 'canned', 'can', 'cans', 'lentils', 'beans', 'chickpeas', 'flour', 'oats', 'cereal', 'grains', 'dry goods', 'dry', 'non-perishable', 'crackers', 'packaged', 'pasta box'], category: 'Dry_Goods', baseShelfHours: 48, expiryOption: '48', tags: ['Vegan', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Prepared Meals & Cooked Dishes', aliases: ['cooked rice', 'fried rice', 'biryani', 'pulao', 'pilaf', 'curry', 'dal', 'sambar', 'stew', 'soup', 'consomme', 'hot pot', 'noodles', 'pasta', 'carbonara', 'spaghetti', 'lasagna', 'risotto', 'gnocchi', 'burrito', 'taco', 'tacos', 'mashed potato', 'meat loaf', 'potpie', 'paneer', 'chicken', 'samosa', 'dumplings', 'momos', 'meal', 'meals', 'catering', 'buffet', 'guacamole', 'rice'], category: 'Prepared_Meals', baseShelfHours: 12, expiryOption: '12', tags: ['Nut-Free'] },
  { name: 'Fresh Apples', aliases: ['apple', 'apples', 'granny smith', 'pomegranate', 'fig', 'pear'], category: 'Produce', baseShelfHours: 48, expiryOption: '48', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Fresh Bananas', aliases: ['banana', 'bananas', 'plantain'], category: 'Produce', baseShelfHours: 24, expiryOption: '24', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Oranges / Citrus Fruit', aliases: ['orange', 'oranges', 'lemon', 'lemons', 'lime', 'citrus', 'pineapple', 'jackfruit', 'custard apple'], category: 'Produce', baseShelfHours: 48, expiryOption: '48', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Fresh Berries & Fruit', aliases: ['strawberry', 'strawberries', 'berries', 'fruit', 'fruits', 'grapes', 'mango', 'watermelon', 'peach', 'plum'], category: 'Produce', baseShelfHours: 24, expiryOption: '24', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Broccoli & Fresh Greens', aliases: ['broccoli', 'cauliflower', 'head cabbage', 'cabbage', 'artichoke', 'brussels sprout'], category: 'Produce', baseShelfHours: 24, expiryOption: '24', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Carrots & Root Vegetables', aliases: ['carrot', 'carrots', 'potato', 'potatoes', 'onion', 'onions', 'turnip', 'radish', 'sweet potato'], category: 'Produce', baseShelfHours: 48, expiryOption: '48', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Fresh Garden Salad / Vegetables', aliases: ['salad', 'lettuce', 'spinach', 'greens', 'cucumber', 'zucchini', 'squash', 'acorn squash', 'butternut squash', 'spaghetti squash', 'bell pepper', 'pepper', 'tomato', 'tomatoes', 'mushroom', 'vegetable', 'vegetables', 'produce', 'corn', 'ear, spike, capitulum', 'cardoon'], category: 'Produce', baseShelfHours: 24, expiryOption: '24', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Dairy, Milk & Yogurt', aliases: ['milk', 'cheese', 'yogurt', 'curd', 'butter', 'cream', 'ice cream', 'dairy', 'paneer pack', 'eggnog'], category: 'Dairy', baseShelfHours: 12, expiryOption: '12', tags: ['Gluten-Free', 'Nut-Free'] },
  { name: 'Refrigerated & Chilled Food', aliases: ['refrigerated', 'chilled', 'cold pack', 'deli', 'tofu', 'hummus'], category: 'Refrigerated', baseShelfHours: 24, expiryOption: '24', tags: ['Nut-Free'] },
  { name: 'Bottled Beverages & Drinks', aliases: ['bottle', 'bottles', 'water bottle', 'pop bottle', 'juice', 'water', 'drink', 'drinks', 'beverage', 'beverages', 'smoothie', 'tea', 'coffee', 'espresso', 'cup'], category: 'Beverages', baseShelfHours: 24, expiryOption: '24', tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Prepared Meal Trays', aliases: ['tray', 'trays', 'bowl', 'plate'], category: 'Prepared_Meals', baseShelfHours: 12, expiryOption: '12', tags: ['Nut-Free'] }
];

// Lazy-loaded singleton pipelines for the pre-trained Food-101, Google ViT, and YOLOS models
let visionPipelinesPromise = null;

const getVisionPipelines = async () => {
  if (!visionPipelinesPromise) {
    visionPipelinesPromise = (async () => {
      try {
        const { pipeline, env, RawImage } = await import('@huggingface/transformers');
        env.cacheDir = path.join(__dirname, '../../.cache/huggingface');

        const [food101Classifier, googleVitClassifier, objectDetector] = await Promise.all([
          pipeline('image-classification', 'onnx-community/swin-finetuned-food101-ONNX', { dtype: 'q8' }),
          pipeline('image-classification', 'Xenova/vit-base-patch16-224', { dtype: 'q8' }),
          pipeline('object-detection', 'Xenova/yolos-tiny', { dtype: 'q8' })
        ]);

        console.log('Pre-trained Food-101 Swin Transformer, Google ViT, and YOLOS Object Detector ready.');
        return { food101Classifier, googleVitClassifier, objectDetector, RawImage };
      } catch (err) {
        console.warn('Pre-trained vision pipeline load warning:', err.message);
        return null;
      }
    })();
  }
  return visionPipelinesPromise;
};

// Warm up vision models in the background when server starts
getVisionPipelines().catch(() => {});

/**
 * Matches a text string or model label against FOOD_ITEM_CATALOG
 */
const matchCatalogItem = (labelStr) => {
  if (!labelStr) return null;
  const norm = String(labelStr).toLowerCase().replace(/_/g, ' ').trim();
  for (const item of FOOD_ITEM_CATALOG) {
    for (const alias of item.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(norm)) {
        return item;
      }
    }
  }
  return null;
};

/**
 * Runs real pre-trained Food-101 Swin Transformer + Google ViT + YOLOS Object Detection
 * on a base64 image data URL.
 */
const classifyImageWithPretrainedModels = async (imageDataUrl, visualProfile) => {
  if (!imageDataUrl || typeof imageDataUrl !== 'string') return null;

  const base64Match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const mimeType = base64Match ? base64Match[1] : 'image/jpeg';
  const base64Data = base64Match ? base64Match[2] : imageDataUrl;

  const pipelines = await getVisionPipelines();
  if (!pipelines) return null;

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const rawImage = await pipelines.RawImage.fromBlob(new Blob([buffer], { type: mimeType }));

    const [food101Preds, vitPreds, detections] = await Promise.all([
      pipelines.food101Classifier(rawImage, { topk: 5 }),
      pipelines.googleVitClassifier(rawImage, { topk: 5 }),
      pipelines.objectDetector(rawImage, { threshold: 0.30 })
    ]);

    const vp = visualProfile || {};

    // 1. Count detected food instances & bounding boxes from YOLOS object detector
    const foodClassesInCoco = new Set([
      'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
      'hot dog', 'pizza', 'donut', 'cake', 'bowl', 'cup', 'bottle'
    ]);

    const relevantDetections = (detections || []).filter(d => foodClassesInCoco.has(d.label));
    const classCounts = {};
    for (const d of relevantDetections) {
      classCounts[d.label] = (classCounts[d.label] || 0) + 1;
    }

    let dominantCocoClass = null;
    let dominantCocoCount = 0;
    for (const [cls, cnt] of Object.entries(classCounts)) {
      if (cnt > dominantCocoCount) {
        dominantCocoCount = cnt;
        dominantCocoClass = cls;
      }
    }

    const imgW = rawImage.width || 224;
    const imgH = rawImage.height || 224;
    const normalizedBoxes = (dominantCocoClass
      ? relevantDetections.filter(d => d.label === dominantCocoClass)
      : relevantDetections
    ).map(d => ({
      label: d.label,
      score: Number(d.score.toFixed(2)),
      x: Math.max(0, d.box.xmin / imgW),
      y: Math.max(0, d.box.ymin / imgH),
      w: Math.min(1, (d.box.xmax - d.box.xmin) / imgW),
      h: Math.min(1, (d.box.ymax - d.box.ymin) / imgH)
    }));

    // 2. Check if Google ViT or YOLOS strongly identifies raw produce, bakery loaf, cake, or beverage
    // (Food-101 only contains prepared restaurant dishes, not raw bananas/apples/broccoli/water bottles)
    const topVit = vitPreds && vitPreds[0];
    if (topVit && topVit.score >= 0.22) {
      const vitLabel = topVit.label.toLowerCase();
      // Raw fruits, vegetables, bread loaves, or bottles where ImageNet ViT excels
      const rawProduceOrBakeryKeywords = [
        'banana', 'granny smith', 'apple', 'orange', 'lemon', 'strawberry', 'pineapple',
        'pomegranate', 'fig', 'broccoli', 'cauliflower', 'cabbage', 'bell pepper',
        'cucumber', 'zucchini', 'mushroom', 'corn', 'ear, spike', 'french loaf',
        'bagel', 'pretzel', 'water bottle', 'pop bottle'
      ];
      if (rawProduceOrBakeryKeywords.some(k => vitLabel.includes(k))) {
        const matchedVit = matchCatalogItem(vitLabel);
        if (matchedVit) {
          return {
            name: matchedVit.name,
            category: matchedVit.category,
            expiry: matchedVit.expiryOption,
            tags: matchedVit.tags,
            confidence: Math.min(99, Math.round(topVit.score * 100 + 15)),
            detectedCount: dominantCocoCount > 0 ? dominantCocoCount : null,
            boundingBoxes: normalizedBoxes
          };
        }
      }
    }

    // 3. Check if YOLOS object detector directly detected a specific food object (like 'cake', 'banana', 'apple', 'orange', 'broccoli', 'carrot', 'donut', 'pizza', 'sandwich')
    const specificYolosClasses = ['banana', 'apple', 'orange', 'broccoli', 'carrot', 'pizza', 'donut', 'cake', 'sandwich', 'hot dog'];
    const specificYolosHit = relevantDetections.find(d => specificYolosClasses.includes(d.label) && d.score >= 0.45);

    // 4. Evaluate Food-101 Swin Vision Transformer top predictions
    const topFood101 = food101Preds && food101Preds[0];
    if (topFood101) {
      // Check if any top-3 Food-101 prediction is a cake or if YOLOS/ViT says cake/bakery
      const cakeClasses = ['cup_cakes', 'strawberry_shortcake', 'cheesecake', 'carrot_cake', 'chocolate_cake', 'red_velvet_cake', 'tiramisu', 'cannoli', 'shortcake'];
      const top3Cake = food101Preds.slice(0, 3).find(p => cakeClasses.includes(p.label) && p.score >= 0.12);
      const vitSaysCakeOrBakery = (vitPreds || []).slice(0, 3).some(p =>
        /\b(bakery|bakeshop|trifle|dough|ice cream|cake|candle)\b/i.test(p.label)
      );

      if (
        (specificYolosHit && specificYolosHit.label === 'cake') ||
        (top3Cake && (topFood101.score < 0.55 || cakeClasses.includes(topFood101.label) || vitSaysCakeOrBakery))
      ) {
        const isDarkChocolate = (vp.darkBrownRatio ?? 0) > 0.22 || (vp.brightness != null && vp.brightness < 95);
        const cakeLabel = top3Cake ? top3Cake.label : 'strawberry_shortcake';
        let cakeName = 'Vanilla / Cream Cake';
        if (cakeLabel === 'chocolate_cake' || isDarkChocolate) {
          cakeName = 'Chocolate Cake';
        } else if (cakeLabel === 'cup_cakes') {
          cakeName = 'Vanilla / Frosted Cupcakes';
        } else if (cakeLabel === 'cheesecake') {
          cakeName = 'Cheesecake';
        } else if (cakeLabel === 'red_velvet_cake') {
          cakeName = 'Red Velvet Cake';
        } else if (cakeLabel === 'carrot_cake' && (vp.warmRatio ?? 0) > 0.35) {
          cakeName = 'Carrot / Spice Cake';
        }

        return {
          name: cakeName,
          category: 'Baked_Goods',
          expiry: '24',
          tags: ['Nut-Free'],
          confidence: Math.min(98, Math.max(84, Math.round((top3Cake?.score || 0.85) * 100))),
          detectedCount: dominantCocoCount > 0 ? dominantCocoCount : null,
          boundingBoxes: normalizedBoxes
        };
      }

      // If YOLOS had a high-confidence hit on a specific fruit/veg/item and Food-101 confidence is low (< 0.35)
      if (specificYolosHit && topFood101.score < 0.35) {
        const matchedYolos = matchCatalogItem(specificYolosHit.label);
        if (matchedYolos) {
          return {
            name: matchedYolos.name,
            category: matchedYolos.category,
            expiry: matchedYolos.expiryOption,
            tags: matchedYolos.tags,
            confidence: Math.min(96, Math.round(specificYolosHit.score * 100 + 10)),
            detectedCount: dominantCocoCount > 0 ? dominantCocoCount : null,
            boundingBoxes: normalizedBoxes
          };
        }
      }

      // Standard Food-101 mapping
      const mapped = FOOD101_MAPPING[topFood101.label];
      if (mapped) {
        let displayName = mapped.name;
        if (mapped.isCake) {
          const isLightCream = (vp.brightness == null || vp.brightness >= 125) && (vp.darkBrownRatio ?? 0) < 0.20;
          if (isLightCream && topFood101.label !== 'chocolate_cake' && topFood101.label !== 'red_velvet_cake') {
            displayName = 'Vanilla / Cream Cake';
          } else {
            displayName = mapped.specificCake || mapped.name;
          }
        }
        return {
          name: displayName,
          category: mapped.category,
          expiry: mapped.expiry,
          tags: mapped.tags,
          confidence: Math.min(99, Math.max(80, Math.round(topFood101.score * 100))),
          detectedCount: dominantCocoCount > 0 ? dominantCocoCount : null,
          boundingBoxes: normalizedBoxes
        };
      }
    }
  } catch (err) {
    console.warn('Pretrained image inference error:', err.message);
  }

  return null;
};

/**
 * Fallback visual feature classifier when only lightweight canvas color statistics are sent
 * (without raw image bytes or text notes).
 */
const inferFoodFromVisualProfile = (visualProfile) => {
  if (!visualProfile) return null;
  const green = visualProfile.greenRatio ?? 0;
  const warm = visualProfile.warmRatio ?? 0;
  const golden = visualProfile.goldenRatio ?? 0;
  const white = visualProfile.whiteRatio ?? 0;
  const redOrange = visualProfile.redOrangeRatio ?? 0;
  const darkBrown = visualProfile.darkBrownRatio ?? 0;
  const bright = visualProfile.brightness ?? 135;
  const sat = visualProfile.saturation ?? 0.35;

  // High green -> Fresh Produce / Salad
  if (green > 0.25) {
    return {
      name: 'Fresh Produce / Salad Greens',
      category: 'Produce',
      expiry: darkBrown > 0.20 ? '12' : '24',
      tags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free']
    };
  }

  // Cream / White / Light Pastel with moderate warmth -> Vanilla / Cream Cake or Bakery Item
  if (white > 0.25 && bright >= 140 && green < 0.12) {
    return {
      name: 'Vanilla / Cream Cake',
      category: 'Baked_Goods',
      expiry: '24',
      tags: ['Nut-Free']
    };
  }

  // Golden / Baked crust -> Bread / Baked Goods
  if (golden > 0.22 || (warm > 0.35 && sat < 0.48 && bright > 115)) {
    return {
      name: 'Baked Goods / Bread & Pastries',
      category: 'Baked_Goods',
      expiry: '24',
      tags: ['Nut-Free']
    };
  }

  // Dark brown -> Chocolate Cake / Bakery
  if (darkBrown > 0.28 && green < 0.1) {
    return {
      name: 'Chocolate Cake / Bakery Item',
      category: 'Baked_Goods',
      expiry: '24',
      tags: ['Nut-Free']
    };
  }

  // High red/orange saturation -> Prepared Meals / Curry / Pizza
  if (redOrange > 0.25 || (warm > 0.45 && sat >= 0.48)) {
    return {
      name: 'Prepared Meal Tray',
      category: 'Prepared_Meals',
      expiry: '12',
      tags: ['Nut-Free']
    };
  }

  return {
    name: 'Assorted Food Donation',
    category: 'Prepared_Meals',
    expiry: '24',
    tags: ['Nut-Free']
  };
};

/**
 * Main Food Analyzer Entrypoint
 */
const analyzeFoodDonation = async ({
  notes = '',
  fileName = '',
  imageDataUrl = null,
  visualProfile = null
}) => {
  const cleanNotes = String(notes || '').trim();
  const cleanFile = String(fileName || '').replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();

  let detectedName = null;
  let finalCategory = null;
  let expiryOption = '24';
  let baseTags = [];
  let confidencePct = 88;
  let detectedItemCount = null;
  let boundingBoxes = [];

  // STEP 1: Run Real Pre-Trained Food-101 Swin Transformer + Google ViT + YOLOS on uploaded image
  if (imageDataUrl) {
    const visionResult = await classifyImageWithPretrainedModels(imageDataUrl, visualProfile);
    if (visionResult) {
      detectedName = visionResult.name;
      finalCategory = visionResult.category;
      expiryOption = visionResult.expiry;
      baseTags = visionResult.tags || [];
      confidencePct = visionResult.confidence || 92;
      if (visionResult.detectedCount != null && visionResult.detectedCount > 0) {
        detectedItemCount = visionResult.detectedCount;
      }
      if (Array.isArray(visionResult.boundingBoxes) && visionResult.boundingBoxes.length > 0) {
        boundingBoxes = visionResult.boundingBoxes;
      }
    }
  }

  // STEP 2: Check text notes or descriptive filename (overrides or refines image when user explicitly types a food name)
  const textMatch = matchCatalogItem(cleanNotes) || matchCatalogItem(cleanFile);
  if (textMatch) {
    detectedName = textMatch.name;
    finalCategory = textMatch.category;
    expiryOption = textMatch.expiryOption;
    baseTags = textMatch.tags;
    confidencePct = Math.max(confidencePct, 94);
  } else if (!detectedName && cleanNotes) {
    // Also check if notes match a Food-101 key directly (e.g. "pad thai", "tiramisu", "samosa", "lasagna")
    const normNotes = cleanNotes.toLowerCase();
    for (const [key, val] of Object.entries(FOOD101_MAPPING)) {
      const phrase = key.replace(/_/g, ' ');
      if (normNotes.includes(phrase)) {
        detectedName = val.name;
        finalCategory = val.category;
        expiryOption = val.expiry;
        baseTags = val.tags;
        confidencePct = 94;
        break;
      }
    }
  }

  // STEP 4: Fallback to visual profile if no imageDataUrl or text matched
  if (!detectedName) {
    const vpResult = inferFoodFromVisualProfile(visualProfile);
    if (vpResult) {
      detectedName = vpResult.name;
      finalCategory = vpResult.category;
      expiryOption = vpResult.expiry;
      baseTags = vpResult.tags;
    } else {
      detectedName = 'Assorted Food Items';
      finalCategory = 'Prepared_Meals';
      expiryOption = '24';
      baseTags = [];
    }
  }

  // STEP 5: Determine Quantity (Number of Items of the Same Food Type)
  // 5a. Explicit count in text notes (e.g., "40 vegan salad bowls", "12 loaves", "3 trays")
  if (cleanNotes) {
    const qtyMatch = cleanNotes.match(/\b(\d+)\s*(?!kg\b|kilos?\b|kilograms?\b|g\b|grams?\b|lbs?\b|pounds?\b|hours?\b|hrs?\b|h\b)([a-zA-Z]+)/i);
    if (qtyMatch) {
      const parsedCount = parseInt(qtyMatch[1], 10);
      if (!isNaN(parsedCount) && parsedCount > 0 && parsedCount <= 10000) {
        detectedItemCount = parsedCount;
      }
    }
  }

  // 5b. Fallback to visual profile segmentation count or 1
  const vp = visualProfile || {};
  if (detectedItemCount == null) {
    if (vp.objectCount != null && vp.objectCount > 0) {
      detectedItemCount = vp.objectCount;
    } else {
      detectedItemCount = 1;
    }
  }

  // STEP 6: Extract Explicit Weight in kg OR Leave Blank for User Input
  let explicitWeightKg = '';
  const combinedText = `${cleanNotes} ${cleanFile}`.trim();
  const kgMatch = combinedText.match(/(\d+(?:\.\d+)?)\s*(kg|kilos|kilograms)\b/i);
  const gramMatch = combinedText.match(/(\d+(?:\.\d+)?)\s*(g|grams)\b/i);
  const lbMatch = combinedText.match(/(\d+(?:\.\d+)?)\s*(lb|lbs|pounds)\b/i);

  if (kgMatch) {
    explicitWeightKg = Number(parseFloat(kgMatch[1]).toFixed(2));
  } else if (gramMatch) {
    explicitWeightKg = Number((parseFloat(gramMatch[1]) / 1000).toFixed(2));
  } else if (lbMatch) {
    explicitWeightKg = Number((parseFloat(lbMatch[1]) * 0.453592).toFixed(2));
  }

  // STEP 7: Adjust Shelf Life Based on Food Category & Visual Freshness
  const browningLevel = vp.browningRatio ?? vp.darkBrownRatio ?? 0;
  if (browningLevel > 0.20 && finalCategory === 'Produce') {
    expiryOption = '12';
  } else if (finalCategory === 'Prepared_Meals' || finalCategory === 'Dairy') {
    expiryOption = '12';
  } else if (finalCategory === 'Dry_Goods') {
    expiryOption = '48';
  }

  // STEP 8: Infer Dietary Tags
  const tags = new Set(baseTags || []);
  const lowerNotes = cleanNotes.toLowerCase();
  if (lowerNotes.includes('vegan')) {
    tags.add('Vegan');
    tags.add('Dairy-Free');
  }
  if (lowerNotes.includes('gluten-free') || lowerNotes.includes('gluten free')) {
    tags.add('Gluten-Free');
  }
  if (lowerNotes.includes('halal')) {
    tags.add('Halal');
  }
  if (lowerNotes.includes('dairy-free') || lowerNotes.includes('dairy free')) {
    tags.add('Dairy-Free');
  }
  if (lowerNotes.includes('nut-free') || lowerNotes.includes('nut free')) {
    tags.add('Nut-Free');
  }
  if (/\b(chicken|beef|pork|meat|fish|mutton|salmon|steak|ribs)\b/i.test(lowerNotes)) {
    tags.delete('Vegan');
  }
  if (/\b(cheese|milk|cream|butter|paneer|yogurt)\b/i.test(lowerNotes)) {
    tags.delete('Vegan');
    tags.delete('Dairy-Free');
  }

  // Construct clean description for the form
  let suggestedDescription = cleanNotes;
  if (!suggestedDescription) {
    suggestedDescription = detectedItemCount > 1
      ? `${detectedItemCount}x ${detectedName}`
      : detectedName;
  } else if (detectedItemCount > 1 && !/\b\d+\b/.test(suggestedDescription)) {
    suggestedDescription = `${detectedItemCount}x ${suggestedDescription}`;
  }

  const storageGuidelines = {
    'Prepared_Meals': 'Keep refrigerated below 5°C or hot above 60°C until pickup (use within 12 hours).',
    'Baked_Goods': 'Store covered in a cool, dry place at room temperature (safe up to 24 hours).',
    'Produce': `Keep fresh produce cool and dry (recommended use within ${expiryOption} hours).`,
    'Dairy': 'Keep refrigerated between 1°C and 4°C at all times (use within 12 hours).',
    'Refrigerated': 'Maintain refrigeration below 5°C until pickup (use within 24 hours).',
    'Dry_Goods': 'Keep sealed in a dry storage area (safe for 48+ hours).',
    'Beverages': 'Keep sealed and chilled until pickup (safe up to 24 hours).'
  };

  return {
    detected_food_item: detectedName,
    detected_item_count: detectedItemCount,
    detected_item_unit: detectedItemCount === 1 ? 'item' : 'items',
    bounding_boxes: boundingBoxes,
    description: suggestedDescription,
    batch_type: finalCategory,
    weight_kg: explicitWeightKg,
    weight_detected: explicitWeightKg !== '',
    estimated_meals: explicitWeightKg !== '' ? Math.max(1, Math.round(Number(explicitWeightKg) / 0.5)) : null,
    expiry_hours: expiryOption,
    predicted_shelf_life_hours: Number(expiryOption),
    shelf_life_window: {
      hours: Number(expiryOption),
      storage: storageGuidelines[finalCategory] || 'Store safely until pickup.'
    },
    dietary_tags: Array.from(tags),
    safety_note: storageGuidelines[finalCategory] || 'Store safely until pickup.',
    confidence_pct: confidencePct
  };
};

module.exports = { analyzeFoodDonation };
