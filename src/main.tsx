import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import MahjongAdvisor from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MahjongAdvisor />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
