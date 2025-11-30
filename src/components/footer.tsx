import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-6 bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-slate-600">
        <div className="mb-4 md:mb-0">
          <span className="font-semibold">Tipsy Pelicans</span> &copy;{" "}
          {new Date().getFullYear()}
        </div>
        <div className="flex gap-6">
          <Link
            href="/privacy-policy"
            className="hover:text-blue-600 hover:underline transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/data-deletion"
            className="hover:text-blue-600 hover:underline transition-colors"
          >
            Data Deletion
          </Link>
        </div>
      </div>
    </footer>
  );
}
