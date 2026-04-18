import type { DemoProduct } from "@/lib/demo-data";

export type AgentReply = {
  text: string;
  products: DemoProduct[];
};

export type CatalogSearchResult = {
  matches: DemoProduct[];
  closestMatches: DemoProduct[];
  displayProducts: DemoProduct[];
  exactAvailable: boolean;
  showAllRequested: boolean;
  signals: {
    normalized: string;
    budget?: number;
    color?: string;
    brand?: string;
    categoryTerm?: string;
    normalizedCategory?: string;
    wantsPremium: boolean;
    wantsCheaper: boolean;
    wantsAll: boolean;
  };
};

export type ProductContextReply = {
  text: string;
  products: DemoProduct[];
};

const policies: Record<string, string> = {
  shipping: "Shipping takes 3 to 5 business days in this demo, and express delivery is available on selected items.",
  return: "You can return unused products within 7 days in this demo flow.",
  exchange: "Size and color exchanges are supported within 7 days if stock is available.",
  payment: "We support cards, UPI, and cash on delivery on selected products in this demo.",
  warranty: "Selected sports equipment in this demo includes a 6 month limited warranty.",
};

const colorKeywords = ["black", "blue", "white", "green", "red", "grey", "gray", "orange", "yellow", "wood"] as const;
const categoryAliasMap: Record<string, string[]> = {
  basketballs: ["basketball", "basketballs"],
  footballs: ["football", "footballs", "soccer ball", "soccer", "match football", "training football"],
  "sports-shoes": ["shoe", "shoes", "sports shoes", "running shoes", "training shoes", "sneakers"],
  rackets: ["racket", "rackets", "badminton", "badminton racket"],
  skates: ["skate", "skates", "skating", "inline skates"],
  "gym-bags": ["bag", "bags", "sports bag", "gym bag", "duffel bag", "duffel bags"],
  "cricket-bats": ["cricket bat", "cricket bats", "bat", "bats"],
  "yoga-mats": ["yoga mat", "yoga mats", "exercise mat", "training mat", "mat", "mats"],
};

const categoryLabels: Record<string, string> = {
  basketballs: "Basketballs",
  footballs: "Footballs",
  "sports-shoes": "Sports shoes",
  rackets: "Badminton rackets",
  skates: "Skates",
  "gym-bags": "Gym bags",
  "cricket-bats": "Cricket bats",
  "yoga-mats": "Yoga mats",
};

const stopWords = new Set([
  "add",
  "cart",
  "show",
  "all",
  "options",
  "option",
  "the",
  "this",
  "that",
  "with",
  "for",
  "under",
  "please",
  "want",
  "need",
  "from",
  "into",
  "and",
  "any",
  "one",
  "to",
  "give",
  "list",
  "available",
  "only",
  "tell",
  "about",
]);

function extractBudget(message: string) {
  const match = message.match(/(?:under|below|budget|less than)\s*(?:rs\.?|inr)?\s*(\d{3,6})/i);
  return match ? Number(match[1]) : undefined;
}

export function extractOrdinalIndex(message: string) {
  const normalized = message.toLowerCase();
  if (/\b1st\b|\bfirst\b|\bone\b/.test(normalized)) return 0;
  if (/\b2nd\b|\bsecond\b|\btwo\b/.test(normalized)) return 1;
  if (/\b3rd\b|\bthird\b|\bthree\b/.test(normalized)) return 2;
  if (/\b4th\b|\bfourth\b|\bfour\b/.test(normalized)) return 3;
  return null;
}

function getKnownBrands(products: DemoProduct[]) {
  return [...new Set(products.map((product) => product.brand.toLowerCase()))];
}

function detectCategory(message: string) {
  const normalized = message.toLowerCase();

  for (const [category, aliases] of Object.entries(categoryAliasMap)) {
    const alias = aliases.find((item) => normalized.includes(item));
    if (alias) {
      return { normalizedCategory: category, categoryTerm: alias };
    }
  }

  return {
    normalizedCategory: undefined,
    categoryTerm: undefined,
  };
}

function extractSignals(message: string, products: DemoProduct[]) {
  const normalized = message.toLowerCase();
  const budget = extractBudget(normalized);
  const color = colorKeywords.find((item) => normalized.includes(item));
  const brands = getKnownBrands(products);
  const brand = brands.find((item) => normalized.includes(item));
  const { normalizedCategory, categoryTerm } = detectCategory(normalized);
  const wantsPremium = /\b(best|premium|top|high end)\b/i.test(normalized);
  const wantsCheaper = /\b(cheap|cheaper|budget|value|affordable|lowest)\b/i.test(normalized);
  const wantsAll =
    /\b(show|list|see|display)\b.*\b(all|every)\b/i.test(normalized) ||
    /\b(all options|all items|every option|sare options|sab options)\b/i.test(normalized);

  return {
    normalized,
    budget,
    color,
    brand,
    categoryTerm,
    normalizedCategory,
    wantsPremium,
    wantsCheaper,
    wantsAll,
  };
}

function keywordScore(product: DemoProduct, normalized: string) {
  const words = normalized
    .split(/[^a-z0-9-]+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));

  return words.reduce((score, word) => {
    if (product.name.toLowerCase().includes(word)) return score + 2.4;
    if (product.brand.toLowerCase().includes(word)) return score + 2.2;
    if (product.category.toLowerCase().includes(word)) return score + 1.7;
    if (product.description.toLowerCase().includes(word)) return score + 1.2;
    if (product.slug.toLowerCase().includes(word)) return score + 1.5;
    if (product.tags.some((tag) => tag.toLowerCase().includes(word))) return score + 1.4;
    if (product.colors.some((color) => color.toLowerCase().includes(word))) return score + 1.6;
    if (product.sizes.some((size) => size.toLowerCase().includes(word))) return score + 1.2;
    return score;
  }, 0);
}

function rankProducts(products: DemoProduct[], signals: CatalogSearchResult["signals"]) {
  return [...products].sort((left, right) => {
    const leftScore =
      (left.featured ? 2.4 : 0) +
      left.rating * 1.2 +
      Math.min(left.stock, 12) / 4 +
      keywordScore(left, signals.normalized) +
      (signals.brand && left.brand.toLowerCase() === signals.brand ? 4.2 : 0) +
      (signals.normalizedCategory && left.category === signals.normalizedCategory ? 3.8 : 0) +
      (signals.color && left.colors.some((color) => color.toLowerCase() === signals.color) ? 2.4 : 0) +
      (signals.budget ? Math.max(0, 4 - Math.abs(signals.budget - left.price) / 900) : 0) +
      (signals.wantsPremium ? left.price / 2200 : 0) +
      (signals.wantsCheaper ? (7000 - left.price) / 2200 : 0);
    const rightScore =
      (right.featured ? 2.4 : 0) +
      right.rating * 1.2 +
      Math.min(right.stock, 12) / 4 +
      keywordScore(right, signals.normalized) +
      (signals.brand && right.brand.toLowerCase() === signals.brand ? 4.2 : 0) +
      (signals.normalizedCategory && right.category === signals.normalizedCategory ? 3.8 : 0) +
      (signals.color && right.colors.some((color) => color.toLowerCase() === signals.color) ? 2.4 : 0) +
      (signals.budget ? Math.max(0, 4 - Math.abs(signals.budget - right.price) / 900) : 0) +
      (signals.wantsPremium ? right.price / 2200 : 0) +
      (signals.wantsCheaper ? (7000 - right.price) / 2200 : 0);
    return rightScore - leftScore;
  });
}

function filterProducts(
  products: DemoProduct[],
  signals: CatalogSearchResult["signals"],
  options?: {
    ignoreBudget?: boolean;
    ignoreColor?: boolean;
    ignoreBrand?: boolean;
    ignoreCategory?: boolean;
  },
) {
  return products.filter((product) => {
    if (product.stock <= 0) {
      return false;
    }

    if (!options?.ignoreCategory && signals.normalizedCategory && product.category !== signals.normalizedCategory) {
      return false;
    }

    if (!options?.ignoreBrand && signals.brand && product.brand.toLowerCase() !== signals.brand) {
      return false;
    }

    if (
      !options?.ignoreColor &&
      signals.color &&
      !product.colors.some((color) => color.toLowerCase() === signals.color)
    ) {
      return false;
    }

    if (!options?.ignoreBudget && signals.budget && product.price > signals.budget) {
      return false;
    }

    if (!signals.normalizedCategory && !signals.brand && keywordScore(product, signals.normalized) <= 0) {
      return false;
    }

    return true;
  });
}

function pickDisplayProducts(matches: DemoProduct[], signals: CatalogSearchResult["signals"]) {
  if (!matches.length) {
    return [];
  }

  if (signals.wantsAll) {
    return matches.slice(0, 12);
  }

  const exactSignalCount = [
    signals.normalizedCategory,
    signals.brand,
    signals.color,
    signals.budget,
  ].filter(Boolean).length;

  if (exactSignalCount >= 3) {
    return matches.slice(0, 1);
  }

  if (exactSignalCount >= 1) {
    return matches.slice(0, Math.min(2, matches.length));
  }

  return matches.slice(0, Math.min(3, matches.length));
}

function getCategorySummary(category: string, products: DemoProduct[]) {
  const categoryProducts = products.filter((product) => product.category === category);
  const brands = [...new Set(categoryProducts.map((product) => product.brand))];
  const colors = [...new Set(categoryProducts.flatMap((product) => product.colors))];
  const sizes = [...new Set(categoryProducts.flatMap((product) => product.sizes))];
  return {
    products: categoryProducts,
    brands,
    colors,
    sizes,
    label: categoryLabels[category] ?? category.replace(/-/g, " "),
  };
}

function familyScore(base: DemoProduct, candidate: DemoProduct) {
  let score = 0;
  if (base.category === candidate.category) score += 5;
  if (base.brand === candidate.brand) score += 4;
  if (base.id !== candidate.id) score += 1;
  if (base.tags.some((tag) => candidate.tags.includes(tag))) score += 2;
  if (base.colors.some((color) => candidate.colors.includes(color))) score += 1;
  return score;
}

function sortByFamily(base: DemoProduct, products: DemoProduct[]) {
  return [...products]
    .filter((product) => product.id !== base.id && product.stock > 0)
    .sort((left, right) => familyScore(base, right) - familyScore(base, left));
}

export function getCatalogOverview(products: DemoProduct[]) {
  const categories = Object.entries(categoryLabels).map(([key, label]) => {
    const categoryProducts = products.filter((product) => product.category === key);
    const brands = [...new Set(categoryProducts.map((product) => product.brand))];
    return `${label}: ${brands.join(", ")}`;
  });

  return categories.join(" | ");
}

export function buildCategoryDetailsReply(category: string, products: DemoProduct[]): ProductContextReply | null {
  const summary = getCategorySummary(category, products);
  if (!summary.products.length) {
    return null;
  }

  return {
    text: `${summary.label} are available in brands ${summary.brands.join(", ")}. Colors include ${summary.colors.join(", ")} and sizes include ${summary.sizes.join(", ")}. Tell me the brand or exact variant you want.`,
    products: summary.products.slice(0, Math.min(4, summary.products.length)),
  };
}

export function buildContextualProductReply(
  message: string,
  currentProduct: DemoProduct,
  products: DemoProduct[],
): ProductContextReply | null {
  const normalized = message.toLowerCase();
  const familyProducts = sortByFamily(currentProduct, products);

  if (/\b(?:same|another|other)\b.*\b(?:color|colour)\b|\banother color\b/i.test(normalized)) {
    if (currentProduct.colors.length > 1) {
      return {
        text: `${currentProduct.name} is available in ${currentProduct.colors.join(", ")}. Tell me which color you want and I will continue with that exact variant.`,
        products: [currentProduct],
      };
    }

    const colorAlternatives = familyProducts.filter((product) =>
      product.colors.some((color) => !currentProduct.colors.includes(color)),
    );
    if (colorAlternatives.length) {
      return {
        text: `${currentProduct.name} does not have another color in this exact product, but these close alternatives do.`,
        products: colorAlternatives.slice(0, 3),
      };
    }
  }

  if (/\b(?:same|another|other)\b.*\bsize\b|\banother size\b/i.test(normalized)) {
    if (currentProduct.sizes.length > 1) {
      return {
        text: `${currentProduct.name} is available in ${currentProduct.sizes.join(", ")}. Tell me which size you want and I will continue with that exact variant.`,
        products: [currentProduct],
      };
    }

    const sizeAlternatives = familyProducts.filter((product) =>
      product.sizes.some((size) => !currentProduct.sizes.includes(size)),
    );
    if (sizeAlternatives.length) {
      return {
        text: `${currentProduct.name} does not have another size in this exact product, but these close alternatives cover more size options.`,
        products: sizeAlternatives.slice(0, 3),
      };
    }
  }

  if (/\b(cheaper|budget|lower price|less expensive)\b/i.test(normalized)) {
    const cheaper = familyProducts
      .filter((product) => product.category === currentProduct.category && product.price < currentProduct.price)
      .sort((left, right) => left.price - right.price)[0];
    if (cheaper) {
      return {
        text: `${cheaper.name} is the cheaper alternative in this category. It costs Rs. ${cheaper.price} and is a better value pick if you want to spend less.`,
        products: [cheaper],
      };
    }
  }

  if (/\b(premium|better|best|higher|upgrade)\b/i.test(normalized)) {
    const premium = familyProducts
      .filter((product) => product.category === currentProduct.category && product.price > currentProduct.price)
      .sort((left, right) => right.price - left.price)[0];
    if (premium) {
      return {
        text: `${premium.name} is the more premium alternative here. It costs Rs. ${premium.price} and is the better pick if you want a higher-end option.`,
        products: [premium],
      };
    }
  }

  return null;
}

export function searchCatalog(message: string, products: DemoProduct[]): CatalogSearchResult {
  const signals = extractSignals(message, products);
  const strictMatches = rankProducts(filterProducts(products, signals), signals);

  if (strictMatches.length) {
    return {
      matches: strictMatches,
      closestMatches: [],
      displayProducts: pickDisplayProducts(strictMatches, signals),
      exactAvailable: true,
      showAllRequested: signals.wantsAll,
      signals,
    };
  }

  const relaxedMatches = rankProducts(
    filterProducts(products, signals, {
      ignoreBudget: Boolean(signals.budget),
      ignoreColor: Boolean(signals.color),
    }),
    signals,
  );

  const closestMatches = relaxedMatches.length
    ? relaxedMatches
    : rankProducts(
        filterProducts(products, signals, {
          ignoreBudget: true,
          ignoreColor: true,
          ignoreBrand: false,
          ignoreCategory: true,
        }),
        signals,
      );

  return {
    matches: [],
    closestMatches,
    displayProducts: closestMatches.slice(0, Math.min(3, closestMatches.length)),
    exactAvailable: false,
    showAllRequested: signals.wantsAll,
    signals,
  };
}

export function resolveProductReference(message: string, scopeProducts: DemoProduct[], allProducts: DemoProduct[]) {
  const signals = extractSignals(message, allProducts);
  const ordinalIndex = extractOrdinalIndex(message);
  const scopedMatches = rankProducts(filterProducts(scopeProducts, signals, { ignoreBudget: true }), signals);

  if (scopedMatches.length) {
    return ordinalIndex !== null ? scopedMatches[ordinalIndex] ?? scopedMatches[0] : scopedMatches[0];
  }

  if (ordinalIndex !== null && scopeProducts[ordinalIndex]) {
    return scopeProducts[ordinalIndex];
  }

  const allMatches = rankProducts(filterProducts(allProducts, signals, { ignoreBudget: true }), signals);
  if (allMatches.length) {
    return ordinalIndex !== null ? allMatches[ordinalIndex] ?? allMatches[0] : allMatches[0];
  }

  return ordinalIndex !== null ? allProducts[ordinalIndex] : undefined;
}

export function buildAgentReply(message: string, products: DemoProduct[]): AgentReply {
  const normalized = message.toLowerCase().trim();

  if (
    /\b(categories|category|all categories|what items|what do you have|items available|available items)\b/i.test(
      normalized,
    )
  ) {
    return {
      text: `We currently have ${Object.values(categoryLabels).join(", ")}. Tell me the category or brand you want, and I will narrow it down for you.`,
      products: [],
    };
  }

  const policyKey = Object.keys(policies).find((item) => normalized.includes(item));
  if (policyKey) {
    return {
      text: policies[policyKey],
      products: [],
    };
  }

  const categorySignals = extractSignals(normalized, products);
  if (
    categorySignals.normalizedCategory &&
    /\b(brand|brands|color|colors|colour|colours|size|sizes|available)\b/i.test(normalized)
  ) {
    return buildCategoryDetailsReply(categorySignals.normalizedCategory, products) ?? {
      text: "I could not find that category right now.",
      products: [],
    };
  }

  if (/\b(hello|hi|hey)\b/i.test(normalized)) {
    return {
      text: `Hi, I can help with ${getCatalogOverview(products)}. Tell me the category, brand, budget, color, or size you want.`,
      products: [],
    };
  }

  const result = searchCatalog(normalized, products);

  if (result.exactAvailable && result.displayProducts.length) {
    const [top] = result.displayProducts;
    const label =
      result.signals.categoryTerm ??
      result.signals.brand ??
      (result.displayProducts[0].brand ? `${result.displayProducts[0].brand} ${categoryLabels[result.displayProducts[0].category] ?? result.displayProducts[0].category}` : result.displayProducts[0].category.replace(/-/g, " "));
    const budgetText = result.signals.budget ? ` under Rs. ${result.signals.budget}` : "";

    if (result.showAllRequested) {
      return {
        text: `These are the matching ${label} options${budgetText} that are available right now. Tell me which one you want, and I will help with the exact variant and cart.`,
        products: result.displayProducts,
      };
    }

    if (result.displayProducts.length === 1) {
      return {
        text: `${top.name} is the closest match for what you described${budgetText}. If you want it, I can help with the exact color and size before adding it to your cart.`,
        products: result.displayProducts,
      };
    }

    return {
      text: `I found ${result.displayProducts.length} good matches${budgetText}. My top pick is ${top.name}, and I can also compare the others or add the exact one you choose.`,
      products: result.displayProducts,
    };
  }

  if (result.closestMatches.length) {
    return {
      text: "That exact product is not available at this time. These are the closest options I can offer based on your request.",
      products: result.displayProducts,
    };
  }

  return {
    text: "I need one more clue to help properly. Tell me the sports item, brand, budget, color, size, or whether you want the cheaper or premium option.",
    products: [],
  };
}
