import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface HeaderProps {
  categories: Category[];
  activeCategorySlug?: string;
  onCategoryChange?: (slug: string) => void;
  showBackLink?: boolean;
}

export default function Header({
  categories,
  activeCategorySlug = "all",
  onCategoryChange,
  showBackLink = false,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCategoryClick = (slug: string) => {
    if (onCategoryChange) {
      onCategoryChange(slug);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-foreground/[0.03]">
        <div className="w-full px-5 md:px-10">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left: Desktop Nav */}
            <div className="flex items-center gap-8 flex-1">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-1 text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
              </button>

              <nav className="hidden md:flex items-center gap-7">
                {showBackLink ? (
                  <Link
                    to="/"
                    className="nav-link text-xs font-body font-normal uppercase text-foreground/50 hover:text-foreground transition-colors"
                  >
                    ← Back
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCategoryClick("all")}
                    className={`nav-link text-xs font-body font-normal uppercase transition-colors duration-300 ${
                      activeCategorySlug === "all" ? "text-foreground active" : "text-foreground/40 hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                )}
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className={`nav-link text-xs font-body font-normal uppercase transition-colors duration-300 ${
                      activeCategorySlug === cat.slug ? "text-foreground active" : "text-foreground/40 hover:text-foreground"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Center: Logo */}
            <Link to="/" className="absolute left-1/2 -translate-x-1/2 text-center group">
              <span className="font-body text-2xl md:text-3xl font-semibold text-foreground uppercase">
                HINA
              </span>
              <span className="font-body text-2xl md:text-3xl font-light text-foreground/30 ml-2 group-hover:text-foreground/60 transition-colors uppercase">
                STUDIO
              </span>
            </Link>

            {/* Right: Info */}
            <div className="flex items-center gap-6 flex-1 justify-end">
              <Link
                to="/"
                className="hidden md:flex items-center gap-1 text-xs font-body font-normal uppercase text-foreground/40 hover:text-foreground transition-colors nav-link"
              >
                Contact
                <ArrowUpRight size={10} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background pt-20"
          >
            <motion.nav
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center gap-8 h-[70vh]"
            >
              <button
                onClick={() => handleCategoryClick("all")}
                className={`font-display text-3xl font-light ${activeCategorySlug === "all" ? "text-foreground" : "text-foreground/30"}`}
              >
                Journal
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`font-display text-3xl font-light ${activeCategorySlug === cat.slug ? "text-foreground" : "text-foreground/30"}`}
                >
                  {cat.name}
                </button>
              ))}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
