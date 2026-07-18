"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ShoppingBag, User, Search } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { siteConfig } from "@/lib/site-config";
import { getBlurDataURL } from "@/lib/imageUtils";

interface MenuItem {
  id: string;
  name: string;
  url?: string;
  category?: { id: string; slug: string; name: string };
  collection?: { id: string; slug: string; name: string };
  page?: { slug: string; title: string };
}

interface HeaderProps {
  menuItems?: MenuItem[];
}

const DEFAULT_MENU: MenuItem[] = [
  { id: "1", name: "Shop DENO", url: "/products" },
  { id: "saccos", name: "Shop SACCO", url: "/saccos" },
  { id: "beba", name: "Shop BEBA", url: "/beba" },
  { id: "attire", name: "Shop ATTIRE", url: "/attire" },
];

function menuHref(item: MenuItem): string {
  if (item.url) return item.url;
  if (item.collection) return `/collections/${item.collection.slug}`;
  if (item.category) return `/categories/${item.category.slug}`;
  if (item.page) return `/pages/${item.page.slug}`;
  return "#";
}

export function Header({ menuItems = [] }: HeaderProps) {
  const displayMenu = menuItems.length > 0 ? menuItems : DEFAULT_MENU;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { cart, openCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartItemsCount = mounted ? (cart?.lines.reduce((sum, line) => sum + line.quantity, 0) || 0) : 0;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 mr-2"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link href="/" className="flex-shrink-0">
              <Image
                src="/muraguri-logo.svg"
                alt={siteConfig.name}
                width={160}
                height={48}
                className="h-12 w-auto"
                priority
                blurDataURL={getBlurDataURL()}
              />
            </Link>
          </div>

          <div className="hidden lg:flex lg:gap-x-8">
            {displayMenu.map((item) => (
              <Link
                key={item.id}
                href={menuHref(item)}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/search" className="p-2 text-gray-500 hover:text-gray-700">
              <Search className="h-5 w-5" />
            </Link>

            <Link href="/account" className="p-2 text-gray-500 hover:text-gray-700 hidden sm:block">
              <User className="h-5 w-5" />
            </Link>

            <button
              type="button"
              onClick={openCart}
              className="relative p-2 text-gray-500 hover:text-gray-700"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-50">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-white px-4 py-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">Menu</span>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-6 flow-root">
                  <ul className="-my-4 divide-y divide-gray-200">
                    {displayMenu.map((item) => (
                      <li key={item.id} className="py-4">
                        <Link
                          href={menuHref(item)}
                          className="block text-base font-medium text-gray-700 hover:text-gray-900"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6 space-y-2">
                  <Link
                    href="/account"
                    className="flex items-center gap-2 text-base font-medium text-gray-700 hover:text-gray-900"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
