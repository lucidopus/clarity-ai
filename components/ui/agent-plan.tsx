"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup, type Variants } from "framer-motion";

const EASE_OUT_QUART: [number, number, number, number] = [0.2, 0.65, 0.3, 0.9];
const EASE_BOUNCE: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export type AgentPlanStatus =
  | "completed"
  | "in-progress"
  | "pending"
  | "need-help"
  | "failed";

export interface AgentPlanSubtask {
  id: string;
  title: string;
  description?: string;
  status: AgentPlanStatus;
}

export interface AgentPlanTask {
  id: string;
  title: string;
  description?: string;
  status: AgentPlanStatus;
  subtasks?: AgentPlanSubtask[];
}

interface AgentPlanProps {
  tasks: AgentPlanTask[];
  defaultExpandedTaskIds?: string[];
  className?: string;
}

const STATUS_LABEL: Record<AgentPlanStatus, string> = {
  completed: "done",
  "in-progress": "running",
  pending: "queued",
  "need-help": "attention",
  failed: "failed",
};

function StatusIcon({
  status,
  size = "md",
}: {
  status: AgentPlanStatus;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (status === "completed")
    return <CheckCircle2 className={`${sizeClass} text-emerald-500`} />;
  if (status === "in-progress")
    return (
      <CircleDotDashed
        className={`${sizeClass} text-accent animate-[spin_4s_linear_infinite]`}
      />
    );
  if (status === "need-help")
    return <CircleAlert className={`${sizeClass} text-amber-500`} />;
  if (status === "failed")
    return <CircleX className={`${sizeClass} text-red-500`} />;
  return <Circle className={`${sizeClass} text-secondary/50`} />;
}

function statusBadgeClass(status: AgentPlanStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "in-progress":
      return "bg-accent/10 text-accent";
    case "need-help":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "failed":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    default:
      return "bg-border/40 text-secondary";
  }
}

export default function AgentPlan({
  tasks,
  defaultExpandedTaskIds,
  className = "",
}: AgentPlanProps) {
  // User-toggled expansion state. The active (in-progress) task is always
  // auto-expanded on top of this so the user sees live detail without re-renders.
  const [userToggled, setUserToggled] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (defaultExpandedTaskIds ?? []).forEach((id) => {
      initial[id] = true;
    });
    return initial;
  });

  const activeTaskId = useMemo(
    () => tasks.find((t) => t.status === "in-progress")?.id ?? null,
    [tasks],
  );

  const isExpanded = (taskId: string): boolean => {
    if (userToggled[taskId] !== undefined) return userToggled[taskId];
    return taskId === activeTaskId;
  };

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const toggleTaskExpansion = (taskId: string) => {
    setUserToggled((prev) => ({
      ...prev,
      [taskId]: !isExpanded(taskId),
    }));
  };

  const taskVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : -4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { type: "tween", duration: 0.2 }
        : { type: "spring", stiffness: 500, damping: 30 },
    },
  };

  const subtaskListVariants: Variants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      height: "auto",
      opacity: 1,
      transition: {
        duration: 0.25,
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        when: "beforeChildren",
        ease: EASE_OUT_QUART,
      },
    },
    exit: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.2, ease: EASE_OUT_QUART },
    },
  };

  const subtaskVariants: Variants = {
    hidden: { opacity: 0, x: prefersReducedMotion ? 0 : -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: prefersReducedMotion
        ? { type: "tween", duration: 0.2 }
        : { type: "spring", stiffness: 500, damping: 25 },
    },
  };

  const statusBadgeVariants: Variants = {
    initial: { scale: 1 },
    animate: {
      scale: prefersReducedMotion ? 1 : [1, 1.08, 1],
      transition: { duration: 0.35, ease: EASE_BOUNCE },
    },
  };

  return (
    <div className={`w-full ${className}`}>
      <motion.div
        className="bg-card-bg border border-border rounded-xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: EASE_OUT_QUART },
        }}
      >
        <LayoutGroup>
          <div className="p-4 overflow-hidden">
            <ul className="space-y-1 overflow-hidden">
              {tasks.map((task, index) => {
                const expanded = isExpanded(task.id);
                const isCompleted = task.status === "completed";
                const hasSubtasks = !!task.subtasks && task.subtasks.length > 0;

                return (
                  <motion.li
                    key={task.id}
                    className={index !== 0 ? "mt-1 pt-1" : ""}
                    initial="hidden"
                    animate="visible"
                    variants={taskVariants}
                  >
                    <div className="group flex items-center px-2 py-1.5 rounded-md transition-colors hover:bg-foreground/[0.03]">
                      <div className="mr-2 flex-shrink-0">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={task.status}
                            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.8, rotate: 8 }}
                            transition={{
                              duration: 0.2,
                              ease: EASE_OUT_QUART,
                            }}
                          >
                            <StatusIcon status={task.status} />
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <button
                        type="button"
                        onClick={() => hasSubtasks && toggleTaskExpansion(task.id)}
                        className={`flex min-w-0 flex-grow items-center justify-between text-left ${
                          hasSubtasks ? "cursor-pointer" : "cursor-default"
                        }`}
                        aria-expanded={hasSubtasks ? expanded : undefined}
                      >
                        <span
                          className={`mr-2 flex-1 truncate text-sm ${
                            isCompleted ? "text-secondary" : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </span>

                        <motion.span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeClass(task.status)}`}
                          variants={statusBadgeVariants}
                          initial="initial"
                          animate="animate"
                          key={task.status}
                        >
                          {STATUS_LABEL[task.status]}
                        </motion.span>
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {expanded && hasSubtasks && (
                        <motion.div
                          className="relative overflow-hidden"
                          variants={subtaskListVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                        >
                          <div className="absolute top-0 bottom-0 left-[18px] border-l border-dashed border-border" />
                          <ul className="mt-1 mb-1 ml-3 space-y-0.5">
                            {task.subtasks!.map((subtask) => (
                              <motion.li
                                key={subtask.id}
                                className="group flex flex-col py-0.5 pl-5"
                                variants={subtaskVariants}
                                initial="hidden"
                                animate="visible"
                                layout
                              >
                                <div className="flex flex-1 items-center rounded-md p-1">
                                  <div className="mr-2 flex-shrink-0">
                                    <AnimatePresence mode="wait">
                                      <motion.div
                                        key={subtask.status}
                                        initial={{
                                          opacity: 0,
                                          scale: 0.8,
                                          rotate: -8,
                                        }}
                                        animate={{
                                          opacity: 1,
                                          scale: 1,
                                          rotate: 0,
                                        }}
                                        exit={{
                                          opacity: 0,
                                          scale: 0.8,
                                          rotate: 8,
                                        }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        <StatusIcon
                                          status={subtask.status}
                                          size="sm"
                                        />
                                      </motion.div>
                                    </AnimatePresence>
                                  </div>
                                  <span
                                    className={`text-xs ${
                                      subtask.status === "completed"
                                        ? "text-secondary"
                                        : "text-foreground/80"
                                    }`}
                                  >
                                    {subtask.title}
                                  </span>
                                </div>
                                {subtask.description && (
                                  <p className="text-secondary pl-8 pr-2 text-[11px] leading-relaxed">
                                    {subtask.description}
                                  </p>
                                )}
                              </motion.li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}
