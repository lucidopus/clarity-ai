import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card-bg/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Logo and Tagline */}
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-xl font-bold text-foreground">Clarity AI</span>
            </Link>
            <p className="text-sm text-secondary">Transform passive watching into active learning</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/privacy" className="text-secondary hover:text-accent transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-secondary hover:text-accent transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="text-secondary hover:text-accent transition-colors">
              Contact
            </Link>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-accent transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-accent transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-center text-sm text-secondary">
          © {new Date().getFullYear()} Clarity AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
