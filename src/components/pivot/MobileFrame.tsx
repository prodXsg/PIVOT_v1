import { ReactNode, useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Signal, Wifi, BatteryMedium } from "lucide-react";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 900px) and (min-height: 760px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function StatusBar() {
  return (
    <div className="absolute top-0 left-0 right-0 h-[54px] z-30 px-9 flex items-center justify-between text-foreground text-[15px] font-semibold pointer-events-none select-none">
      <span className="tabular pl-2">9:41</span>
      {/* Dynamic Island */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[11px] w-[124px] h-[37px] rounded-full bg-black" />
      <div className="flex items-center gap-1.5 pr-1">
        <Signal size={16} strokeWidth={2.6} className="fill-foreground" />
        <Wifi size={16} strokeWidth={2.6} />
        <BatteryMedium size={22} strokeWidth={2} />
      </div>
    </div>
  );
}

export function MobileFrame({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  const { theme } = useApp();

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen bg-background relative flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  // Desktop — iPhone 17 Pro frame
  const pageBg =
    theme === "dark"
      ? "bg-[radial-gradient(ellipse_at_top,_hsl(0_0%_10%)_0%,_hsl(0_0%_4%)_60%,_hsl(0_0%_2%)_100%)]"
      : "bg-[radial-gradient(ellipse_at_top,_hsl(60_15%_97%)_0%,_hsl(60_10%_92%)_60%,_hsl(60_8%_88%)_100%)]";

  // Titanium bezel — black titanium for dark, natural titanium for light
  const bezelGradient =
    theme === "dark"
      ? "linear-gradient(135deg, #2a2a2c 0%, #1a1a1c 25%, #3a3a3d 50%, #1d1d1f 75%, #2c2c2e 100%)"
      : "linear-gradient(135deg, #d8d3c7 0%, #b5ad9d 25%, #e8e3d6 50%, #a89f8d 75%, #cfc8b9 100%)";

  const innerRingColor = theme === "dark" ? "#0a0a0a" : "#3a352d";

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-8 ${pageBg}`}>
      <div
        className="relative"
        style={{
          width: 410,
          height: 864,
          padding: 10,
          borderRadius: 60,
          background: bezelGradient,
          boxShadow:
            "0 50px 100px -20px hsl(0 0% 0% / 0.55), 0 30px 60px -30px hsl(0 0% 0% / 0.45), inset 0 0 0 1px hsl(0 0% 100% / 0.06)",
        }}
      >
        {/* Side buttons */}
        {/* Mute switch (left top) */}
        <div
          className="absolute -left-[3px] top-[110px] w-[3px] h-[30px] rounded-l-md"
          style={{ background: bezelGradient }}
        />
        {/* Volume up */}
        <div
          className="absolute -left-[3px] top-[170px] w-[3px] h-[60px] rounded-l-md"
          style={{ background: bezelGradient }}
        />
        {/* Volume down */}
        <div
          className="absolute -left-[3px] top-[245px] w-[3px] h-[60px] rounded-l-md"
          style={{ background: bezelGradient }}
        />
        {/* Power button */}
        <div
          className="absolute -right-[3px] top-[200px] w-[3px] h-[100px] rounded-r-md"
          style={{ background: bezelGradient }}
        />

        {/* Inner ring (subtle dark line between bezel and screen) */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: 50,
            background: innerRingColor,
            padding: 2,
          }}
        >
          {/* Screen */}
          <div
            className="relative w-full h-full overflow-hidden bg-background"
            style={{ borderRadius: 48 }}
          >
            <StatusBar />
            <div className="absolute inset-0 pt-[54px] flex flex-col">
              <div className="w-full h-full max-w-none flex flex-col bg-background">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
