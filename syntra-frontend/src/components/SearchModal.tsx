import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  FolderKanban,
  Users,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import searchService from "../services/searchService";
import type { SearchResult } from "../types";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await searchService.globalSearch(query);
        setResults(data);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      const result = results[selectedIndex];
      if (result) {
        navigate(result.url);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "task":
        return <CheckSquare className="w-4 h-4 text-blue-500" />;
      case "project":
        return <FolderKanban className="w-4 h-4 text-purple-500" />;
      case "team":
        return <Users className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const groupedResults = {
    tasks: results.filter((r) => r.type === "task"),
    projects: results.filter((r) => r.type === "project"),
    teams: results.filter((r) => r.type === "team"),
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects, or teams..."
            className="w-full px-3 py-4 text-gray-900 dark:text-white bg-transparent outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto p-2">
          {query.length < 2 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                Type at least 2 characters to search
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </p>
            </div>
          ) : (
            <div>
              {/* Tasks Section */}
              {groupedResults.tasks.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tasks ({groupedResults.tasks.length})
                  </div>
                  {groupedResults.tasks.map((result, idx) => {
                    const globalIndex = results.findIndex(
                      (r) => r.id === result.id,
                    );
                    return (
                      <button
                        key={result.id}
                        onClick={() => {
                          navigate(result.url);
                          onClose();
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedIndex === globalIndex
                            ? "bg-blue-50 dark:bg-blue-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {getIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {result.title}
                            </p>
                            {result.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {result.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                              {result.project_name && (
                                <span className="text-xs text-gray-400">
                                  Project: {result.project_name}
                                </span>
                              )}
                              {result.status && (
                                <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                  {result.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Projects Section */}
              {groupedResults.projects.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Projects ({groupedResults.projects.length})
                  </div>
                  {groupedResults.projects.map((result, idx) => {
                    const globalIndex = results.findIndex(
                      (r) => r.id === result.id,
                    );
                    return (
                      <button
                        key={result.id}
                        onClick={() => {
                          navigate(result.url);
                          onClose();
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedIndex === globalIndex
                            ? "bg-blue-50 dark:bg-blue-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {getIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {result.title}
                            </p>
                            {result.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {result.description}
                              </p>
                            )}
                            {result.team_name && (
                              <p className="text-xs text-gray-400 mt-1">
                                Team: {result.team_name}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Teams Section */}
              {groupedResults.teams.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Teams ({groupedResults.teams.length})
                  </div>
                  {groupedResults.teams.map((result, idx) => {
                    const globalIndex = results.findIndex(
                      (r) => r.id === result.id,
                    );
                    return (
                      <button
                        key={result.id}
                        onClick={() => {
                          navigate(result.url);
                          onClose();
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedIndex === globalIndex
                            ? "bg-blue-50 dark:bg-blue-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {getIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {result.title}
                            </p>
                            {result.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {result.description}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to close</span>
          </div>
          <div>{results.length > 0 && `${results.length} results`}</div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
