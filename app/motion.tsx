"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

// shared handle so the app can tell Lenis to recompute its scroll limit when
// content is added/removed below the fold (async results, brief, tour, etc.)
export const lenisRef: { current: Lenis | null } = { current: null };

/** Recompute Lenis limit + all ScrollTrigger positions after the layout changes. */
export function refreshScroll() {
  lenisRef.current?.resize();
  if (typeof window !== "undefined") ScrollTrigger.refresh();
}

/** Buttery inertia scroll (Lenis) driving GSAP ScrollTrigger. No-op under reduced-motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (reduced()) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, autoRaf: false });
    lenisRef.current = lenis;
    // feed scroll into ScrollTrigger and drive Lenis off GSAP's ticker (single clock)
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);
  return null;
}

/** Scroll-scrubbed parallax: translates the child as it moves through the viewport. */
export function Parallax({ children, speed = 0.25, className = "" }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const st = gsap.to(el, {
      yPercent: -speed * 100,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
    return () => {
      st.scrollTrigger?.kill();
      st.kill();
    };
  }, [speed]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Hero content that drifts up, scales down and fades as the first screen scrolls away. */
export function HeroText({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const st = gsap.to(el, {
      yPercent: -14,
      scale: 0.92,
      opacity: 0.15,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.4 },
    });
    return () => {
      st.scrollTrigger?.kill();
      st.kill();
    };
  }, []);
  return (
    <div ref={ref} className={className} style={{ transformOrigin: "left bottom" }}>
      {children}
    </div>
  );
}

/** Cursor-reactive 3D tilt with perspective + a volt sheen. */
export function Tilt({ children, className = "", max = 10 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || reduced()) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(700px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(0)`;
    };
    const onLeave = () => (el.style.transform = "perspective(700px) rotateY(0) rotateX(0)");
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [max]);
  return (
    <div ref={ref} className={`transition-transform duration-300 ease-out will-change-transform ${className}`} style={{ transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
}

/** Blended custom cursor: a lerped ring that swells over interactive targets. */
export function Cursor() {
  useEffect(() => {
    if (!finePointer() || reduced()) return;
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    document.body.append(ring, dot);
    document.body.classList.add("cursor-none");

    let x = innerWidth / 2,
      y = innerHeight / 2,
      rx = x,
      ry = y,
      raf = 0;
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      const t = e.target as Element;
      const hot = !!t.closest?.("a, button, input, [data-cursor]");
      ring.classList.toggle("is-hot", hot);
    };
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      ring.remove();
      dot.remove();
      document.body.classList.remove("cursor-none");
    };
  }, []);
  return null;
}

/** Pull a child toward the cursor when it's near. */
export function Magnetic({ children, strength = 0.4 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || reduced()) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
    };
    const onLeave = () => (el.style.transform = "translate(0,0)");
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);
  return (
    <span ref={ref} className="inline-block transition-transform duration-200 ease-out will-change-transform">
      {children}
    </span>
  );
}

/** Sticky stacking panel: pins at the top, then the next StackSection scrolls up and
    covers it while this one scales back + dims — a card settling into the stack.
    Content is sized to fit a screen (no inner scroll) so page scroll stays smooth.
    Reduced-motion/print fall back to normal flow via CSS. */
export function StackSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced()) return;
    const el = ref.current,
      inEl = inner.current;
    if (!el || !inEl) return;
    const st = gsap.to(inEl, {
      scale: 0.93,
      opacity: 0.25,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
    });
    return () => {
      st.scrollTrigger?.kill();
      st.kill();
    };
  }, []);
  return (
    <section ref={ref} className="stack-card sticky top-0 min-h-screen bg-ink">
      <div
        ref={inner}
        className={`mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-24 md:px-8 ${className}`}
        style={{ transformOrigin: "center 30%" }}
      >
        {children}
      </div>
    </section>
  );
}

/** Reveal-on-scroll wrapper. Shows immediately under reduced-motion. */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (reduced()) return setShown(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

/** Lightweight WebGL hero centerpiece: a rotating "taste-graph" point cloud — a sphere
    of nodes in the accent colors, cursor-reactive and gently breathing.
    three.js core only — no R3F/drei. On-brand for a taste graph, cheap to render. */
export function HeroObject({ theme }: { theme: "dark" | "light" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const css = getComputedStyle(document.documentElement);
    const col = (v: string, f: string) => new THREE.Color(css.getPropertyValue(v).trim() || f);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 5;

    // nodes on a fibonacci sphere, colored by a lerp between two accents
    const COUNT = 650;
    const R = 1.8;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const cA = col("--color-volt", "#d8ff3e");
    const cB = col("--hue-4", "#b69cff");
    const golden = Math.PI * (3 - Math.sqrt(5));
    const tmp = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      positions[i * 3] = Math.cos(th) * r * R;
      positions[i * 3 + 1] = y * R;
      positions[i * 3 + 2] = Math.sin(th) * r * R;
      tmp.copy(cA).lerp(cB, (y + 1) / 2);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: theme === "dark" ? 0.05 : 0.045,
      vertexColors: true,
      transparent: true,
      opacity: theme === "dark" ? 0.95 : 0.8,
      depthWrite: false,
      sizeAttenuation: true,
      blending: theme === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const cloud = new THREE.Points(geo, mat);
    scene.add(cloud);

    const place = () => {
      const portrait = mount.clientWidth < mount.clientHeight * 1.1;
      cloud.position.set(portrait ? 0 : 1.5, portrait ? 1.3 : 0.35, 0);
      cloud.scale.setScalar(portrait ? 0.85 : 1);
    };
    place();

    let mx = 0,
      my = 0,
      tmx = 0,
      tmy = 0;
    const onMove = (e: PointerEvent) => {
      tmx = e.clientX / innerWidth - 0.5;
      tmy = e.clientY / innerHeight - 0.5;
    };
    addEventListener("pointermove", onMove);
    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      place();
    };
    addEventListener("resize", resize);

    const baseScale = () => (mount.clientWidth < mount.clientHeight * 1.1 ? 0.85 : 1);
    const render = (t: number) => {
      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;
      cloud.rotation.y = t * 0.00016 + mx * 0.8;
      cloud.rotation.x = t * 0.0001 + my * 0.5;
      cloud.scale.setScalar(baseScale() * (1 + Math.sin(t * 0.0013) * 0.03)); // breathe
      renderer.render(scene, camera);
    };

    let raf = 0;
    if (reduced()) {
      render(0);
    } else {
      const loop = (ms: number) => {
        render(ms);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("resize", resize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [theme]);
  return <div ref={ref} className="absolute inset-0" aria-hidden />;
}

/** Living hero scene: drifting gooey color fields, theme-aware. */
export function HeroCanvas({ theme }: { theme: "dark" | "light" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const css = getComputedStyle(document.documentElement);
    const cols = ["--hue-0", "--hue-1", "--hue-4", "--color-volt"].map((v) => css.getPropertyValue(v).trim() || "#888");
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    let w = 0,
      h = 0;
    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener("resize", resize);

    // pointer + scroll influence, each smoothed toward a target for lag/weight
    let tmx = 0,
      tmy = 0,
      mx = 0,
      my = 0,
      scr = 0;
    const onMove = (e: PointerEvent) => {
      tmx = e.clientX / innerWidth - 0.5; // -0.5..0.5
      tmy = e.clientY / innerHeight - 0.5;
    };
    addEventListener("pointermove", onMove);

    // ponytail: 4 drifting blobs + heavy blur = cheap gooey field, no WebGL/three.js.
    // depth: each blob gets a parallax factor so cursor/scroll move them by different amounts.
    const blobs = cols.map((c, i) => ({
      c,
      px: 0.2 + 0.2 * i,
      py: 0.3 + 0.12 * i,
      ax: 0.26 + 0.05 * i,
      ay: 0.2 + 0.06 * i,
      sx: 0.12 + 0.03 * i,
      sy: 0.09 + 0.04 * i,
      ph: i * 1.7,
      depth: 0.4 + i * 0.5, // nearer blobs react more
    }));

    const draw = (t: number) => {
      mx += (tmx - mx) * 0.06;
      my += (tmy - my) * 0.06;
      scr = (scrollY || 0) / innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.filter = "blur(70px)";
      ctx.globalCompositeOperation = theme === "dark" ? "lighter" : "multiply";
      const R = Math.max(w, h) * 0.42;
      for (const b of blobs) {
        const cx = (b.px + Math.sin(t * b.sx + b.ph) * b.ax) * w + mx * b.depth * w * 0.22;
        const cy =
          (b.py + Math.cos(t * b.sy + b.ph) * b.ay) * h +
          my * b.depth * h * 0.18 +
          scr * b.depth * h * 0.35; // scroll parallax
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, b.c);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.globalAlpha = theme === "dark" ? 0.5 : 0.38;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    if (reduced()) {
      draw(0);
      return () => {
        removeEventListener("resize", resize);
        removeEventListener("pointermove", onMove);
      };
    }
    let raf = 0;
    let t0 = 0;
    const loop = (ms: number) => {
      if (!t0) t0 = ms;
      draw((ms - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
    };
  }, [theme]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
