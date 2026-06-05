import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckSquare,
  AlertCircle,
} from "lucide-react";
import taskService from "../services/taskService";
import type { Task } from "../types";

interface CalendarViewProps {
  projectId?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      let allTasks: Task[] = [];

      if (projectId) {
        // Load tasks for specific project
        allTasks = await taskService.getTasks(projectId);
      } else {
        // Load all tasks from all projects (you'll need to implement this)
        // For now, we'll just show tasks from the first project
        // You can enhance this later
        allTasks = [];
      }

      setTasks(allTasks);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getTasksForDate = (date: Date): Task[] => {
    if (!date) return [];
    const dateStr = date.toDateString();
    return tasks.filter((task) => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === dateStr;
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isOverdue = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {formatMonth(currentDate)}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[100px] bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                />
              );
            }

            const tasksForDate = getTasksForDate(date);
            const isCurrentDate = isToday(date);
            const isDateOverdue = isOverdue(date) && tasksForDate.length > 0;

            return (
              <div
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`
                  min-h-[100px] p-2 rounded-lg cursor-pointer transition-all
                  ${isCurrentDate ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}
                  ${tasksForDate.length > 0 ? "bg-gray-50 dark:bg-gray-700/30" : "bg-white dark:bg-gray-800"}
                `}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={`
                    text-sm font-medium
                    ${isCurrentDate ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}
                  `}
                  >
                    {date.getDate()}
                  </span>
                  {tasksForDate.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                      {tasksForDate.length}
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1">
                  {tasksForDate.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/project/${task.project_id}`);
                      }}
                      className="text-xs p-1 bg-white dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition truncate"
                    >
                      <div className="flex items-center space-x-1">
                        {task.priority === "urgent" && (
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  ))}
                  {tasksForDate.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      +{tasksForDate.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task List for Selected Date Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSelectedDate(null)}
          />
          <div className="absolute bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tasks for {selectedDate.toLocaleDateString()}
                  {isOverdue(selectedDate) && (
                    <span className="ml-2 text-xs text-red-500">(Overdue)</span>
                  )}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-3">
                {getTasksForDate(selectedDate).length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No tasks due on this date
                  </p>
                ) : (
                  getTasksForDate(selectedDate).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedDate(null);
                        navigate(`/project/${task.project_id}`);
                      }}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {task.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Project: {task.project_id}
                          </p>
                          {task.priority && (
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium
                              ${
                                task.priority === "urgent"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : task.priority === "high"
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                    : task.priority === "medium"
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}
                        </div>
                        <CheckSquare className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
