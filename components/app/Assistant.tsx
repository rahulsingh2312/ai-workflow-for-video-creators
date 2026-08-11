"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { Button } from "@/components/app/kit";

type Turn = {
  role: "you" | "it";
  text: string;
  ran?: { action: string; detail: string };
  handoff?: { action: string; where: string };
};

type Reply = {
  reply: string;
  screen?: string;
  ran?: { action: string; detail: string };
  handoff?: { action: string; where: string };
  chips?: string[];
};

/**
 * The workspace, driven by typing.
 *
 * It sits over the page rather than replacing it, because almost every answer
 * ends by moving somewhere — the reply says what happened and the screen
 * behind it is already showing the thing being talked about.
 */
export function Assistant({
  lang,
  open,
  onClose,
  go,
}: {
  lang: Lang;
  open: boolean;
  onClose: () => void;
  go: (screen: string) => void;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);

  const OPENERS = [
    t("What's next?", "下一步是什么？"),
    t("Find topics", "找选题"),
    t("Write the draft", "写初稿"),
    t("Check the facts", "核对事实"),
  ];

  const [turns, setTurns] = useState<Turn[]>([]);
  const [chips, setChips] = useState<string[]>(OPENERS);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send(message: string) {
    const m = message.trim();
    if (!m || busy) return;
    setText("");
    setChips([]);
    setTurns((p) => [...p, { role: "you", text: m }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: m, lang }),
      });
      const d = (await res.json()) as Reply & { message?: string };
      if (!res.ok) {
        setTurns((p) => [
          ...p,
          {
            role: "it",
            text:
              d.message ??
              t("That did not work.", "这一步没跑通。"),
          },
        ]);
        return;
      }
      setTurns((p) => [
        ...p,
        { role: "it", text: d.reply, ran: d.ran, handoff: d.handoff },
      ]);
      setChips(d.chips?.length ? d.chips : OPENERS);
      // Moving the page under the panel is most of the point: the reply
      // explains, the screen behind it shows.
      if (d.screen) go(d.screen);
    } catch {
      setTurns((p) => [
        ...p,
        { role: "it", text: t("I could not reach the workspace.", "连不上工作区。") },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Dim, not a modal: the page behind stays readable because the reply is
          usually about what is on it. */}
      <button
        type="button"
        aria-label={t("Close", "关闭")}
        onClick={onClose}
        className="fixed inset-0 z-40 [animation:fade_160ms_var(--e-out)]"
        style={{ background: "color-mix(in srgb, var(--ink-gray-9) 22%, transparent)" }}
      />
      <aside
        role="dialog"
        aria-label={t("Assistant", "助手")}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[26rem] flex-col [animation:slide-in_200ms_var(--e-out)]"
        style={{
          background: "var(--surface-white)",
          boxShadow: "inset 1px 0 0 var(--outline-gray-2), var(--sh-lg)",
        }}
      >
        <header className="flex items-center gap-2 px-4 py-3">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "var(--surface-amber-2)",
              color: "var(--ink-amber-3)",
            }}
          >
            <Sparkles className="size-3.5" strokeWidth={2} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium">
            {t("Ask for anything", "有事直接说")}
          </p>
          <Button
            size="sm"
            variant="ghost"
            icon={X}
            ariaLabel={t("Close", "关闭")}
            onClick={onClose}
          />
        </header>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {!turns.length ? (
            <div className="pt-6">
              <p className="text-[15px] font-medium">
                {t("What do you want to do?", "你想做什么？")}
              </p>
              <p
                className="mt-1 text-[13px] leading-normal"
                style={{ color: "var(--ink-gray-5)" }}
              >
                {t(
                  "I can find topics, write the draft, check the facts and read the results. Decisions that need a reason stay with you.",
                  "找选题、写初稿、核对事实、读回数据，我都能做。要写理由的决定，还是你来。",
                )}
              </p>
            </div>
          ) : null}

          <div className="space-y-3 pt-3">
            {turns.map((turn, i) =>
              turn.role === "you" ? (
                <p
                  key={i}
                  className="ml-auto w-fit max-w-[85%] rounded-[var(--r)] px-3 py-1.5 text-[13px]"
                  style={{ background: "var(--rail)" }}
                >
                  {turn.text}
                </p>
              ) : (
                <div key={i} className="max-w-[92%]">
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "var(--ink-gray-8)" }}
                  >
                    {turn.text}
                  </p>
                  {/* Two different facts, so two different marks: one says the
                      assistant acted, the other says it deliberately did not. */}
                  {turn.ran ? (
                    <p
                      className="mt-1 text-[11.5px]"
                      style={{ color: "var(--ink-green-3)" }}
                    >
                      {t("ran", "已执行")} {turn.ran.action} · {turn.ran.detail}
                    </p>
                  ) : null}
                  {turn.handoff ? (
                    <p
                      className="mt-1 text-[11.5px]"
                      style={{ color: "var(--ink-amber-3)" }}
                    >
                      {t("yours to do", "要你来")} · {turn.handoff.where}
                    </p>
                  ) : null}
                </div>
              ),
            )}
            {busy ? (
              <p className="text-[13px]" style={{ color: "var(--ink-gray-4)" }}>
                {t("Working…", "在做了…")}
              </p>
            ) : null}
          </div>
        </div>

        {chips.length && !busy ? (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => send(c)}
                className="rounded-full px-2.5 py-1 text-[12px] [transition:background-color_140ms_var(--e-out)] hover:[background-color:var(--rail)]"
                style={{
                  boxShadow: "inset 0 0 0 1px var(--outline-gray-2)",
                  color: "var(--ink-gray-7)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="flex items-center gap-2 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("Ask for anything", "有事直接说")}
            className="min-w-0 flex-1 rounded-[var(--r-sm)] px-3 py-2 text-[13px] outline-none"
            style={{
              background: "var(--rail)",
              color: "var(--ink-gray-8)",
            }}
          />
          <Button
            type="submit"
            variant="solid"
            size="sm"
            icon={ArrowUp}
            ariaLabel={t("Send", "发送")}
            disabled={!text.trim() || busy}
          />
        </form>
      </aside>
    </>
  );
}
