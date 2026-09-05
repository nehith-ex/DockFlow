import { Button } from "@/components/ui/button";
import { MapView, type MapMarker } from "@/components/Map";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Database,
  FilePlus2,
  Gauge,
  Info,
  Layers3,
  ListChecks,
  MapPin,
  Play,
  RefreshCcw,
  Ship,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  defaultRequest,
  defaultScenario,
  generateForecast,
  rankCandidates,
  runDecisionEngine,
  type ProcurementRequest,
  type RankedVessel,
  type Scenario,
  type Strategy,
  validateRequest,
  vesselCandidates,
} from "../../../shared/dockflow";

const strategyLabels: Record<Strategy, string> = {
  cost: "Cost-first",
  delivery: "Delivery-first",
  risk: "Risk-first",
  balanced: "Balanced",
};

const strategyDescriptions: Record<Strategy, string> = {
  cost: "Lowest modeled landed cost",
  delivery: "Fastest, most reliable arrival",
  risk: "Most robust against disruption",
  balanced: "Even trade-off across objectives",
};

const navViews = [
  { id: "overview", label: "Decision desk", icon: BarChart3 },
  { id: "new", label: "New request", icon: FilePlus2 },
  { id: "scenario", label: "Scenario lab", icon: SlidersHorizontal },
  { id: "history", label: "Request history", icon: RefreshCcw },
];

function money(value: number) {
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function stageStatus(index: number, currentView: string) {
  if (currentView === "new" && index > 0) return "pending";
  return index === 4 ? "active" : "complete";
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const initialView = location === "/new" ? "new" : location === "/scenario" ? "scenario" : location === "/history" ? "history" : location === "/recommend" ? "recommend" : "overview";
  const [view, setView] = useState(initialView);
  const [request, setRequest] = useState<ProcurementRequest>(defaultRequest);
  const [scenario, setScenario] = useState<Scenario>(defaultScenario);
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [selectedName, setSelectedName] = useState(defaultRequest.cargo === "Thermal coal" ? "MV Atlas Meridian" : "");
  const [lastRun, setLastRun] = useState("Just now");
  const utils = trpc.useUtils();
  const createRequest = trpc.procurement.create.useMutation({
    onSuccess: () => utils.procurement.history.invalidate(),
    onError: () => toast.error("Decision run was not saved", { description: "The local dashboard remains available; please retry to persist the run." }),
  });
  const history = trpc.procurement.history.useQuery();

  useEffect(() => {
    const routeView = location === "/new" ? "new" : location === "/scenario" ? "scenario" : location === "/history" ? "history" : location === "/recommend" ? "recommend" : "overview";
    setView(routeView);
  }, [location]);

  const engine = useMemo(() => runDecisionEngine(request, scenario, strategy), [request, scenario, strategy]);
  const ranked = engine.ranked;
  const selected = ranked.find((item) => item.candidate.name === selectedName) ?? ranked[0];
  const forecast = engine.forecast;

  const navigate = (nextView: string) => {
    setView(nextView);
    const route = nextView === "overview" ? "/desk" : `/${nextView}`;
    setLocation(route);
  };

  const updateScenario = (key: keyof Scenario, value: number) => {
    setScenario((current) => ({ ...current, [key]: value }));
  };

  const runRequest = (nextRequest: ProcurementRequest) => {
    setRequest(nextRequest);
    setScenario(defaultScenario);
    setStrategy("balanced");
    setSelectedName("");
    setLastRun("Just now");
    navigate("recommend");
    createRequest.mutate({ request: nextRequest, scenario: defaultScenario, strategy: "balanced" });
    toast.success("Decision run completed", { description: "Feasibility was applied before recommendation scoring." });
  };

  const resetScenario = () => {
    setScenario(defaultScenario);
    toast("Scenario reset", { description: "Baseline synthetic market assumptions restored." });
  };

  if (location === "/") {
    return <LandingHome onNewRequest={() => setLocation("/new")} />;
  }

  return (
    <div className="dockflow-app">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <div className="brand-name">DockFlow</div>
            <div className="brand-subtitle">Freight procurement intelligence</div>
          </div>
        </div>
        <div className="topbar-meta">
          <div className="data-status"><span className="status-dot" /> Synthetic / Proxy data</div>
          <div className="topbar-divider" />
          <div className="run-meta"><span className="meta-label">Last run</span><strong>{lastRun}</strong></div>
          <Button variant="outline" size="sm" className="header-action" onClick={() => navigate("new")}><FilePlus2 size={14} /> New request</Button>
        </div>
      </header>

      <div className="command-strip">
        <div className="route-context">
          <div className="eyebrow">ACTIVE PROCUREMENT REQUEST</div>
          <div className="route-line"><MapPin size={15} /> {request.origin} <ArrowRight size={14} /> {request.destination}</div>
          <div className="route-subline">{request.cargo} · {request.quantity.toLocaleString()} MT · Arrival {request.arrivalWindow}</div>
        </div>
        <div className="objective-context">
          <div className="eyebrow">ACTIVE OBJECTIVE</div>
          <div className="objective-value">{strategyLabels[strategy]}</div>
          <div className="route-subline">{strategyDescriptions[strategy]}</div>
        </div>
      </div>

      <div className="pipeline">
        {[
          ["01", "Validate", "Input checked"],
          ["02", "Constraints", "Feasible only"],
          ["03", "Features", "Decision-ready"],
          ["04", "Forecast", "Uncertainty shown"],
          ["05", "Recommend", "Rank + explain"],
        ].map(([number, label, detail], index) => {
          const status = stageStatus(index, view);
          return (
            <button key={label} className={`pipeline-step ${status}`} onClick={() => navigate(index === 4 ? "overview" : index === 3 ? "overview" : index === 1 ? "overview" : view)}>
              <span className="pipeline-index">{status === "complete" ? <Check size={13} strokeWidth={3} /> : number}</span>
              <span className="pipeline-copy"><strong>{label}</strong><small>{detail}</small></span>
              {index < 4 && <ChevronRight className="pipeline-chevron" size={16} />}
            </button>
          );
        })}
      </div>

      <div className="view-tabs" role="tablist" aria-label="DockFlow views">
        <div className="view-tab-set">
          {[
            ["home", "Home"],
            ["overview", "Overview"],
            ["forecast", "Forecast"],
            ["feasibility", "Feasibility"],
            ["recommend", "Recommend"],
            ["scenario", "Scenario lab"],
          ].map(([id, label]) => (
            <button key={id} className={`view-tab ${view === id ? "selected" : ""}`} onClick={() => id === "home" ? setLocation("/") : setView(id)}>{label}</button>
          ))}
        </div>
        <div className="view-tab-note"><Info size={13} /> Every rank is traceable to a visible score or rule</div>
      </div>

      {view === "new" ? (
        <NewRequestForm request={request} onRun={runRequest} onCancel={() => navigate("overview")} />
      ) : view === "history" ? (
        <HistoryView history={history.data ?? []} onOpen={(saved) => { setRequest(saved.request); setScenario(saved.result.scenario ?? defaultScenario); setStrategy(saved.result.strategy ?? "balanced"); navigate("overview"); }} />
      ) : view === "scenario" ? (
        <ScenarioView scenario={scenario} baseline={defaultScenario} forecast={forecast} ranked={ranked} onChange={updateScenario} onReset={resetScenario} strategy={strategy} onStrategy={setStrategy} />
      ) : (
        <>
          <section className="metric-grid">
            <MetricCard label="Recommended vessel" value={engine.recommended?.candidate.name ?? "No feasible vessel"} detail={engine.recommended ? `${engine.recommended.candidate.vesselClass} · ${engine.recommended.candidate.dwt.toLocaleString()} DWT` : "Adjust hard constraints"} accent="red" icon={<Ship size={17} />} />
            <MetricCard label="Feasibility gate" value={`${engine.feasibleCount} / ${engine.feasibility.length} pass`} detail={`${engine.rejectedCount} excluded before ranking`} icon={<ListChecks size={17} />} />
            <MetricCard label="Forecast confidence" value={`${forecast[3]?.confidence ?? 0}%`} detail="Week 04 blended confidence" icon={<Gauge size={17} />} />
          </section>

          {view === "overview" && <><section className="primary-grid"><PortMapPanel request={request} onSelectDestination={(destination) => setRequest((current) => ({ ...current, destination }))} /><RecommendationCard selected={selected} strategy={strategy} onView={() => setView("recommend")} /></section><ForecastPanel forecast={forecast} scenario={scenario} /><DecisionTrace steps={engine.decisionTrace} /><FeasibilityView feasibility={engine.feasibility} /></>}
          {view === "forecast" && <ForecastPanel forecast={forecast} scenario={scenario} />}
          {view === "feasibility" && <><DecisionTrace steps={engine.decisionTrace} /><FeasibilityView feasibility={engine.feasibility} /></>}
          {view === "recommend" && <><section className="primary-grid"><RecommendationCard selected={selected} strategy={strategy} onView={() => setView("recommend")} /><PortMapPanel request={request} onSelectDestination={(destination) => setRequest((current) => ({ ...current, destination }))} /></section><ForecastPanel forecast={forecast} scenario={scenario} /><DecisionTrace steps={engine.decisionTrace} /><FeasibilityView feasibility={engine.feasibility} /><RecommendationView ranked={ranked} strategy={strategy} setStrategy={setStrategy} selectedName={selected?.candidate.name ?? ""} setSelectedName={setSelectedName} /></>}
        </>
      )}

      <footer className="footer-strip">
        <span><span className="red-square" /> DockFlow decision support · Constraints before preferences</span>
        <span>SIH26006 · MVP v0.1 · {request.origin.split(",")[0]} → {request.destination.split(",")[0]}</span>
      </footer>
    </div>
  );
}

function LandingHome({ onNewRequest }: { onNewRequest: () => void }) {
  const featured = vesselCandidates.slice(0, 4);
  return <main className="landing-home"><section className="landing-hero"><div className="landing-hero-copy"><div className="eyebrow"><span className="red-square tiny" /> FREIGHT PROCUREMENT INTELLIGENCE</div><h1>Find the right vessel before the market moves.</h1><p>DockFlow turns cargo requirements, port constraints, and market uncertainty into a transparent chartering shortlist.</p><div className="landing-actions"><Button onClick={onNewRequest}><FilePlus2 size={15} /> New Request</Button><button className="text-action landing-secondary" onClick={() => document.getElementById("vessel-board")?.scrollIntoView({ behavior: "smooth" })}>Explore vessel board <ArrowRight size={14} /></button></div></div><div className="landing-hero-visual"><div className="hero-grid-lines" /><div className="hero-route-label">RTE / EAST COAST INDIA</div><div className="hero-route"><span className="hero-port origin">RB</span><span className="hero-dash" /><span className="hero-ship"><Ship size={22} /></span><span className="hero-dash" /><span className="hero-port destination">PRD</span></div><div className="hero-route-meta"><span>Richards Bay</span><span>Paradip</span></div><div className="hero-signal"><span className="status-dot" /> CONSTRAINTS-FIRST / AUDITABLE</div></div></section><section className="landing-pipeline"><span className="eyebrow">ONE DECISION FLOW</span>{["Cargo", "Forecast", "Feasibility", "Optimize", "Recommend"].map((item, index) => <div key={item} className="landing-pipeline-step"><b>{String(index + 1).padStart(2, "0")}</b><span>{item}</span>{index < 4 && <ArrowRight size={13} />}</div>)}</section><section className="landing-section" id="vessel-board"><div className="landing-section-heading"><div><div className="eyebrow">FEATURED VESSEL BOARD / SAMPLE LISTINGS</div><h2>Vessels ready for review</h2><p>Indicative synthetic/proxy listings for the MVP. Every vessel remains subject to the request-specific feasibility gate.</p></div><span className="source-chip"><Database size={13} /> Synthetic / Proxy</span></div><div className="vessel-ad-grid">{featured.map((vessel, index) => <article className="vessel-ad-card" key={vessel.name}><div className="vessel-ad-top"><span className="listing-number">0{index + 1}</span><span className="listing-status"><span className="status-dot" /> Sample listing</span></div><div className="vessel-ad-icon"><Ship size={23} /></div><h3>{vessel.name}</h3><p className="vessel-ad-operator">{vessel.operator} · {vessel.vesselClass}</p><div className="vessel-ad-specs"><span><b>{vessel.dwt.toLocaleString()}</b><small>DWT</small></span><span><b>{vessel.draft.toFixed(1)} m</b><small>DRAFT</small></span><span><b>{vessel.transitDays} d</b><small>TRANSIT</small></span></div><div className="vessel-ad-cargo">{vessel.cargoes.slice(0, 2).map((cargo) => <span key={cargo}>{cargo}</span>)}</div><button className="vessel-ad-link" onClick={onNewRequest}>Use in a New Request <ArrowRight size={14} /></button></article>)}</div></section><section className="landing-cta"><div><span className="eyebrow">READY TO RUN A DECISION?</span><h2>Start with the cargo. End with a defensible shortlist.</h2></div><Button onClick={onNewRequest}><FilePlus2 size={15} /> New Request</Button></section></main>;
}


function MetricCard({ label, value, detail, icon, accent }: { label: string; value: string; detail: string; icon: React.ReactNode; accent?: string }) {
  return <div className={`metric-card ${accent ?? ""}`}><div className="metric-head"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div></div>;
}

function ForecastPanel({ forecast, scenario }: { forecast: ReturnType<typeof generateForecast>; scenario: Scenario }) {
  return <section className="panel forecast-panel">
    <div className="panel-heading"><div><div className="eyebrow">MARKET OUTLOOK / 08 WEEKS</div><h2>Freight trend with uncertainty</h2></div><div className="legend-set"><span><i className="legend-line blue" /> Freight / $M</span><span><i className="legend-band" /> Confidence band</span></div></div>
    <div className="chart-wrap"><ResponsiveContainer width="100%" height={220}><AreaChart data={forecast} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
      <defs><linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef3b2d" stopOpacity={0.14} /><stop offset="100%" stopColor="#ef3b2d" stopOpacity={0.02} /></linearGradient></defs>
      <CartesianGrid stroke="#e6e6e6" vertical={false} />
      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#686868", fontSize: 11 }} />
      <YAxis domain={[18, "auto"]} axisLine={false} tickLine={false} tick={{ fill: "#686868", fontSize: 11 }} tickFormatter={(value) => `$${value}`} />
      <Tooltip contentStyle={{ border: "1px solid #111", borderRadius: 0, boxShadow: "none", fontSize: 12 }} formatter={(value: number, name: string) => [name === "freight" ? `$${value}M` : `$${value}M`, name === "freight" ? "Freight" : name]} />
      <Area type="monotone" dataKey="high" stroke="none" fill="url(#confidenceBand)" activeDot={false} />
      <Area type="monotone" dataKey="low" stroke="none" fill="#fff" activeDot={false} />
      <Line type="monotone" dataKey="freight" stroke="#0057b8" strokeWidth={2.5} dot={{ r: 3, fill: "#0057b8", strokeWidth: 0 }} activeDot={{ r: 5 }} />
    </AreaChart></ResponsiveContainer></div>
    <div className="forecast-foot"><span><strong>68–82%</strong> confidence range by horizon</span><span><span className="red-square tiny" /> {scenario.freight === 0 && scenario.congestion === 0 ? "Baseline conditions" : "Scenario-adjusted outlook"}</span><span>Source: synthetic/proxy adapter</span></div><div className="confidence-strip"><span><b>Freight</b><strong>{forecast[3]?.confidence}%</strong><small>range ±{((forecast[3]?.high ?? 0) - (forecast[3]?.low ?? 0)).toFixed(1)}M</small></span><span><b>Congestion</b><strong>{forecast[3]?.confidence}%</strong><small>range ±{((forecast[3]?.congestionHigh ?? 0) - (forecast[3]?.congestionLow ?? 0)).toFixed(1)}</small></span><span><b>Delivery</b><strong>{forecast[3]?.confidence}%</strong><small>range ±{((forecast[3]?.deliveryHigh ?? 0) - (forecast[3]?.deliveryLow ?? 0)).toFixed(1)}d</small></span></div>
  </section>;
}

function PortMapPanel({ request, onSelectDestination }: { request: ProcurementRequest; onSelectDestination: (destination: string) => void }) {
  const ports = [
    { name: "Haldia Dock", state: "West Bengal", code: "IN HAL", position: { lat: 22.03, lng: 88.06 } },
    { name: "Paradip", state: "Odisha", code: "IN PRD", position: { lat: 20.27, lng: 86.70 } },
    { name: "Visakhapatnam", state: "Andhra Pradesh", code: "IN VIZ", position: { lat: 17.69, lng: 83.22 } },
    { name: "Kamarajar / Ennore", state: "Tamil Nadu", code: "IN ENN", position: { lat: 13.25, lng: 80.34 } },
  ];
  const active = ports.find((port) => request.destination.startsWith(port.name)) ?? ports[1];
  const indiaEntry = { lat: 15, lng: 94 };
  const seaApproach = { lat: active.position.lat, lng: active.position.lng + 2 };
  const markers: MapMarker[] = ports.map((port) => ({ id: port.name, label: port.code, position: port.position, title: port.name }));
  return <section className="panel map-panel"><div className="panel-heading"><div><div className="eyebrow">EAST COAST INDIA / PORT NETWORK</div><h2>Route context</h2><p className="panel-description">Live geographic context for the current procurement route. Drag, zoom, or select a port.</p></div><span className="source-chip">CartoDB dark layer</span></div><div className="map-stage"><MapView initialCenter={{ lat: 18, lng: 82 }} initialZoom={5.5} markers={markers} activeMarkerId={active.name} routePath={[indiaEntry, seaApproach, active.position]} onMarkerClick={(marker) => onSelectDestination(`${marker.title ?? marker.label}, India`)} /><div className="map-key"><span><i className="map-key-dot active-dot" /> Selected destination</span><span><i className="map-key-line" /> India entry trajectory</span><span><i className="map-key-dot" /> East Coast port</span></div></div><div className="map-footer"><span><b>{active.name}</b> · {active.state}</span><span>{request.origin.split(",")[0]} → {active.name}</span></div></section>;
}

function RecommendationCard({ selected, strategy, onView }: { selected?: RankedVessel; strategy: Strategy; onView: () => void }) {
  return <section className="panel recommendation-card">
    <div className="panel-heading"><div><div className="eyebrow">CURRENT RECOMMENDATION</div><h2>Best fit, explained</h2></div><Sparkles size={17} className="panel-icon" /></div>
    {selected ? <>
      <div className="recommend-rank"><span>RANK 01</span><span className="recommend-score">{selected.overallScore}<small>/100</small></span></div>
      <h3>{selected.candidate.name}</h3><p className="muted-copy">{selected.candidate.operator} · {selected.candidate.vesselClass}</p>
      <div className="recommend-big-number">{money(selected.landedCost)}</div><div className="muted-copy">modeled landed cost · {selected.deliveryDays.toFixed(1)} day delivery</div>
      <div className="score-bars"><ScoreBar label="Cost" value={selected.costScore} color="blue" /><ScoreBar label="Delivery" value={selected.deliveryScore} color="black" /><ScoreBar label="Risk" value={selected.resilienceScore} color="red" /></div>
      <div className="explanation-box"><div className="explanation-title"><CircleCheck size={14} /> Why this is ranked here</div><p>{selected.rationale}</p></div>
      <button className="text-action" onClick={onView}>Open full comparison <ArrowRight size={14} /></button>
    </> : <EmptyState text="No feasible vessel matches these constraints." />}
  </section>;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="score-row"><span>{label}</span><div className="score-track"><span className={`score-fill ${color}`} style={{ width: `${value}%` }} /></div><strong>{value}</strong></div>;
}

function OverviewLower({ ranked, feasibility, strategy, setStrategy, selectedName, setSelectedName, onFeasibility }: { ranked: RankedVessel[]; feasibility: ReturnType<typeof runDecisionEngine>["feasibility"]; strategy: Strategy; setStrategy: (strategy: Strategy) => void; selectedName: string; setSelectedName: (name: string) => void; onFeasibility: () => void }) {
  return <section className="secondary-grid">
    <div className="panel comparison-panel"><div className="panel-heading"><div><div className="eyebrow">FEASIBLE OPTIONS / PREFERENCE RANKING</div><h2>Compare alternatives</h2></div><StrategyToggle strategy={strategy} onStrategy={setStrategy} /></div><RankedTable ranked={ranked} selectedName={selectedName} setSelectedName={setSelectedName} /><button className="text-action" onClick={() => { setStrategy("balanced"); onFeasibility(); }}>View constraints audit <ArrowRight size={14} /></button></div>
    <div className="panel audit-panel"><div className="panel-heading"><div><div className="eyebrow">AUDIT TRAIL / HARD GATE</div><h2>Feasibility checks</h2></div><ListChecks size={17} className="panel-icon" /></div><div className="audit-summary"><span className="audit-number">{feasibility.filter((item) => item.feasible).length}</span><span>feasible vessels<br /><small>of {feasibility.length} screened</small></span></div><div className="audit-list">{feasibility.slice(0, 4).map((item) => <div className="audit-line" key={item.candidate.name}><span className={item.feasible ? "pass-dot" : "fail-dot"}>{item.feasible ? <Check size={11} /> : <X size={11} />}</span><span className="audit-vessel">{item.candidate.name}</span><span className={item.feasible ? "audit-pass" : "audit-fail"}>{item.feasible ? "PASS" : "REJECTED"}</span></div>)}</div><button className="text-action" onClick={onFeasibility}>Inspect all rules <ArrowRight size={14} /></button></div>
  </section>;
}

function StrategyToggle({ strategy, onStrategy }: { strategy: Strategy; onStrategy: (strategy: Strategy) => void }) {
  return <div className="strategy-toggle">{(Object.keys(strategyLabels) as Strategy[]).map((item) => <button key={item} className={strategy === item ? "active" : ""} onClick={() => onStrategy(item)}>{strategyLabels[item].replace("-first", "")}</button>)}</div>;
}

function RankedTable({ ranked, selectedName, setSelectedName }: { ranked: RankedVessel[]; selectedName: string; setSelectedName: (name: string) => void }) {
  return <div className="ranked-table"><div className="table-row table-header"><span>Vessel / operator</span><span>Cost</span><span>Delivery</span><span>Risk</span><span>Rank</span></div>{ranked.map((item, index) => <button className={`table-row table-body ${selectedName === item.candidate.name ? "selected" : ""}`} key={item.candidate.name} onClick={() => setSelectedName(item.candidate.name)}><span><strong>{String(index + 1).padStart(2, "0")}</strong><span className="vessel-name"><b>{item.candidate.name}</b><small>{item.candidate.operator}</small></span></span><span>{money(item.landedCost)}</span><span>{item.deliveryDays.toFixed(1)}d</span><span><i className={`risk-dot ${item.riskScore > 35 ? "high" : "low"}`} />{item.riskScore}</span><span className="rank-score">{item.overallScore}</span></button>)}</div>;
}

function DecisionTrace({ steps }: { steps: ReturnType<typeof runDecisionEngine>["decisionTrace"] }) {
  return <section className="trace-panel"><div className="trace-title"><span className="eyebrow">DECISION TRACE / SERVER PIPELINE</span><span className="source-chip"><Layers3 size={13} /> 8 steps complete</span></div><div className="trace-grid">{steps.map((step) => <div className="trace-step" key={step.id}><span>{String(step.id).padStart(2, "0")}</span><div><b>{step.label}</b><small>{step.detail}</small></div></div>)}</div></section>;
}

function FeasibilityView({ feasibility }: { feasibility: ReturnType<typeof runDecisionEngine>["feasibility"] }) {
  return <section className="panel full-panel"><div className="panel-heading"><div><div className="eyebrow">DETERMINISTIC RULE ENGINE / SCREEN BEFORE SCORE</div><h2>Feasibility gate</h2><p className="panel-description">Physically or operationally impossible options are removed before any commercial preference is applied.</p></div><div className="rule-badge"><span className="red-square tiny" /> Rule-based</div></div><div className="feasibility-grid">{feasibility.map((item) => <div className={`feasibility-card ${item.feasible ? "pass" : "fail"}`} key={item.candidate.name}><div className="feasibility-card-head"><div><span className="eyebrow">{item.candidate.vesselClass} · {item.candidate.dwt.toLocaleString()} DWT</span><h3>{item.candidate.name}</h3><p>{item.candidate.operator}</p></div><div className={`feasibility-status ${item.feasible ? "pass" : "fail"}`}>{item.feasible ? <><CircleCheck size={14} /> FEASIBLE</> : <><CircleAlert size={14} /> REJECTED</>}</div></div><div className="check-list">{item.checks.map((check) => <div key={check.label} className="check-item"><span className={check.passed ? "check-pass" : "check-fail"}>{check.passed ? <Check size={11} /> : <X size={11} />}</span><span><b>{check.label}</b><small>{check.detail}</small></span></div>)}</div>{item.rejectionReason && <div className="rejection-reason"><TriangleAlert size={13} /><span><b>Why excluded:</b> {item.rejectionReason}</span></div>}</div>)}</div></section>;
}

function RecommendationView({ ranked, strategy, setStrategy, selectedName, setSelectedName }: { ranked: RankedVessel[]; strategy: Strategy; setStrategy: (strategy: Strategy) => void; selectedName: string; setSelectedName: (name: string) => void }) {
  const selected = ranked.find((item) => item.candidate.name === selectedName) ?? ranked[0];
  return <section className="recommendation-layout"><div className="panel full-panel"><div className="panel-heading"><div><div className="eyebrow">PREFERENCE PROFILES / LIVE RANKING</div><h2>Recommendation comparison</h2><p className="panel-description">Change the operating objective to see how the same feasible set is reordered.</p></div><StrategyToggle strategy={strategy} onStrategy={setStrategy} /></div><RankedTable ranked={ranked} selectedName={selected?.candidate.name ?? ""} setSelectedName={setSelectedName} /></div><div className="panel explanation-panel"><div className="eyebrow">TRACEABLE EXPLANATION</div>{selected ? <><div className="explanation-rank">{selected.overallScore}<small>/100</small></div><h2>{selected.candidate.name}</h2><p className="muted-copy">{strategyLabels[strategy]} · {strategyDescriptions[strategy]}</p><div className="tradeoff-grid"><div><span>Cost</span><strong>{money(selected.landedCost)}</strong><small>{selected.costScore}/100</small></div><div><span>Delivery</span><strong>{selected.deliveryDays.toFixed(1)} d</strong><small>{selected.deliveryScore}/100</small></div><div><span>Risk</span><strong>{selected.riskScore}/100</strong><small>{selected.resilienceScore}/100 resilience</small></div></div><div className="explanation-box"><div className="explanation-title"><Sparkles size={14} /> Plain-language rationale</div><p>{selected.rationale}</p></div><div className="flag-list">{selected.flags.map((flag) => <span key={flag} className={flag.includes("Elevated") || flag.includes("Longer") ? "flag warning" : "flag"}>{flag.includes("Elevated") || flag.includes("Longer") ? <TriangleAlert size={12} /> : <Check size={12} />}{flag}</span>)}</div></> : <EmptyState text="No ranked options." />}</div></section>;
}

function ScenarioView({ scenario, baseline, forecast, ranked, onChange, onReset, strategy, onStrategy }: { scenario: Scenario; baseline: Scenario; forecast: ReturnType<typeof generateForecast>; ranked: RankedVessel[]; onChange: (key: keyof Scenario, value: number) => void; onReset: () => void; strategy: Strategy; onStrategy: (strategy: Strategy) => void }) {
  const baselineRanked = useMemo(() => rankCandidates(defaultRequest, baseline, strategy), [baseline, strategy]);
  const currentLead = ranked[0]?.candidate.name;
  const baselineLead = baselineRanked[0]?.candidate.name;
  return <section className="scenario-layout"><div className="panel scenario-controls"><div className="panel-heading"><div><div className="eyebrow">SENSITIVITY WORKBENCH / WHAT-IF</div><h2>Scenario lab</h2><p className="panel-description">Stress the market assumptions and observe the recommendation response.</p></div><button className="icon-button" onClick={onReset} aria-label="Reset scenario"><RefreshCcw size={15} /></button></div><div className="scenario-control-list">{(["freight", "congestion", "fuel", "demand"] as const).map((key) => <div className="scenario-control" key={key}><div className="control-head"><span>{key[0].toUpperCase() + key.slice(1)} {key === "freight" ? "rate" : "pressure"}</span><strong className={scenario[key] > 0 ? "positive-shock" : scenario[key] < 0 ? "negative-shock" : "neutral-shock"}>{scenario[key] > 0 ? "+" : ""}{scenario[key]}%</strong></div><input aria-label={`${key} scenario adjustment`} type="range" min={-30} max={40} value={scenario[key]} onChange={(event) => onChange(key, Number(event.target.value))} /><div className="range-labels"><span>Favorable</span><span>Baseline</span><span>Stress</span></div></div>)}</div><div className="scenario-callout"><div><CircleAlert size={15} /><strong>{currentLead === baselineLead ? "Recommendation stable" : "Recommendation shifted"}</strong></div><p>{currentLead === baselineLead ? `${currentLead} remains the lead option under this scenario.` : `The lead moved from ${baselineLead ?? "baseline"} to ${currentLead ?? "no option"}.`}</p></div><div className="scenario-profile"><span className="eyebrow">RANKING PROFILE</span><StrategyToggle strategy={strategy} onStrategy={onStrategy} /></div></div><div className="scenario-results"><div className="panel"><div className="panel-heading"><div><div className="eyebrow">SCENARIO OUTPUT / FREIGHT + DELIVERY</div><h2>Forecast response</h2></div><span className="source-chip"><Database size={13} /> Synthetic adapter</span></div><div className="chart-wrap scenario-chart"><ResponsiveContainer width="100%" height={280}><LineChart data={forecast} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}><CartesianGrid stroke="#e6e6e6" vertical={false} /><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#686868", fontSize: 11 }} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#686868", fontSize: 11 }} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#686868", fontSize: 11 }} /><Tooltip contentStyle={{ border: "1px solid #111", borderRadius: 0, boxShadow: "none", fontSize: 12 }} /><Line yAxisId="left" type="monotone" dataKey="freight" stroke="#0057b8" strokeWidth={2.5} dot={false} name="Freight / $M" /><Line yAxisId="right" type="monotone" dataKey="congestion" stroke="#ef3b2d" strokeWidth={2} dot={false} name="Congestion index" /><Line yAxisId="right" type="monotone" dataKey="delivery" stroke="#111" strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="Delivery days" /></LineChart></ResponsiveContainer></div><div className="scenario-output-grid"><div><span>Week 04 freight</span><strong>${forecast[3]?.freight}M</strong><small>vs baseline ${(generateForecast(defaultRequest, baseline)[3]?.freight ?? 0).toFixed(1)}M</small></div><div><span>Congestion index</span><strong>{forecast[3]?.congestion}</strong><small>higher is more disruptive</small></div><div><span>Lead option</span><strong>{currentLead ?? "—"}</strong><small>{currentLead === baselineLead ? "Stable under stress" : "Changed vs baseline"}</small></div></div></div></div></section>;
}

function NewRequestForm({ request, onRun, onCancel }: { request: ProcurementRequest; onRun: (request: ProcurementRequest) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(request);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = <K extends keyof ProcurementRequest>(key: K, value: ProcurementRequest[K]) => { setDraft((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: "" })); };
  const handleRun = () => { const checked = validateRequest(draft); setErrors(checked.errors); if (!checked.valid) { toast.error("Review request constraints", { description: Object.values(checked.errors)[0] }); return; } onRun(draft); };
  useEffect(() => { const cargoSelect = Array.from(document.querySelectorAll("select")).find((select) => select.value === "Thermal coal" || select.value === "Steel"); if (cargoSelect && !Array.from(cargoSelect.options).some((option) => option.value === "Steel")) cargoSelect.add(new Option("Steel", "Steel"), 1); }, [draft.cargo]);
  return <section className="new-request-layout"><div className="new-request-intro"><div className="eyebrow">01 / REQUIREMENT INPUT</div><h1>Start a procurement decision</h1><p>Define the route, cargo, and operating boundaries. DockFlow will validate the request, remove infeasible vessels, and only then rank the remaining options.</p><div className="intro-rule"><span className="red-square" /><span>Every recommendation starts with an auditable constraint set.</span></div></div><div className="panel request-form-panel"><div className="form-section"><div className="form-section-title"><span>01</span><div><h2>Route & cargo</h2><p>Scope the movement you need to procure.</p></div></div><div className="form-grid two"><Field label="Origin port" error={errors.origin}><select value={draft.origin} onChange={(event) => update("origin", event.target.value)}><option>Richards Bay, South Africa</option><option>Newcastle, Australia</option><option>Mina Saqr, UAE</option></select></Field><Field label="Destination port" error={errors.destination}><select value={draft.destination} onChange={(event) => update("destination", event.target.value)}><option>Paradip, India</option><option>Visakhapatnam, India</option><option>Haldia, India</option><option>Kamarajar, India</option></select></Field><Field label="Cargo type" error={errors.cargo}><select value={draft.cargo} onChange={(event) => update("cargo", event.target.value)}><option>Thermal coal</option><option>Ore</option><option>Grain</option><option>Fertilizer</option></select></Field><Field label="Quantity / MT" error={errors.quantity}><input type="number" min={1000} value={draft.quantity} onChange={(event) => update("quantity", Number(event.target.value))} /></Field></div></div><div className="form-section"><div className="form-section-title"><span>02</span><div><h2>Timing & operating constraints</h2><p>These rules act as a hard feasibility gate.</p></div></div><div className="form-grid two"><Field label="Arrival window" error={errors.arrivalWindow}><select value={draft.arrivalWindow} onChange={(event) => update("arrivalWindow", event.target.value)}><option>15–30 Nov 2026</option><option>01–15 Dec 2026</option><option>16–31 Dec 2026</option><option>01–15 Jan 2027</option></select></Field><Field label="Preferred vessel class"><select value={draft.vesselClass} onChange={(event) => update("vesselClass", event.target.value)}><option>Any</option><option>Handysize</option><option>Supramax</option><option>Panamax</option></select></Field><Field label="Maximum draft / m" error={errors.maxDraft}><input type="number" step="0.1" min={8} max={18} value={draft.maxDraft} onChange={(event) => update("maxDraft", Number(event.target.value))} /><small className="field-note">Destination berth limit</small></Field><Field label="Minimum capacity / DWT" error={errors.minDwt}><input type="number" step="1000" min={10000} value={draft.minDwt} onChange={(event) => update("minDwt", Number(event.target.value))} /></Field><Field label="Cargo handling profile"><select value={draft.cargoSensitivity} onChange={(event) => update("cargoSensitivity", event.target.value as ProcurementRequest["cargoSensitivity"])}><option value="standard">Standard bulk</option><option value="fragile">Sensitive / fragile</option><option value="hazardous">Hazardous / controlled</option></select></Field></div></div><div className="form-actions"><button className="text-action" onClick={onCancel}>Cancel</button><Button onClick={handleRun}><Play size={15} /> Run DockFlow decision</Button></div></div></section>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className={`field ${error ? "field-error" : ""}`}><span>{label}</span>{children}{error && <small className="field-error-message">{error}</small>}</label>; }

function HistoryView({ history, onOpen }: { history: Array<{ id: number; createdAt: Date; request: ProcurementRequest; result: ReturnType<typeof runDecisionEngine> }>; onOpen: (saved: { request: ProcurementRequest; result: ReturnType<typeof runDecisionEngine> }) => void }) {
  const [, setLocation] = useLocation();
  return <section className="panel full-panel history-panel"><div className="panel-heading"><div><div className="eyebrow">PROCUREMENT ARCHIVE / REVISITABLE RUNS</div><h2>Request history</h2><p className="panel-description">Stored decision runs keep the input, scenario, and reasoning together for review.</p></div><div className="source-chip"><Database size={13} /> PostgreSQL / demo workspace</div></div>{history.length === 0 ? <EmptyState text="No saved runs yet. Run a new procurement request to create an auditable record." action="Start first request" onAction={() => setLocation("/new")} /> : <div className="history-list">{history.map((item) => <button key={item.id} className="history-row" onClick={() => onOpen({ request: item.request, result: item.result })}><span className="history-id">#{String(item.id).padStart(4, "0")}</span><span><b>{item.request.origin.split(",")[0]} → {item.request.destination.split(",")[0]}</b><small>{item.request.cargo} · {item.request.quantity.toLocaleString()} MT</small></span><span className="history-vessel">{item.result.recommended?.candidate.name ?? "No feasible vessel"}<small>{item.result.strategy} strategy</small></span><span className="history-date">{new Date(item.createdAt).toLocaleDateString()}</span><ChevronRight size={16} /></button>)}</div>}</section>;
}

function EmptyState({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) { return <div className="empty-state"><Info size={16} /><p>{text}</p>{action && <button className="text-action" onClick={onAction}>{action} <ArrowRight size={14} /></button>}</div>; }
