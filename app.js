// 待辦清單使用原生 JavaScript，並以 localStorage 保存資料。
const STORAGE_KEY = "todo-list-items";
const THEME_STORAGE_KEY = "todo-list-theme";
const THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");
const remainingCount = document.getElementById("remaining-count");
const clearCompletedButton = document.getElementById("clear-completed");
const themeToggle = document.getElementById("theme-toggle");
const filterButtons = document.querySelectorAll(".filter-button");

let todos = loadTodos();
let activeFilter = "all";
let themePreference = loadThemePreference();

// 初次載入時依照手動選擇或作業系統偏好設定主題。
function getCurrentTheme() {
  return themePreference || (THEME_QUERY.matches ? "dark" : "light");
}

function applyTheme() {
  const theme = getCurrentTheme();
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === "dark" ? "☀️ 淺色模式" : "🌙 深色模式";
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
}

// 讀取使用者手動選擇的主題；沒有有效設定時跟隨系統。
function loadThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch (error) {
    console.warn("讀取主題設定失敗，將跟隨作業系統偏好。", error);
    return null;
  }
}

// 讀取並檢查已保存的資料，避免損壞的內容影響清單。
function loadTodos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((todo) =>
      todo &&
      typeof todo.id === "string" &&
      typeof todo.text === "string" &&
      typeof todo.completed === "boolean"
    );
  } catch (error) {
    console.warn("讀取待辦清單失敗，將以空清單開始。", error);
    return [];
  }
}

// 將目前清單保存至瀏覽器。
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// 根據篩選結果更新清單，未完成數量則始終使用完整資料計算。
function render() {
  list.replaceChildren();

  const visibleTodos = todos.filter((todo) => {
    if (activeFilter === "active") {
      return !todo.completed;
    }

    if (activeFilter === "completed") {
      return todo.completed;
    }

    return true;
  });

  visibleTodos.forEach((todo) => {
    const item = document.createElement("li");
    item.className = todo.completed ? "todo-item completed" : "todo-item";
    item.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.className = "todo-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `標記「${todo.text}」為完成`);

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "刪除";
    deleteButton.setAttribute("aria-label", `刪除「${todo.text}」`);

    item.append(checkbox, text, deleteButton);
    list.append(item);
  });

  emptyState.hidden = visibleTodos.length > 0;
  if (visibleTodos.length === 0) {
    const emptyMessages = {
      all: "還沒有任何待辦事項,新增一個吧!",
      active: "目前沒有未完成的待辦事項。",
      completed: "目前沒有已完成的待辦事項；已取消勾選的項目仍保留在「全部」清單中。",
    };
    emptyState.textContent = emptyMessages[activeFilter];
  }

  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  const remainingTodos = todos.filter((todo) => !todo.completed).length;
  const completedTodos = todos.length - remainingTodos;
  remainingCount.textContent = `未完成:${remainingTodos} 項`;
  clearCompletedButton.hidden = completedTodos === 0;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) {
    return;
  }

  todos.push({ id: createId(), text, completed: false });
  saveTodos();
  render();
  form.reset();
  input.focus();
});

list.addEventListener("click", (event) => {
  const item = event.target.closest(".todo-item");
  if (!item) {
    return;
  }

  const todo = todos.find((entry) => entry.id === item.dataset.id);
  if (!todo) {
    return;
  }

  if (event.target.matches(".todo-checkbox")) {
    todo.completed = event.target.checked;
  } else if (event.target.matches(".btn-delete")) {
    todos = todos.filter((entry) => entry.id !== todo.id);
  } else {
    return;
  }

  saveTodos();
  render();
});

themeToggle.addEventListener("click", () => {
  themePreference = getCurrentTheme() === "dark" ? "light" : "dark";
  applyTheme();

  try {
    localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  } catch (error) {
    console.error("儲存主題設定失敗，重新整理後可能無法保留選擇。", error);
  }
});

clearCompletedButton.addEventListener("click", () => {
  const completedCount = todos.filter((todo) => todo.completed).length;
  if (completedCount === 0) {
    return;
  }

  if (!window.confirm(`確定要清除全部 ${completedCount} 個已完成的待辦事項嗎？此操作無法復原。`)) {
    return;
  }

  todos = todos.filter((todo) => !todo.completed);
  saveTodos();
  render();
});

// 在使用者尚未手動選擇主題時，即時跟隨作業系統偏好變化。
THEME_QUERY.addEventListener("change", () => {
  if (!themePreference) {
    applyTheme();
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    render();
  });
});

applyTheme();
render();
