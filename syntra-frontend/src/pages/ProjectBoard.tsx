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

import { ArrowLeft, Plus, MoreVertical, Calendar, X } from "lucide-react";

import type { Task, SyntraTaskStatus, SyntraTaskPriority } from "../types";

interface Project {
  id: string;
  name: string;
  description?: string;
  team_id: string;
  team_name?: string;
}

const statusColumns: {
  id: SyntraTaskStatus;
  title: string;
  color: string;
}[] = [
  { id: "todo", title: "To Do", color: "bg-gray-100" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-100" },
  { id: "review", title: "Review", color: "bg-yellow-100" },
  { id: "done", title: "Done", color: "bg-green-100" },
];

const priorityColors: Record<SyntraTaskPriority, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task)}
      className="bg-white rounded-lg shadow-sm p-3 mb-2 active:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing touch-manipulation"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm flex-1">
          {task.title}
        </h4>

        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {task.description && (
        <p className="text-gray-500 text-xs mb-2 line-clamp-2">
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
          <div className="flex items-center text-xs text-gray-400">
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
          <h3 className="font-semibold text-gray-900">{column.title}</h3>

          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
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
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-xs text-gray-400">Drop tasks here</p>
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const data = await projectService.getProject(projectId!);
      setProject(data);
    } catch (error) {
      console.error("Failed to load project:", error);
    }
  };

  const loadTasks = async () => {
    setLoading(true);

    try {
      const data = await taskService.getTasks(projectId!);
      setTasks(data);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
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

      setTasks((prev) => [task, ...prev]);

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
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);

    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);

    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);

    if (!draggedTask) return;

    let targetStatus: SyntraTaskStatus;

    // Dropped on column
    if (statusColumns.some((column) => column.id === over.id)) {
      targetStatus = over.id as SyntraTaskStatus;
    } else {
      // Dropped on another task
      const targetTask = tasks.find((t) => t.id === over.id);

      if (!targetTask) return;

      targetStatus = targetTask.status;
    }

    if (draggedTask.status === targetStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === draggedTask.id
          ? {
              ...task,
              status: targetStatus,
            }
          : task,
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

  if (loading && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>

          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/team/${project?.team_id || ""}`)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg active:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">
              {project?.name}
            </h1>

            {project?.description && (
              <p className="text-sm text-gray-500 mt-0.5">
                {project.description}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm active:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
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
              <div className="bg-white rounded-lg shadow-lg p-3 w-80 opacity-90">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">
                    {activeTask.title}
                  </h4>
                </div>

                {activeTask.description && (
                  <p className="text-gray-500 text-xs mb-2 line-clamp-2">
                    {activeTask.description}
                  </p>
                )}

                <div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[activeTask.priority]}`}
                  >
                    {activeTask.priority}
                  </span>
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

          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Create New Task
              </h2>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 pb-8">
              <form onSubmit={handleCreateTask}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Title *
                  </label>

                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Design homepage"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>

                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add details..."
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>

                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        "low",
                        "medium",
                        "high",
                        "urgent",
                      ] as SyntraTaskPriority[]
                    ).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setNewTask({
                            ...newTask,
                            priority: p,
                          })
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-medium capitalize ${
                          newTask.priority === p
                            ? `${priorityColors[p]} ring-2 ring-blue-500`
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating || !newTask.title.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
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
          from {
            transform: translateY(100%);
          }

          to {
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProjectBoard;
