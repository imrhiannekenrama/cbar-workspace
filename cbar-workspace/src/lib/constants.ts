// ============================================================
// CBAR Workspace — application constants
// ============================================================

import type { SectionStatus, TaskPriority, TaskStatus } from "./types";

export const APP_NAME = "CBAR Workspace";

export interface ResearchSectionDef {
  slug: string;
  title: string;
  group: string;
}

export const SECTION_GROUPS = [
  "Preliminaries",
  "Chapter 1",
  "Chapter 2",
  "Chapter 3",
  "Chapter 4",
  "Back Matter",
] as const;

export const RESEARCH_SECTIONS: ResearchSectionDef[] = [
  { slug: "title-page", title: "Title Page", group: "Preliminaries" },
  { slug: "approval-sheet", title: "Approval Sheet", group: "Preliminaries" },
  { slug: "acknowledgement", title: "Acknowledgement", group: "Preliminaries" },
  { slug: "abstract", title: "Abstract", group: "Preliminaries" },
  { slug: "introduction", title: "Introduction", group: "Chapter 1" },
  { slug: "background-of-the-study", title: "Background of the Study", group: "Chapter 1" },
  { slug: "statement-of-the-problem", title: "Statement of the Problem", group: "Chapter 1" },
  { slug: "proposed-intervention", title: "Proposed Intervention", group: "Chapter 1" },
  { slug: "theoretical-framework", title: "Theoretical Framework", group: "Chapter 1" },
  { slug: "methodology", title: "Methodology", group: "Chapter 2" },
  { slug: "research-design", title: "Research Design", group: "Chapter 2" },
  { slug: "research-locale", title: "Research Locale", group: "Chapter 2" },
  { slug: "participants", title: "Participants", group: "Chapter 2" },
  { slug: "research-instrument", title: "Research Instrument", group: "Chapter 2" },
  { slug: "data-gathering", title: "Data Gathering", group: "Chapter 2" },
  { slug: "data-analysis", title: "Data Analysis", group: "Chapter 2" },
  { slug: "ethical-considerations", title: "Ethical Considerations", group: "Chapter 2" },
  { slug: "trustworthiness", title: "Trustworthiness", group: "Chapter 2" },
  { slug: "reflexivity", title: "Reflexivity", group: "Chapter 2" },
  { slug: "presentation-of-results", title: "Presentation of Results", group: "Chapter 3" },
  { slug: "conclusions", title: "Conclusions", group: "Chapter 4" },
  { slug: "recommendations", title: "Recommendations", group: "Chapter 4" },
  { slug: "references", title: "References", group: "Back Matter" },
  { slug: "appendices", title: "Appendices", group: "Back Matter" },
  { slug: "curriculum-vitae", title: "Curriculum Vitae", group: "Back Matter" },
];

export const TASK_STATUSES: TaskStatus[] = [
  "To Do",
  "In Progress",
  "For Review",
  "Completed",
];

export const TASK_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];

export const SECTION_STATUSES: SectionStatus[] = [
  "Not Started",
  "Draft",
  "In Review",
  "Completed",
];

export const STATUS_PROGRESS: Record<SectionStatus, number> = {
  "Not Started": 0,
  Draft: 50,
  "In Review": 75,
  Completed: 100,
};

export const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  Urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export const TASK_STATUS_STYLES: Record<string, string> = {
  "To Do": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "For Review": "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

// ------------------------------------------------------------
// Organizational chart (Team page)
// ------------------------------------------------------------
export interface CommitteeRoster {
  name: string;
  description: string;
  responsibilities: string[];
  members: string[];
}

export const LEADER = {
  name: "Rhianne Ken S. Rama",
  roles: ["Group Leader", "Proponent", "On-site Implementer"],
};

export const COMMITTEE_ROSTER: CommitteeRoster[] = [
  {
    name: "Technical Committee",
    description: "Handles everything technical for the intervention.",
    responsibilities: [
      "QuizSync Guide",
      "PowerPoint",
      "Network Setup",
      "Technical Support",
      "Troubleshooting",
    ],
    members: ["Mariel Caidic", "Prince Mercadal", "Arvie Bretaña"],
  },
  {
    name: "Data and Documentation",
    description: "Handles data encoding, statistics and the research draft.",
    responsibilities: [
      "Encoding",
      "Master Spreadsheet",
      "Formatting",
      "Statistics",
      "Research Draft",
    ],
    members: ["Alaiza Jane Paraiso", "Daino Peleño", "Kelts Abanes"],
  },
  {
    name: "Coordination Committee",
    description: "Handles communication, documents and scheduling.",
    responsibilities: [
      "Letters",
      "Consent Forms",
      "Attendance",
      "Minutes",
      "Scheduling",
      "Communication",
    ],
    members: [
      "Cherry Ann Catalogo (Committee Head)",
      "Geline Bathan",
      "Shayne Campo",
    ],
  },
];
