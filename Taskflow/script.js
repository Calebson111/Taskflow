/* ===================================
   TaskFlow - Main Application Logic
   =================================== */

// ===================================
// State Management
// ===================================
const state = {
  tasks: [],
  currentFilter: 'all',
  searchQuery: '',
  editingTaskId: null,
  taskToDelete: null
};

// ===================================
// DOM Elements
// ===================================
const elements = {
  loader: document.getElementById('loader'),
  app: document.getElementById('app'),
  taskForm: document.getElementById('taskForm'),
  taskInput: document.getElementById('taskInput'),
  taskList: document.getElementById('taskList'),
  searchInput: document.getElementById('searchInput'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  statTotal: document.getElementById('statTotal'),
  statActive: document.getElementById('statActive'),
  statCompleted: document.getElementById('statCompleted'),
  emptyState: document.getElementById('emptyState'),
  noResults: document.getElementById('noResults'),
  themeToggle: document.getElementById('themeToggle'),
  deleteModal: document.getElementById('deleteModal'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  toastContainer: document.getElementById('toastContainer')
};

// ===================================
// Utility Functions
// ===================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ===================================
// Local Storage
// ===================================
function loadTasks() {
  try {
    const stored = localStorage.getItem('taskflow_tasks');
    state.tasks = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading tasks:', error);
    state.tasks = [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem('taskflow_tasks', JSON.stringify(state.tasks));
  } catch (error) {
    console.error('Error saving tasks:', error);
    showToast('Failed to save tasks', 'error');
  }
}

// ===================================
// Task Operations
// ===================================
function addTask(text) {
  const trimmedText = text.trim();
  if (!trimmedText) return false;

  const task = {
    id: generateId(),
    text: trimmedText,
    completed: false,
    createdAt: Date.now()
  };

  state.tasks.unshift(task);
  saveTasks();
  renderTasks();
  renderStats();
  showToast('Task added successfully', 'success');
  return true;
}

function updateTask(id, newText) {
  const trimmedText = newText.trim();
  if (!trimmedText) return false;

  const task = state.tasks.find(t => t.id === id);
  if (!task) return false;

  task.text = trimmedText;
  saveTasks();
  renderTasks();
  showToast('Task updated', 'success');
  return true;
}

function deleteTask(id) {
  const index = state.tasks.findIndex(t => t.id === id);
  if (index === -1) return false;

  state.tasks.splice(index, 1);
  saveTasks();
  renderTasks();
  renderStats();
  showToast('Task deleted', 'success');
  return true;
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return false;

  task.completed = !task.completed;
  saveTasks();
  renderTasks();
  renderStats();
  showToast(task.completed ? 'Task completed!' : 'Task marked as active', 'success');
  return true;
}

// ===================================
// Filtering & Searching
// ===================================
function getFilteredTasks() {
  let filtered = state.tasks;

  // Apply search filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(task => 
      task.text.toLowerCase().includes(query)
    );
  }

  // Apply status filter
  switch (state.currentFilter) {
    case 'active':
      filtered = filtered.filter(task => !task.completed);
      break;
    case 'completed':
      filtered = filtered.filter(task => task.completed);
      break;
  }

  return filtered;
}

// ===================================
// Rendering Functions
// ===================================
function renderTasks() {
  const filteredTasks = getFilteredTasks();
  
  // Clear list
  elements.taskList.innerHTML = '';

  // Render tasks
  filteredTasks.forEach(task => {
    const taskElement = createTaskElement(task);
    elements.taskList.appendChild(taskElement);
  });

  // Update empty states
  updateEmptyState(filteredTasks.length);
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.completed ? ' completed' : ''}`;
  li.dataset.id = task.id;

  li.innerHTML = `
    <label class="task-item__checkbox">
      <input 
        type="checkbox" 
        ${task.completed ? 'checked' : ''} 
        aria-label="Mark as ${task.completed ? 'incomplete' : 'complete'}"
      />
      <span class="task-item__checkbox-mark"></span>
    </label>
    
    <div class="task-item__content">
      <div class="task-item__text">${escapeHtml(task.text)}</div>
      <div class="task-item__date">${formatDate(task.createdAt)}</div>
    </div>
    
    <div class="task-item__actions">
      <button class="task-item__btn task-item__btn--edit" aria-label="Edit task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="task-item__btn task-item__btn--delete" aria-label="Delete task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `;

  return li;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const active = total - completed;

  animateNumber(elements.statTotal, total);
  animateNumber(elements.statActive, active);
  animateNumber(elements.statCompleted, completed);
}

function animateNumber(element, targetValue) {
  const currentValue = parseInt(element.textContent) || 0;
  if (currentValue === targetValue) return;

  const duration = 300;
  const steps = 20;
  const stepValue = (targetValue - currentValue) / steps;
  const stepDuration = duration / steps;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    const value = Math.round(currentValue + (stepValue * currentStep));
    element.textContent = value;

    if (currentStep >= steps) {
      element.textContent = targetValue;
      clearInterval(interval);
    }
  }, stepDuration);
}

function updateEmptyState(filteredCount) {
  const hasTasks = state.tasks.length > 0;
  const hasFilteredTasks = filteredCount > 0;
  const hasSearchQuery = state.searchQuery.length > 0;

  // Hide all empty states first
  elements.emptyState.hidden = true;
  elements.noResults.hidden = true;
  elements.taskList.hidden = false;

  if (!hasTasks) {
    // No tasks at all
    elements.emptyState.hidden = false;
    elements.taskList.hidden = true;
  } else if (!hasFilteredTasks && hasSearchQuery) {
    // Has tasks but search returned no results
    elements.noResults.hidden = false;
    elements.taskList.hidden = true;
  } else if (!hasFilteredTasks) {
    // Has tasks but filter returned no results
    elements.emptyState.hidden = false;
    elements.emptyState.querySelector('.empty-state__title').textContent = 'No tasks here';
    elements.emptyState.querySelector('.empty-state__text').textContent = 
      state.currentFilter === 'active' 
        ? 'All tasks are completed!' 
        : 'No completed tasks yet.';
    elements.taskList.hidden = true;
  }
}

// ===================================
// Toast Notifications
// ===================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = `
    <div class="toast__icon">${icons[type]}</div>
    <div class="toast__message">${message}</div>
  `;

  elements.toastContainer.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===================================
// Modal Functions
// ===================================
function openDeleteModal(taskId) {
  state.taskToDelete = taskId;
  elements.deleteModal.hidden = false;
  document.body.style.overflow = 'hidden';
  
  // Focus the cancel button for accessibility
  const cancelBtn = elements.deleteModal.querySelector('[data-close]');
  cancelBtn.focus();
}

function closeDeleteModal() {
  state.taskToDelete = null;
  elements.deleteModal.hidden = true;
  document.body.style.overflow = '';
}

function confirmDelete() {
  if (state.taskToDelete) {
    deleteTask(state.taskToDelete);
    closeDeleteModal();
  }
}

// ===================================
// Edit Mode
// ===================================
function startEdit(taskId) {
  const taskElement = document.querySelector(`[data-id="${taskId}"]`);
  if (!taskElement) return;

  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const textElement = taskElement.querySelector('.task-item__text');
  const originalText = task.text;

  // Replace text with input
  textElement.innerHTML = `
    <input 
      type="text" 
      class="edit-input" 
      value="${escapeHtml(originalText)}"
      maxlength="200"
    />
  `;

  const input = textElement.querySelector('.edit-input');
  input.focus();
  input.select();

  // Handle edit completion
  const finishEdit = (save) => {
    if (save) {
      const newText = input.value.trim();
      if (newText && newText !== originalText) {
        updateTask(taskId, newText);
      } else {
        renderTasks(); // Revert if empty or unchanged
      }
    } else {
      renderTasks(); // Cancel edit
    }
  };

  // Event listeners
  input.addEventListener('blur', () => finishEdit(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEdit(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishEdit(false);
    }
  });
}

// ===================================
// Theme Management
// ===================================
function initTheme() {
  const savedTheme = localStorage.getItem('taskflow_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('taskflow_theme', newTheme);
  
  showToast(`Switched to ${newTheme} mode`, 'info');
}

// ===================================
// Event Listeners
// ===================================
function setupEventListeners() {
  // Task form submission
  elements.taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = elements.taskInput.value;
    
    if (addTask(text)) {
      elements.taskInput.value = '';
      elements.taskInput.focus();
    }
  });

  // Search input with debounce
  elements.searchInput.addEventListener('input', debounce((e) => {
    state.searchQuery = e.target.value;
    renderTasks();
  }, 300));

  // Filter buttons
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active state
      elements.filterButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');

      // Update filter and render
      state.currentFilter = button.dataset.filter;
      renderTasks();
    });
  });

  // Task list event delegation
  elements.taskList.addEventListener('click', (e) => {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.id;

    // Checkbox click
    if (e.target.type === 'checkbox') {
      toggleTask(taskId);
      return;
    }

    // Edit button click
    if (e.target.closest('.task-item__btn--edit')) {
      startEdit(taskId);
      return;
    }

    // Delete button click
    if (e.target.closest('.task-item__btn--delete')) {
      openDeleteModal(taskId);
      return;
    }
  });

  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleTheme);

  // Modal events
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) {
      closeDeleteModal();
    }
  });

  elements.confirmDeleteBtn.addEventListener('click', confirmDelete);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close modal
    if (e.key === 'Escape' && !elements.deleteModal.hidden) {
      closeDeleteModal();
    }
  });
}

// ===================================
// Initialization
// ===================================
function init() {
  // Show loader
  elements.loader.classList.remove('hidden');

  // Simulate loading delay for better UX
  setTimeout(() => {
    // Initialize theme
    initTheme();

    // Load tasks from storage
    loadTasks();

    // Initial render
    renderTasks();
    renderStats();

    // Setup event listeners
    setupEventListeners();

    // Hide loader
    elements.loader.classList.add('hidden');

    // Focus input
    setTimeout(() => {
      elements.taskInput.focus();
    }, 300);
  }, 800);
}

// Start the application
document.addEventListener('DOMContentLoaded', init);