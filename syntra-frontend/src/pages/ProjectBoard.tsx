import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import taskService from "../services/taskService";
import projectService from "../services/projectService";
import TaskDetailsModal from "../components/TaskDetailsModal";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Calendar,
  X,
  Filter,
  RotateCcw,
} from "lucide-react";

import type { Task, SyntraTaskStatus, SyntraTaskPriority } from "../types";

interface Project {
  id: string;
  name: string;
  description?: string;
  team_id: string;
  team_name?: string;
}

interface Member {
  id: string;
  user_id: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

const statusColumns: {
  id: SyntraTaskStatus;
  title: string;
  color: string;
}[] = [
  { id: "todo", title: "To Do", color: "bg-gray-100 dark:bg-gray-700" },
  {
    id: "in_progress",
    title: "In Progress",
    color: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: "review",
    title: "Review",
    color: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  { id: "done", title: "Done", color: "bg-green-100 dark:bg-green-900/30" },
];

const priorityColors: Record<SyntraTaskPriority, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const priorityOptions: { id: SyntraTaskPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
];

const statusOptions: { id: SyntraTaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

// Sortable Task Card Component
interface SortableTaskCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = ({
  task,
  onTaskClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-2 active:bg-gray-50 dark:active:bg-gray-700 transition-colors cursor-grab active:cursor-grabbing touch-manipulation border border-gray-100 dark:border-gray-700"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm flex-1">
          {task.title}
        </h4>
        <button
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {task.description && (
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}
          >
            {task.priority}
          </span>
        </div>

        {task.due_date && (
          <div
            className={`flex items-center text-xs ${isOverdue ? "text-red-500" : "text-gray-400 dark:text-gray-500"}`}
          >
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(task.due_date).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

interface ColumnProps {
  column: (typeof statusColumns)[0];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const Column: React.FC<ColumnProps> = ({ column, tasks, onTaskClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="w-80 flex-shrink-0">
      <div className={`${column.color} rounded-t-lg p-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {column.title}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`
          ${column.color}
          bg-opacity-30
          rounded-b-lg
          p-2
          min-h-[500px]
          transition-all
          ${isOver ? "ring-2 ring-blue-500" : ""}
        `}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Drop tasks here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectBoard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priority: "",
    status: "",
    assignee_id: "",
    search: "",
  });

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as SyntraTaskPriority,
  });

  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadTasks();
      loadTeamMembers();
    }
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [allTasks, filters]);

  const loadProject = async () => {
    try {
      const data = await projectService.getProject(projectId!);
      setProject(data);
    } catch (error) {
      console.error("Failed to load project:", error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const projectData = await projectService.getProject(projectId!);
      if (projectData && projectData.team_id) {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/teams/${projectData.team_id}/members`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const data = await response.json();
        setMembers(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load team members:", error);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await taskService.getTasks(projectId!);
      setAllTasks(data);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allTasks];

    if (filters.priority) {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    if (filters.status) {
      filtered = filtered.filter((task) => task.status === filters.status);
    }

    if (filters.assignee_id) {
      filtered = filtered.filter(
        (task) => task.assignee_id === filters.assignee_id,
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower),
      );
    }

    setFilteredTasks(filtered);
  };

  const clearFilters = () => {
    setFilters({
      priority: "",
      status: "",
      assignee_id: "",
      search: "",
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setCreating(true);

    try {
      const task = await taskService.createTask({
        title: newTask.title,
        description: newTask.description,
        project_id: projectId!,
        priority: newTask.priority,
      });

      setAllTasks((prev) => [task, ...prev]);
      setShowCreateModal(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
      });
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setCreating(false);
    }
  };

  const getTasksByStatus = (status: SyntraTaskStatus) => {
    return filteredTasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = filteredTasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const draggedTask = filteredTasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    let targetStatus: SyntraTaskStatus;

    if (statusColumns.some((column) => column.id === over.id)) {
      targetStatus = over.id as SyntraTaskStatus;
    } else {
      const targetTask = filteredTasks.find((t) => t.id === over.id);
      if (!targetTask) return;
      targetStatus = targetTask.status;
    }

    if (draggedTask.status === targetStatus) return;

    setAllTasks((prev) =>
      prev.map((task) =>
        task.id === draggedTask.id ? { ...task, status: targetStatus } : task,
      ),
    );

    try {
      await taskService.updateTaskStatus(
        draggedTask.id,
        targetStatus,
        getTasksByStatus(targetStatus).length,
      );
    } catch (error) {
      console.error("Failed to update task status:", error);
      loadTasks();
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  if (loading && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-16 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/team/${project?.team_id || ""}`)}
              className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {project?.name}
              </h1>
              {project?.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition ${
                activeFilterCount > 0
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white text-blue-600 text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filters
              </h3>
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear all</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Priority Filter */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) =>
                    setFilters({ ...filters, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Priorities</option>
                  {priorityOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee Filter */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Assignee
                </label>
                <select
                  value={filters.assignee_id}
                  onChange={(e) =>
                    setFilters({ ...filters, assignee_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Members</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user?.name || "Unknown"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Filter */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  placeholder="Search tasks..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Board */}
      <div className="p-4 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-4 min-w-max">
            {statusColumns.map((column) => (
              <Column
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTask ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 w-80 opacity-90 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {activeTask.title}
                  </h4>
                </div>
                {activeTask.description && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-2 line-clamp-2">
                    {activeTask.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[activeTask.priority]}`}
                  >
                    {activeTask.priority}
                  </span>
                  {activeTask.due_date && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(activeTask.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Task
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-5 pb-8">
              <form onSubmit={handleCreateTask}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Design homepage"
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="Add details..."
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {priorityOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setNewTask({ ...newTask, priority: p.id })
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                          newTask.priority === p.id
                            ? priorityColors[p.id] + " ring-2 ring-blue-500"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newTask.title.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
                  >
                    {creating ? "Creating..." : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetailsModal
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={loadTasks}
        />
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProjectBoard;
