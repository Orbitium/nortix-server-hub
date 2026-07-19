import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="Nortix Playtests home">
      <span className="brand__mark">N</span>
      {!compact && (
        <span className="brand__word">
          NORTIX <small>PLAYTESTS</small>
        </span>
      )}
    </Link>
  );
}
