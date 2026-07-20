import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card, ProgressBar, Sparks, StatusChip } from "@nortix/ui";
import { useState } from "react";
import { useParticipations } from "../features/api-data";

export function SeededProgressPage() {
  const [tab, setTab] = useState("Active");
  const { data: participations = [], isLoading, isError, refetch } = useParticipations();
  const visible = participations.filter((participation) => {
    if (tab === "Active") return ["JOINED", "IN_PROGRESS"].includes(participation.status);
    if (tab === "Under review") return participation.completions.some((item) => item.status === "PENDING");
    if (tab === "Completed") return participation.status === "COMPLETED";
    return true;
  });
  const active = participations.filter((item) => ["JOINED", "IN_PROGRESS"].includes(item.status));
  const potentialSparks = active.reduce((total, item) => total + item.campaign.maximumSparksReward, 0);

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <h1>My Progress</h1>
          <p>Track backend-verified campaign milestones and potential Sparks.</p>
        </div>
      </div>
      <div className="summary-strip">
        <span><small>Active campaigns</small><strong>{active.length}</strong></span>
        <span><small>Completed</small><strong>{participations.filter((item) => item.status === "COMPLETED").length}</strong></span>
        <span><small>Potential Sparks</small><strong>Up to {potentialSparks.toLocaleString()}</strong></span>
        <span><small>Participation records</small><strong>{participations.length}</strong></span>
      </div>
      <div className="tabs">
        {["Active", "Under review", "Completed", "History"].map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>
        ))}
      </div>
      {isLoading && <Card><p>Loading your seeded participation records…</p></Card>}
      {isError && <Card><p>Participation records could not be loaded.</p><Button onClick={() => refetch()}>Retry</Button></Card>}
      {!isLoading && !isError && visible.length === 0 && (
        <Card><p>No participation records match this view.</p><Link className="button button--primary" to="/campaigns">Browse campaigns</Link></Card>
      )}
      <div className="campaign-grid">
        {visible.map((participation) => {
          const milestones = participation.campaign.milestones;
          const approved = participation.completions.filter((item) => item.status === "APPROVED").length;
          return (
            <Card className="progress-detail" key={participation.id}>
              <div className="progress-detail__header">
                <span className="server-inline__logo">{participation.campaign.server.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <h2>{participation.campaign.title}</h2>
                  <p>{participation.campaign.server.name} · Joined {new Date(participation.joinedAt).toLocaleDateString()}</p>
                </div>
                <StatusChip status={participation.status} />
              </div>
              <ProgressBar value={milestones.length ? Math.round((approved / milestones.length) * 100) : 0} label={`${approved} of ${milestones.length} milestones verified`} />
              <div className="milestone-status-list">
                {milestones.map((milestone, index) => {
                  const completion = participation.completions.find((item) => item.milestoneId === milestone.id);
                  return (
                    <div className={completion?.status === "APPROVED" ? "complete" : ""} key={milestone.id}>
                      {completion?.status === "APPROVED" ? <CheckCircle2 /> : <span className="status-number">{index + 1}</span>}
                      <span>
                        <strong>{milestone.title}</strong>
                        <small>{completion ? `Verification: ${completion.status.toLowerCase()}` : milestone.publicInstructions}</small>
                      </span>
                      <div><strong>Up to {milestone.sparksReward}</strong><Sparks value="Sparks" /></div>
                    </div>
                  );
                })}
              </div>
              <small>Last activity {new Date(participation.lastActivityAt).toLocaleString()}</small>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
