/**
 * TaskMaster Kanban Engine
 * Pure ES6 Native Implementation with zero AI slop
 */

(function () {
  "use strict";

  const STORAGE_KEY = "taskmaster_kanban_v1";

  // Initial Seed Data (Loaded only if storage is completely empty)
  const SEED_TASKS = [
    {
      id: "task-101",
      title: "Design PostgreSQL Relational Schema",
      description: "Establish normalized tables for users, teams, and audit logs with strict foreign key constraints and indexes.",
      column: "backlog",
      priority: "high",
      dueDate: "2026-09-15",
      tags: ["Database", "SQL", "Architecture"],
      createdAt: Date.now() - 86400000 * 3
    },
    {
      id: "task-102",
      title: "Implement Token Bucket Rate Limiter",
      description: "Protect REST API endpoints from DDoS and abuse using Redis sliding-window counter middleware.",
      column: "in-progress",
      priority: "urgent",
      dueDate: "2026-09-10",
      tags: ["Backend", "Redis", "Security"],
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: "task-103",
      title: "Audit WCAG 2.1 AA Contrast Compliance",
      description: "Ensure all typography, interactive states, and modal overlays meet minimum 4.5:1 contrast ratios.",
      column: "review",
      priority: "medium",
      dueDate: "2026-09-12",
      tags: ["A11y", "Frontend", "CSS"],
      createdAt: Date.now() - 86400000
    },
    {
      id: "task-104",
      title: "Engineered Minimax Chess AI Engine",
      description: "Built complete evaluation tables, alpha-beta pruning, move history, and audio feedback in Naty Games.",
      column: "done",
      priority: "high",
      dueDate: "2026-09-05",
      tags: ["Algorithms", "Vanilla JS", "Flagship"],
      createdAt: Date.now() - 86400000 * 5
    }
  ];

  // Application State
  let tasks = [];
  let searchQuery = "";
  let selectedPriority = "all";
  let draggedTaskId = null;

  // DOM Elements
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearch");
  const priorityFilter = document.getElementById("priorityFilter");
  const openNewTaskBtn = document.getElementById("openNewTaskBtn");
  const taskModal = document.getElementById("taskModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const taskForm = document.getElementById("taskForm");
  const modalTitle = document.getElementById("modalTitle");

  const taskIdInput = document.getElementById("taskId");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescInput = document.getElementById("taskDescInput");
  const taskPriorityInput = document.getElementById("taskPriorityInput");
  const taskColumnInput = document.getElementById("taskColumnInput");
  const taskDueDateInput = document.getElementById("taskDueDateInput");
  const taskTagsInput = document.getElementById("taskTagsInput");

  const moreActionsBtn = document.getElementById("moreActionsBtn");
  const actionsMenu = document.getElementById("actionsMenu");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");
  const resetSampleBtn = document.getElementById("resetSampleBtn");

  const totalCountEl = document.getElementById("totalCount");
  const completedCountEl = document.getElementById("completedCount");
  const completionRateEl = document.getElementById("completionRate");
  const progressBarEl = document.getElementById("progressBar");
  const toastEl = document.getElementById("toast");

  const columns = ["backlog", "in-progress", "review", "done"];

  // ==========================================
  // STORAGE & STATE
  // ==========================================

  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        tasks = JSON.parse(stored);
      } else {
        tasks = [...SEED_TASKS];
        saveTasks();
      }
    } catch (e) {
      console.error("Failed to load tasks from localStorage:", e);
      tasks = [...SEED_TASKS];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      updateMetrics();
    } catch (e) {
      showToast("Storage quota exceeded or unavailable.", "error");
    }
  }

  // ==========================================
  // METRICS & PROGRESS
  // ==========================================

  function updateMetrics() {
    if (!totalCountEl) return;
    const total = tasks.length;
    const completed = tasks.filter(t => t.column === "done").length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    if (totalCountEl) totalCountEl.textContent = total;
    if (completedCountEl) completedCountEl.textContent = completed;
    if (completionRateEl) completionRateEl.textContent = `${rate}%`;
    if (progressBarEl) progressBarEl.style.width = `${rate}%`;
  }

  // ==========================================
  // RENDER ENGINE
  // ==========================================

  function renderBoard() {
    columns.forEach(colId => {
      const listEl = document.getElementById(`list-${colId}`);
      const countEl = document.getElementById(`count-${colId}`);
      listEl.innerHTML = "";

      // Filter tasks for this column based on search & priority
      const colTasks = tasks.filter(task => {
        if (task.column !== colId) return false;

        if (selectedPriority !== "all" && task.priority !== selectedPriority) {
          return false;
        }

        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(q);
          const matchesDesc = (task.description || "").toLowerCase().includes(q);
          const matchesTags = (task.tags || []).some(t => t.toLowerCase().includes(q));
          if (!matchesTitle && !matchesDesc && !matchesTags) return false;
        }

        return true;
      });

      countEl.textContent = colTasks.length;

      if (colTasks.length === 0) {
        const placeholder = document.createElement("div");
        placeholder.className = "empty-placeholder";
        placeholder.textContent = searchQuery ? "No matching tasks" : "No tasks in this lane";
        listEl.appendChild(placeholder);
      } else {
        colTasks.forEach(task => {
          listEl.appendChild(createTaskCardElement(task));
        });
      }
    });

    updateMetrics();
  }

  function createTaskCardElement(task) {
    const card = document.createElement("article");
    card.className = "task-card";
    card.id = task.id;
    card.setAttribute("draggable", "true");

    const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < new Date().setHours(0,0,0,0) && task.column !== "done";

    const tagsHtml = (task.tags && task.tags.length > 0)
      ? `<div class="task-tags">${task.tags.map(t => `<span class="task-tag">#${escapeHtml(t)}</span>`).join("")}</div>`
      : "";

    const dueHtml = task.dueDate
      ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
             <line x1="16" y1="2" x2="16" y2="6"></line>
             <line x1="8" y1="2" x2="8" y2="6"></line>
             <line x1="3" y1="10" x2="21" y2="10"></line>
           </svg>
           ${task.dueDate}${isOverdue ? ' (Overdue)' : ''}
         </span>`
      : `<span></span>`;

    card.innerHTML = `
      <div class="task-card-header">
        <span class="badge-priority priority-${task.priority}">${task.priority}</span>
        <div class="task-actions">
          <button class="btn-card-action edit-btn" data-id="${task.id}" aria-label="Edit task" title="Edit task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-card-action delete-btn" data-id="${task.id}" aria-label="Delete task" title="Delete task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ""}
      ${tagsHtml}
      <div class="task-footer">
        ${dueHtml}
        <span class="task-id">#${task.id.replace("task-", "")}</span>
      </div>
    `;

    // Drag Event Listeners
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);

    // Edit and Delete Event Listeners
    card.querySelector(".edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openEditModal(task.id);
    });

    card.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });

    return card;
  }

  // ==========================================
  // DRAG & DROP ENGINE
  // ==========================================

  function handleDragStart(e) {
    draggedTaskId = this.id;
    this.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", this.id);
  }

  function handleDragEnd() {
    this.classList.remove("dragging");
    document.querySelectorAll(".task-list").forEach(list => list.classList.remove("drag-over"));
    draggedTaskId = null;
  }

  function setupDragDropColumns() {
    columns.forEach(colId => {
      const listEl = document.getElementById(`list-${colId}`);

      listEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        listEl.classList.add("drag-over");
      });

      listEl.addEventListener("dragleave", (e) => {
        if (!listEl.contains(e.relatedTarget)) {
          listEl.classList.remove("drag-over");
        }
      });

      listEl.addEventListener("drop", (e) => {
        e.preventDefault();
        listEl.classList.remove("drag-over");
        const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
        if (!taskId) return;

        const targetTask = tasks.find(t => t.id === taskId);
        if (targetTask && targetTask.column !== colId) {
          targetTask.column = colId;
          saveTasks();
          renderBoard();
          showToast(`Moved to ${formatColumnName(colId)}`);
        }
      });
    });
  }

  function formatColumnName(col) {
    switch (col) {
      case "backlog": return "Backlog";
      case "in-progress": return "In Progress";
      case "review": return "In Review";
      case "done": return "Completed";
      default: return col;
    }
  }

  // ==========================================
  // TASK CRUD OPERATIONS
  // ==========================================

  function openCreateModal() {
    modalTitle.textContent = "Create New Task";
    taskForm.reset();
    taskIdInput.value = "";
    taskColumnInput.value = "backlog";
    taskPriorityInput.value = "medium";
    taskModal.showModal();
    taskTitleInput.focus();
  }

  function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    modalTitle.textContent = "Edit Task";
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskDescInput.value = task.description || "";
    taskPriorityInput.value = task.priority;
    taskColumnInput.value = task.column;
    taskDueDateInput.value = task.dueDate || "";
    taskTagsInput.value = (task.tags || []).join(", ");

    taskModal.showModal();
    taskTitleInput.focus();
  }

  function handleTaskFormSubmit(e) {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    if (!title) return;

    const parsedTags = taskTagsInput.value
      .split(",")
      .map(t => t.trim().replace(/^#/, ""))
      .filter(t => t.length > 0);

    const taskId = taskIdInput.value;

    if (taskId) {
      // Update existing
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          title,
          description: taskDescInput.value.trim(),
          priority: taskPriorityInput.value,
          column: taskColumnInput.value,
          dueDate: taskDueDateInput.value || null,
          tags: parsedTags,
          updatedAt: Date.now()
        };
        showToast("Task updated successfully");
      }
    } else {
      // Create new
      const newTask = {
        id: "task-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        title,
        description: taskDescInput.value.trim(),
        priority: taskPriorityInput.value,
        column: taskColumnInput.value,
        dueDate: taskDueDateInput.value || null,
        tags: parsedTags,
        createdAt: Date.now()
      };
      tasks.unshift(newTask);
      showToast("New task created");
    }

    saveTasks();
    renderBoard();
    taskModal.close();
  }

  function deleteTask(taskId) {
    if (confirm("Are you sure you want to permanently delete this task?")) {
      tasks = tasks.filter(t => t.id !== taskId);
      saveTasks();
      renderBoard();
      showToast("Task deleted");
    }
  }

  // ==========================================
  // BACKUP & RESTORE
  // ==========================================

  function exportBoard() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `taskmaster-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Board exported as JSON");
  }

  function handleImportBoard(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          tasks = imported;
          saveTasks();
          renderBoard();
          showToast("Board successfully imported!");
        } else {
          showToast("Invalid JSON schema for board.", "error");
        }
      } catch (err) {
        showToast("Could not parse JSON file.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function resetSampleTasks() {
    if (confirm("Reset all tasks to sample engineering data? This will overwrite current tasks.")) {
      tasks = JSON.parse(JSON.stringify(SEED_TASKS));
      saveTasks();
      renderBoard();
      showToast("Reset to sample tasks");
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  function showToast(message, type = "info") {
    toastEl.textContent = message;
    toastEl.className = "toast show";
    if (type === "error") {
      toastEl.style.borderColor = "var(--accent-red)";
    } else {
      toastEl.style.borderColor = "var(--accent-cyan)";
    }
    setTimeout(() => {
      toastEl.className = "toast";
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ==========================================
  // EVENT LISTENERS INITIALIZATION
  // ==========================================

  function init() {
    loadTasks();
    setupDragDropColumns();
    renderBoard();

    // Search and filter listeners
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      clearSearchBtn.style.display = searchQuery ? "block" : "none";
      renderBoard();
    });

    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      searchQuery = "";
      clearSearchBtn.style.display = "none";
      renderBoard();
      searchInput.focus();
    });

    priorityFilter.addEventListener("change", (e) => {
      selectedPriority = e.target.value;
      renderBoard();
    });

    // Modal listeners
    openNewTaskBtn.addEventListener("click", openCreateModal);
    closeModalBtn.addEventListener("click", () => taskModal.close());
    cancelModalBtn.addEventListener("click", () => taskModal.close());
    taskForm.addEventListener("submit", handleTaskFormSubmit);

    // Close modal on backdrop click
    taskModal.addEventListener("click", (e) => {
      const rect = taskModal.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
        && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) {
        taskModal.close();
      }
    });

    // Global keyboard shortcut: Cmd/Ctrl + N for new task
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openCreateModal();
      }
    });

    // More actions dropdown
    moreActionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      actionsMenu.classList.toggle("show");
    });

    document.addEventListener("click", () => {
      actionsMenu.classList.remove("show");
    });

    exportBtn.addEventListener("click", exportBoard);
    importInput.addEventListener("change", handleImportBoard);
    resetSampleBtn.addEventListener("click", resetSampleTasks);
  }

  // Bootstrap when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
