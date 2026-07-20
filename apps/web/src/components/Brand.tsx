import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="brand" aria-label="Nortix Playtests home">
      <span className="brand__mark">X</span>
      {!compact && (
        <span className="brand__word">
          NORTIX
        </span>
      )}
    </Link>
  );
}
