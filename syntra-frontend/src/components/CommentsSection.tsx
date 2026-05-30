import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  Send,
  Trash2,
  Edit2,
  X,
  Check,
  Reply,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import commentService from "../services/commentService";
import type { Comment } from "../types";

interface CommentsSectionProps {
  taskId: string;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ taskId }) => {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await commentService.getComments(taskId);
      console.log("Raw comments from API:", data);
      setComments(data);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await commentService.createComment({
        content: newComment,
        task_id: taskId,
      });
      setNewComment("");
      await loadComments();
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    console.log("Submitting reply to parent:", parentId);
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      await commentService.createComment({
        content: replyContent,
        task_id: taskId,
        parent_comment_id: parentId,
      });
      setReplyContent("");
      setReplyingTo(null);
      await loadComments();
    } catch (error) {
      console.error("Failed to post reply:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await commentService.updateComment(commentId, editContent);
      setEditingComment(null);
      setEditContent("");
      await loadComments();
    } catch (error) {
      console.error("Failed to edit comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      try {
        await commentService.deleteComment(commentId);
        await loadComments();
      } catch (error) {
        console.error("Failed to delete comment:", error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  const CommentItem: React.FC<{ comment: Comment; depth?: number }> = ({
    comment,
    depth = 0,
  }) => {
    const isOwnComment = comment.user_id === user?.id;

    return (
      <div
        className={`${depth > 0 ? "ml-6 sm:ml-8 mt-3 pl-3 border-l-2 border-gray-200" : "mb-4"}`}
      >
        <div className="bg-gray-50 rounded-lg p-3">
          {/* Comment Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {comment.user_name?.charAt(0).toUpperCase() ||
                    comment.user?.name?.charAt(0).toUpperCase() ||
                    "U"}
                </span>
              </div>
              <span className="font-medium text-sm text-gray-900">
                {comment.user_name || comment.user?.name || "Unknown User"}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(comment.created_at)}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
            </div>

            {isOwnComment && editingComment !== comment.id && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Comment Content */}
          {editingComment === comment.id ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent("");
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
          )}

          {/* Reply Button */}
          {!editingComment && (
            <button
              onClick={() =>
                setReplyingTo(replyingTo === comment.id ? null : comment.id)
              }
              className="flex items-center space-x-1 mt-2 text-xs text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
          )}

          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="mt-3">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-medium">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={submitting || !replyContent.trim()}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      Post Reply
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent("");
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Render Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div>
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-4">
        <MessageCircle className="w-5 h-5 text-gray-400" />
        <h3 className="font-semibold text-gray-900">Comments</h3>
        <span className="text-xs text-gray-400">({comments.length})</span>
      </div>

      {/* Comment List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No comments yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Be the first to leave a comment
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="mt-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={2}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="mt-2 flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post Comment</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentsSection;
