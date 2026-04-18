"use client";

import { generateDemoProducts, type DemoProduct } from "@/lib/demo-data";

const PRODUCTS_KEY = "sales-demo-products";
const PRODUCTS_VERSION_KEY = "sales-demo-products-version";
const PRODUCTS_VERSION = "sports-basic-v5";
const USER_KEY = "sales-user-auth";
const ADMIN_KEY = "sales-admin-auth";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window.localStorage.getItem(key);
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function ensureDemoProducts() {
  if (typeof window === "undefined") {
    return [];
  }

  const currentVersion = window.localStorage.getItem(PRODUCTS_VERSION_KEY);
  const existing = readJSON<DemoProduct[]>(PRODUCTS_KEY, []);
  if (existing.length && currentVersion === PRODUCTS_VERSION) {
    return existing;
  }

  const seeded = generateDemoProducts();
  writeJSON(PRODUCTS_KEY, seeded);
  window.localStorage.setItem(PRODUCTS_VERSION_KEY, PRODUCTS_VERSION);
  return seeded;
}

export function getProducts() {
  return ensureDemoProducts();
}

export function saveProducts(products: DemoProduct[]) {
  writeJSON(PRODUCTS_KEY, products);
}

export function setUserLoggedIn(value: boolean) {
  writeJSON(USER_KEY, value);
}

export function setAdminLoggedIn(value: boolean) {
  writeJSON(ADMIN_KEY, value);
}

export function isUserLoggedIn() {
  return readJSON<boolean>(USER_KEY, false);
}

export function isAdminLoggedIn() {
  return readJSON<boolean>(ADMIN_KEY, false);
}
