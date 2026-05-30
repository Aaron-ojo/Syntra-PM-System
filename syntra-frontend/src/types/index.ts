export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  // Make these optional in case backend returns different names
  full_name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  user?: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  team_id: string;
  team_name?: string;
  created_by: string;
  created_by_name?: string;
  status: "active" | "archived" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  start_date?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
}
// Task Status Types - renamed to be more unique
export type SyntraTaskStatus = "todo" | "in_progress" | "review" | "done";

export type SyntraTaskPriority = "low" | "medium" | "high" | "urgent";

// Task Interface
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: SyntraTaskStatus;
  priority: SyntraTaskPriority;
  project_id: string;
  assignee_id?: string;
  created_by: string;
  due_date?: string;
  position: number;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
}

// Comment Interface
// Comment Interface
export interface Comment {
  id: string;
  content: string;
  task_id: string;
  user_id: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
  attachments?: string[];
  user_name?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}
// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: "task_assigned" | "comment_added" | "comment_reply" | "status_changed";
  title: string;
  content: string;
  read: boolean;
  data?: {
    task_id?: string;
    comment_id?: string;
  };
  created_at: string;
}
