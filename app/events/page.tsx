"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DateInput from "../../components/DateInput";
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

type WorkspaceView = "overview" | "budget" | "visuals";

type BudgetClusterId = "core" | "people" | "experience" | "logistics" | "buffer";

type BudgetCluster = {
  id: BudgetClusterId;
  title: string;
  description: string;
  accent: string;
  fields: PlannerLineItemKey[];
  total: number;
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
  heroLabel: string;
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
    heroLabel: "Ceremony + reception budget",
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
    heroLabel: "Trip budget and itinerary frame",
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
    heroLabel: "Deposit, fees, and move-in costs",
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
    heroLabel: "Purchase and ownership model",
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
    heroLabel: "Tuition and study-living budget",
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
    heroLabel: "Essentials coverage model",
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
    heroLabel: "Guest-led celebration budget",
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
    heroLabel: "Flexible custom budget model",
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

type PlannerVisualProfile = {
  headline: string;
  summary: string;
  highlights: string[];
  sceneLabel: string;
  sceneAccent: string;
  sceneGradient: string;
};

const PLANNER_VISUALS: Record<GoalPlanningCategory, PlannerVisualProfile> = {
  Wedding: {
    headline: "Build the day around the moments that cost the most.",
    summary: "Balance venue, catering, photography, styling, and guest count before locking suppliers.",
    highlights: ["Venue", "Guests", "Food", "Photos"],
    sceneLabel: "Wedding scene",
    sceneAccent: "#F472B6",
    sceneGradient: "linear-gradient(135deg, #FFF1F7 0%, #F5F3FF 100%)",
  },
  Holiday: {
    headline: "See the trip before you spend on it.",
    summary: "Keep flights, stays, activities, and daily spending in one budget view.",
    highlights: ["Flights", "Stay", "Activities", "Transfers"],
    sceneLabel: "Trip scene",
    sceneAccent: "#06B6D4",
    sceneGradient: "linear-gradient(135deg, #E0F2FE 0%, #ECFEFF 100%)",
  },
  Home: {
    headline: "Model the purchase, not just the deposit.",
    summary: "Account for legal fees, furnishing, buffers, and the first months after the move.",
    highlights: ["Deposit", "Fees", "Furniture", "Buffer"],
    sceneLabel: "Home scene",
    sceneAccent: "#10B981",
    sceneGradient: "linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)",
  },
  Vehicle: {
    headline: "Price the ownership journey, not only the keys.",
    summary: "Plan deposit, financing, insurance, repairs, and running costs together.",
    highlights: ["Deposit", "Finance", "Insurance", "Fuel"],
    sceneLabel: "Vehicle scene",
    sceneAccent: "#F97316",
    sceneGradient: "linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)",
  },
  Education: {
    headline: "Turn tuition into a full study plan.",
    summary: "Budget for tuition, books, software, transport, and living support without losing the long-term view.",
    highlights: ["Tuition", "Books", "Software", "Living"],
    sceneLabel: "Education scene",
    sceneAccent: "#8B5CF6",
    sceneGradient: "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)",
  },
  "Emergency Fund": {
    headline: "Stress-test the months you need to cover.",
    summary: "Model essentials only and see how much reserve you really need to stay safe.",
    highlights: ["Rent", "Food", "Utilities", "Reserve"],
    sceneLabel: "Safety net scene",
    sceneAccent: "#22C55E",
    sceneGradient: "linear-gradient(135deg, #F0FDF4 0%, #ECFCCB 100%)",
  },
  Birthday: {
    headline: "Design the atmosphere and the budget together.",
    summary: "Keep guest count, catering, styling, and entertainment aligned from the start.",
    highlights: ["Venue", "Guests", "Decor", "Music"],
    sceneLabel: "Celebration scene",
    sceneAccent: "#F43F5E",
    sceneGradient: "linear-gradient(135deg, #FFF1F2 0%, #FDF2F8 100%)",
  },
  Other: {
    headline: "Shape any milestone into a clear financial plan.",
    summary: "Use a flexible template to mix recurring costs, fixed fees, and planning notes in one place.",
    highlights: ["Scope", "Costs", "Notes", "Buffer"],
    sceneLabel: "Custom plan scene",
    sceneAccent: "#6366F1",
    sceneGradient: "linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 100%)",
  },
};

const SCALED_COST_FIELDS: PlannerLineItemKey[] = [
  "mealCostPerGuest",
  "seatingCostPerGuest",
  "cakeCostPerGuest",
  "drinksCostPerGuest",
];

const FIXED_COST_FIELDS: PlannerLineItemKey[] = [
  "venueCost",
  "decorCost",
  "floristCost",
  "photographyCost",
  "musicCost",
  "transportCost",
  "attireCost",
  "plannerFee",
  "accommodationCost",
  "stationeryCost",
];

const WORKSPACE_VIEWS: Array<{ id: WorkspaceView; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Story, milestones, and quick plan setup" },
  { id: "budget", label: "Budget", description: "Interactive cost clusters and live totals" },
  { id: "visuals", label: "Visuals", description: "Moodboard, references, and inspiration" },
];

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

function getPlannerVisualProfile(category: GoalPlanningCategory) {
  return PLANNER_VISUALS[category] ?? PLANNER_VISUALS.Other;
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

function formatCompactDate(value: string) {
  if (!value) {
    return "No date set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getFieldDisplayValue(planner: EventPlannerState, field: PlannerLineItemKey) {
  if (SCALED_COST_FIELDS.includes(field)) {
    return planner.guestCount * planner[field];
  }

  return planner[field];
}

function createBudgetClusters(planner: EventPlannerState, profile: PlannerProfile): BudgetCluster[] {
  const clusters: Array<Omit<BudgetCluster, "total">> = [
    {
      id: "core",
      title: "Core booking",
      description: "The biggest locked-in commitments at the centre of the plan.",
      accent: "#8B5CF6",
      fields: ["venueCost", "accommodationCost", "plannerFee"],
    },
    {
      id: "people",
      title: "People costs",
      description: `Costs that scale with your ${profile.unitLabel.toLowerCase()}.`,
      accent: "#0EA5E9",
      fields: ["mealCostPerGuest", "seatingCostPerGuest", "cakeCostPerGuest", "drinksCostPerGuest"],
    },
    {
      id: "experience",
      title: "Experience and styling",
      description: "Everything shaping the look, feel, and finish of the plan.",
      accent: "#F43F5E",
      fields: ["decorCost", "floristCost", "photographyCost", "musicCost", "attireCost"],
    },
    {
      id: "logistics",
      title: "Logistics and extras",
      description: "Transport, admin, and practical costs that keep the plan moving.",
      accent: "#10B981",
      fields: ["transportCost", "stationeryCost"],
    },
    {
      id: "buffer",
      title: "Safety buffer",
      description: "Reserve space for uncertainty before you commit to the final total.",
      accent: "#F97316",
      fields: [],
    },
  ];

  return clusters.map((cluster) => ({
    ...cluster,
    total: cluster.id === "buffer"
      ? linearlyRound((planner.contingencyPercent / 100) * ([...FIXED_COST_FIELDS, ...SCALED_COST_FIELDS].reduce((sum, field) => sum + getFieldDisplayValue(planner, field), 0)))
      : cluster.fields.reduce((sum, field) => sum + getFieldDisplayValue(planner, field), 0),
  }));
}

function linearlyRound(value: number) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

type PlannerSelectOption = {
  value: string;
  label: string;
  description?: string;
};

function PlannerSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: PlannerSelectOption[];
  onChange: (nextValue: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className={styles.selectField} ref={rootRef}>
      <span className={styles.fieldLabel}>{label}</span>
      <button
        type="button"
        className={styles.selectButton}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className={styles.selectButtonText}>
          <strong>{selected?.label ?? value}</strong>
          {selected?.description ? <small>{selected.description}</small> : null}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 6L8 10.5L12.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen ? (
        <div className={styles.selectMenu} role="listbox" aria-label={label}>
          {options.map((option) => {
            const selectedOption = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.selectOption} ${selectedOption ? styles.selectOptionActive : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <strong>{option.label}</strong>
                {option.description ? <span>{option.description}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [currentPlanSlug, setCurrentPlanSlug] = useState("free");
  const [isLoading, setIsLoading] = useState(true);
  const [planner, setPlanner] = useState<EventPlannerState>(DEFAULT_PLANNER);
  const [assets, setAssets] = useState<PlannerAsset[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [activeClusterId, setActiveClusterId] = useState<BudgetClusterId>("core");
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
  const visualProfile = getPlannerVisualProfile(planner.planningCategory);

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
  const planningCategoryOptions = Object.keys(PLANNER_PROFILES).map((category) => ({
    value: category,
    label: category,
    description: getPlannerProfile(category as GoalPlanningCategory).heroLabel,
  }));
  const planTypeOptions = plannerProfile.typeOptions.map((option) => ({
    value: option,
    label: option,
    description: `${planner.planningCategory} format`,
  }));
  const budgetClusters = useMemo(() => createBudgetClusters(planner, plannerProfile), [planner, plannerProfile]);
  const activeCluster = budgetClusters.find((cluster) => cluster.id === activeClusterId) ?? budgetClusters[0];
  const topCostDrivers = [...lineItems].sort((left, right) => right.value - left.value).slice(0, 4);
  const milestoneCards = [
    {
      title: "Scope locked",
      detail: `${plannerProfile.unitLabel}: ${planner.guestCount}`,
      tone: "neutral",
    },
    {
      title: "Target date",
      detail: formatCompactDate(planner.eventDate),
      tone: "neutral",
    },
    {
      title: isOverBudget ? "Over target" : "Within target",
      detail: formatSignedCurrency(budgetDifference),
      tone: isOverBudget ? "warning" : "positive",
    },
    {
      title: "Saved so far",
      detail: formatCurrency(planner.depositPaid),
      tone: "positive",
    },
  ];

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
    setStatusMessage("Planning workbook exported.");
  }

  function exportJsonSnapshot() {
    triggerDownload(
      `${sanitizeFileName(planner.eventName)}-snapshot.json`,
      JSON.stringify({ planner, lineItems, subtotal, contingencyAmount, totalEstimate, perGuestCost, remainingBalance, budgetDifference }, null, 2),
      "application/json",
    );
    setStatusMessage("Planning snapshot exported.");
  }

  if (isLoading) {
    return <PageLoading message="Loading planning workspace..." />;
  }

  if (!canUsePrecisionEventPlanning) {
    return (
      <div className={styles.pageShell}>
        <SubscriptionGate
          currentPlanSlug={currentPlan.slug}
          feature="precisionEventPlanning"
          title="Precision Planning Workspace"
          description="Pro unlocks a dedicated goal-planning workspace with detailed templates, cost modeling, visual references, and Excel-ready exports."
        />
        <div className={styles.gateBackRow}>
          <Link href="/goals" className={styles.secondaryButton}>Back to goals</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageShell}>
      <section className={styles.hero}>
        <div className={styles.heroTopRow}>
          <div>
            <span className={styles.eyebrow}>Pro Planning Workspace</span>
            <h1 className={styles.title}>{plannerProfile.workspaceTitle}</h1>
            <p className={styles.subtitle}>
              {plannerProfile.workspaceDescription}
            </p>
          </div>
          <Link href="/goals" className={styles.secondaryButton}>Back to goals</Link>
        </div>
        <div className={styles.heroShowcase}>
          <div className={styles.heroStory}>
            <p className={styles.heroLead}>{visualProfile.headline}</p>
            <div className={styles.heroMeta}>
              <span>{currentPlan.name} active</span>
              <span>{planner.planningCategory} template</span>
              <span>{formatCompactDate(planner.eventDate)}</span>
            </div>
            <div className={styles.highlightList}>
              {visualProfile.highlights.map((item) => (
                <span key={item} className={styles.highlightPill}>{item}</span>
              ))}
            </div>
          </div>
          <div className={styles.visualSceneCard} style={{ background: visualProfile.sceneGradient } as React.CSSProperties}>
            <div className={styles.visualSceneTop}>
              <span className={styles.visualSceneLabel}>{visualProfile.sceneLabel}</span>
              <span className={styles.visualSceneAccent} style={{ backgroundColor: visualProfile.sceneAccent }} />
            </div>
            <div className={styles.visualSceneCanvas}>
              <div className={styles.sceneOrb} style={{ backgroundColor: visualProfile.sceneAccent }} />
              <div className={styles.sceneCardLarge} />
              <div className={styles.sceneCardSmall} />
              <div className={styles.sceneRail}>
                {visualProfile.highlights.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            <p className={styles.visualSceneSummary}>{visualProfile.summary}</p>
          </div>
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

      <section className={styles.workspaceNav}>
        {WORKSPACE_VIEWS.map((view) => {
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              className={`${styles.workspaceTab} ${isActive ? styles.workspaceTabActive : ""}`}
              onClick={() => setActiveView(view.id)}
            >
              <strong>{view.label}</strong>
              <span>{view.description}</span>
            </button>
          );
        })}
      </section>

      {activeView === "overview" ? (
        <div className={styles.workspaceGrid}>
          <div className={styles.primaryColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Plan storyboard</h2>
                  <p>Start with the story of the plan before going into line-by-line edits.</p>
                </div>
              </div>

              <div className={styles.milestoneGrid}>
                {milestoneCards.map((card) => (
                  <article key={card.title} className={`${styles.milestoneCard} ${card.tone === "warning" ? styles.milestoneWarning : card.tone === "positive" ? styles.milestonePositive : ""}`}>
                    <span>{card.title}</span>
                    <strong>{card.detail}</strong>
                  </article>
                ))}
              </div>

              <div className={styles.overviewSetupRow}>
                <PlannerSelect
                  label="Goal template"
                  value={planner.planningCategory}
                  options={planningCategoryOptions}
                  onChange={(nextValue) => {
                    const nextCategory = normalizePlanningCategory(nextValue);
                    const nextProfile = getPlannerProfile(nextCategory);
                    setPlanner((current) => ({
                      ...current,
                      planningCategory: nextCategory,
                      eventType: nextProfile.typeOptions.includes(current.eventType)
                        ? current.eventType
                        : nextProfile.typeOptions[0] ?? current.eventType,
                    }));
                  }}
                />
                <PlannerSelect
                  label="Plan type"
                  value={planner.eventType}
                  options={planTypeOptions}
                  onChange={(nextValue) => updateTextField("eventType", nextValue)}
                />
                <label className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>Date</span>
                  <DateInput value={planner.eventDate} onChange={(nextValue) => updateTextField("eventDate", nextValue)} />
                </label>
              </div>

              <div className={styles.storyboardCard}>
                <div>
                  <strong>{planner.eventName}</strong>
                  <p>{planner.notes || "Add planner notes to define the mood, constraints, and decision-making rules."}</p>
                </div>
                <div className={styles.storyboardMeta}>
                  <span>{planner.venueName || plannerProfile.entityLabel}</span>
                  <span>{planner.venueLocation || plannerProfile.entityLocationLabel}</span>
                  <span>{planner.hostName || plannerProfile.hostLabel}</span>
                </div>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Top cost drivers</h2>
                  <p>The biggest items in the current plan, ranked by impact.</p>
                </div>
                <button type="button" className={styles.secondaryButton} onClick={() => setActiveView("budget")}>Open budget workbench</button>
              </div>
              <div className={styles.driverList}>
                {topCostDrivers.map((item) => {
                  const share = totalEstimate > 0 ? (item.value / totalEstimate) * 100 : 0;
                  return (
                    <button key={item.label} type="button" className={styles.driverCard} onClick={() => setActiveView("budget")}> 
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.type === "perGuest" ? "Scales with scope" : "Fixed commitment"}</p>
                      </div>
                      <div className={styles.driverMeta}>
                        <span>{formatCurrency(item.value)}</span>
                        <small>{formatPercentage(share)}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className={styles.secondaryColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Quick plan setup</h2>
                  <p>Only the essentials here. Full editing lives in the dedicated budget view.</p>
                </div>
              </div>

              <div className={styles.setupGrid}>
                <label className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>Plan name</span>
                  <input value={planner.eventName} onChange={(event) => updateTextField("eventName", event.target.value)} />
                </label>
                <label className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>{plannerProfile.hostLabel}</span>
                  <input value={planner.hostName} onChange={(event) => updateTextField("hostName", event.target.value)} placeholder="Who owns this plan?" />
                </label>
                <label className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>{plannerProfile.entityLabel}</span>
                  <input value={planner.venueName} onChange={(event) => updateTextField("venueName", event.target.value)} />
                </label>
                <label className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>{plannerProfile.entityLocationLabel}</span>
                  <input value={planner.venueLocation} onChange={(event) => updateTextField("venueLocation", event.target.value)} />
                </label>
                <label className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>{plannerProfile.unitLabel}</span>
                  <input type="number" min="0" value={planner.guestCount} onChange={(event) => updateNumberField("guestCount", event.target.value)} />
                </label>
                <label className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>Budget target</span>
                  <input type="number" min="0" value={planner.budgetTarget} onChange={(event) => updateNumberField("budgetTarget", event.target.value)} />
                </label>
                <label className={`${styles.fieldBlock} ${styles.fullSpan}`}>
                  <span className={styles.fieldLabel}>Planner notes</span>
                  <textarea rows={4} value={planner.notes} onChange={(event) => updateTextField("notes", event.target.value)} />
                </label>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Visual highlights</h2>
                  <p>Each plan type keeps a few anchor areas front and center.</p>
                </div>
                <button type="button" className={styles.secondaryButton} onClick={() => setActiveView("visuals")}>Open visuals</button>
              </div>
              <div className={styles.referenceStrip}>
                {visualProfile.highlights.map((item) => (
                  <article key={item} className={styles.referenceCard}>
                    <strong>{item}</strong>
                    <p>{planner.planningCategory} focus area</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeView === "budget" ? (
        <div className={styles.budgetWorkspace}>
          <section className={styles.clusterRail}>
            {budgetClusters.map((cluster) => {
              const isActive = cluster.id === activeCluster.id;
              return (
                <button
                  key={cluster.id}
                  type="button"
                  className={`${styles.clusterCard} ${isActive ? styles.clusterCardActive : ""}`}
                  onClick={() => setActiveClusterId(cluster.id)}
                >
                  <span className={styles.clusterAccent} style={{ backgroundColor: cluster.accent }} />
                  <div>
                    <strong>{cluster.title}</strong>
                    <p>{cluster.description}</p>
                  </div>
                  <span className={styles.clusterTotal}>{formatCurrency(cluster.total)}</span>
                </button>
              );
            })}
          </section>

          <section className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>{activeCluster.title}</h2>
                <p>{activeCluster.description}</p>
              </div>
              <span className={styles.clusterBadge}>{formatCurrency(activeCluster.total)}</span>
            </div>

            {activeCluster.id === "buffer" ? (
              <div className={styles.costCardGrid}>
                <label className={styles.costCard}>
                  <span className={styles.costCardTitle}>Contingency %</span>
                  <small>Extra space for uncertainty</small>
                  <input type="number" min="0" value={planner.contingencyPercent} onChange={(event) => updateNumberField("contingencyPercent", event.target.value)} />
                </label>
                <article className={styles.costCard}>
                  <span className={styles.costCardTitle}>Calculated buffer</span>
                  <small>Applied on top of the subtotal</small>
                  <strong className={styles.metricLarge}>{formatCurrency(contingencyAmount)}</strong>
                </article>
              </div>
            ) : (
              <div className={styles.costCardGrid}>
                {activeCluster.fields.map((field) => (
                  <label key={field} className={styles.costCard}>
                    <span className={styles.costCardTitle}>{plannerProfile.lineItemLabels[field]}</span>
                    <small>{SCALED_COST_FIELDS.includes(field) ? `Live total: ${formatCurrency(getFieldDisplayValue(planner, field))}` : "Fixed total in the plan"}</small>
                    <input type="number" min="0" value={planner[field]} onChange={(event) => updateNumberField(field, event.target.value)} />
                  </label>
                ))}
              </div>
            )}
          </section>

          <aside className={styles.summaryRail}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Live totals</h2>
                  <p>The planner recalculates instantly while you edit one cluster at a time.</p>
                </div>
              </div>

              <div className={styles.summaryStack}>
                <article className={styles.summaryMetric}>
                  <span>Total estimate</span>
                  <strong>{formatCurrency(totalEstimate)}</strong>
                </article>
                <article className={styles.summaryMetric}>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </article>
                <article className={styles.summaryMetric}>
                  <span>Budget gap</span>
                  <strong className={isOverBudget ? styles.negativeValue : styles.positiveValue}>{formatSignedCurrency(budgetDifference)}</strong>
                </article>
                <article className={styles.summaryMetric}>
                  <span>Remaining balance</span>
                  <strong>{formatCurrency(remainingBalance)}</strong>
                </article>
              </div>

              <div className={styles.calculationCallout}>
                <strong>How the maths works</strong>
                <p>Subtotal = fixed costs + scaled costs. Total estimate = subtotal + contingency. Budget gap = target budget - total estimate. Remaining balance = total estimate - already saved.</p>
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      {activeView === "visuals" ? (
        <div className={styles.visualWorkspace}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Visual board</h2>
                <p>Build a live reference wall for the plan instead of keeping all inspiration outside Lunivo.</p>
              </div>
              <label className={styles.uploadButton}>
                <input type="file" accept="image/*" multiple onChange={handleAssetUpload} />
                Add visuals
              </label>
            </div>

            <div className={styles.referenceStrip}>
              {visualProfile.highlights.map((item) => (
                <article key={item} className={styles.referenceCard}>
                  <strong>{item}</strong>
                  <p>{planner.planningCategory} focus area</p>
                </article>
              ))}
            </div>

            <div className={styles.visualMoodboard}>
              <div className={styles.moodboardPrompt} style={{ background: visualProfile.sceneGradient } as React.CSSProperties}>
                <strong>{visualProfile.headline}</strong>
                <p>{visualProfile.summary}</p>
              </div>
              {assets.length === 0 ? (
                <div className={styles.emptyState}>
                  <strong>No visuals yet</strong>
                  <p>Add venue, supplier, styling, destination, property, or inspiration references and keep them beside the model.</p>
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
      ) : null}

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
