import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Box, RotateCw, ZoomIn, Move } from "lucide-react";
import productFrontImg from "@assets/WhatsApp_Image_2026-05-02_at_2.15.52_AM_1777668487991.jpeg";
import productBackImg from "@assets/WhatsApp_Image_2026-05-02_at_2.15.53_AM_1777668487989.jpeg";

/* ─────────────────────────────────────────────
   Enhanced CSS 3D product box
   – drag to rotate (pointer + touch)
   – scroll wheel / pinch-to-zoom
   – two-finger pan
   – idle auto-spin with shimmer lighting
───────────────────────────────────────────── */

const DEPTH = 80;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.2;

interface CSS3DBoxProps {
  size?: number;
  autoSpin?: boolean;
}

function CSS3DBox({ size = 320, autoSpin = true }: CSS3DBoxProps) {
  const rotX = useMotionValue(-8);
  const rotY = useMotionValue(20);
  const scale = useMotionValue(1);
  const translateX = useMotionValue(0);
  const translateY = useMotionValue(0);

  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const spinAnim = useRef<ReturnType<typeof animate> | null>(null);
  const currentY = useRef(20);

  /* pinch state */
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const isPinching = useRef(false);
  const isTwoFingerPan = useRef(false);
  const lastTwoFingerMid = useRef({ x: 0, y: 0 });

  const w = size;
  const h = Math.round(size * 1.42);
  const half_w = w / 2;
  const half_h = h / 2;
  const half_d = DEPTH / 2;

  /* shimmer value (0 → 1 cycling) for a subtle highlight sweep */
  const shimmer = useMotionValue(0);
  useEffect(() => {
    const a = animate(shimmer, 1, {
      duration: 3.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse",
    });
    return () => a.stop();
  }, [shimmer]);

  const shimmerOpacity = useTransform(shimmer, [0, 0.5, 1], [0, 0.18, 0]);

  /* start / stop idle spin */
  const startSpin = useCallback(() => {
    if (!autoSpin) return;
    spinAnim.current?.stop();
    const target = currentY.current + 360;
    spinAnim.current = animate(rotY, target, {
      duration: 11,
      ease: "linear",
      repeat: Infinity,
      onUpdate: (v) => { currentY.current = v; },
    });
  }, [autoSpin, rotY]);

  const stopSpin = useCallback(() => {
    spinAnim.current?.stop();
  }, []);

  useEffect(() => {
    startSpin();
    return () => spinAnim.current?.stop();
  }, [startSpin]);

  /* ── pointer drag (single finger / mouse) ── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (isPinching.current) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    stopSpin();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [stopSpin]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || isPinching.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    const newY = currentY.current + dx * 0.6;
    const newX = Math.max(-45, Math.min(45, rotX.get() - dy * 0.4));
    currentY.current = newY;
    rotY.set(newY);
    rotX.set(newX);
  }, [rotX, rotY]);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (!isPinching.current) startSpin();
  }, [startSpin]);

  /* ── scroll wheel zoom ── */
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    scale.set(Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.get() + delta)));
  }, [scale]);

  /* ── touch: single drag + pinch zoom + two-finger pan ── */
  const getDist = (a: Touch, b: Touch) =>
    Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  const getMid = (a: Touch, b: Touch) => ({
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    stopSpin();
    if (e.touches.length === 2) {
      isPinching.current = true;
      isTwoFingerPan.current = true;
      isDragging.current = false;
      pinchRef.current = {
        dist: getDist(e.touches[0], e.touches[1]),
        midX: getMid(e.touches[0], e.touches[1]).x,
        midY: getMid(e.touches[0], e.touches[1]).y,
      };
      lastTwoFingerMid.current = getMid(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1) {
      isPinching.current = false;
      isTwoFingerPan.current = false;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [stopSpin]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 2 && pinchRef.current) {
      const newDist = getDist(e.touches[0], e.touches[1]);
      const ratio = newDist / pinchRef.current.dist;
      const prevScale = scale.get();
      scale.set(Math.max(MIN_SCALE, Math.min(MAX_SCALE, prevScale * ratio)));
      pinchRef.current.dist = newDist;

      /* two-finger pan */
      const mid = getMid(e.touches[0], e.touches[1]);
      const pdx = mid.x - lastTwoFingerMid.current.x;
      const pdy = mid.y - lastTwoFingerMid.current.y;
      translateX.set(translateX.get() + pdx);
      translateY.set(translateY.get() + pdy);
      lastTwoFingerMid.current = mid;
    } else if (e.touches.length === 1 && !isPinching.current) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const newY = currentY.current + dx * 0.6;
      const newX = Math.max(-45, Math.min(45, rotX.get() - dy * 0.4));
      currentY.current = newY;
      rotY.set(newY);
      rotX.set(newX);
    }
  }, [rotX, rotY, scale, translateX, translateY]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      isPinching.current = false;
      isTwoFingerPan.current = false;
      pinchRef.current = null;
    }
    if (e.touches.length === 0) startSpin();
  }, [startSpin]);

  /* ── double tap / double click to reset ── */
  const lastTap = useRef(0);
  const onDoubleClick = useCallback(() => {
    scale.set(1);
    translateX.set(0);
    translateY.set(0);
    rotX.set(-8);
  }, [scale, translateX, translateY, rotX]);

  const onTouchEndDouble = useCallback((e: React.TouchEvent) => {
    onTouchEnd(e);
    const now = Date.now();
    if (now - lastTap.current < 300) onDoubleClick();
    lastTap.current = now;
  }, [onTouchEnd, onDoubleClick]);

  const transform = useTransform(
    [rotX, rotY, scale, translateX, translateY],
    ([rx, ry, s, tx, ty]) =>
      `translate(${tx}px, ${ty}px) scale(${s}) rotateX(${rx}deg) rotateY(${ry}deg)`
  );

  const sideStyle: React.CSSProperties = {
    position: "absolute",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    overflow: "hidden",
  };

  return (
    <div
      style={{
        width: w,
        height: h,
        perspective: 1000,
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndDouble}
    >
      <motion.div
        style={{
          width: w,
          height: h,
          position: "relative",
          transformStyle: "preserve-3d",
          transform,
        }}
      >
        {/* FRONT face */}
        <div style={{ ...sideStyle, width: w, height: h, transform: `translateZ(${half_d}px)` }}>
          <img
            src={productFrontImg}
            alt="TISZTA Organic Atta — Front"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            draggable={false}
          />
          {/* shimmer overlay */}
          <motion.div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
              opacity: shimmerOpacity,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* BACK face */}
        <div style={{ ...sideStyle, width: w, height: h, transform: `rotateY(180deg) translateZ(${half_d}px)` }}>
          <img
            src={productBackImg}
            alt="TISZTA Organic Atta — Back"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            draggable={false}
          />
          <motion.div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
              opacity: shimmerOpacity,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* LEFT face */}
        <div style={{
          ...sideStyle,
          width: DEPTH, height: h,
          left: -half_d + half_w - DEPTH, top: 0,
          transform: `rotateY(90deg) translateZ(${half_w - half_d}px)`,
          background: "linear-gradient(180deg, #2d7a3a 0%, #1a5c2a 50%, #0f3b1a 100%)",
        }} />

        {/* RIGHT face */}
        <div style={{
          ...sideStyle,
          width: DEPTH, height: h,
          left: half_w - half_d, top: 0,
          transform: `rotateY(-90deg) translateZ(${half_w - half_d}px)`,
          background: "linear-gradient(180deg, #1a5c2a 0%, #0f3b1a 50%, #0a2a12 100%)",
        }} />

        {/* TOP face */}
        <div style={{
          ...sideStyle,
          width: w, height: DEPTH,
          left: 0, top: -half_d,
          transform: `rotateX(90deg) translateZ(${half_h - half_d}px)`,
          background: "linear-gradient(90deg, #f7c948 0%, #f0b429 50%, #e09518 100%)",
        }} />

        {/* BOTTOM face */}
        <div style={{
          ...sideStyle,
          width: w, height: DEPTH,
          left: 0, top: h - half_d,
          transform: `rotateX(-90deg) translateZ(${half_h - half_d}px)`,
          background: "linear-gradient(90deg, #0a2a12 0%, #0f3b1a 100%)",
        }} />
      </motion.div>
    </div>
  );
}

/* ── Pedestal + glow scene ── */
function BoxScene({ size = 280 }: { size?: number }) {
  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* ambient glow behind the box */}
      <div
        style={{
          position: "absolute",
          width: size * 1.1,
          height: size * 0.6,
          top: "10%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(26,92,42,0.13) 0%, transparent 70%)",
          filter: "blur(20px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <CSS3DBox size={size} autoSpin />
      </div>
      {/* elliptical drop shadow */}
      <div
        style={{
          width: size * 0.75,
          height: 16,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.22) 0%, transparent 80%)",
          marginTop: 10,
          flexShrink: 0,
          position: "relative",
          zIndex: 1,
        }}
      />
    </div>
  );
}

/* ── hint badge ── */
function Hint({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-white/70 px-3 py-1.5 rounded-full border border-border/50 shadow-sm">
      <Icon className="w-3.5 h-3.5 text-secondary shrink-0" />
      {label}
    </span>
  );
}

/* ── Exported homepage section ── */
export function Product3DSection() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #f0ede0 0%, #e8f0e4 50%, #f5f2e8 100%)" }}>
      {/* decorative blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle, #c8e6c9 0%, transparent 70%)", transform: "translate(-30%, -30%)" }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, #f7c948 0%, transparent 70%)", transform: "translate(30%, 30%)" }} />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary font-bold bg-secondary/10 px-4 py-1.5 rounded-full mb-4">
            <Box className="w-3.5 h-3.5" />
            Interactive 3D Experience
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold mt-2 mb-4 text-foreground">
            Explore the Packaging
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Rotate, zoom, and inspect every side of our High Protein Organic Atta — right in your browser.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
          {/* 3D viewer card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full max-w-sm md:max-w-md"
          >
            <div
              className="rounded-3xl shadow-2xl overflow-hidden flex items-center justify-center p-10"
              style={{
                background: "linear-gradient(145deg, #eef2e8 0%, #f5f0e8 60%, #e8ede0 100%)",
                boxShadow: "0 25px 60px -10px rgba(26,92,42,0.18), 0 8px 20px -5px rgba(0,0,0,0.08)",
              }}
            >
              <BoxScene size={260} />
            </div>
          </motion.div>

          {/* info panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-sm w-full text-center lg:text-left"
          >
            <h3 className="font-serif text-2xl font-bold text-foreground mb-3">
              High Protein Organic Atta
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              A scientifically formulated multi-grain blend — crafted with nature's finest grains to fuel your day with up to 16–18g of protein per 100g.
            </p>

            {/* feature chips */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-8">
              {["16–18g Protein", "Multi-Grain Blend", "100% Organic", "No Preservatives"].map((tag) => (
                <span key={tag} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>

            {/* control hints */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-2">
              <Hint icon={RotateCw} label="Drag to rotate" />
              <Hint icon={ZoomIn} label="Scroll / pinch to zoom" />
              <Hint icon={Move} label="Two fingers to pan" />
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2 text-center lg:text-left">
              Double-click or double-tap to reset view
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── "View in 3D" button + dialog ── */
export function Product3DButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="lg"
        data-testid="button-view-3d"
        className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all font-semibold"
      >
        <Box className="w-5 h-5" />
        View in 3D
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-full p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          <div
            className="p-8 md:p-10 flex flex-col items-center gap-6"
            style={{ background: "linear-gradient(145deg, #eef2e8 0%, #f5f0e8 60%, #e8ede0 100%)" }}
          >
            <div className="text-center">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary font-bold bg-secondary/10 px-4 py-1.5 rounded-full mb-3">
                <Box className="w-3.5 h-3.5" />
                Interactive 3D Model
              </span>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mt-1">
                High Protein Organic Atta
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Drag • Scroll to zoom • Two fingers to pan • Double-click to reset
              </p>
            </div>

            {open && (
              <div
                className="rounded-2xl overflow-hidden flex items-center justify-center p-8 w-full"
                style={{
                  background: "linear-gradient(135deg, #e4ede0 0%, #f5f2e8 100%)",
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <BoxScene size={280} />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Hint icon={RotateCw} label="Drag to rotate" />
              <Hint icon={ZoomIn} label="Scroll / pinch to zoom" />
              <Hint icon={Move} label="Two fingers to pan" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
