"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageLoading from "../../components/PageLoading";
import SubscriptionGate from "../../components/SubscriptionGate";
import { readApiError } from "../../lib/apiClient";
import { DEMO_EMAIL, DEMO_PLAN_SLUG, getSession, type AuthSession } from "../../lib/auth";
import { FREE_PLAN, getSubscriptionPlanBySlug, hasFeatureAccess } from "../../lib/subscriptions";
import styles from "./events.module.css";

type ProfilePayload = {
  user?: {
    planSlug?: string;
  };
};

type GoalPlanningCategory =
  | "Home"
  | "Holiday"
  | "Wedding"
  | "Education"
  | "Vehicle"
  | "Emergency Fund"
  | "Birthday"
  | "Other";

type PlannerField = keyof EventPlannerState;

type EventPlannerState = {
  planningCategory: GoalPlanningCategory;
  eventName: string;
  eventType: string;
  eventDate: string;
  hostName: string;
  venueName: string;
  venueLocation: string;
  venueCapacity: number;
  venueSizeSqm: number;
  guestCount: number;
  budgetTarget: number;
  depositPaid: number;
  venueCost: number;
  mealCostPerGuest: number;
  seatingCostPerGuest: number;
  cakeCostPerGuest: number;
  drinksCostPerGuest: number;
  decorCost: number;
  floristCost: number;
  photographyCost: number;
  musicCost: number;
  transportCost: number;
  attireCost: number;
  plannerFee: number;
  accommodationCost: number;
  stationeryCost: number;
  contingencyPercent: number;
  notes: string;
};

type PlannerAsset = {
  id: string;
  name: string;
  sizeLabel: string;
  url: string;
};

type CostLineItem = {
  label: string;
  value: number;
  type: "perGuest" | "fixed";
};

const EVENT_STORAGE_PREFIX = "lunivo-event-planner";

type PlannerLineItemKey =
  | "venueCost"
  | "mealCostPerGuest"
  | "seatingCostPerGuest"
  | "cakeCostPerGuest"
  | "drinksCostPerGuest"
  | "decorCost"
  | "floristCost"
  | "photographyCost"
  | "musicCost"
  | "transportCost"
  | "attireCost"
  | "plannerFee"
  | "accommodationCost"
  | "stationeryCost";

type PlannerProfile = {
  workspaceTitle: string;
  workspaceDescription: string;
  hostLabel: string;
  entityLabel: string;
  entityLocationLabel: string;
  unitLabel: string;
  unitCostLabel: string;
  capacityLabel: string;
  scaleLabel: string;
  typeOptions: string[];
  lineItemLabels: Record<PlannerLineItemKey, string>;
};

const PLANNER_PROFILES: Record<GoalPlanningCategory, PlannerProfile> = {
  Wedding: {
    workspaceTitle: "Wedding Planning",
    workspaceDescription: "Model venues, guests, food, decor, suppliers, and export the full wedding plan.",
    hostLabel: "Couple or host",
    entityLabel: "Venue name",
    entityLocationLabel: "Venue location",
    unitLabel: "Guest count",
    unitCostLabel: "Cost per guest",
    capacityLabel: "Venue capacity",
    scaleLabel: "Venue size (sqm)",
    typeOptions: ["Wedding", "Reception", "Engagement party"],
    lineItemLabels: {
      venueCost: "Venue hire",
      mealCostPerGuest: "Meals per guest",
      seatingCostPerGuest: "Seating per guest",
      cakeCostPerGuest: "Cake per guest",
      drinksCostPerGuest: "Drinks per guest",
      decorCost: "Decor",
      floristCost: "Florist",
      photographyCost: "Photography & video",
      musicCost: "Music & entertainment",
      transportCost: "Transport",
      attireCost: "Attire",
      plannerFee: "Planner fee",
      accommodationCost: "Accommodation",
      stationeryCost: "Stationery",
    },
  },
  Holiday: {
    workspaceTitle: "Holiday Planning",
    workspaceDescription: "Plan travel spend, accommodation, activities, and trip-level budgeting in one workspace.",
    hostLabel: "Lead traveler",
    entityLabel: "Destination or hotel",
    entityLocationLabel: "Region or country",
    unitLabel: "Traveler count",
    unitCostLabel: "Cost per traveler",
    capacityLabel: "Booking capacity",
    scaleLabel: "Trip length (days)",
    typeOptions: ["Holiday", "City break", "Road trip", "Family trip"],
    lineItemLabels: {
      venueCost: "Flights & long-haul travel",
      mealCostPerGuest: "Daily food per traveler",
      seatingCostPerGuest: "Activities per traveler",
      cakeCostPerGuest: "Travel insurance per traveler",
      drinksCostPerGuest: "Local transport per traveler",
      decorCost: "Tours & bookings",
      floristCost: "Passports, visas, admin",
      photographyCost: "Photo & content budget",
      musicCost: "Entertainment",
      transportCost: "Airport transfers",
      attireCost: "Shopping & luggage",
      plannerFee: "Planning support",
      accommodationCost: "Accommodation",
      stationeryCost: "Itinerary & admin",
    },
  },
  Home: {
    workspaceTitle: "Home Purchase Planning",
    workspaceDescription: "Break down the home goal into deposit, fees, furnishing, and monthly affordability planning.",
    hostLabel: "Buyer name",
    entityLabel: "Property or development",
    entityLocationLabel: "Area or city",
    unitLabel: "Mortgage term (months)",
    unitCostLabel: "Cost per month",
    capacityLabel: "Monthly payment ceiling",
    scaleLabel: "Property size (sqm)",
    typeOptions: ["Home purchase", "Apartment", "Renovation"],
    lineItemLabels: {
      venueCost: "Deposit",
      mealCostPerGuest: "Mortgage per month",
      seatingCostPerGuest: "Utilities per month",
      cakeCostPerGuest: "Insurance per month",
      drinksCostPerGuest: "Maintenance per month",
      decorCost: "Legal fees",
      floristCost: "Survey & inspection",
      photographyCost: "Renovation reserve",
      musicCost: "Moving costs",
      transportCost: "Commuting setup",
      attireCost: "Furnishing",
      plannerFee: "Broker or advisor fee",
      accommodationCost: "Temporary accommodation",
      stationeryCost: "Stamp duty & admin",
    },
  },
  Vehicle: {
    workspaceTitle: "Vehicle Purchase Planning",
    workspaceDescription: "Model deposit, finance term, insurance, running costs, and the full purchase budget.",
    hostLabel: "Buyer name",
    entityLabel: "Vehicle or dealership",
    entityLocationLabel: "Dealer location",
    unitLabel: "Finance term (months)",
    unitCostLabel: "Cost per month",
    capacityLabel: "Monthly payment ceiling",
    scaleLabel: "Annual mileage",
    typeOptions: ["Car purchase", "Lease plan", "Motorbike"],
    lineItemLabels: {
      venueCost: "Deposit",
      mealCostPerGuest: "Monthly payment",
      seatingCostPerGuest: "Insurance per month",
      cakeCostPerGuest: "Tax per month",
      drinksCostPerGuest: "Fuel or charging per month",
      decorCost: "Dealer fees",
      floristCost: "Registration",
      photographyCost: "Warranty extension",
      musicCost: "Accessories",
      transportCost: "Collection & travel",
      attireCost: "Repairs reserve",
      plannerFee: "Broker fee",
      accommodationCost: "Storage or parking setup",
      stationeryCost: "Paperwork & admin",
    },
  },
  Education: {
    workspaceTitle: "Education Planning",
    workspaceDescription: "Plan tuition, study materials, living costs, and the true total of an education goal.",
    hostLabel: "Student name",
    entityLabel: "School or provider",
    entityLocationLabel: "Campus or city",
    unitLabel: "Study term (months)",
    unitCostLabel: "Cost per month",
    capacityLabel: "Monthly study budget",
    scaleLabel: "Weekly study hours",
    typeOptions: ["Degree", "Course", "Bootcamp"],
    lineItemLabels: {
      venueCost: "Tuition",
      mealCostPerGuest: "Books & materials per month",
      seatingCostPerGuest: "Transport per month",
      cakeCostPerGuest: "Meals per month",
      drinksCostPerGuest: "Equipment per month",
      decorCost: "Application fees",
      floristCost: "Certifications & exams",
      photographyCost: "Software & subscriptions",
      musicCost: "Mentoring & tutoring",
      transportCost: "Travel",
      attireCost: "Living expenses reserve",
      plannerFee: "Advisor fee",
      accommodationCost: "Accommodation",
      stationeryCost: "Admin & stationery",
    },
  },
  "Emergency Fund": {
    workspaceTitle: "Emergency Fund Planning",
    workspaceDescription: "Translate the safety-net goal into monthly essentials, reserve targets, and coverage planning.",
    hostLabel: "Account holder",
    entityLabel: "Reserve account",
    entityLocationLabel: "Bank or provider",
    unitLabel: "Coverage months",
    unitCostLabel: "Cost per month",
    capacityLabel: "Monthly essentials target",
    scaleLabel: "Dependents covered",
    typeOptions: ["Emergency fund", "Family safety net", "Income buffer"],
    lineItemLabels: {
      venueCost: "Rent or mortgage",
      mealCostPerGuest: "Groceries per month",
      seatingCostPerGuest: "Utilities per month",
      cakeCostPerGuest: "Insurance per month",
      drinksCostPerGuest: "Transport per month",
      decorCost: "Healthcare reserve",
      floristCost: "Childcare reserve",
      photographyCost: "Debt payments",
      musicCost: "Communication bills",
      transportCost: "Household repairs",
      attireCost: "Subscriptions & essentials",
      plannerFee: "Advisory support",
      accommodationCost: "Alternative housing reserve",
      stationeryCost: "Admin buffer",
    },
  },
  Birthday: {
    workspaceTitle: "Celebration Planning",
    workspaceDescription: "Model venue, guests, food, styling, and supplier costs for a detailed celebration plan.",
    hostLabel: "Host name",
    entityLabel: "Venue or restaurant",
    entityLocationLabel: "Venue location",
    unitLabel: "Guest count",
    unitCostLabel: "Cost per guest",
    capacityLabel: "Venue capacity",
    scaleLabel: "Venue size (sqm)",
    typeOptions: ["Birthday", "Dinner party", "Private celebration"],
    lineItemLabels: {
      venueCost: "Venue hire",
      mealCostPerGuest: "Food per guest",
      seatingCostPerGuest: "Seating per guest",
      cakeCostPerGuest: "Cake per guest",
      drinksCostPerGuest: "Drinks per guest",
      decorCost: "Decor",
      floristCost: "Floral styling",
      photographyCost: "Photography",
      musicCost: "Music & entertainment",
      transportCost: "Transport",
      attireCost: "Host styling",
      plannerFee: "Planning support",
      accommodationCost: "Guest accommodation",
      stationeryCost: "Invites & admin",
    },
  },
  Other: {
    workspaceTitle: "Custom Goal Planning",
    workspaceDescription: "Use a flexible planning board to model the budget and moving parts behind any custom goal.",
    hostLabel: "Owner or organizer",
    entityLabel: "Main item or venue",
    entityLocationLabel: "Location",
    unitLabel: "Units or participants",
    unitCostLabel: "Cost per unit",
    capacityLabel: "Capacity or budget threshold",
    scaleLabel: "Scale metric",
    typeOptions: ["Custom plan", "Personal project", "Milestone"],
    lineItemLabels: {
      venueCost: "Primary fixed cost",
      mealCostPerGuest: "Unit cost 1",
      seatingCostPerGuest: "Unit cost 2",
      cakeCostPerGuest: "Unit cost 3",
      drinksCostPerGuest: "Unit cost 4",
      decorCost: "Supporting fixed cost 1",
      floristCost: "Supporting fixed cost 2",
      photographyCost: "Supporting fixed cost 3",
      musicCost: "Supporting fixed cost 4",
      transportCost: "Logistics",
      attireCost: "Equipment or supplies",
      plannerFee: "Professional support",
      accommodationCost: "Accommodation or reserve",
      stationeryCost: "Admin & extras",
    },
  },
};

const DEFAULT_PLANNER: EventPlannerState = {
  planningCategory: "Wedding",
  eventName: "Autumn Wedding Weekend",
  eventType: "Wedding",
  eventDate: "",
  hostName: "",
  venueName: "Rosewood Manor",
  venueLocation: "Bath, Somerset",
  venueCapacity: 160,
  venueSizeSqm: 540,
  guestCount: 120,
  budgetTarget: 48000,
  depositPaid: 10000,
  venueCost: 12500,
  mealCostPerGuest: 68,
  seatingCostPerGuest: 14,
  cakeCostPerGuest: 8,
  drinksCostPerGuest: 22,
  decorCost: 3600,
  floristCost: 2400,
  photographyCost: 3200,
  musicCost: 1900,
  transportCost: 850,
  attireCost: 2800,
  plannerFee: 2200,
  accommodationCost: 1800,
  stationeryCost: 600,
  contingencyPercent: 10,
  notes: "Ceremony outdoors if weather allows. Keep vegan and gluten-free meal counts separate in the final supplier brief.",
};

function getStorageKey(session: AuthSession | null) {
  return `${EVENT_STORAGE_PREFIX}-${session?.userId ?? session?.email ?? "guest"}`;
}

function loadStoredPlanner(session: AuthSession | null) {
  if (typeof window === "undefined") {
    return DEFAULT_PLANNER;
  }

  try {
    const raw = localStorage.getItem(getStorageKey(session));
    if (!raw) {
      return DEFAULT_PLANNER;
    }

    const parsed = JSON.parse(raw) as Partial<EventPlannerState>;
    return {
      ...DEFAULT_PLANNER,
      ...parsed,
    } satisfies EventPlannerState;
  } catch {
    return DEFAULT_PLANNER;
  }
}

function persistPlanner(session: AuthSession | null, planner: EventPlannerState) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(getStorageKey(session), JSON.stringify(planner));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCurrency(value: number) {
  if (value === 0) {
    return formatCurrency(0);
  }

  return `${value > 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function normalizePlanningCategory(value: string | null | undefined): GoalPlanningCategory {
  switch (value) {
    case "Home":
    case "Holiday":
    case "Wedding":
    case "Education":
    case "Vehicle":
    case "Emergency Fund":
    case "Birthday":
      return value;
    default:
      return "Other";
  }
}

function getPlannerProfile(category: GoalPlanningCategory) {
  return PLANNER_PROFILES[category] ?? PLANNER_PROFILES.Other;
}

function sanitizeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "event-plan";
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mapGoalKindToEventType(goalKind: string | null) {
  const category = normalizePlanningCategory(goalKind);
  return getPlannerProfile(category).typeOptions[0] ?? "Custom plan";
}

function buildPlannerFromGoalQuery(searchParams: URLSearchParams, fallbackPlanner: EventPlannerState) {
  const goalTitle = searchParams.get("goalTitle");
  const goalTargetAmount = Number(searchParams.get("goalTargetAmount"));
  const goalSavedAmount = Number(searchParams.get("goalSavedAmount"));
  const goalTargetDate = searchParams.get("goalTargetDate");
  const goalNotes = searchParams.get("goalNotes");
  const goalKind = searchParams.get("goalKind");
  const planningCategory = normalizePlanningCategory(goalKind);

  if (!goalTitle) {
    return fallbackPlanner;
  }

  return {
    ...fallbackPlanner,
    planningCategory,
    eventName: goalTitle,
    eventType: mapGoalKindToEventType(goalKind),
    eventDate: goalTargetDate || fallbackPlanner.eventDate,
    budgetTarget: Number.isFinite(goalTargetAmount) ? goalTargetAmount : fallbackPlanner.budgetTarget,
    depositPaid: Number.isFinite(goalSavedAmount) ? goalSavedAmount : fallbackPlanner.depositPaid,
    notes: goalNotes || fallbackPlanner.notes,
  } satisfies EventPlannerState;
}

function buildExcelWorkbook(planner: EventPlannerState, lineItems: CostLineItem[], summary: {
  subtotal: number;
  contingencyAmount: number;
  totalEstimate: number;
  perGuestCost: number;
  remainingBalance: number;
  budgetDifference: number;
  targetCoverageRate: number;
}) {
  const summaryRows = [
    ["Event", planner.eventName],
    ["Type", planner.eventType],
    ["Date", planner.eventDate || "Not set"],
    ["Host", planner.hostName || "Not set"],
    ["Venue", planner.venueName],
    ["Location", planner.venueLocation],
    ["Guests", String(planner.guestCount)],
    ["Venue capacity", String(planner.venueCapacity)],
    ["Budget target", planner.budgetTarget.toFixed(2)],
    ["Deposit paid", planner.depositPaid.toFixed(2)],
    ["Subtotal", summary.subtotal.toFixed(2)],
    ["Contingency", summary.contingencyAmount.toFixed(2)],
    ["Total estimate", summary.totalEstimate.toFixed(2)],
    ["Cost per guest", summary.perGuestCost.toFixed(2)],
    ["Remaining balance", summary.remainingBalance.toFixed(2)],
    ["Budget gap", summary.budgetDifference.toFixed(2)],
    ["Target coverage rate", summary.targetCoverageRate.toFixed(2)],
    ["Planner notes", planner.notes || ""],
  ];

  const summarySheet = summaryRows
    .map(
      ([label, value]) =>
        `<Row><Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(label)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell></Row>`,
    )
    .join("");

  const costSheet = lineItems
    .map(
      (item) =>
        `<Row><Cell><Data ss:Type="String">${escapeXml(item.label)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(item.type)}</Data></Cell><Cell><Data ss:Type="Number">${item.value.toFixed(2)}</Data></Cell></Row>`,
    )
    .join("");

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Summary">
  <Table>
   ${summarySheet}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Costs">
  <Table>
   <Row>
    <Cell ss:StyleID="header"><Data ss:Type="String">Line item</Data></Cell>
    <Cell ss:StyleID="header"><Data ss:Type="String">Type</Data></Cell>
    <Cell ss:StyleID="header"><Data ss:Type="String">Amount</Data></Cell>
   </Row>
   ${costSheet}
  </Table>
 </Worksheet>
</Workbook>`;
}

function triggerDownload(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [currentPlanSlug, setCurrentPlanSlug] = useState("free");
  const [isLoading, setIsLoading] = useState(true);
  const [planner, setPlanner] = useState<EventPlannerState>(DEFAULT_PLANNER);
  const [assets, setAssets] = useState<PlannerAsset[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const assetUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const currentSession = getSession();
    const storedPlanner = loadStoredPlanner(currentSession);
    setSessionState(currentSession);
    setPlanner(buildPlannerFromGoalQuery(new URLSearchParams(searchParams?.toString() ?? ""), storedPlanner));

    const normalizedEmail = currentSession?.email.trim().toLowerCase() ?? "";
    if (currentSession?.isDemo || normalizedEmail === DEMO_EMAIL) {
      setCurrentPlanSlug(DEMO_PLAN_SLUG);
      setIsLoading(false);
      return;
    }

    if (!currentSession?.userId) {
      setCurrentPlanSlug("free");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPlan() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await readApiError(response, "Unable to load account plan."));
        }

        const payload = (await response.json()) as ProfilePayload;
        if (!isMounted) {
          return;
        }

        setCurrentPlanSlug(payload.user?.planSlug ?? "free");
      } catch {
        if (isMounted) {
          setCurrentPlanSlug("free");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPlan();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!session) {
      return;
    }

    persistPlanner(session, planner);
  }, [planner, session]);

  useEffect(() => {
    assetUrlsRef.current = assets.map((asset) => asset.url);
  }, [assets]);

  useEffect(() => {
    return () => {
      assetUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const currentPlan = getSubscriptionPlanBySlug(currentPlanSlug) ?? FREE_PLAN;
  const canUsePrecisionEventPlanning = hasFeatureAccess(currentPlan.slug, "precisionEventPlanning");
  const plannerProfile = getPlannerProfile(planner.planningCategory);

  const lineItems = useMemo<CostLineItem[]>(() => {
    const unitCount = planner.guestCount;
    const labels = plannerProfile.lineItemLabels;
    return [
      { label: labels.venueCost, value: planner.venueCost, type: "fixed" },
      { label: labels.mealCostPerGuest, value: unitCount * planner.mealCostPerGuest, type: "perGuest" },
      { label: labels.seatingCostPerGuest, value: unitCount * planner.seatingCostPerGuest, type: "perGuest" },
      { label: labels.cakeCostPerGuest, value: unitCount * planner.cakeCostPerGuest, type: "perGuest" },
      { label: labels.drinksCostPerGuest, value: unitCount * planner.drinksCostPerGuest, type: "perGuest" },
      { label: labels.decorCost, value: planner.decorCost, type: "fixed" },
      { label: labels.floristCost, value: planner.floristCost, type: "fixed" },
      { label: labels.photographyCost, value: planner.photographyCost, type: "fixed" },
      { label: labels.musicCost, value: planner.musicCost, type: "fixed" },
      { label: labels.transportCost, value: planner.transportCost, type: "fixed" },
      { label: labels.attireCost, value: planner.attireCost, type: "fixed" },
      { label: labels.plannerFee, value: planner.plannerFee, type: "fixed" },
      { label: labels.accommodationCost, value: planner.accommodationCost, type: "fixed" },
      { label: labels.stationeryCost, value: planner.stationeryCost, type: "fixed" },
    ];
  }, [planner, plannerProfile]);

  const subtotal = useMemo(() => lineItems.reduce((sum, item) => sum + item.value, 0), [lineItems]);
  const contingencyAmount = subtotal * (planner.contingencyPercent / 100);
  const totalEstimate = subtotal + contingencyAmount;
  const perGuestCost = planner.guestCount > 0 ? totalEstimate / planner.guestCount : 0;
  const remainingBalance = Math.max(totalEstimate - planner.depositPaid, 0);
  const budgetDifference = planner.budgetTarget - totalEstimate;
  const isOverBudget = budgetDifference < 0;
  const targetCoverageRate = planner.budgetTarget > 0 ? (planner.depositPaid / planner.budgetTarget) * 100 : 0;
  const activeCostLines = lineItems.filter((item) => item.value > 0).length;
  const recommendedBuffer = Math.ceil(Math.max(planner.guestCount, 1) * 0.08);

  function updateTextField(field: PlannerField, value: string) {
    setPlanner((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateNumberField(field: PlannerField, value: string) {
    const numericValue = Number(value);
    setPlanner((current) => ({
      ...current,
      [field]: Number.isFinite(numericValue) ? numericValue : 0,
    }));
  }

  function handleAssetUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const nextAssets = files.slice(0, Math.max(0, 8 - assets.length)).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      url: URL.createObjectURL(file),
    }));

    setAssets((current) => [...current, ...nextAssets]);
    event.target.value = "";
  }

  function removeAsset(assetId: string) {
    setAssets((current) => {
      const assetToRemove = current.find((asset) => asset.id === assetId);
      if (assetToRemove) {
        URL.revokeObjectURL(assetToRemove.url);
      }
      return current.filter((asset) => asset.id !== assetId);
    });
  }

  function exportExcelPlan() {
    const workbook = buildExcelWorkbook(planner, lineItems, {
      subtotal,
      contingencyAmount,
      totalEstimate,
      perGuestCost,
      remainingBalance,
      budgetDifference,
      targetCoverageRate,
    });

    triggerDownload(`${sanitizeFileName(planner.eventName)}-plan.xls`, workbook, "application/vnd.ms-excel");
    setStatusMessage("Excel-ready event workbook exported.");
  }

  function exportJsonSnapshot() {
    triggerDownload(
      `${sanitizeFileName(planner.eventName)}-snapshot.json`,
      JSON.stringify({ planner, lineItems, subtotal, contingencyAmount, totalEstimate, perGuestCost, remainingBalance, budgetDifference }, null, 2),
      "application/json",
    );
    setStatusMessage("Event planning snapshot exported.");
  }

  if (isLoading) {
    return <PageLoading message="Loading event planning workspace..." />;
  }

  if (!canUsePrecisionEventPlanning) {
    return (
      <div className={styles.pageShell}>
        <SubscriptionGate
          currentPlanSlug={currentPlan.slug}
          feature="precisionEventPlanning"
          title="Precision Event Planning"
          description="Pro unlocks a dedicated event planning workspace with detailed guest, venue, supplier, image, and Excel-ready budget modeling."
        />
      </div>
    );
  }

  return (
    <div className={styles.pageShell}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pro Workspace</span>
          <h1 className={styles.title}>{plannerProfile.workspaceTitle}</h1>
          <p className={styles.subtitle}>
            {plannerProfile.workspaceDescription}
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span>{currentPlan.name} active</span>
          <span>{planner.planningCategory} template</span>
          <span>{assets.length} visual reference{assets.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p>Total estimate</p>
          <h2>{formatCurrency(totalEstimate)}</h2>
          <span>{formatCurrency(subtotal)} subtotal + {formatCurrency(contingencyAmount)} contingency</span>
        </article>
        <article className={styles.kpiCard}>
          <p>{plannerProfile.unitCostLabel}</p>
          <h2>{formatCurrency(perGuestCost)}</h2>
          <span>{planner.guestCount} {plannerProfile.unitLabel.toLowerCase()} in the current model</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Budget gap</p>
          <h2 className={isOverBudget ? styles.negativeValue : styles.positiveValue}>{formatSignedCurrency(budgetDifference)}</h2>
          <span>
            {isOverBudget
              ? `${formatCurrency(Math.abs(budgetDifference))} over your ${formatCurrency(planner.budgetTarget)} target`
              : `${formatCurrency(budgetDifference)} left within your ${formatCurrency(planner.budgetTarget)} target`}
          </span>
        </article>
        <article className={styles.kpiCard}>
          <p>Remaining balance</p>
          <h2>{formatCurrency(remainingBalance)}</h2>
          <span>{formatCurrency(planner.depositPaid)} already committed</span>
        </article>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Event blueprint</h2>
              <p>Set the goal template and core plan details before refining cost assumptions.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Goal template</span>
              <select
                value={planner.planningCategory}
                onChange={(event) => {
                  const nextCategory = normalizePlanningCategory(event.target.value);
                  const nextProfile = getPlannerProfile(nextCategory);
                  setPlanner((current) => ({
                    ...current,
                    planningCategory: nextCategory,
                    eventType: nextProfile.typeOptions.includes(current.eventType)
                      ? current.eventType
                      : nextProfile.typeOptions[0] ?? current.eventType,
                  }));
                }}
              >
                {Object.keys(PLANNER_PROFILES).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Plan name</span>
              <input value={planner.eventName} onChange={(event) => updateTextField("eventName", event.target.value)} />
            </label>
            <label>
              <span>Plan type</span>
              <select value={planner.eventType} onChange={(event) => updateTextField("eventType", event.target.value)}>
                {plannerProfile.typeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={planner.eventDate} onChange={(event) => updateTextField("eventDate", event.target.value)} />
            </label>
            <label>
              <span>{plannerProfile.hostLabel}</span>
              <input value={planner.hostName} onChange={(event) => updateTextField("hostName", event.target.value)} placeholder="Who owns this plan?" />
            </label>
            <label>
              <span>{plannerProfile.entityLabel}</span>
              <input value={planner.venueName} onChange={(event) => updateTextField("venueName", event.target.value)} />
            </label>
            <label>
              <span>{plannerProfile.entityLocationLabel}</span>
              <input value={planner.venueLocation} onChange={(event) => updateTextField("venueLocation", event.target.value)} />
            </label>
            <label>
              <span>{plannerProfile.unitLabel}</span>
              <input type="number" min="0" value={planner.guestCount} onChange={(event) => updateNumberField("guestCount", event.target.value)} />
            </label>
            <label>
              <span>{plannerProfile.capacityLabel}</span>
              <input type="number" min="0" value={planner.venueCapacity} onChange={(event) => updateNumberField("venueCapacity", event.target.value)} />
            </label>
            <label>
              <span>{plannerProfile.scaleLabel}</span>
              <input type="number" min="0" value={planner.venueSizeSqm} onChange={(event) => updateNumberField("venueSizeSqm", event.target.value)} />
            </label>
            <label>
              <span>Budget target</span>
              <input type="number" min="0" value={planner.budgetTarget} onChange={(event) => updateNumberField("budgetTarget", event.target.value)} />
            </label>
            <label>
              <span>Deposit already paid</span>
              <input type="number" min="0" value={planner.depositPaid} onChange={(event) => updateNumberField("depositPaid", event.target.value)} />
            </label>
            <label className={styles.fullWidth}>
              <span>Planner notes</span>
              <textarea rows={4} value={planner.notes} onChange={(event) => updateTextField("notes", event.target.value)} />
            </label>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Cost engine</h2>
              <p>Model fixed fees and unit-driven costs in the same plan.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label><span>{plannerProfile.lineItemLabels.venueCost}</span><input type="number" min="0" value={planner.venueCost} onChange={(event) => updateNumberField("venueCost", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.mealCostPerGuest}</span><input type="number" min="0" value={planner.mealCostPerGuest} onChange={(event) => updateNumberField("mealCostPerGuest", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.seatingCostPerGuest}</span><input type="number" min="0" value={planner.seatingCostPerGuest} onChange={(event) => updateNumberField("seatingCostPerGuest", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.cakeCostPerGuest}</span><input type="number" min="0" value={planner.cakeCostPerGuest} onChange={(event) => updateNumberField("cakeCostPerGuest", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.drinksCostPerGuest}</span><input type="number" min="0" value={planner.drinksCostPerGuest} onChange={(event) => updateNumberField("drinksCostPerGuest", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.decorCost}</span><input type="number" min="0" value={planner.decorCost} onChange={(event) => updateNumberField("decorCost", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.floristCost}</span><input type="number" min="0" value={planner.floristCost} onChange={(event) => updateNumberField("floristCost", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.photographyCost}</span><input type="number" min="0" value={planner.photographyCost} onChange={(event) => updateNumberField("photographyCost", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.musicCost}</span><input type="number" min="0" value={planner.musicCost} onChange={(event) => updateNumberField("musicCost", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.transportCost}</span><input type="number" min="0" value={planner.transportCost} onChange={(event) => updateNumberField("transportCost", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.attireCost}</span><input type="number" min="0" value={planner.attireCost} onChange={(event) => updateNumberField("attireCost", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.plannerFee}</span><input type="number" min="0" value={planner.plannerFee} onChange={(event) => updateNumberField("plannerFee", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.accommodationCost}</span><input type="number" min="0" value={planner.accommodationCost} onChange={(event) => updateNumberField("accommodationCost", event.target.value)} /></label>
            <label><span>{plannerProfile.lineItemLabels.stationeryCost}</span><input type="number" min="0" value={planner.stationeryCost} onChange={(event) => updateNumberField("stationeryCost", event.target.value)} /></label>
            <label><span>Contingency %</span><input type="number" min="0" value={planner.contingencyPercent} onChange={(event) => updateNumberField("contingencyPercent", event.target.value)} /></label>
          </div>
        </section>
      </div>

      <div className={styles.secondaryGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Budget intelligence</h2>
              <p>See where the plan stretches, compresses, or needs more room.</p>
            </div>
          </div>

          <div className={styles.insightGrid}>
            <article className={styles.insightCard}>
              <strong>Target coverage</strong>
              <span>{formatPercentage(targetCoverageRate)}</span>
              <p>{formatCurrency(planner.depositPaid)} already saved against a target of {formatCurrency(planner.budgetTarget)}.</p>
            </article>
            <article className={styles.insightCard}>
              <strong>Active cost lines</strong>
              <span>{activeCostLines}</span>
              <p>Budget model sections currently contributing to the total estimate.</p>
            </article>
            <article className={styles.insightCard}>
              <strong>Recommended buffer units</strong>
              <span>{recommendedBuffer}</span>
              <p>An 8% cushion based on the current {plannerProfile.unitLabel.toLowerCase()}.</p>
            </article>
          </div>

          <div className={styles.costList}>
            {lineItems.map((item) => {
              const share = totalEstimate > 0 ? (item.value / totalEstimate) * 100 : 0;
              return (
                <article key={item.label} className={styles.costRow}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.type === "perGuest" ? "Scales with guest count" : "Fixed supplier or venue cost"}</p>
                  </div>
                  <div className={styles.costMeta}>
                    <span>{formatCurrency(item.value)}</span>
                    <small>{formatPercentage(share)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Visual planning board</h2>
              <p>Keep references, screenshots, suppliers, products, or inspiration beside the financial plan.</p>
            </div>
          </div>

          <div className={styles.visualBoardToolbar}>
            <label className={styles.uploadButton}>
              <input type="file" accept="image/*" multiple onChange={handleAssetUpload} />
              Add venue or supplier images
            </label>
            <span className={styles.uploadHint}>Local preview only in this workspace session.</span>
          </div>

          <div className={styles.visualBoardContent}>
            {assets.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No visuals yet</strong>
                <p>Add the venue, food, flowers, cake, or moodboard references you want to keep next to the budget.</p>
              </div>
            ) : (
              <div className={styles.assetGrid}>
                {assets.map((asset) => (
                  <figure key={asset.id} className={styles.assetCard}>
                    <img src={asset.url} alt={asset.name} className={styles.assetImage} />
                    <figcaption>
                      <strong>{asset.name}</strong>
                      <span>{asset.sizeLabel}</span>
                    </figcaption>
                    <button type="button" className={styles.removeButton} onClick={() => removeAsset(asset.id)}>
                      Remove
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Export studio</h2>
            <p>Package the model for Excel or share a JSON planning snapshot.</p>
          </div>
        </div>
        <div className={styles.exportRow}>
          <button type="button" className={styles.primaryButton} onClick={exportExcelPlan}>
            Export Excel-ready workbook
          </button>
          <button type="button" className={styles.secondaryButton} onClick={exportJsonSnapshot}>
            Export JSON snapshot
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setPlanner((current) => ({
              ...DEFAULT_PLANNER,
              planningCategory: current.planningCategory,
              eventType: getPlannerProfile(current.planningCategory).typeOptions[0] ?? DEFAULT_PLANNER.eventType,
            }))}
          >
            Reset sample plan
          </button>
        </div>
        {statusMessage ? <p className={styles.statusMessage}>{statusMessage}</p> : null}
      </section>
    </div>
  );
}
