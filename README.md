# Sales_chatbot

## Project Goal

Build a demo ecommerce website where the main feature is an AI sales assistant.

The product should include:

- a storefront with demo products
- a chat assistant as the main conversion feature
- a side `Talk to Agent` voice mode
- shared chat + voice context
- a local item-management area to add, update, and delete demo items

This version should use **one shared demo dataset** as the initial content source,
but storage should now be implemented with **SQLite3**.

## Final Product Shape

The app should feel like a small ecommerce store with an embedded sales agent:

- product listing on the main page
- right-side chat panel
- floating or side voice button
- product cards pushed by the assistant into chat
- admin/storage section for editing demo items

The assistant should behave like a salesperson:

- understand shopper intent
- recommend the right product
- answer store questions
- compare options
- push the user toward add-to-cart or checkout

## Tech Stack

Use a simple stack for speed:

- `Next.js` for frontend and backend routes
- `Gemini` for chat + live voice
- `SQLite3` for storage
- `Prisma` as ORM
- local JSON files only for seeding demo data

No Redis is required.
No Shopify is required in the MVP.

## Data Strategy

Use local JSON files inside the repo as the **seed/source for demo content**, then load them into SQLite.

Suggested files:

```txt
/data/products.json
/data/store.json
/data/faqs.json
```

### `products.json`

This should contain all demo products.

Each item should have fields like:

```json
{
  "id": "shoe-001",
  "name": "Black Training Shoe",
  "category": "shoes",
  "brand": "DemoFit",
  "price": 2499,
  "currency": "INR",
  "colors": ["black"],
  "sizes": ["7", "8", "9", "10"],
  "stock": 12,
  "image": "/images/shoe-001.jpg",
  "description": "Lightweight gym and daily training shoe.",
  "tags": ["gym", "training", "daily wear"],
  "featured": true
}
```

### `store.json`

Store-level data:

- store name
- shipping summary
- return policy summary
- support info
- currency

### `faqs.json`

Short answers for:

- shipping
- returns
- exchanges
- warranty
- payment

## Storage and CRUD Plan

Use **SQLite3 + Prisma** for product storage.
The local JSON file should be used only to seed initial demo items.

This storage area should support:

- add item
- update item
- delete item
- preview item card

The item-management UI can be a protected demo page like:

```txt
/admin
```

This page should:

- list all demo items
- provide a form for creating a new item
- allow editing product fields
- allow deleting items
- save changes back to `products.json`

For the MVP, this is enough to simulate storage with a real database-backed flow.

## Core Pages

### Storefront

Suggested route:

```txt
/
```

Contains:

- hero or simple header
- product grid
- right-side AI chat
- floating `Talk to Agent` trigger

### Product Detail

Suggested route:

```txt
/product/[id]
```

Contains:

- product image
- product info
- price
- stock
- AI quick-sell prompts
- add-to-cart button

### Admin / Storage

Suggested route:

```txt
/admin
```

Contains:

- item table or card list
- add/update/delete form
- local save action

## Main Experience

The main thing is the assistant, not the catalog.

So the experience priority should be:

1. chat works well
2. voice mode works well
3. product cards appear correctly
4. add/update/delete item storage works
5. store visuals support the assistant

## Assistant Modes

There should be two ways to interact:

### 1. Chat Mode

Text-first experience:

- shopper types a question
- AI responds in short sales-style language
- if relevant, AI shows product cards
- user can ask follow-up questions

### 2. Talk Mode

Voice-first experience:

- shopper clicks `Talk to Agent`
- microphone starts
- live transcript appears
- AI replies in voice
- same product cards update in the UI

Both modes should use the same session context.

## Shared Session Context

Even without Redis, keep session state in memory on the server or in client state for demo purposes.

Track:

- budget
- preferred category
- preferred brand
- color
- size
- last products shown
- selected product
- cart items

This lets the user do:

- type: `I need gym shoes under 3000`
- then speak: `show black ones`

The agent should continue the same context.

## AI Responsibilities

The assistant should:

- answer store questions
- ask short clarifying questions
- recommend products from demo data
- compare products
- guide user to add to cart
- suggest checkout

The assistant should not:

- invent products
- invent stock
- invent price
- invent policy details

Product answers should come from SQLite data seeded from the demo dataset.
Store and FAQ content can stay in local JSON unless you also want them in Prisma models.

## Tool / Function Layer

Even though this is a demo, structure it as if the AI is calling store tools.

Recommended tools:

- `search_products(filters)`
- `get_product_by_id(id)`
- `compare_products(ids)`
- `get_store_policy(topic)`
- `add_to_cart(productId, size, quantity)`
- `list_cart_items()`

For admin/storage:

- `create_product(product)`
- `update_product(id, updates)`
- `delete_product(id)`

These should be backed by Prisma queries.

## Prisma + SQLite Requirements

The project must include:

- `SQLite3` as the database
- `Prisma` as the ORM
- an initial migration
- a seed script that inserts demo products
- at least one complete CRUD RESTful API

Recommended model:

```prisma
model Product {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  category    String
  brand       String
  price       Int
  currency    String   @default("INR")
  colors      String
  sizes       String
  stock       Int
  image       String
  description String
  tags        String
  featured    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Because SQLite does not support array columns directly, fields like `colors`, `sizes`, and `tags` can be stored as JSON strings or comma-separated strings in the MVP.

## Full CRUD REST API Requirement

Implement at least one complete RESTful CRUD API for products.

Suggested endpoints:

```txt
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

This API should:

- use Prisma
- read/write to SQLite
- validate request payloads
- return JSON responses
- be usable by both the storefront and the admin page

This product CRUD API will also power the storage/admin section.

## Search and Recommendation Logic

Do not let the model search the full catalog by itself.
Create simple backend filtering logic over Prisma/SQLite data.

Extract filters like:

- category
- budget
- color
- brand
- size
- use case

Then return top matches from `products.json`.

Recommendation rules:

- show at most 3 items
- prefer in-stock items
- prefer closer budget matches
- prefer stronger tag matches

## Response Format

Keep the assistant output structured so the frontend can render cards.

Suggested response shape:

```json
{
  "reply": "I found two good black gym shoes under your budget.",
  "intent": "recommendation",
  "products": [
    {
      "id": "shoe-001",
      "name": "Black Training Shoe",
      "price": 2499,
      "image": "/images/shoe-001.jpg",
      "reason": "Best match for gym use under 3000."
    }
  ],
  "nextAction": "ask_size"
}
```

## UI Layout Plan

Suggested homepage layout:

- left: product grid
- right: sticky chat panel
- bottom-right or side: voice trigger

The store should look like ecommerce, but the assistant should be the focus.

## Suggested Folder Structure

```txt
/src
  /app
    /api
      /chat
      /voice
      /products
      /admin
    /admin
    /product/[id]
  /components
    ChatPanel.tsx
    VoicePanel.tsx
    ProductGrid.tsx
    ProductCard.tsx
    AdminProductForm.tsx
    AdminProductList.tsx
  /lib
    gemini.ts
    chat.ts
    session.ts
    product-search.ts
    product-storage.ts
    cart.ts
/data
  products.json
  store.json
  faqs.json
/prisma
  schema.prisma
  seed.ts
```

## Build Order

### Phase 1

- initialize Next.js app
- add Prisma + SQLite setup
- add demo product JSON seed
- render homepage product grid

### Phase 2

- build right-side chat UI
- connect Gemini text chat route
- return structured product cards

### Phase 3

- build cart state
- support add-to-cart from chat
- support product detail pages

### Phase 4

- build `/admin` storage area
- add create/update/delete item actions
- persist edits with Prisma into SQLite

### Phase 5

- add voice mode using Gemini Live
- connect voice transcript + product suggestions
- keep voice and text in shared session context

### Phase 6

- improve styling
- optimize short selling responses
- test full demo flow

## Demo-Ready User Flows

The final demo should support:

### Flow 1

- user types: `show me shoes under 3000`
- AI shows 2 or 3 product cards
- user adds one to cart

### Flow 2

- user clicks `Talk to Agent`
- user says: `I want a black backpack for college`
- AI speaks answer and updates product cards

### Flow 3

- user asks: `What is your return policy?`
- AI answers from `faqs.json`

### Flow 4

- admin opens `/admin`
- adds a new demo item
- item is saved in SQLite and appears in storefront and in assistant recommendations

### Flow 5

- admin edits or deletes an item
- updated catalog in SQLite is used immediately by storefront and assistant

## Optimization Rules

To keep the demo fast and clean:

- keep replies short
- ask one question at a time
- show no more than 3 products
- use backend filters, not raw model guessing
- keep policy answers cached in memory if needed
- keep voice responses concise

## MVP Scope

The MVP should include:

- storefront UI
- SQLite database with seeded demo product data
- Prisma ORM setup
- chat assistant
- voice mode trigger
- product recommendation cards
- cart actions
- admin storage page for add/update/delete
- one full CRUD RESTful API for products

This is enough for a strong demo with a lightweight real database setup.

## Recommended Next Step

Start with:

1. Next.js app scaffold
2. Prisma + SQLite setup
3. seed demo products from `products.json`
4. homepage UI
5. product CRUD API
6. chat API
7. admin storage page
8. voice integration

After that, polish the design and selling behavior.
<!-- commit 1: project scaffold -->
<!-- commit 2: prisma schema -->
<!-- commit 3: sales agent -->
<!-- commit 4: demo data -->
<!-- commit 5: home experience -->
<!-- commit 6: admin panel -->
<!-- commit 7: auth -->
<!-- commit 8: global css -->
<!-- commit 9: hydration fix -->
<!-- commit 10: product carousel -->
<!-- commit 11: suggestion chips -->
<!-- commit 12: api route fix -->
<!-- commit 13: sse streaming -->
<!-- commit 14: product detail page -->
<!-- commit 15: chat bubble styles -->
<!-- commit 16: cart persistence -->
<!-- commit 17: error handling -->
<!-- commit 18: admin crud -->
<!-- commit 19: chat hooks -->
<!-- commit 20: readme update -->
