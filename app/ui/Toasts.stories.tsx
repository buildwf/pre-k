import { useState } from "react";
import { Toasts, type ToastItem } from "./Toasts";
import { Window } from "./Window";

export default { component: Toasts, parameters: { layout: "fullscreen", window: false } };

const sample: ToastItem[] = [
  { id: 1, title: "Bo assigned you a card", body: "Write the launch post" },
  { id: 2, title: "Payment received", body: "You're on Pro." },
];

function Demo({ start }: { start: ToastItem[] }) {
  const [toasts, setToasts] = useState(start);

  return (
    <Window>
      <Toasts toasts={toasts} onDismiss={(id) => setToasts(toasts.filter((t) => t.id !== id))} />
    </Window>
  );
}

export const Default = { render: () => <Demo start={sample} /> };
export const One = { render: () => <Demo start={sample.slice(0, 1)} /> };
export const TitleOnly = { name: "Title only", render: () => <Demo start={[{ id: 3, title: "Saved" }]} /> };
