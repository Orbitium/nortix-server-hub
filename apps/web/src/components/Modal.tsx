import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "../lib/i18n";

export function Modal({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className={className ? `modal ${className}` : "modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t("ui.closeDialog")}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
