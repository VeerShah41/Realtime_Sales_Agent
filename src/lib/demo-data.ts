export type DemoProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  colors: string[];
  sizes: string[];
  stock: number;
  image: string;
  description: string;
  tags: string[];
  featured: boolean;
  rating: number;
};

const categoryPalette: Record<string, { bg: string; accent: string; label: string }> = {
  basketballs: { bg: "#f97316", accent: "#7c2d12", label: "Basketball" },
  footballs: { bg: "#2563eb", accent: "#0f172a", label: "Football" },
  "sports-shoes": { bg: "#111827", accent: "#f8fafc", label: "Sports Shoes" },
  rackets: { bg: "#16a34a", accent: "#052e16", label: "Racket" },
  "cricket-bats": { bg: "#a16207", accent: "#1c1917", label: "Cricket Bat" },
  "yoga-mats": { bg: "#7c3aed", accent: "#f5f3ff", label: "Yoga Mat" },
  "gym-bags": { bg: "#0891b2", accent: "#083344", label: "Gym Bag" },
  skates: { bg: "#db2777", accent: "#500724", label: "Skates" },
};

const imageOverrides: Record<string, string> = {
  "demo-1": "https://images.unsplash.com/photo-1546519638-68e109498ffc",
  "demo-2": "https://images.unsplash.com/photo-1519861531473-9200262188bf",
  "demo-4": "https://images.unsplash.com/photo-1517466787929-bc90951d0974",
  "demo-5": "https://images.unsplash.com/photo-1552667466-07770ae110d0",
  "demo-7": "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
  "demo-8": "https://images.unsplash.com/photo-1543508282-6319a3e2621f",
  "demo-10": "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6",
  "demo-12": "https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972",
  "demo-15": "https://images.unsplash.com/photo-1599447292412-4a0f2a2f6e2d",
  "demo-17": "https://images.unsplash.com/photo-1547949003-9792a18a2601",
  "demo-19": "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e",
};

const rawProducts: Omit<DemoProduct, "image">[] = [
  {
    id: "demo-1",
    slug: "nike-training-basketball",
    name: "Nike Training Basketball",
    category: "basketballs",
    brand: "Nike",
    price: 1299,
    colors: ["orange", "black"],
    sizes: ["Size 7"],
    stock: 14,
    description: "Durable outdoor basketball with strong grip and consistent bounce.",
    tags: ["basketball", "outdoor", "training", "nike"],
    featured: true,
    rating: 4.5,
  },
  {
    id: "demo-2",
    slug: "adidas-training-basketball",
    name: "Adidas Training Basketball",
    category: "basketballs",
    brand: "Adidas",
    price: 1199,
    colors: ["orange"],
    sizes: ["Size 7"],
    stock: 11,
    description: "Textured surface for better control during outdoor games.",
    tags: ["basketball", "training", "adidas"],
    featured: false,
    rating: 4.3,
  },
  {
    id: "demo-3",
    slug: "nivia-basketball",
    name: "Nivia Engraver Basketball",
    category: "basketballs",
    brand: "Nivia",
    price: 899,
    colors: ["orange"],
    sizes: ["Size 7"],
    stock: 20,
    description: "Budget-friendly basketball for beginners and practice.",
    tags: ["basketball", "budget", "nivia"],
    featured: false,
    rating: 4.1,
  },
  {
    id: "demo-4",
    slug: "nike-match-football",
    name: "Nike Match Football",
    category: "footballs",
    brand: "Nike",
    price: 1499,
    colors: ["white", "blue"],
    sizes: ["Size 5"],
    stock: 9,
    description: "Match-quality football with stable flight and soft touch.",
    tags: ["football", "match", "nike"],
    featured: true,
    rating: 4.6,
  },
  {
    id: "demo-5",
    slug: "adidas-training-football",
    name: "Adidas Training Football",
    category: "footballs",
    brand: "Adidas",
    price: 1399,
    colors: ["white", "red"],
    sizes: ["Size 5"],
    stock: 13,
    description: "Machine-stitched football ideal for training sessions.",
    tags: ["football", "training", "adidas"],
    featured: false,
    rating: 4.4,
  },
  {
    id: "demo-6",
    slug: "cosco-football",
    name: "Cosco Premier Football",
    category: "footballs",
    brand: "Cosco",
    price: 999,
    colors: ["white"],
    sizes: ["Size 5"],
    stock: 18,
    description: "Durable football suitable for school and practice games.",
    tags: ["football", "budget", "cosco"],
    featured: false,
    rating: 4,
  },
  {
    id: "demo-7",
    slug: "nike-running-shoes",
    name: "Nike Running Shoes",
    category: "sports-shoes",
    brand: "Nike",
    price: 3499,
    colors: ["black", "white"],
    sizes: ["Size 8", "Size 9", "Size 10"],
    stock: 7,
    description: "Lightweight running shoes with cushioned sole and comfort fit.",
    tags: ["running", "comfort", "nike"],
    featured: true,
    rating: 4.7,
  },
  {
    id: "demo-8",
    slug: "puma-training-shoes",
    name: "Puma Training Shoes",
    category: "sports-shoes",
    brand: "Puma",
    price: 2999,
    colors: ["blue", "white"],
    sizes: ["Size 7", "Size 8", "Size 9"],
    stock: 10,
    description: "Flexible shoes designed for gym and training sessions.",
    tags: ["training", "puma"],
    featured: false,
    rating: 4.3,
  },
  {
    id: "demo-9",
    slug: "adidas-running-shoes",
    name: "Adidas Running Shoes",
    category: "sports-shoes",
    brand: "Adidas",
    price: 3799,
    colors: ["black"],
    sizes: ["Size 8", "Size 9"],
    stock: 6,
    description: "Comfortable running shoes with excellent grip.",
    tags: ["running", "adidas"],
    featured: false,
    rating: 4.5,
  },
  {
    id: "demo-10",
    slug: "yonex-badminton-racket",
    name: "Yonex GR 303 Racket",
    category: "rackets",
    brand: "Yonex",
    price: 1999,
    colors: ["black"],
    sizes: ["G4"],
    stock: 12,
    description: "Lightweight racket suitable for beginners and intermediate players.",
    tags: ["badminton", "yonex"],
    featured: true,
    rating: 4.8,
  },
  {
    id: "demo-11",
    slug: "lining-badminton-racket",
    name: "Li-Ning Training Racket",
    category: "rackets",
    brand: "Li-Ning",
    price: 1799,
    colors: ["red"],
    sizes: ["G5"],
    stock: 9,
    description: "Balanced racket with good control and durability.",
    tags: ["badminton", "li-ning"],
    featured: false,
    rating: 4.4,
  },
  {
    id: "demo-12",
    slug: "sg-cricket-bat",
    name: "SG English Willow Bat",
    category: "cricket-bats",
    brand: "SG",
    price: 4999,
    colors: ["wood"],
    sizes: ["Short Handle"],
    stock: 5,
    description: "Premium bat for leather ball cricket with strong stroke play.",
    tags: ["cricket", "premium", "sg"],
    featured: true,
    rating: 4.8,
  },
  {
    id: "demo-13",
    slug: "ss-cricket-bat",
    name: "SS Ton Cricket Bat",
    category: "cricket-bats",
    brand: "SS",
    price: 4599,
    colors: ["wood"],
    sizes: ["Short Handle"],
    stock: 6,
    description: "Balanced bat with large sweet spot for match play.",
    tags: ["cricket", "ss"],
    featured: false,
    rating: 4.6,
  },
  {
    id: "demo-14",
    slug: "cosco-cricket-bat",
    name: "Cosco Kashmir Willow Bat",
    category: "cricket-bats",
    brand: "Cosco",
    price: 1899,
    colors: ["wood"],
    sizes: ["Short Handle"],
    stock: 14,
    description: "Entry-level bat for tennis ball and beginner practice.",
    tags: ["cricket", "budget", "cosco"],
    featured: false,
    rating: 4.1,
  },
  {
    id: "demo-15",
    slug: "nike-yoga-mat",
    name: "Nike Yoga Mat 6mm",
    category: "yoga-mats",
    brand: "Nike",
    price: 1299,
    colors: ["black"],
    sizes: ["6mm"],
    stock: 21,
    description: "Anti-slip yoga mat for daily workouts and stretching.",
    tags: ["yoga", "fitness", "nike"],
    featured: true,
    rating: 4.5,
  },
  {
    id: "demo-16",
    slug: "puma-yoga-mat",
    name: "Puma Exercise Mat 6mm",
    category: "yoga-mats",
    brand: "Puma",
    price: 999,
    colors: ["blue"],
    sizes: ["6mm"],
    stock: 17,
    description: "Soft mat designed for home fitness routines.",
    tags: ["fitness", "puma"],
    featured: false,
    rating: 4.3,
  },
  {
    id: "demo-17",
    slug: "nike-gym-bag",
    name: "Nike Duffel Gym Bag",
    category: "gym-bags",
    brand: "Nike",
    price: 1999,
    colors: ["black"],
    sizes: ["30L"],
    stock: 8,
    description: "Spacious gym bag with multiple compartments.",
    tags: ["gym", "nike"],
    featured: true,
    rating: 4.6,
  },
  {
    id: "demo-18",
    slug: "adidas-gym-bag",
    name: "Adidas Sports Bag",
    category: "gym-bags",
    brand: "Adidas",
    price: 1799,
    colors: ["blue"],
    sizes: ["30L"],
    stock: 10,
    description: "Durable sports bag for gym and travel.",
    tags: ["gym", "adidas"],
    featured: false,
    rating: 4.4,
  },
  {
    id: "demo-19",
    slug: "cosco-inline-skates",
    name: "Cosco Inline Skates",
    category: "skates",
    brand: "Cosco",
    price: 2499,
    colors: ["black"],
    sizes: ["Size 8", "Size 9"],
    stock: 6,
    description: "Beginner-friendly inline skates with smooth wheels.",
    tags: ["skating", "cosco"],
    featured: false,
    rating: 4.2,
  },
  {
    id: "demo-20",
    slug: "nivia-inline-skates",
    name: "Nivia Inline Skates",
    category: "skates",
    brand: "Nivia",
    price: 2699,
    colors: ["red"],
    sizes: ["Size 8"],
    stock: 5,
    description: "Comfortable skates with good ankle support.",
    tags: ["skating", "nivia"],
    featured: false,
    rating: 4.3,
  },
];

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildFallbackImage(product: Omit<DemoProduct, "image">) {
  const palette = categoryPalette[product.category] ?? {
    bg: "#0f766e",
    accent: "#ecfeff",
    label: product.category,
  };
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="760" viewBox="0 0 960 760">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.bg}" />
          <stop offset="100%" stop-color="${palette.accent}" />
        </linearGradient>
      </defs>
      <rect width="960" height="760" fill="url(#bg)" />
      <circle cx="760" cy="140" r="140" fill="rgba(255,255,255,0.12)" />
      <circle cx="200" cy="620" r="180" fill="rgba(255,255,255,0.08)" />
      <text x="72" y="130" fill="white" font-size="40" font-family="Arial, sans-serif" font-weight="700">${product.brand}</text>
      <text x="72" y="196" fill="white" font-size="58" font-family="Arial, sans-serif" font-weight="800">${palette.label}</text>
      <text x="72" y="274" fill="rgba(255,255,255,0.92)" font-size="32" font-family="Arial, sans-serif">${product.name}</text>
      <text x="72" y="336" fill="rgba(255,255,255,0.85)" font-size="26" font-family="Arial, sans-serif">${product.colors.join(" / ")}</text>
      <text x="72" y="384" fill="rgba(255,255,255,0.85)" font-size="26" font-family="Arial, sans-serif">${product.sizes.join(" / ")}</text>
      <rect x="72" y="470" width="300" height="88" rx="22" fill="rgba(255,255,255,0.14)" />
      <text x="104" y="525" fill="white" font-size="40" font-family="Arial, sans-serif" font-weight="700">Rs. ${product.price}</text>
    </svg>
  `;
  return encodeSvg(svg);
}

export const demoProducts: DemoProduct[] = rawProducts.map((product) => ({
  ...product,
  image: imageOverrides[product.id] ?? buildFallbackImage(product),
}));

export function generateDemoProducts() {
  return demoProducts.map((product) => ({
    ...product,
    colors: [...product.colors],
    sizes: [...product.sizes],
    tags: [...product.tags],
  }));
}
