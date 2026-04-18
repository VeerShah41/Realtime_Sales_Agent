import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDemoProducts } from "@/lib/demo-data";
import { buildAgentReply, getCatalogOverview, searchCatalog } from "@/lib/sales-agent";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1),
});

const contextSchema = z.object({
  focusedProductId: z.string().optional(),
  suggestedProductIds: z.array(z.string()).max(12).default([]),
  pendingProductId: z.string().optional(),
  liveMode: z.boolean().default(false),
  memorySummary: z.string().default(""),
  cartLines: z
    .array(
      z.object({
        productId: z.string(),
        color: z.string(),
        size: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .max(20)
    .default([]),
});

const requestSchema = z.object({
  message: z.string().min(1),
  history: z.array(messageSchema).max(20).default([]),
  context: contextSchema.default({
    suggestedProductIds: [],
    liveMode: false,
    memorySummary: "",
    cartLines: [],
  }),
});

const demoProducts = generateDemoProducts();

function shortlistProducts(message: string) {
  const result = searchCatalog(message, demoProducts);
  return result.displayProducts;
}

function buildCatalogBlock(message: string) {
  const result = searchCatalog(message, demoProducts);
  const matches = result.exactAvailable
    ? (result.showAllRequested ? result.matches.slice(0, 12) : result.displayProducts)
    : result.closestMatches.slice(0, 6);

  if (!matches.length) {
    return "No exact catalog matches for this turn.";
  }

  return matches
    .map(
      (product, index) =>
        `${index + 1}. ${product.name} | category=${product.category} | brand=${product.brand} | price=Rs.${product.price} | colors=${product.colors.join(", ")} | sizes=${product.sizes.join(", ")} | stock=${product.stock} | description=${product.description}`,
    )
    .join("\n");
}

function formatProduct(product?: (typeof demoProducts)[number]) {
  if (!product) return "None";
  return `${product.name} | brand=${product.brand} | category=${product.category} | price=Rs.${product.price} | colors=${product.colors.join(", ")} | sizes=${product.sizes.join(", ")}`;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { message, history, context } = parsed.data;
  const fallback = buildAgentReply(message, demoProducts);
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return NextResponse.json({
      text: fallback.text,
      products: fallback.products,
      source: "fallback",
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const transcript = history
      .slice(-8)
      .map((item) => `${item.role === "user" ? "Customer" : "Agent"}: ${item.text}`)
      .join("\n");
    const focusedProduct = demoProducts.find((product) => product.id === context.focusedProductId);
    const pendingProduct = demoProducts.find((product) => product.id === context.pendingProductId);
    const suggestedProducts = context.suggestedProductIds
      .map((id) => demoProducts.find((product) => product.id === id))
      .filter((product): product is (typeof demoProducts)[number] => Boolean(product));
    const cartSummary = context.cartLines.length
      ? context.cartLines
          .map((line) => {
            const product = demoProducts.find((item) => item.id === line.productId);
            return product
              ? `${product.name} | color=${line.color} | size=${line.size} | qty=${line.quantity}`
              : `Unknown item | qty=${line.quantity}`;
          })
          .join("\n")
      : "Cart is empty.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        temperature: 0.35,
        topP: 0.85,
        maxOutputTokens: 180,
        systemInstruction: `You are a live ecommerce sales agent.
Speak naturally like a confident store salesperson in a real conversation.
Keep replies short, voice-friendly, and helpful.
Never output JSON or lists unless absolutely needed.
Goals:
- understand what the shopper wants
- recommend 1 best match when the customer is specific
- recommend 2 options when a comparison would help
- only show more than 3 if the customer explicitly asks to see all options
- explain why the top pick fits
- guide the shopper toward compare, cart, or checkout
- answer shipping, returns, exchanges, and payment questions clearly
Rules:
- only use the provided catalog and policy facts
- never invent products, prices, stock, discounts, or policies
- if the request is vague, ask exactly one short follow-up question
- most replies should stay within 2 or 3 sentences
- do not repeat the same product as all options
- if comparing, clearly contrast two different matching products when available
- if the customer says "show all options", show all relevant matching options from the provided catalog
- if the customer asks for a product that is unavailable, say it is not available at this time and then guide them to the closest available alternatives
- if the customer says "add Nivia basketball", assume they want that specific product family and ask for missing color or size before confirming the cart step
- if the customer already gave the exact product, color, and size in one message, do not ask unnecessary follow-up questions
- if the customer asks "what colors and sizes are available", answer with the exact available colors and sizes for the current product
- if the customer greets you or asks which categories are available, tell them the available categories clearly
- avoid using filler words like "strong" in the reply
- stay anchored to the current focused product and pending variant flow from the provided UI context
- use the provided session memory to preserve the customer's category, brand, budget, color, size, and last product context across turns
- if the UI context says there is a pending product, do not switch to unrelated products unless the customer clearly changes the topic
- if the customer refers to "the third one" or "the second Nivia one", respect both the item order and the product name or brand
- if the customer asks to remove something from the cart, help them identify the exact item and ask a short clarification only when needed`,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Conversation so far:
${transcript || "No prior conversation."}

Current customer message:
${message}

Relevant catalog options:
${buildCatalogBlock(message)}

Focused product from UI:
${formatProduct(focusedProduct)}

Pending product waiting for variant details:
${formatProduct(pendingProduct)}

Current suggested products from UI:
${suggestedProducts.length ? suggestedProducts.map((product, index) => `${index + 1}. ${formatProduct(product)}`).join("\n") : "None"}

Current cart:
${cartSummary}

Session memory from UI:
${context.memorySummary || "None"}

Interaction mode:
${context.liveMode ? "Live voice call" : "Typed chat"}

Store policy facts:
- Shipping: 3 to 5 business days in this demo.
- Returns: 7 day unused return window.
- Exchanges: size and color exchanges if stock is available.
- Payments: cards, UPI, and cash on delivery on selected items.

Catalog overview:
${getCatalogOverview(demoProducts)}

Behavior test cases you must follow:
- Customer: "show all football options under 2000" -> show all matching football options from the catalog block, not just one.
- Customer: "add Nivia basketball" -> ask for size and color if they matter before confirming add.
- Customer: "add Cosco basketball size 7 color red" -> treat it as a direct add flow with no extra loop.
- Customer: "what colors and sizes are available" -> answer with the current product's exact colors and sizes.
- Customer: "show me all Nike footballs" -> keep the answer inside the football category and Nike brand only.
- Customer: "give me the cheaper one" -> stay in the same product family or category and suggest the lower-priced alternative.
- Customer: "same one in another color" -> stay on the same focused product first, then offer close alternatives only if that exact product has no other color.
- Customer: "which one is best for beginners" -> prefer products whose tags or descriptions clearly fit training, practice, or entry-level use.
- Customer: "add the third one" -> treat it as the third currently shown product.
- Customer: "the second Nivia one" -> match the second option among the currently shown Nivia products when possible.
- Customer: "this one is not available?" -> be honest and, if unavailable, pivot to the closest available alternatives.
- Customer: "remove the blue basketball from cart" -> help remove the exact item, and if multiple cart items match, ask one short clarifying question.
- Customer: "terminate the agent" -> end the live call politely and do not continue the conversation.

Reply as the sales agent speaking directly to the customer.`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      text: response.text?.trim() || fallback.text,
      products: fallback.products,
      source: "gemini",
    });
  } catch {
    return NextResponse.json({
      text: fallback.text,
      products: fallback.products,
      source: "fallback",
    });
  }
}
