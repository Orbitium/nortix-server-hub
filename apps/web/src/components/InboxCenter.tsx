import {
  Archive,
  Bell,
  CheckCheck,
  CircleAlert,
  Gamepad2,
  MessageSquare,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "@nortix/ui";
import {
  type InboxMessage,
  type NotificationPreferences,
  type UserNotification,
  useInboxMessages,
  useNotificationPreferences,
  useNotifications,
} from "../features/api-data";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { ListSkeleton } from "./LoadingSkeletons";

const relativeTime = (value: string) => {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const notificationIcon = {
  CAMPAIGN: Gamepad2,
  QUEST: Zap,
  SPARKS: Sparkles,
  SERVER: Server,
  TEAM: Users,
  SECURITY: ShieldCheck,
  SYSTEM: Bell,
} as const;

function EmptyInbox({ type }: { type: "notifications" | "messages" }) {
  const { t } = useI18n();
  return (
    <div className="inbox-empty">
      {type === "messages" ? <MessageSquare /> : <Bell />}
      <h2>{type === "messages" ? t("ui.noMessages") : t("ui.noNotifications")}</h2>
      <p>{type === "messages" ? t("ui.staffMessages") : t("ui.activityUpdates")}</p>
    </div>
  );
}

export function InboxPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"notifications" | "messages">("notifications");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busyId, setBusyId] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notifications = useNotifications(unreadOnly);
  const messages = useInboxMessages(unreadOnly);

  useEffect(() => {
    if (tab !== "notifications") return;
    void api("/inbox/read-all", {
      method: "POST",
      body: JSON.stringify({ kind: "notifications" }),
    })
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["notifications"] }),
          queryClient.invalidateQueries({ queryKey: ["inbox-summary"] }),
        ]),
      )
      .catch(() => undefined);
  }, [queryClient, tab]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] }),
      queryClient.invalidateQueries({ queryKey: ["inbox-summary"] }),
    ]);
  };

  const openNotification = async (item: UserNotification) => {
    if (!item.readAt) await api(`/notifications/${item.id}/read`, { method: "PATCH" });
    await refresh();
    if (item.actionUrl) navigate(item.actionUrl);
  };

  const openMessage = async (delivery: InboxMessage) => {
    if (!delivery.readAt) await api(`/messages/${delivery.id}/read`, { method: "PATCH" });
    await refresh();
    if (delivery.message.actionUrl) navigate(delivery.message.actionUrl);
  };

  const archive = async (kind: "notification" | "message", id: string) => {
    setBusyId(id);
    try {
      await api(`/${kind === "notification" ? "notifications" : "messages"}/${id}`, {
        method: "DELETE",
      });
      await refresh();
    } finally {
      setBusyId("");
    }
  };

  const markAllRead = async () => {
    await api("/inbox/read-all", {
      method: "POST",
      body: JSON.stringify({ kind: tab }),
    });
    await refresh();
  };

  const activeQuery = tab === "notifications" ? notifications : messages;
  const items = activeQuery.data ?? [];

  return (
    <div className="dashboard-page inbox-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">{t("ui.accountCommunications")}</span>
          <h1>{t("ui.inbox")}</h1>
          <p>{t("ui.inboxDescription")}</p>
        </div>
        <Button variant="secondary" onClick={markAllRead} disabled={!items.some((item) => !item.readAt)}>
          <CheckCheck /> {t("ui.markAllRead")}
        </Button>
      </div>

      <Card className="inbox-shell">
        <div className="inbox-toolbar">
          <div className="inbox-tabs" role="tablist" aria-label="Inbox sections">
            <button className={tab === "notifications" ? "active" : ""} onClick={() => setTab("notifications")} role="tab">
              <Bell /> {t("ui.notifications")}
            </button>
            <button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")} role="tab">
              <MessageSquare /> {t("ui.messagesFromNortix")}
            </button>
          </div>
          <label className="inbox-unread-filter">
            <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />
            {t("ui.unreadOnly")}
          </label>
        </div>

        {activeQuery.isLoading ? <ListSkeleton rows={5} label="Loading your inbox" /> : null}
        {activeQuery.isError ? (
          <div className="inbox-loading" role="alert">
            {t("ui.inboxError")} <button onClick={() => activeQuery.refetch()}>{t("ui.retry")}</button>
          </div>
        ) : null}

        {!activeQuery.isLoading && !activeQuery.isError && items.length === 0 ? <EmptyInbox type={tab} /> : null}

        {tab === "notifications" ? (
          <div className="inbox-list">
            {(notifications.data ?? []).map((item) => {
              const Icon = notificationIcon[item.category];
              return (
                <article className={`inbox-item ${item.readAt ? "" : "is-unread"}`} key={item.id}>
                  <button className="inbox-item__content" onClick={() => openNotification(item)}>
                    <span className={`inbox-item__icon inbox-item__icon--${item.category.toLowerCase()}`}><Icon /></span>
                    <span>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                      <small>{relativeTime(item.createdAt)} · {item.category.toLowerCase()}</small>
                    </span>
                  </button>
                  <button className="inbox-archive" disabled={busyId === item.id} onClick={() => archive("notification", item.id)} aria-label={t("ui.archive", { title: item.title })}>
                    <Archive />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="inbox-list">
            {(messages.data ?? []).map((delivery) => (
              <article className={`inbox-item inbox-message inbox-message--${delivery.message.severity.toLowerCase()} ${delivery.readAt ? "" : "is-unread"}`} key={delivery.id}>
                <button className="inbox-item__content" onClick={() => openMessage(delivery)}>
                  <span className="inbox-item__icon">
                    {delivery.message.severity === "CRITICAL" ? <CircleAlert /> : <ShieldCheck />}
                  </span>
                  <span>
                    <strong>{delivery.message.title}</strong>
                    <p>{delivery.message.body}</p>
                    <small>{relativeTime(delivery.deliveredAt)} · {delivery.message.createdBy.displayName}</small>
                  </span>
                </button>
                <button className="inbox-archive" disabled={busyId === delivery.id} onClick={() => archive("message", delivery.id)} aria-label={t("ui.archive", { title: delivery.message.title })}>
                  <Archive />
                </button>
              </article>
            ))}
          </div>
        )}
      </Card>
      <p className="inbox-privacy-note">
        <ShieldCheck /> {t("ui.inboxPrivacy")}
      </p>
    </div>
  );
}

const preferenceRows: Array<{
  key: keyof Omit<NotificationPreferences, "updatedAt" | "emailProductUpdates">;
  title: string;
  description: string;
}> = [
  { key: "campaignActivity", title: "Campaign activity", description: "Joins, milestone results, campaign changes, and participation updates." },
  { key: "questsAndStreaks", title: "Quests and streaks", description: "Persisted daily quest progress and streak status changes." },
  { key: "sparksActivity", title: "Sparks activity", description: "Verified Sparks activity, shop purchases, and account corrections." },
  { key: "serverOperations", title: "Server operations", description: "Verification, plugin health, eligibility, and campaign operations." },
  { key: "teamActivity", title: "Team activity", description: "Server-team invitations, responses, role changes, and access removal." },
  { key: "productUpdates", title: "Product updates", description: "Non-urgent Nortix feature and service announcements." },
];

export function NotificationSettingsPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = useNotificationPreferences();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setStatus("");
    try {
      const updated = await api<NotificationPreferences>("/notification-preferences", {
        method: "PUT",
        body: JSON.stringify({
          campaignActivity: draft.campaignActivity,
          questsAndStreaks: draft.questsAndStreaks,
          sparksActivity: draft.sparksActivity,
          serverOperations: draft.serverOperations,
          teamActivity: draft.teamActivity,
          productUpdates: draft.productUpdates,
          emailProductUpdates: false,
        }),
      });
      setDraft(updated);
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      setStatus("Notification preferences saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Preferences could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (isError) return <div className="dashboard-page"><p>{t("ui.preferencesError")}</p><Button onClick={() => refetch()}>{t("ui.retry")}</Button></div>;
  if (isLoading || !draft)
    return (
      <div className="dashboard-page notification-settings-page">
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">{t("ui.accountSettings")}</span>
            <h1>{t("ui.notificationSettings")}</h1>
            <p>{t("ui.notificationDescription")}</p>
          </div>
        </div>
        <Card className="notification-settings-card">
          <ListSkeleton rows={6} label="Loading notification preferences" />
        </Card>
      </div>
    );

  return (
    <div className="dashboard-page notification-settings-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">{t("ui.accountSettings")}</span>
          <h1>{t("ui.notificationSettings")}</h1>
          <p>{t("ui.notificationDescription")}</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</Button>
      </div>
      <Card className="notification-settings-card">
        {preferenceRows.map((row) => (
          <label className="notification-setting-row" key={row.key}>
            <span>
              <strong>{row.title}</strong>
              <small>{row.description}</small>
            </span>
            <input
              type="checkbox"
              checked={draft[row.key]}
              onChange={(event) => setDraft({ ...draft, [row.key]: event.target.checked })}
            />
          </label>
        ))}
        <div className="notification-setting-row notification-setting-row--locked">
          <span>
            <strong>{t("ui.securityNotices")}</strong>
            <small>{t("ui.securityNoticesDescription")}</small>
          </span>
          <ShieldCheck />
        </div>
        <div className="notification-setting-row notification-setting-row--locked">
          <span>
            <strong>{t("ui.emailDelivery")}</strong>
            <small>{t("ui.emailDeliveryDescription")}</small>
          </span>
          <span className="unavailable-chip">{t("ui.unavailable")}</span>
        </div>
      </Card>
      {status ? <p className="settings-save-status" role="status">{status}</p> : null}
    </div>
  );
}
