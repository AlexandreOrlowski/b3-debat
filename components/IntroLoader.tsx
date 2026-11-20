"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { DotLottie } from "@lottiefiles/dotlottie-web";

const maximumCoverTime = 2800;
const minimumCoverTime = 650;

function FloralSeal({ reducedMotion }: { reducedMotion: boolean | null }) {
  const seal = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animation: DotLottie | undefined;
    let disposed = false;
    void import("@lottiefiles/dotlottie-web").then(({ DotLottie }) => {
      if (disposed || !seal.current) return;
      DotLottie.setWasmUrl("/motion/dotlottie-player.wasm");
      animation = new DotLottie({
        canvas: seal.current,
        loop: false,
        autoplay: !reducedMotion,
        src: "/motion/julia-bloom.json",
      });
      if (reducedMotion) {
        animation.addEventListener("load", () => animation?.setFrame(32));
      }
    }).catch(() => {
      // The wordmark remains visible if the optional vector player fails to load.
    });
    return () => {
      disposed = true;
      animation?.destroy();
    };
  }, [reducedMotion]);

  return <canvas ref={seal} width={128} height={128} style={{ width: 64, height: 64, marginBottom: 16 }} />;
}

export default function IntroLoader({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(true);
  const start = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    start.current = performance.now();
    const dismiss = () => setVisible(false);
    const timeout = window.setTimeout(dismiss, maximumCoverTime);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", dismiss, { passive: true, once: true });
    window.addEventListener("touchmove", dismiss, { passive: true, once: true });
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchmove", dismiss);
    };
  }, []);

  useEffect(() => {
    if (!ready || !visible) return;
    const elapsed = performance.now() - start.current;
    const delay = reducedMotion ? 0 : Math.max(0, minimumCoverTime - elapsed);
    const timeout = window.setTimeout(() => setVisible(false), delay);
    return () => window.clearTimeout(timeout);
  }, [ready, reducedMotion, visible]);

  return (
    <>
      <noscript><style>{".julia-intro{display:none!important}"}</style></noscript>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="julia-intro"
            role="status"
            aria-label="Chargement du parfum Julia"
            initial={false}
            exit={reducedMotion ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: reducedMotion ? 0.12 : 0.52, ease: [0.77, 0, 0.18, 1] }}
            style={{
              position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center",
              background: "#770b1c", color: "#ffeedc", pointerEvents: "none",
              clipPath: "inset(0% 0% 0% 0%)",
            }}
          >
            <div aria-hidden="true" style={{ display: "grid", justifyItems: "center" }}>
              <FloralSeal reducedMotion={reducedMotion} />
              <span style={{
                fontFamily: "var(--font-display, 'Times New Roman'), serif", fontStyle: "italic",
                fontSize: "clamp(4.5rem, 10vw, 7rem)", lineHeight: 0.88, letterSpacing: "-0.065em",
                paddingRight: "0.07em",
              }}>Julia</span>
              <span style={{
                marginTop: 22, fontSize: "0.75rem", lineHeight: 1, letterSpacing: "0.26em",
                fontFamily: "var(--font-sans, Arial), sans-serif",
              }}>EAU DE PARFUM</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
