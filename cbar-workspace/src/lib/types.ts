// ============================================================
// CBAR Workspace — shared database types
// ============================================================

export type UserRole = "Administrator" | "Researcher";
export type UserStatus = "Active" | "Inactive";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";
export type TaskStatus = "To Do" | "In Progress" | "For Review" | "Completed";
export type SectionStatus = "Not Started" | "Draft" | "In Review" | "Completed";
export type EventType = "Deadline" | "Meeting" | "Consultation";
export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

export interface Committee {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  committee_id: string | null;
  student_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  committee?: Committee | null;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchSection {
  id: string;
  slug: string;
  title: string;
  group_name: string;
  order_index: number;
  content_html: string;
  status: SectionStatus;
  progress: number;
  updated_by: string | null;
  updated_at: string;
  updated_by_profile?: { full_name: string } | null;
}

export interface SectionVersion {
  id: string;
  section_id: string;
  content_html: string;
  label: string | null;
  created_by: string | null;
  created_at: string;
  created_by_profile?: { full_name: string } | null;
}

export interface Comment {
  id: string;
  section_id: string | null;
  parent_id: string | null;
  author_id: string;
  body: string;
  mentions: string[];
  resolved: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
}

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface TaskAttachment {
  name: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  committee_id: string | null;
  created_by: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  checklist: ChecklistItem[];
  attachments: TaskAttachment[];
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  committee?: Committee | null;
}

export interface Meeting {
  id: string;
  title: string;
  agenda: string | null;
  scheduled_at: string;
  location: string | null;
  minutes_html: string | null;
  created_by: string | null;
  created_at: string;
  attendance?: MeetingAttendance[];
}

export interface MeetingAttendance {
  id: string;
  meeting_id: string;
  profile_id: string;
  status: AttendanceStatus;
  profile?: Profile | null;
}

export interface FolderItem {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface FileRecord {
  id: string;
  folder_id: string | null;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
  version: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  folder?: FolderItem | null;
  uploader?: Profile | null;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version: number;
  storage_path: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
  uploader?: Profile | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user?: Profile | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  event_date: string;
  event_time: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  author_id: string | null;
  title: string;
  body: string;
  created_at: string;
  author?: Profile | null;
}

export interface Message {
  id: string;
  author_id: string;
  channel: string;
  body: string;
  created_at: string;
  author?: Profile | null;
}

export interface ChannelRead {
  channel: string;
  profile_id: string;
  last_read_at: string;
}
