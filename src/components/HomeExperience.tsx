"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { generateDemoProducts, type DemoProduct } from "@/lib/demo-data";
import { getProducts } from "@/lib/demo-storage";
import {
  buildCategoryDetailsReply,
  buildContextualProductReply,
  buildAgentReply,
  extractOrdinalIndex,
  getCatalogOverview,
  resolveProductReference,
  searchCatalog,
} from "@/lib/sales-agent";

type Message = {
  role: "assistant" | "user";
  text: string;
  products?: DemoProduct[];
};

type CartLine = {
  key: string;
  productId: string;
  quantity: number;
  color: string;
  size: string;
};

type PendingCartSelection = {
  product: DemoProduct;
  quantity: number;
  color?: string;
  size?: string;
};

type PendingRemovalSelection = {
  keys: string[];
};

type SessionMemory = {
  category?: string;
  brand?: string;
  budget?: number;
  color?: string;
  size?: string;
  productId?: string;
};

const VOICE_END_DELAY_MS = 2500;

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

function MicSvg() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ui-icon">
      <path
        d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V21h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.07A7 7 0 0 1 5 12a1 1 0 1 1 2 0 5 5 0 0 0 10 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HangupSvg() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ui-icon">
      <path
        d="M4.95 9.9A15.3 15.3 0 0 1 12 8c2.53 0 4.94.62 7.05 1.9.86.52 1.16 1.62.67 2.5l-1.1 1.97a1.8 1.8 0 0 1-2.26.8l-2.21-.9a1.8 1.8 0 0 0-1.59.12l-1.1.65a1.8 1.8 0 0 1-1.84 0l-1.1-.65a1.8 1.8 0 0 0-1.59-.12l-2.21.9a1.8 1.8 0 0 1-2.26-.8l-1.1-1.96c-.49-.89-.19-2 .67-2.52Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SendSvg() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ui-icon">
      <path
        d="M20.67 3.33a1 1 0 0 0-1.05-.22L4.48 9.16a1 1 0 0 0 .07 1.88l6.3 1.98 1.98 6.3a1 1 0 0 0 1.88.07l6.05-15.14a1 1 0 0 0-.1-.92Zm-7.17 13.2-1.25-3.98a1 1 0 0 0-.64-.64l-3.98-1.25 8.34-3.33-3.47 9.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SpeakerSvg() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ui-icon">
      <path
        d="M11 5.08a1 1 0 0 1 1.6-.8l4.87 3.65A1 1 0 0 1 18 8.73v6.54a1 1 0 0 1-.53.88l-4.87 3.65A1 1 0 0 1 11 18.99V5.08Zm-5 4.92a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3v-4H6Zm14.07-2.74a1 1 0 0 1 1.4.14A8 8 0 0 1 23 12a8 8 0 0 1-1.53 4.6 1 1 0 1 1-1.61-1.18A6 6 0 0 0 21 12a6 6 0 0 0-1.07-3.56 1 1 0 0 1 .14-1.18Zm-2.43 2.2a1 1 0 0 1 1.38.28A4.53 4.53 0 0 1 19.8 12a4.53 4.53 0 0 1-.78 2.56 1 1 0 0 1-1.66-1.12A2.53 2.53 0 0 0 17.8 12a2.53 2.53 0 0 0-.44-1.44 1 1 0 0 1 .28-1.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EndCallSvg() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ui-icon">
      <path
        d="M7 7a1 1 0 0 1 1 1v3h8V8a1 1 0 1 1 2 0v3h1a1 1 0 1 1 0 2h-1v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-3H5a1 1 0 1 1 0-2h1V8a1 1 0 0 1 1-1Zm1 6v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3H8Zm2-8a1 1 0 0 1 1 1v2h2V6a1 1 0 1 1 2 0v2h.5a1 1 0 1 1 0 2h-7a1 1 0 1 1 0-2H9V6a1 1 0 0 1 1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function looksLikeAddToCartIntent(message: string) {
  return /\b(add|added|adding|put|place|get|take|buy)\b.*\b(cart|basket|this|that|item|one|basket|basketball|football|shoes?|racket|rackets|skates?|bag|bat|mat|nivia|nike|adidas|puma|yonex|cosco)\b|\badd to cart\b|\bbuy this\b/i.test(
    message,
  );
}

function looksLikeCheckoutIntent(message: string) {
  return /(checkout|place order|buy now|proceed|continue to payment|purchase)/i.test(message);
}

function looksLikeRemoveIntent(message: string) {
  return /(remove|delete|take out|drop)\b/i.test(message);
}

function looksLikeCompareIntent(message: string) {
  return /(compare|difference|which one|vs|versus)/i.test(message);
}

function looksLikeRemoveAllIntent(message: string) {
  return /(remove all|clear cart|empty cart|delete all)/i.test(message);
}

function looksLikeShowAllIntent(message: string) {
  return /\b(show|see|list)\b.*\b(all|every)\b|\b(all options|all items|every option|sare options|sab options)\b/i.test(
    message,
  );
}

function looksLikeAnyOptionIntent(message: string) {
  return /\b(any|anyone|any one|whichever|whatever)\b/i.test(message);
}

function looksLikeAnyColorIntent(message: string) {
  return /\b(any|whatever)\s+(color|colour)\b/i.test(message);
}

function looksLikeAnySizeIntent(message: string) {
  return /\b(any|whatever)\s+size\b|\bany specs?\b/i.test(message);
}

function looksLikeVariantAvailabilityIntent(message: string) {
  return /\b(color|colors|colour|colours|size|sizes)\b/i.test(message) &&
    /\b(available|options|show|tell|what|which|list)\b/i.test(message);
}

function mentionsVariantWords(message: string) {
  return /\b(color|colors|colour|colours|size|sizes|red|blue|black|white|green|yellow|orange|grey|gray|wood|\d+mm|g4|g5|size\s*\d+|short handle)\b/i.test(
    message,
  );
}

function looksLikeTerminateAgentIntent(message: string) {
  return /\b(terminate|end|stop|close|hang up|disconnect)\b/i.test(message) &&
    /\b(agent|call|session|chat|assistant)?\b/i.test(message);
}

function looksLikeNegative(message: string) {
  return /\b(no|nah|nahi|nope|cancel|stop)\b/i.test(message);
}

function buildCartLineKey(productId: string, color: string, size: string) {
  return `${productId}::${color}::${size}`;
}

function normalizeCategoryLabel(category: string) {
  return category.replace(/-/g, " ");
}

function buildVariantLabel(color?: string, size?: string) {
  return [color, size].filter(Boolean).join(" | ");
}

function mentionsProductIdentity(message: string) {
  return /\b(basketball|football|shoe|shoes|racket|rackets|skate|skates|bag|bat|mat|nike|adidas|puma|yonex|cosco|nivia|li-ning|sg|ss)\b/i.test(
    message,
  );
}

function shouldStayInPendingSelection(
  message: string,
  pendingProduct: DemoProduct,
  searchSignals: {
    brand?: string;
    normalizedCategory?: string;
  },
) {
  const normalized = message.toLowerCase();
  const answersPending =
    mentionsVariantWords(normalized) ||
    looksLikeAnyColorIntent(normalized) ||
    looksLikeAnySizeIntent(normalized) ||
    looksLikeAnyOptionIntent(normalized) ||
    looksLikeNegative(normalized);

  if (answersPending) {
    return true;
  }

  if (searchSignals.normalizedCategory && searchSignals.normalizedCategory !== pendingProduct.category) {
    return false;
  }

  if (searchSignals.brand && searchSignals.brand !== pendingProduct.brand.toLowerCase()) {
    return false;
  }

  if (/\b(looking for|show|need|want|give me|find|search)\b/i.test(normalized)) {
    return false;
  }

  return false;
}

function summarizeMemory(memory: SessionMemory) {
  return [
    memory.category ? `category=${memory.category}` : "",
    memory.brand ? `brand=${memory.brand}` : "",
    memory.budget ? `budget=${memory.budget}` : "",
    memory.color ? `color=${memory.color}` : "",
    memory.size ? `size=${memory.size}` : "",
    memory.productId ? `product=${memory.productId}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

export function HomeExperience() {
  const [products, setProducts] = useState<DemoProduct[]>(() => generateDemoProducts());
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi, I am your AI sports sales agent. Tell me what sport, brand, budget, color, or use case you want, and I will narrow it down quickly.",
    },
  ]);
  const [input, setInput] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({});
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [pendingCartSelection, setPendingCartSelection] = useState<PendingCartSelection | null>(null);
  const [pendingRemovalSelection, setPendingRemovalSelection] = useState<PendingRemovalSelection | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const listenPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceDraftRef = useRef("");
  const callActiveRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const latestSuggestionsRef = useRef<DemoProduct[]>([]);
  const lastAssistantTextRef = useRef(messages[0].text);
  const lastSearchMessageRef = useRef("");
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const lastVariantProductRef = useRef<DemoProduct | null>(null);
  const lastFocusedProductRef = useRef<DemoProduct | null>(null);
  const sessionMemoryRef = useRef<SessionMemory>({});

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, cartOpen, isListening]);

  useEffect(() => {
    return () => {
      if (listenPauseTimeoutRef.current) {
        clearTimeout(listenPauseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const pickPreferredVoice = () => {
      const voices = window.speechSynthesis.getVoices?.() ?? [];
      preferredVoiceRef.current =
        voices.find((voice) => /female|zira|samantha|victoria|karen|moira|veena/i.test(voice.name)) ??
        voices.find((voice) => /en-in/i.test(voice.lang) && /female|zira|veena/i.test(voice.name)) ??
        voices.find((voice) => /en-in|en-gb|en-us/i.test(voice.lang)) ??
        null;
    };

    pickPreferredVoice();
    window.speechSynthesis.onvoiceschanged = pickPreferredVoice;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const featured = useMemo(() => products.slice(0, 8), [products]);
  const cartEntries = useMemo(
    () =>
      cartItems
        .map((line) => ({
          line,
          product: products.find((item) => item.id === line.productId),
        }))
        .filter((entry): entry is { line: CartLine; product: DemoProduct } => Boolean(entry.product)),
    [cartItems, products],
  );
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  function getSelectedQty(productId: string) {
    return selectedQty[productId] ?? 1;
  }

  function updateSelectedQty(productId: string, delta: number) {
    setSelectedQty((current) => ({
      ...current,
      [productId]: Math.max(1, Math.min(10, (current[productId] ?? 1) + delta)),
    }));
  }

  function updateCartQty(lineKey: string, delta: number) {
    setCartItems((current) =>
      current.flatMap((item) => {
        if (item.key !== lineKey) {
          return [item];
        }

        const nextQuantity = Math.max(0, item.quantity + delta);
        return nextQuantity ? [{ ...item, quantity: nextQuantity }] : [];
      }),
    );
  }

  function removeCartLine(lineKey: string) {
    setCartItems((current) => current.filter((item) => item.key !== lineKey));
  }

  function clearCart() {
    setCartItems([]);
  }

  function extractColorFromMessage(message: string, product: DemoProduct) {
    const normalized = message.toLowerCase();
    return product.colors.find((color) => normalized.includes(color.toLowerCase()));
  }

  function extractSizeFromMessage(message: string, product: DemoProduct) {
    const normalized = message.toLowerCase();
    return product.sizes.find((size) => normalized.includes(size.toLowerCase()));
  }

  function getDefaultVariant(product: DemoProduct) {
    return {
      color: product.colors[0] ?? "standard",
      size: product.sizes[0] ?? "standard",
    };
  }

  function getAlternativeProducts(product: DemoProduct) {
    const sameCategory = products.filter(
      (item) => item.id !== product.id && item.category === product.category && item.stock > 0,
    );
    if (sameCategory.length) {
      return sameCategory.slice(0, 3);
    }

    return products.filter((item) => item.id !== product.id && item.stock > 0).slice(0, 3);
  }

  function addAssistantMessage(
    text: string,
    messageProducts: DemoProduct[] = [],
    options?: {
      rememberContext?: boolean;
      setSuggestions?: boolean;
    },
  ) {
    const shouldRemember = options?.rememberContext ?? true;
    const shouldSetSuggestions = options?.setSuggestions ?? true;

    if (messageProducts.length && shouldSetSuggestions) {
      latestSuggestionsRef.current = messageProducts;
    }

    if (messageProducts.length && shouldRemember) {
      lastFocusedProductRef.current = messageProducts[0];
      sessionMemoryRef.current = {
        ...sessionMemoryRef.current,
        category: messageProducts[0].category,
        brand: messageProducts[0].brand,
        productId: messageProducts[0].id,
      };
    }
    lastAssistantTextRef.current = text;
    setMessages((current) => [...current, { role: "assistant", text, products: messageProducts }]);
  }

  function rememberConversationContext(
    message: string,
    options?: {
      product?: DemoProduct;
      color?: string;
      size?: string;
    },
  ) {
    const result = searchCatalog(message, products);
    const product = options?.product;
    sessionMemoryRef.current = {
      ...sessionMemoryRef.current,
      category: product?.category ?? result.signals.normalizedCategory ?? sessionMemoryRef.current.category,
      brand: product?.brand ?? result.signals.brand ?? sessionMemoryRef.current.brand,
      budget: result.signals.budget ?? sessionMemoryRef.current.budget,
      color: options?.color ?? result.signals.color ?? sessionMemoryRef.current.color,
      size: options?.size ?? sessionMemoryRef.current.size,
      productId: product?.id ?? sessionMemoryRef.current.productId,
    };
  }

  function getRememberedProduct() {
    const rememberedId = sessionMemoryRef.current.productId;
    return rememberedId ? products.find((product) => product.id === rememberedId) : undefined;
  }

  function clearItemPreference() {
    setPendingCartSelection(null);
    lastVariantProductRef.current = null;
    lastFocusedProductRef.current = null;
    lastSearchMessageRef.current = "";
    sessionMemoryRef.current = {};
  }

  function buildFocusedVariantReply(message: string, product: DemoProduct, fromCall: boolean) {
    const color = extractColorFromMessage(message, product);
    const size = extractSizeFromMessage(message, product);
    const wantsAdd = looksLikeAddToCartIntent(message) || /(?:want|need|take|give me|go with|choose|select)/i.test(message);

    if (!color && !size) {
      return null;
    }

    const validColor = !color || product.colors.includes(color);
    const validSize = !size || product.sizes.includes(size);

    if (!validColor || !validSize) {
      return {
        text: `${product.name} is available in colors ${product.colors.join(", ")} and sizes ${product.sizes.join(", ")}. Tell me one exact option from these, and I will continue with the same item.`,
        products: [product],
      };
    }

    rememberConversationContext(message, {
      product,
      color: color ?? sessionMemoryRef.current.color,
      size: size ?? sessionMemoryRef.current.size,
    });

    if (wantsAdd) {
      prepareCartSelection(product, message, fromCall);
      return { handled: true as const };
    }

    const nextColor = color ?? sessionMemoryRef.current.color ?? product.colors[0];
    const nextSize = size ?? sessionMemoryRef.current.size ?? product.sizes[0];
    return {
      text: `${product.name} is available in ${buildVariantLabel(nextColor, nextSize)}. If you want, I can add this same item to your cart.`,
      products: [product],
    };
  }

  function speakNow(text: string, resumeListening = false) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.12;
    utterance.pitch = 1.05;
    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      if (resumeListening && callActiveRef.current) {
        startListening();
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function replayLatestAssistantMessage() {
    if (lastAssistantTextRef.current) {
      speakNow(lastAssistantTextRef.current, false);
    }
  }

  function executeAddToCart(
    product: DemoProduct,
    options?: {
      shouldSpeak?: boolean;
      quantity?: number;
      color?: string;
      size?: string;
    },
  ) {
    clearItemPreference();
    setCartOpen(true);
    const fallbackVariant = getDefaultVariant(product);
    const quantity = options?.quantity ?? getSelectedQty(product.id);
    const color = options?.color ?? fallbackVariant.color;
    const size = options?.size ?? fallbackVariant.size;
    const key = buildCartLineKey(product.id, color, size);

    setCartItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }

      return [...current, { key, productId: product.id, quantity, color, size }];
    });

    const variantLabel = buildVariantLabel(color, size);
    const alternatives = getAlternativeProducts(product);
    const text = `${product.name}${variantLabel ? ` in ${variantLabel}` : ""} has been added to your cart. Here are a few alternatives and fresh recommendations if you want to keep browsing.`;
    addAssistantMessage(text, alternatives, {
      rememberContext: false,
      setSuggestions: true,
    });

    if (options?.shouldSpeak) {
      speakNow(text, true);
    }
  }

  function announceRemoval(
    entry: { line: CartLine; product: DemoProduct },
    fromCall: boolean,
  ) {
    lastFocusedProductRef.current = entry.product;
    removeCartLine(entry.line.key);
    const variantLabel = buildVariantLabel(entry.line.color, entry.line.size);
    const text = `${entry.product.name}${variantLabel ? ` in ${variantLabel}` : ""} has been removed from your cart. Want me to replace it with another option?`;
    addAssistantMessage(text);
    if (fromCall || callActiveRef.current) {
      speakNow(text, true);
    }
  }

  function getCartEntryPool(keys?: string[]) {
    if (!keys?.length) {
      return cartEntries;
    }

    return cartEntries.filter((entry) => keys.includes(entry.line.key));
  }

  function findCartMatchesFromText(message: string, keys?: string[]) {
    const normalized = message.toLowerCase();
    const ordinalIndex = extractOrdinalIndex(normalized);
    const pool = getCartEntryPool(keys);
    const filtered = pool.filter(({ line, product }) => {
      const tokens = [
        product.name.toLowerCase(),
        product.brand.toLowerCase(),
        product.category.toLowerCase(),
        line.color.toLowerCase(),
        line.size.toLowerCase(),
        ...product.colors.map((color) => color.toLowerCase()),
      ];
      return tokens.some((token) => normalized.includes(token));
    });

    if (filtered.length) {
      if (ordinalIndex !== null) {
        return filtered[ordinalIndex] ? [filtered[ordinalIndex]] : filtered;
      }
      return filtered;
    }

    if (ordinalIndex !== null && pool[ordinalIndex]) {
      return [pool[ordinalIndex]];
    }

    return [];
  }

  function askForRemoveClarification(matches: { line: CartLine; product: DemoProduct }[], fromCall: boolean) {
    const choices = matches
      .slice(0, 4)
      .map(
        (entry, index) =>
          `${index + 1}. ${entry.product.name} ${buildVariantLabel(entry.line.color, entry.line.size)}`,
      )
      .join(", ");
    const text = `I found multiple cart items that match. Tell me the product name, color, size, or number. ${choices}`;
    setPendingRemovalSelection({ keys: matches.map((entry) => entry.line.key) });
    addAssistantMessage(text);
    if (fromCall || callActiveRef.current) {
      speakNow(text, true);
    }
  }

  function askForVariantDetails(selection: PendingCartSelection, fromCall: boolean) {
    lastVariantProductRef.current = selection.product;
    lastFocusedProductRef.current = selection.product;
    const needsColor = selection.product.colors.length > 1 && !selection.color;
    const needsSize = selection.product.sizes.length > 1 && !selection.size;
    const text = needsColor && needsSize
      ? `Before I add ${selection.product.name}, tell me the color and size you want. Colors are ${selection.product.colors.join(", ")} and sizes are ${selection.product.sizes.join(", ")}.`
      : needsColor
        ? `Before I add ${selection.product.name}, tell me the color you want. Options are ${selection.product.colors.join(", ")}.`
        : `Before I add ${selection.product.name}, tell me the size you want. Options are ${selection.product.sizes.join(", ")}.`;
    addAssistantMessage(text);
    if (fromCall || callActiveRef.current) {
      speakNow(text, true);
    }
  }

  function prepareCartSelection(
    product: DemoProduct,
    message: string,
    fromCall: boolean,
    quantity = getSelectedQty(product.id),
  ) {
    const rememberedColor =
      sessionMemoryRef.current.productId === product.id ? sessionMemoryRef.current.color : undefined;
    const rememberedSize =
      sessionMemoryRef.current.productId === product.id ? sessionMemoryRef.current.size : undefined;
    const color =
      extractColorFromMessage(message, product) ??
      rememberedColor ??
      (looksLikeAnyColorIntent(message) || looksLikeAnyOptionIntent(message) ? product.colors[0] : undefined);
    const size =
      extractSizeFromMessage(message, product) ??
      rememberedSize ??
      (looksLikeAnySizeIntent(message) || looksLikeAnyOptionIntent(message) ? product.sizes[0] : undefined);
    const selection: PendingCartSelection = {
      product,
      quantity,
      color,
      size,
    };
    const needsColor = product.colors.length > 1 && !color;
    const needsSize = product.sizes.length > 1 && !size;

    if (needsColor || needsSize) {
      setPendingCartSelection(selection);
      askForVariantDetails(selection, fromCall);
      return true;
    }

    executeAddToCart(product, {
      shouldSpeak: fromCall || callActiveRef.current,
      quantity,
      color,
      size,
    });
    return true;
  }

  function resolvePendingSelection(message: string, fromCall: boolean) {
    if (!pendingCartSelection) {
      return false;
    }

    if (looksLikeNegative(message)) {
      setPendingCartSelection(null);
      lastVariantProductRef.current = null;
      const text = "Okay, I did not add it. Tell me the color, size, or another product if you want a different one.";
      addAssistantMessage(text);
      if (fromCall || callActiveRef.current) {
        speakNow(text, true);
      }
      return true;
    }

    const color =
      extractColorFromMessage(message, pendingCartSelection.product) ??
      pendingCartSelection.color ??
      (looksLikeAnyColorIntent(message) || looksLikeAnyOptionIntent(message)
        ? pendingCartSelection.product.colors[0]
        : undefined);
    const size =
      extractSizeFromMessage(message, pendingCartSelection.product) ??
      pendingCartSelection.size ??
      (looksLikeAnySizeIntent(message) || looksLikeAnyOptionIntent(message)
        ? pendingCartSelection.product.sizes[0]
        : undefined);
    const nextSelection = {
      ...pendingCartSelection,
      color,
      size,
    };
    const needsColor = nextSelection.product.colors.length > 1 && !nextSelection.color;
    const needsSize = nextSelection.product.sizes.length > 1 && !nextSelection.size;

    if ((needsColor || needsSize) && mentionsVariantWords(message)) {
      const text = `${nextSelection.product.name} is available in colors ${nextSelection.product.colors.join(", ")} and sizes ${nextSelection.product.sizes.join(", ")}. Tell me one exact option from these, and I will add it to your cart.`;
      setPendingCartSelection(nextSelection);
      addAssistantMessage(text, [nextSelection.product]);
      if (fromCall || callActiveRef.current) {
        speakNow(text, true);
      }
      return true;
    }

    if (needsColor || needsSize) {
      setPendingCartSelection(nextSelection);
      askForVariantDetails(nextSelection, fromCall);
      return true;
    }

    setPendingCartSelection(null);
    executeAddToCart(nextSelection.product, {
      shouldSpeak: fromCall || callActiveRef.current,
      quantity: nextSelection.quantity,
      color: nextSelection.color,
      size: nextSelection.size,
    });
    return true;
  }

  function resolvePendingRemoval(message: string, fromCall: boolean) {
    if (!pendingRemovalSelection) {
      return false;
    }

    if (looksLikeRemoveAllIntent(message)) {
      setPendingRemovalSelection(null);
      clearCart();
      const text = "I removed everything from your cart. If you want, I can help you start again with the closest options.";
      addAssistantMessage(text);
      if (fromCall || callActiveRef.current) {
        speakNow(text, true);
      }
      return true;
    }

    const matches = findCartMatchesFromText(message, pendingRemovalSelection.keys);

    if (matches.length === 1) {
      setPendingRemovalSelection(null);
      announceRemoval(matches[0], fromCall);
      return true;
    }

    if (matches.length > 1) {
      askForRemoveClarification(matches, fromCall);
      return true;
    }

    const text = "I still need one more detail to remove the right cart item. Tell me the name, color, size, or its number in the cart.";
    addAssistantMessage(text);
    if (fromCall || callActiveRef.current) {
      speakNow(text, true);
    }
    return true;
  }

  function compareSuggestedProducts(message: string, fromCall: boolean) {
    const suggestions = latestSuggestionsRef.current;
    if (suggestions.length < 2) {
      const text = "I need at least two good options before I compare them. Ask me for alternatives and I will line them up properly.";
      addAssistantMessage(text);
      if (fromCall || callActiveRef.current) {
        speakNow(text, true);
      }
      return true;
    }

    const first = resolveProductReference(message, suggestions, products) ?? suggestions[0];
    const second =
      suggestions.find((item) => item.id !== first.id) ??
      products.find((item) => item.id !== first.id && item.category === first.category) ??
      suggestions[1];

    if (!first || !second) {
      return false;
    }

    const text = `${first.name} is better if you want ${first.tags[0]} and a more premium feel, while ${second.name} is better if you want a simpler value option. Tell me which one you want, and I will help with color, size, and cart.`;
    addAssistantMessage(text, [first, second]);
    if (fromCall || callActiveRef.current) {
      speakNow(text, true);
    }
    return true;
  }

  function executeCheckout() {
    setCartOpen(true);
    const text =
      cartCount > 0
        ? "Your cart is ready for checkout. You can review the items in the cart drawer and then purchase."
        : "Your cart is still empty. Tell me what you want first, and I will add the right item before checkout.";
    addAssistantMessage(text);
    if (callActiveRef.current) {
      speakNow(text, true);
    }
  }

  function terminateCall() {
    callActiveRef.current = false;
    setCallActive(false);
    intentionalStopRef.current = true;
    setPendingCartSelection(null);
    setPendingRemovalSelection(null);
    lastVariantProductRef.current = null;
    recognitionRef.current?.stop();
    setIsListening(false);
    setIsThinking(false);
    setIsSpeaking(false);
    voiceDraftRef.current = "";
    window.speechSynthesis?.cancel();
    addAssistantMessage("Live call ended. If you want help again, tap the mic button to start again.");
  }

  function startListening() {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor || !callActiveRef.current || isThinking || isSpeaking) {
      return;
    }

    if (listenPauseTimeoutRef.current) {
      clearTimeout(listenPauseTimeoutRef.current);
    }

    intentionalStopRef.current = false;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      voiceDraftRef.current = transcript.trim();
      setInput(voiceDraftRef.current);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!callActiveRef.current) {
        return;
      }

      if (voiceDraftRef.current) {
        const spokenText = voiceDraftRef.current;
        voiceDraftRef.current = "";
        listenPauseTimeoutRef.current = setTimeout(() => {
          void handleSend(spokenText, true);
        }, VOICE_END_DELAY_MS);
        return;
      }

      listenPauseTimeoutRef.current = setTimeout(() => {
        if (!intentionalStopRef.current && !isThinking && !isSpeaking) {
          startListening();
        }
      }, VOICE_END_DELAY_MS);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  async function handleSend(message: string, fromCall = false) {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    if (looksLikeTerminateAgentIntent(trimmed)) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");
      if (callActiveRef.current) {
        terminateCall();
      } else {
        setAssistantOpen(false);
      }
      return;
    }

    const searchResult = searchCatalog(trimmed, products);
    const searchSignals = searchResult.signals;
    rememberConversationContext(trimmed);
    if (pendingRemovalSelection) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");
      resolvePendingRemoval(trimmed, fromCall);
      return;
    }

    if (pendingCartSelection) {
      if (!shouldStayInPendingSelection(trimmed, pendingCartSelection.product, searchSignals)) {
        setPendingCartSelection(null);
        lastVariantProductRef.current = null;
      } else {
        setMessages((current) => [...current, { role: "user", text: trimmed }]);
        setInput("");
        resolvePendingSelection(trimmed, fromCall);
        return;
      }
    }

    const showAllFromContext =
      looksLikeShowAllIntent(trimmed) &&
      !searchSignals.brand &&
      !searchSignals.normalizedCategory &&
      Boolean(lastSearchMessageRef.current);
    const resolvedMessage = showAllFromContext
      ? `${lastSearchMessageRef.current} show all options`
      : trimmed;
    const userScope = latestSuggestionsRef.current;
    const resolvedProduct =
      looksLikeAnyOptionIntent(trimmed) && userScope.length
        ? userScope[0]
        : resolveProductReference(trimmed, userScope, products);
    const ordinalIndex = extractOrdinalIndex(trimmed);
    const focusedProduct =
      lastVariantProductRef.current ?? resolvedProduct ?? lastFocusedProductRef.current ?? getRememberedProduct();

    if (/\b(hello|hi|hey)\b/i.test(trimmed)) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");
      const text = `Hi, I can help with ${getCatalogOverview(products)}. Tell me the category, brand, budget, color, or size you want.`;
      addAssistantMessage(text);
      if (fromCall || callActiveRef.current) {
        speakNow(text, true);
      }
      return;
    }

    if (
      searchSignals.normalizedCategory &&
      /\b(brand|brands|color|colors|colour|colours|size|sizes|available|beginner|training|match)\b/i.test(trimmed)
    ) {
      const reply = buildCategoryDetailsReply(searchSignals.normalizedCategory, products);
      if (reply) {
        setMessages((current) => [...current, { role: "user", text: trimmed }]);
        setInput("");
        addAssistantMessage(reply.text, reply.products);
        if (fromCall || callActiveRef.current) {
          speakNow(reply.text, true);
        }
        return;
      }
    }

    if (looksLikeVariantAvailabilityIntent(trimmed)) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");
      const variantProduct =
        lastVariantProductRef.current ??
        resolvedProduct ??
        latestSuggestionsRef.current[0] ??
        (lastSearchMessageRef.current ? searchCatalog(lastSearchMessageRef.current, products).displayProducts[0] : undefined);

      if (variantProduct) {
        const text = `${variantProduct.name} is available in colors ${variantProduct.colors.join(", ")} and sizes ${variantProduct.sizes.join(", ")}. Tell me the exact color and size you want, and I will add it straight to the cart.`;
        addAssistantMessage(text, [variantProduct]);
        if (fromCall || callActiveRef.current) {
          speakNow(text, true);
        }
      } else {
        const text = "Tell me which product you want, and I will list its available colors and sizes.";
        addAssistantMessage(text);
        if (fromCall || callActiveRef.current) {
          speakNow(text, true);
        }
      }
      return;
    }

    if (focusedProduct) {
      const contextualReply = buildContextualProductReply(trimmed, focusedProduct, products);
      if (contextualReply) {
        setMessages((current) => [...current, { role: "user", text: trimmed }]);
        setInput("");
        addAssistantMessage(contextualReply.text, contextualReply.products);
        if (fromCall || callActiveRef.current) {
          speakNow(contextualReply.text, true);
        }
        return;
      }
    }

    if (
      focusedProduct &&
      mentionsVariantWords(trimmed) &&
      !mentionsProductIdentity(trimmed)
    ) {
      const focusedVariantReply = buildFocusedVariantReply(trimmed, focusedProduct, fromCall);
      if (focusedVariantReply) {
        setMessages((current) => [...current, { role: "user", text: trimmed }]);
        setInput("");

        if ("handled" in focusedVariantReply) {
          return;
        }

        addAssistantMessage(focusedVariantReply.text, focusedVariantReply.products);
        if (fromCall || callActiveRef.current) {
          speakNow(focusedVariantReply.text, true);
        }
        return;
      }
    }

    const contextualVariantProduct = lastVariantProductRef.current ?? resolvedProduct ?? focusedProduct;
    if (!looksLikeAddToCartIntent(trimmed) && contextualVariantProduct && (extractColorFromMessage(trimmed, contextualVariantProduct) || extractSizeFromMessage(trimmed, contextualVariantProduct))) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");
      const color = extractColorFromMessage(trimmed, contextualVariantProduct);
      const size = extractSizeFromMessage(trimmed, contextualVariantProduct);
      const needsColor = contextualVariantProduct.colors.length > 1 && !color;
      const needsSize = contextualVariantProduct.sizes.length > 1 && !size;

      if (
        !needsColor &&
        !needsSize &&
        /(?:want|need|take|give me|go with|choose|add|added|adding|put)/i.test(trimmed)
      ) {
        executeAddToCart(contextualVariantProduct, {
          shouldSpeak: fromCall || callActiveRef.current,
          color,
          size,
        });
        return;
      }
    }

    if (looksLikeAddToCartIntent(trimmed)) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");

      const addTarget =
        resolvedProduct ??
        focusedProduct ??
        getRememberedProduct() ??
        latestSuggestionsRef.current[0] ??
        (lastSearchMessageRef.current ? searchCatalog(lastSearchMessageRef.current, products).displayProducts[0] : undefined);

      if (addTarget) {
        prepareCartSelection(addTarget, trimmed, fromCall);
      } else {
        const text = "Tell me which product you want me to add, and I will handle the cart step for you.";
        addAssistantMessage(text);
        if (fromCall || callActiveRef.current) {
          speakNow(text, true);
        }
      }
      return;
    }

    if (looksLikeRemoveAllIntent(trimmed)) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");
      clearCart();
      const text = "I removed everything from your cart. If you want, I can show fresh options again.";
      addAssistantMessage(text);
      if (fromCall || callActiveRef.current) {
        speakNow(text, true);
      }
      return;
    }

    if (looksLikeCompareIntent(trimmed)) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");
      if (compareSuggestedProducts(trimmed, fromCall)) {
        return;
      }
    }

    if (looksLikeRemoveIntent(trimmed)) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");
      const matches = findCartMatchesFromText(trimmed);

      if (matches.length === 1) {
        announceRemoval(matches[0], fromCall);
      } else if (matches.length > 1) {
        askForRemoveClarification(matches, fromCall);
      } else if (ordinalIndex !== null && cartEntries[ordinalIndex]) {
        announceRemoval(cartEntries[ordinalIndex], fromCall);
      } else {
        const text = "I could not find that item in your cart. Tell me the product name, color, size, or number.";
        addAssistantMessage(text);
        if (fromCall || callActiveRef.current) {
          speakNow(text, true);
        }
      }
      return;
    }

    if (looksLikeCheckoutIntent(trimmed)) {
      setMessages((current) => [...current, { role: "user", text: trimmed }]);
      setInput("");
      executeCheckout();
      return;
    }

    const history = messages.slice(-8).map((item) => ({
      role: item.role,
      text: item.text,
    }));

    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setInput("");
    setIsThinking(true);
    lastSearchMessageRef.current = resolvedMessage;

    if (showAllFromContext) {
      const reply = buildAgentReply(resolvedMessage, products);
      addAssistantMessage(reply.text, reply.products);
      if (fromCall || callActiveRef.current) {
        speakNow(reply.text, true);
      }
      setIsThinking(false);
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: resolvedMessage,
          history,
          context: {
            focusedProductId: lastFocusedProductRef.current?.id,
            suggestedProductIds: latestSuggestionsRef.current.map((product) => product.id),
            pendingProductId: lastVariantProductRef.current?.id,
            liveMode: fromCall || callActiveRef.current,
            memorySummary: summarizeMemory(sessionMemoryRef.current),
            cartLines: cartItems.map((item) => ({
              productId: item.productId,
              color: item.color,
              size: item.size,
              quantity: item.quantity,
            })),
          },
        }),
      });

      const payload = await response.json();
      addAssistantMessage(payload.text, payload.products ?? []);

      if (fromCall || callActiveRef.current) {
        speakNow(payload.text, true);
      }
    } catch {
      const reply = buildAgentReply(resolvedMessage, products);
      addAssistantMessage(reply.text, reply.products);
      if (fromCall || callActiveRef.current) {
        speakNow(reply.text, true);
      }
    } finally {
      setIsThinking(false);
    }
  }

  function handleAddToCart(product: DemoProduct) {
    const variant = getDefaultVariant(product);
    executeAddToCart(product, {
      shouldSpeak: callActiveRef.current,
      color: variant.color,
      size: variant.size,
    });
  }

  function toggleVoice() {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      addAssistantMessage("This browser does not support live speech recognition. Chrome works best for the talk demo.");
      return;
    }

    if (callActiveRef.current) {
      terminateCall();
      return;
    }

    setPendingCartSelection(null);
    setPendingRemovalSelection(null);
    lastVariantProductRef.current = null;
    callActiveRef.current = true;
    setCallActive(true);
    addAssistantMessage("Live session started. Tell me what you want, and I will help like you are on a call.");
    speakNow(
      "Hi, you are connected to your sales agent. Tell me what you are looking for, and I will help you choose the best option.",
      true,
    );
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <h1>PlayVault Sports Store</h1>
        </div>
        <div className="hero-links">
          <Link href="/login" className="ghost-button">
            User Login
          </Link>
          <Link href="/admin/login" className="ghost-button">
            Admin Login
          </Link>
        </div>
      </section>

      <div className="content-grid">
        <section className="catalog-panel">
          <div className="section-header">
            <h2>Featured sports equipment</h2>
            <button type="button" className="ghost-button cart-trigger" onClick={() => setCartOpen(true)}>
              Cart {cartCount}
            </button>
          </div>
          <div className="product-grid">
            {featured.map((product) => (
              <article key={product.id} className="product-card">
                <div className="image-box">
                  <Image src={product.image} alt={product.name} fill className="card-image" />
                </div>
                <div className="product-content">
                  <div className="product-meta">
                    <span>{product.brand}</span>
                    <span>{normalizeCategoryLabel(product.category)}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="product-footer">
                    <strong>Rs. {product.price}</strong>
                    <div className="product-action-stack">
                      <div className="qty-control">
                        <button type="button" onClick={() => updateSelectedQty(product.id, -1)}>
                          -
                        </button>
                        <span>{getSelectedQty(product.id)}</span>
                        <button type="button" onClick={() => updateSelectedQty(product.id, 1)}>
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className={
                          cartEntries.some((entry) => entry.product.id === product.id)
                            ? "ghost-button success-button"
                            : "primary-button"
                        }
                        onClick={() => handleAddToCart(product)}
                      >
                        {cartEntries.some((entry) => entry.product.id === product.id) ? "Added" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className={`assistant-panel ${assistantOpen ? "open" : "closed"}`}>
          <div className="assistant-header">
            <div className="assistant-title-block">
              <span className="eyebrow">Sales Agent</span>
              <h2>Ask Me</h2>
            </div>
            <div className="assistant-header-actions">
              <div className="status-badge">
                {callActive
                  ? isListening
                    ? "Listening"
                    : isSpeaking
                      ? "Speaking"
                      : isThinking
                        ? "Thinking"
                        : "Live"
                  : `Cart ${cartCount}`}
              </div>
              <button
                type="button"
                className="assistant-tool-button"
                onClick={replayLatestAssistantMessage}
                aria-label="Speak latest assistant reply"
              >
                <SpeakerSvg />
              </button>
              {callActive ? (
                <button
                  type="button"
                  className="assistant-tool-button danger"
                  onClick={terminateCall}
                  aria-label="End live audio chat"
                >
                  <EndCallSvg />
                </button>
              ) : null}
              <button
                type="button"
                className="assistant-close"
                onClick={() => setAssistantOpen(false)}
                aria-label="Close assistant"
              >
                ×
              </button>
            </div>
          </div>

          <div className="chat-list" ref={chatScrollRef}>
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
                <p>{message.text}</p>
                {message.products?.length ? (
                  <div className="bubble-products">
                    {message.products.map((product) => (
                      <div key={product.id} className="mini-card">
                        <div className="mini-image-box">
                          <Image src={product.image} alt={product.name} fill className="card-image" />
                        </div>
                        <div className="mini-text">
                          <strong>{product.name}</strong>
                          <small>{product.description}</small>
                          <span>Rs. {product.price}</span>
                          <small>{product.colors.join(", ")} | {product.sizes.join(", ")}</small>
                          <div className="qty-control mini-qty-control">
                            <button type="button" onClick={() => updateSelectedQty(product.id, -1)}>
                              -
                            </button>
                            <span>{getSelectedQty(product.id)}</span>
                            <button type="button" onClick={() => updateSelectedQty(product.id, 1)}>
                              +
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={
                            cartEntries.some((entry) => entry.product.id === product.id)
                              ? "primary-button success-button small-add-button"
                              : "primary-button small-add-button"
                          }
                          onClick={() => handleAddToCart(product)}
                        >
                          {cartEntries.some((entry) => entry.product.id === product.id) ? "Added" : "Add"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isThinking ? (
              <div className="bubble assistant">
                <p>Agent is thinking about the best reply...</p>
              </div>
            ) : null}
            {callActive && isListening ? (
              <div className="bubble assistant listening-bubble">
                <div className="typing-row">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <p>Listening... you can speak now</p>
              </div>
            ) : null}
          </div>

          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend(input);
            }}
          >
            <button
              type="button"
              className={`icon-button ${callActive ? "active" : ""}`}
              onClick={callActive ? terminateCall : toggleVoice}
              aria-label={callActive ? "Terminate live audio chat" : "Start live audio chat"}
            >
              <span className="mic-icon">{callActive ? <HangupSvg /> : <MicSvg />}</span>
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend(input);
                }
              }}
              placeholder="Ask about sports equipment"
              rows={1}
            />
            <button type="submit" className="primary-button send-icon-button" aria-label="Send message">
              <SendSvg />
            </button>
          </form>
        </aside>
      </div>

      {cartOpen ? (
        <aside className="cart-popup">
          <div className="cart-panel">
            <div className="cart-panel-header">
              <strong>Cart</strong>
              <button type="button" className="assistant-close" onClick={() => setCartOpen(false)}>
                ×
              </button>
            </div>
            <div className="cart-list">
              {cartEntries.length ? (
                cartEntries.map(({ product, line }) => (
                  <div key={line.key} className="cart-item">
                    <div className="cart-item-image">
                      <Image src={product.image} alt={product.name} fill className="card-image" />
                    </div>
                    <div className="cart-item-text">
                      <strong>{product.name}</strong>
                      <span>{buildVariantLabel(line.color, line.size)}</span>
                      <span>Rs. {product.price}</span>
                      <div className="qty-control mini-qty-control">
                        <button type="button" onClick={() => updateCartQty(line.key, -1)}>
                          -
                        </button>
                        <span>{line.quantity}</span>
                        <button type="button" onClick={() => updateCartQty(line.key, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-cart-copy">No items in cart yet.</p>
              )}
            </div>
            <button type="button" className="primary-button purchase-button" onClick={executeCheckout}>
              Purchase
            </button>
          </div>
        </aside>
      ) : null}

      <button
        type="button"
        className={`assistant-fab ${assistantOpen ? "hidden" : ""}`}
        onClick={() => setAssistantOpen(true)}
      >
        <span className="assistant-fab-logo">AI</span>
        <span className="assistant-fab-copy">
          <strong>Ask Me</strong>
          <small>Sales Agent</small>
        </span>
      </button>
    </main>
  );
}
