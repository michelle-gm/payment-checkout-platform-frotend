import { useMemo, useState } from "react";
import {
  payWithWompi,
  refreshTransaction,
  type PayResponse,
  type RefreshResponse,
} from "./api";

// type TokenizeResult = { token: string };

// type WompiTokenizeResponse = {
//   id: string;
// };

type Method = "CARD" | "PAYPAL" | "APPLE_PAY" | "GOOGLE_PAY";

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export default function App() {
  const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY as string;

  const [transactionId, setTransactionId] = useState("");
  const [installments, setInstallments] = useState(1);

  const [method, setMethod] = useState<Method>("CARD");
  const [payResult, setPayResult] = useState<any>(null);
  const [refreshResult, setRefreshResult] = useState<any>(null);

  // Datos tarjeta (sandbox)
  const [cardNumber, setCardNumber] = useState("4242424242424242");
  const [expMonth, setExpMonth] = useState("12");
  const [expYear, setExpYear] = useState("29");
  const [cvc, setCvc] = useState("123");
  const [cardHolder, setCardHolder] = useState("TEST USER");

  const [loading, setLoading] = useState(false);
  const [payResp, setPayResp] = useState<PayResponse | null>(null);
  const [refreshResp, setRefreshResp] = useState<RefreshResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUseWompi = useMemo(
    () => Boolean(window.Wompi && WOMPI_PUBLIC_KEY),
    [WOMPI_PUBLIC_KEY]
  );

  async function tokenizeCard(): Promise<{ token: string }> {
    if (!window.Wompi) throw new Error("Wompi script not loaded");
    if (!WOMPI_PUBLIC_KEY) throw new Error("Missing Wompi public key");

    const wompi = new window.Wompi(WOMPI_PUBLIC_KEY);

    const result = await new Promise<{ id: string }>((resolve, reject) => {
      wompi.tokenizeCard(
        {
          number: cardNumber,
          cvc,
          exp_month: expMonth,
          exp_year: expYear,
          card_holder: cardHolder,
        },
        (err, data) => {
          if (err) return reject(err);
          return resolve(data); // ✅ ya no es unknown
        }
      );
    });

    return { token: result.id };
  }

  async function onContinue() {
    setError(null);
    setPayResult(null);
    setRefreshResult(null);

    if (!transactionId) {
      setError(
        "Pega el transactionId (UUID) creado en tu backend (POST /transactions)."
      );
      return;
    }

    if (method !== "CARD") {
      setError(
        "Para la prueba implementamos solo CARD (Wompi token + backend)."
      );
      return;
    }

    setLoading(true);
    try {
      const { token } = await tokenizeCard();
      const resp = await payWithWompi({
        transactionId,
        cardToken: token,
        installments,
      });
      setPayResult(resp);
    } catch (e: unknown) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setError(null);
    setRefreshResp(null);

    const id = payResp?.id || transactionId;
    if (!id) {
      setError("No hay transactionId para refrescar.");
      return;
    }

    setLoading(true);
    try {
      const resp = await refreshTransaction(id);
      setRefreshResp(resp);
    } catch (e: unknown) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        {/* LEFT: methods */}
        <div style={styles.left}>
          <div style={styles.leftHeader}>Payment method</div>

          <MethodRow
            active={method === "CARD"}
            label="Credit Card"
            badges={["MC", "AMEX", "VISA"]}
            onClick={() => setMethod("CARD")}
          />
          <MethodRow
            active={method === "PAYPAL"}
            label="Paypal"
            badges={["PP"]}
            onClick={() => setMethod("PAYPAL")}
          />
          <MethodRow
            active={method === "APPLE_PAY"}
            label="Apple Pay"
            badges={["Pay"]}
            onClick={() => setMethod("APPLE_PAY")}
          />
          <MethodRow
            active={method === "GOOGLE_PAY"}
            label="Google Pay"
            badges={["GPay"]}
            onClick={() => setMethod("GOOGLE_PAY")}
          />
        </div>

        {/* RIGHT: card form */}
        <div style={styles.right}>
          <div style={styles.cardHeaderRow}>
            <div style={styles.cardTitle}>Credit Card</div>
            <div style={styles.badges}>
              <Badge text="MC" />
              <Badge text="AMEX" />
              <Badge text="VISA" />
            </div>
          </div>

          <div style={styles.form}>
            {/* Transaction ID (para tu flujo backend) */}
            <label style={styles.label}>
              Transaction ID (UUID)
              <input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e7b28be8-00b0-4951-8309-4f058eab3186"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Card number
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                style={styles.input}
              />
            </label>

            <div style={styles.grid2}>
              <label style={styles.label}>
                Exp month
                <input
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                Exp year
                <input
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  style={styles.input}
                />
              </label>
            </div>

            <div style={styles.grid2}>
              <label style={styles.label}>
                CVC
                <input
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                Installments
                <input
                  type="number"
                  min={1}
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value || 1))}
                  style={styles.input}
                />
              </label>
            </div>

            <label style={styles.label}>
              Card holder
              <input
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                style={styles.input}
              />
            </label>

            <button
              onClick={onContinue}
              disabled={loading || !canUseWompi}
              style={styles.primaryBtn}
            >
              {loading ? "Processing..." : "Continue"}
            </button>

            <button
              onClick={onRefresh}
              disabled={loading}
              style={styles.secondaryBtn}
            >
              Refresh status
            </button>

            {!canUseWompi && (
              <div style={styles.hint}>
                ⚠️ Wompi script no cargado. Revisa <code>index.html</code>{" "}
                (script checkout widget).
              </div>
            )}

            {error && <pre style={styles.errBox}>{error}</pre>}

            {(payResult || refreshResult) && (
              <div style={styles.results}>
                {payResult && (
                  <div style={styles.resultBlock}>
                    <div style={styles.resultTitle}>/payments/wompi</div>
                    <pre style={styles.pre}>
                      {JSON.stringify(payResult, null, 2)}
                    </pre>
                  </div>
                )}
                {refreshResult && (
                  <div style={styles.resultBlock}>
                    <div style={styles.resultTitle}>
                      /transactions/:id/refresh
                    </div>
                    <pre style={styles.pre}>
                      {JSON.stringify(refreshResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodRow({
  active,
  label,
  badges,
  onClick,
}: {
  active: boolean;
  label: string;
  badges: string[];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.methodRow,
        ...(active ? styles.methodRowActive : {}),
      }}
    >
      <span style={styles.methodLabel}>{label}</span>
      <span style={styles.methodBadges}>
        {badges.map((b) => (
          <Badge key={b} text={b} small />
        ))}
      </span>
    </button>
  );
}

function Badge({ text, small }: { text: string; small?: boolean }) {
  return (
    <span
      style={{
        ...styles.badge,
        ...(small ? styles.badgeSmall : {}),
      }}
    >
      {text}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f6f7fb",
    padding: 24,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    color: "#0f172a",
  },
  shell: {
    width: "min(980px, 100%)",
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: 18,
  },
  left: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  },
  leftHeader: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 12,
    color: "#334155",
  },
  methodRow: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    padding: "12px 12px",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    transition: "all .15s ease",
  },
  methodRowActive: {
    border: "2px solid #3b82f6",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.12)",
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: 650,
  },
  methodBadges: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  right: {
    background: "white",
    borderRadius: 16,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  },
  cardHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
  },
  badges: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  badge: {
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    background: "#f8fafc",
    color: "#334155",
  },
  badgeSmall: {
    padding: "4px 8px",
    fontSize: 11,
  },
  form: {
    display: "grid",
    gap: 12,
  },
  label: {
    display: "grid",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
  },
  input: {
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 14,
    background: "#fff",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  primaryBtn: {
    marginTop: 8,
    width: "100%",
    borderRadius: 14,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "white",
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryBtn: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#0f172a",
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 10,
  },
  errBox: {
    fontSize: 12,
    color: "#991b1b",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 12,
    padding: 10,
    overflow: "auto",
  },
  results: {
    display: "grid",
    gap: 10,
    marginTop: 6,
  },
  resultBlock: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#fafafa",
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 8,
    color: "#334155",
  },
  pre: {
    margin: 0,
    fontSize: 12,
    overflow: "auto",
  },
};
