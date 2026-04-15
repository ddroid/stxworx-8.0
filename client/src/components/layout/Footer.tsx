import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export const Footer = () => (
  <footer className="border-t border-white/10 bg-black/50 backdrop-blur-sm">
    <div className="container-custom py-8 px-6 md:pl-[92px]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted">
          © 2026 STXWORX. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <Link
            to="/whitepaper"
            className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
          >
            <FileText className="w-4 h-4" />
            Whitepaper
          </Link>
          <Link
            to="/privacy"
            className="text-sm text-muted hover:text-white transition-colors"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="text-sm text-muted hover:text-white transition-colors"
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  </footer>
);
