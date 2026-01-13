const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

export type PayRequest = {
  transactionId: string;
  cardToken: string;
  installments: number;
};

export type PayResponse = {
  id: string;
  status: string;
  wompiTxnId: string;
  reference: string;
};

export type RefreshResponse = {
  id: string;
  status: string;
  wompiTxnId: string | null;
  stockDecremented: boolean;
};

export async function payWithWompi(payload: PayRequest): Promise<PayResponse> {
  const res = await fetch(`${BACKEND_URL}/payments/wompi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

export async function refreshTransaction(
  transactionId: string
): Promise<RefreshResponse> {
  const res = await fetch(
    `${BACKEND_URL}/transactions/${transactionId}/refresh`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}
