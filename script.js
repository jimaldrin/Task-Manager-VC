const tasks = [
  {
    id: 1,
    title: 'Outline the new project brief',
    category: 'Work',
    tag: 'mint',
    date: 'Today, 10:00',
    status: 'done',
  },
  {
    id: 2,
    title: 'Book a dentist appointment',
    category: 'Personal',
    tag: 'coral',
    date: 'Today',
    status: 'progress',
  },
  {
    id: 3,
    title: 'Read 20 pages of Atomic Habits',
    category: 'Learning',
    tag: 'lavender',
    date: 'Today',
    status: 'progress',
  },
  {
    id: 4,
    title: 'Plan next week’s meals',
    category: 'Home',
    tag: 'yellow',
    date: 'Today',
    status: 'done',
  },
  {
    id: 5,
    title: 'Review monthly budget',
    category: 'Personal',
    tag: 'coral',
    date: 'Yesterday',
    status: 'done',
  },
  {
    id: 6,
    title: 'Send project handoff notes',
    category: 'Work',
    tag: 'mint',
    date: 'Yesterday',
    status: 'done',
  },
  {
    id: 7,
    title: 'Water the balcony plants',
    category: 'Home',
    tag: 'yellow',
    date: 'Tomorrow',
    status: 'progress',
  },
  {
    id: 8,
    title: 'Collect references for moodboard',
    category: 'Learning',
    tag: 'lavender',
    date: 'Tomorrow',
    status: 'progress',
  },
];

const categories = [
  { id: 1, name: 'Work', icon: 'briefcase-business', color: '#2556EA' },
  { id: 2, name: 'Personal', icon: 'user-round', color: '#4C78F2' },
  { id: 3, name: 'Home', icon: 'house', color: '#238A9A' },
  { id: 4, name: 'Learning', icon: 'book-open', color: '#6B8EF5' },
  { id: 5, name: 'Health', icon: 'heart', color: '#2C9B83' },
  { id: 6, name: 'Finance', icon: 'wallet', color: '#3564C8' },
];

const categoryTags = {
  Work: 'mint',
  Personal: 'coral',
  Home: 'yellow',
  Learning: 'lavender',
  Health: 'coral',
  Finance: 'yellow',
};

const todayInputValue = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

const formatTaskDate = (value) => {
  if (!value) return 'Today';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const editDateValue = (value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const offset = value.startsWith('Tomorrow')
    ? 1
    : value.startsWith('Yesterday')
      ? -1
      : 0;
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

let editingTask = null;
let deletingTask = null;
let searchQuery = '';
let editingCategory = null;
const completionTimers = new Map();

const taskMarkup = (task) => {
  const isDone = task.status === 'done' || task.pendingDone;
  return `<article class="task-card ${isDone ? 'done' : ''}" data-task-id="${task.id}">
  <button class="check-button" type="button" aria-label="${isDone ? 'Mark incomplete' : 'Mark complete'}">${isDone ? '<i data-lucide="check"></i>' : ''}</button>
  <div class="task-content"><p class="task-title">${task.title}</p><div class="task-meta"><span class="tag ${task.tag}">${task.category}</span><span class="task-date">${task.date}</span></div></div>
  <div class="task-actions"><button class="task-action edit" type="button" aria-label="Edit ${task.title}" title="Edit task"><i data-lucide="pencil"></i></button><button class="task-action delete" type="button" aria-label="Delete ${task.title}" title="Delete task"><i data-lucide="trash-2"></i></button></div>
  </article>`;
};

const renderIcons = () => {
  if (window.lucide) window.lucide.createIcons();
};

const filteredTasks = () => {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return tasks;
  return tasks.filter((task) =>
    `${task.title} ${task.category} ${task.date}`.toLowerCase().includes(query),
  );
};

const taskListMarkup = (items) =>
  items.length
    ? items.map(taskMarkup).join('')
    : '<p class="empty-state">No matching tasks found.</p>';

const renderSearchResults = () => {
  const results = document.querySelector('#search-results');
  if (!searchQuery.trim()) {
    results.innerHTML =
      '<p class="search-placeholder">Start typing to see matching tasks.</p>';
    return;
  }
  const matches = filteredTasks();
  results.innerHTML = matches.length
    ? matches
        .map(
          (task) =>
            `<div class="search-result"><strong>${task.title}</strong><span>${task.category} · ${task.date}</span></div>`,
        )
        .join('')
    : '<p class="empty-state">No matching tasks found.</p>';
};

const renderTasks = () => {
  const matchingTasks = filteredTasks();
  const progressTasks = matchingTasks.filter(
    (task) => task.status === 'progress',
  );
  const completedTasks = matchingTasks.filter((task) => task.status === 'done');
  document.querySelector('#all-progress-list').innerHTML =
    taskListMarkup(progressTasks);
  document.querySelector('#all-completed-list').innerHTML =
    taskListMarkup(completedTasks);
  document.querySelector('#progress-list').innerHTML =
    taskListMarkup(progressTasks);
  document.querySelector('#completed-list').innerHTML =
    taskListMarkup(completedTasks);
  renderSearchResults();
  renderIcons();
};

const renderCategories = () => {
  const markup = categories
    .map((category) => {
      const categoryTasks = tasks.filter(
        (task) => task.category === category.name,
      );
      const completed = categoryTasks.filter(
        (task) => task.status === 'done',
      ).length;
      const total = categoryTasks.length;
      const percent = total ? Math.round((completed / total) * 100) : 0;
      return `<article class="category-card"><div class="category-top"><p class="category-name">${category.name}</p><button class="category-edit" type="button" data-category-id="${category.id}" aria-label="Edit ${category.name} category" title="Edit category"><i data-lucide="pencil"></i></button></div><div><div class="category-bottom"><span class="category-percent">${percent}%</span><span class="category-total">${completed}/${total} completed</span></div><div class="progress-bar"><span style="--progress-color: ${category.color}; width: ${percent}%"></span></div></div></article>`;
    })
    .join('');
  document.querySelector('#category-grid').innerHTML = markup;
  document.querySelector('#all-category-grid').innerHTML = markup;
  document.querySelector('#category-count').textContent =
    `${categories.length} spaces`;
  renderIcons();
};

const showView = (filter) => {
  document
    .querySelectorAll('.filter-button')
    .forEach((button) =>
      button.classList.toggle('active', button.dataset.filter === filter),
    );
  document
    .querySelectorAll('.view-section')
    .forEach((section) =>
      section.classList.toggle('hidden', section.dataset.view !== filter),
    );
};

const showToast = (message) => {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2200);
};

const toggleDialog = (id, open) =>
  document.querySelector(`#${id}`).classList.toggle('hidden', !open);

document.querySelector('#search-button').addEventListener('click', () => {
  toggleDialog('search-dialog', true);
  document.querySelector('#search-input').focus();
});

document.querySelector('#search-input').addEventListener('input', (event) => {
  searchQuery = event.target.value;
  renderTasks();
});

document.querySelector('#close-search').addEventListener('click', () => {
  searchQuery = '';
  document.querySelector('#search-input').value = '';
  toggleDialog('search-dialog', false);
  renderTasks();
});

const updateProgress = () => {
  const completed = tasks.filter((item) => item.status === 'done').length;
  const percentage = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  document.querySelector('#completed-count').textContent = completed;
  document.querySelector('.focus-copy strong').innerHTML =
    `<span id="completed-count">${completed}</span> of ${tasks.length} tasks complete`;
  document.querySelector('#focus-ring').style.background =
    `conic-gradient(var(--mint) 0 ${percentage}%, #40504a ${percentage}% 100%)`;
  renderIcons();
  document
    .querySelector('#focus-ring')
    .setAttribute('aria-label', `${percentage} percent complete`);
  document.querySelector('#focus-ring span').innerHTML =
    `${percentage}<small>%</small>`;
  document.querySelector('[data-filter="all"] span').textContent = tasks.length;
  document.querySelector('[data-filter="progress"] span').textContent =
    tasks.filter((item) => item.status === 'progress').length;
  document.querySelector('[data-filter="completed"] span').textContent =
    completed;
  document.querySelector('#all-progress-count').textContent =
    `${tasks.filter((item) => item.status === 'progress').length} active`;
  document.querySelector('#all-completed-count').textContent =
    `${completed} finished`;
  document.querySelector('[data-filter="category"] span').textContent =
    categories.length;
};

document
  .querySelectorAll('[data-filter], [data-filter-jump]')
  .forEach((button) => {
    button.addEventListener('click', () =>
      showView(button.dataset.filter || button.dataset.filterJump),
    );
  });

document.querySelectorAll('.task-list').forEach((list) =>
  list.addEventListener('click', (event) => {
    const check = event.target.closest('.check-button');
    const edit = event.target.closest('.edit');
    const remove = event.target.closest('.delete');
    if (!check && !edit && !remove) return;
    const card = event.target.closest('.task-card');
    const task = tasks.find((item) => item.id === Number(card.dataset.taskId));
    if (check && task.status === 'progress') {
      if (task.pendingDone) {
        task.pendingDone = false;
        clearTimeout(completionTimers.get(task.id));
        completionTimers.delete(task.id);
        renderTasks();
        return;
      }
      task.pendingDone = true;
      completionTimers.set(
        task.id,
        setTimeout(() => {
          if (!task.pendingDone) return;
          task.status = 'done';
          delete task.pendingDone;
          completionTimers.delete(task.id);
          renderTasks();
          updateProgress();
        }, 10000),
      );
      renderTasks();
      return;
    }
    if (check) task.status = 'progress';
    if (edit) {
      editingTask = task;
      document.querySelector('#edit-title').value = task.title;
      document.querySelector('#edit-category').value = task.category;
      document.querySelector('#edit-date').value = editDateValue(task.date);
      toggleDialog('edit-dialog', true);
      document.querySelector('#edit-title').focus();
      return;
    }
    if (remove) {
      deletingTask = task;
      document.querySelector('#delete-copy').textContent =
        `“${task.title}” will be removed from your task lists.`;
      toggleDialog('delete-dialog', true);
      return;
    }
    renderTasks();
    updateProgress();
  }),
);

document.querySelector('#edit-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const updatedTitle = document.querySelector('#edit-title').value.trim();
  const updatedCategory = document.querySelector('#edit-category').value;
  const updatedDate = document.querySelector('#edit-date').value;
  if (!editingTask || !updatedTitle) return;
  editingTask.title = updatedTitle;
  editingTask.category = updatedCategory;
  editingTask.tag = categoryTags[updatedCategory];
  editingTask.date = formatTaskDate(updatedDate);
  toggleDialog('edit-dialog', false);
  editingTask = null;
  renderTasks();
  showToast('Task updated');
});

document.querySelector('#cancel-edit').addEventListener('click', () => {
  editingTask = null;
  toggleDialog('edit-dialog', false);
});

document.querySelector('#confirm-delete').addEventListener('click', () => {
  if (!deletingTask) return;
  tasks.splice(tasks.indexOf(deletingTask), 1);
  deletingTask = null;
  toggleDialog('delete-dialog', false);
  renderTasks();
  updateProgress();
  showToast('Task deleted');
});

document.querySelector('#cancel-delete').addEventListener('click', () => {
  deletingTask = null;
  toggleDialog('delete-dialog', false);
});

document.querySelector('#add-task').addEventListener('click', () => {
  toggleDialog('add-dialog', true);
  document.querySelector('#add-title').value = '';
  document.querySelector('#add-date').value = todayInputValue();
  document.querySelector('#add-title').focus();
});

document.querySelector('#add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = document.querySelector('#add-title').value.trim();
  const category = document.querySelector('#add-category').value;
  const date = document.querySelector('#add-date').value;
  if (!title) return;
  tasks.push({
    id: Math.max(0, ...tasks.map((task) => task.id)) + 1,
    title,
    category,
    tag: categoryTags[category],
    date: formatTaskDate(date),
    status: 'progress',
  });
  toggleDialog('add-dialog', false);
  renderTasks();
  updateProgress();
  showToast('Task added to your queue');
});

document.querySelector('#cancel-add').addEventListener('click', () => {
  toggleDialog('add-dialog', false);
});

document.querySelectorAll('.add-category-button').forEach((button) => {
  button.addEventListener('click', () => {
    editingCategory = null;
    document.querySelector('#category-dialog-title').textContent =
      'Add category';
    document.querySelector('#category-name-input').value = '';
    document.querySelector('#category-icon-input').value = 'folder';
    toggleDialog('category-dialog', true);
    document.querySelector('#category-name-input').focus();
  });
});

document.querySelectorAll('.category-grid').forEach((grid) => {
  grid.addEventListener('click', (event) => {
    const editButton = event.target.closest('.category-edit');
    if (!editButton) return;
    editingCategory = categories.find(
      (category) => category.id === Number(editButton.dataset.categoryId),
    );
    document.querySelector('#category-dialog-title').textContent =
      'Edit category';
    document.querySelector('#category-name-input').value = editingCategory.name;
    document.querySelector('#category-icon-input').value = editingCategory.icon;
    toggleDialog('category-dialog', true);
    document.querySelector('#category-name-input').focus();
  });
});

document.querySelector('#category-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#category-name-input').value.trim();
  const icon = document.querySelector('#category-icon-input').value;
  if (!name) return;
  if (editingCategory) {
    const previousName = editingCategory.name;
    editingCategory.name = name;
    editingCategory.icon = icon;
    tasks
      .filter((task) => task.category === previousName)
      .forEach((task) => {
        task.category = name;
        task.tag = categoryTags[name] || 'mint';
      });
  } else {
    categories.push({
      id: Math.max(0, ...categories.map((category) => category.id)) + 1,
      name,
      icon,
    });
  }
  toggleDialog('category-dialog', false);
  renderCategories();
  renderTasks();
  showToast(editingCategory ? 'Category updated' : 'Category added');
  editingCategory = null;
});

document.querySelector('#cancel-category').addEventListener('click', () => {
  editingCategory = null;
  toggleDialog('category-dialog', false);
});

renderTasks();
renderCategories();
