import { forwardRef } from "react";
import type { Transaction } from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";

// Fixed light-theme colors, deliberately not the app's CSS variables — this
// gets rasterized into an image handed to someone else, who may be viewing
// it on any device/theme. It should look the same (and stay readable)
// regardless of the sender's current in-app theme.
const COLORS = {
  paper: "#FBF7EF",
  card: "#FFFFFF",
  ink: "#241F16",
  inkDim: "#6B6455",
  rule: "#E4DCC8",
  gave: "#B4491F",
  got: "#2F6B4F",
};

function formatDate(occurredAt: number, locale: string): string {
  return new Date(occurredAt).toLocaleString(locale === "bn" ? "bn-BD" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    numberingSystem: "latn",
  });
}

// Rendered off-screen (see PersonDetailView) and captured to PNG via
// html-to-image — never shown on screen directly. Kept visually close to
// the in-app paper-ledger look but as plain inline styles/hex colors, since
// html-to-image rasterizes computed styles and this needs to render
// correctly even positioned off-canvas with no live theme context.
export const PersonStatementCard = forwardRef<
  HTMLDivElement,
  { notebookName: string; personName: string; transactions: Transaction[]; locale: string }
>(function PersonStatementCard({ notebookName, personName, transactions, locale }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: 480,
        padding: 24,
        backgroundColor: COLORS.paper,
        fontFamily: "var(--font-sans, sans-serif)",
        color: COLORS.ink,
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 20,
          padding: 24,
          border: `1px solid ${COLORS.rule}`,
        }}
      >
        <div style={{ fontSize: 13, color: COLORS.inkDim }}>{notebookName}</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{personName}</div>

        <div style={{ height: 1, backgroundColor: COLORS.rule, margin: "16px 0" }} />

        {transactions.length === 0 ? (
          <div style={{ fontSize: 14, color: COLORS.inkDim }}>—</div>
        ) : (
          transactions.map((txn) => {
            const isGave = txn.type === "gave";
            return (
              <div
                key={txn.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "8px 0",
                  borderBottom: `1px solid ${COLORS.rule}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: COLORS.inkDim }}>
                    {formatDate(txn.occurredAt, locale)}
                  </div>
                  {txn.note && <div style={{ fontSize: 13, marginTop: 2 }}>{txn.note}</div>}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: isGave ? COLORS.gave : COLORS.got,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isGave ? "−" : "+"}
                  {formatMoney(txn.amount)}
                </div>
              </div>
            );
          })
        )}

        <div style={{ marginTop: 16, fontSize: 11, color: COLORS.inkDim, textAlign: "right" }}>
          Khata
        </div>
      </div>
    </div>
  );
});
