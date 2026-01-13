export {};

declare global {
  type WompiTokenizeResponse = { id: string };

  interface WompiInstance {
    tokenizeCard(
      data: {
        number: string;
        cvc: string;
        exp_month: string;
        exp_year: string;
        card_holder: string;
      },
      callback: (err: unknown, data: WompiTokenizeResponse) => void
    ): void;
  }

  interface WompiConstructor {
    new (publicKey: string): WompiInstance;
  }

  interface Window {
    Wompi: WompiConstructor;
  }
}
