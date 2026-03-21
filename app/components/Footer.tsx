import { Link } from "react-router";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#111] border-t border-white/5">
      <div className="px-6 md:px-10 py-10 md:py-14">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          {/* Brand */}
          <div className="max-w-sm">
            <Link to="/" className="inline-block mb-3">
              <span className="font-display text-lg font-light text-white italic">
                HINA
              </span>
              <span className="font-display text-lg font-light text-white/30 italic ml-1">
                STUDIO
              </span>
            </Link>
            <p className="text-xs text-white/30 font-body font-light leading-relaxed">
              Capturing moments with elegance and artistry.
              <br />
              Photography studio based in Vietnam.
            </p>
          </div>

          {/* Links + Copyright */}
          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="flex gap-6">
              {["Instagram", "Facebook", "Email"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-xs uppercase text-white/30 hover:text-white/70 transition-colors font-body"
                >
                  {link}
                </a>
              ))}
            </div>
            <p className="text-xs text-white/15 font-body uppercase">
              © {year} Hina Studio
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
