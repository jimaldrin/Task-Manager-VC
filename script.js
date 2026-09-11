const tasks = [];

const categories = [
  { id: 1, name: 'Priority', icon: 'flag', color: '#EF4444', locked: true },
  { id: 2, name: 'General', icon: 'layers-2', color: '#64748B', locked: true },
  { id: 3, name: 'Work', icon: 'briefcase-business', color: '#EF4444' },
  { id: 4, name: 'Personal', icon: 'user-round', color: '#F97316' },
  { id: 5, name: 'Home', icon: 'house', color: '#EAB308' },
  { id: 6, name: 'Learning', icon: 'book-open', color: '#22C55E' },
  { id: 7, name: 'Health', icon: 'heart', color: '#3B82F6' },
  { id: 8, name: 'Finance', icon: 'wallet', color: '#A855F7' },
];

const categoryTags = {
  Priority: 'coral',
  General: 'mint',
  Work: 'mint',
  Personal: 'coral',
  Home: 'yellow',
  Learning: 'lavender',
  Health: 'coral',
  Finance: 'yellow',
};

const readStoredValue = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

let profile = readStoredValue('tasker-profile', { name: 'Jim', picture: '' });
let trashItems = readStoredValue('tasker-trash', []);

const saveStoredValue = (key, value) =>
  localStorage.setItem(key, JSON.stringify(value));

const getCategory = (name) =>
  categories.find((category) => category.name === name);

const renderWeekCalendar = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  document.querySelector('#week-calendar-month').textContent =
    today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  document.querySelector('#week-calendar').innerHTML = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const isToday = date.toDateString() === today.toDateString();
      const label = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
      return `<span class="week-day${isToday ? ' today' : ''}" aria-label="${label}"><abbr title="${label}">${weekday}</abbr><strong>${date.getDate()}</strong></span>`;
    },
  ).join('');
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

const escapeHtml = (value) =>
  String(value).replace(/[&<>'"]/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
      character
    ],
  );

const taskMarkup = (task) => {
  const isDone = task.status === 'done' || task.pendingDone;
  const categoryColor = getCategory(task.category)?.color || '#2556EA';
  const title = escapeHtml(task.title);
  const category = escapeHtml(task.category);
  const note = task.note ? escapeHtml(task.note) : '';
  return `<article class="task-card ${isDone ? 'done' : ''} ${note ? 'has-note' : ''}" data-task-id="${task.id}">
  <button class="check-button" type="button" aria-label="${isDone ? 'Mark incomplete' : 'Mark complete'}">${isDone ? '<i data-lucide="check"></i>' : ''}</button>
  <div class="task-content"><p class="task-title">${title}</p>${note ? `<p class="task-note" title="${note}">${note}</p>` : ''}<div class="task-meta"><span class="tag" style="--tag-color: ${categoryColor}">${category}</span><span class="task-date">${task.date}</span></div></div>
  <div class="task-actions"><button class="task-action task-menu-button" type="button" aria-label="Task actions for ${title}" aria-haspopup="menu" aria-expanded="false" title="Task actions"><i data-lucide="ellipsis"></i></button><div class="task-menu" role="menu"><button class="task-menu-item edit" type="button" role="menuitem"><i data-lucide="pencil" aria-hidden="true"></i>Edit</button><button class="task-menu-item delete" type="button" role="menuitem"><i data-lucide="trash-2" aria-hidden="true"></i>Delete</button></div></div>
  </article>`;
};

const renderIcons = () => {
  if (window.lucide) window.lucide.createIcons();
};

const filteredTasks = () => {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return tasks;
  return tasks.filter((task) =>
    `${task.title} ${task.note || ''} ${task.category} ${task.date}`
      .toLowerCase()
      .includes(query),
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
            `<button class="search-result" type="button" data-task-id="${task.id}"><strong>${task.title}</strong><span>${task.category} · ${task.date}</span></button>`,
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
  document
    .querySelector('#empty-dashboard')
    .classList.toggle('hidden', tasks.length > 0 || searchQuery.trim());
  document
    .querySelector('#all-progress-section')
    .classList.toggle('hidden', tasks.length === 0 && !searchQuery.trim());
  document
    .querySelector('#all-completed-section')
    .classList.toggle('hidden', tasks.length === 0 && !searchQuery.trim());
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
        (task) => task.status === 'done' || task.pendingDone,
      ).length;
      const total = categoryTasks.length;
      const percent = total ? Math.round((completed / total) * 100) : 0;
      const categoryControl = category.locked
        ? '<span class="category-lock" title="Default category"><i data-lucide="lock-keyhole" aria-hidden="true"></i></span>'
        : `<button class="category-edit" type="button" data-category-id="${category.id}" aria-label="Edit ${category.name} category" title="Edit category"><i data-lucide="pencil"></i></button>`;
      return `<article class="category-card" data-category-id="${category.id}" tabindex="0" role="button" aria-label="Add task to ${category.name}"><div class="category-top"><p class="category-name">${category.name}</p>${categoryControl}</div><div><div class="category-bottom"><span class="category-percent">${percent}%</span><span class="category-total">${completed}/${total} completed</span></div><div class="progress-bar"><span style="--progress-color: ${category.color}; width: ${percent}%"></span></div></div></article>`;
    })
    .join('');
  document.querySelector('#category-grid').innerHTML = markup;
  document.querySelector('#all-category-grid').innerHTML = markup;
  document.querySelector('#category-count').textContent =
    `${categories.length} spaces`;
  const categoryOptions = categories
    .map(
      (category) =>
        `<option value="${category.name}">${category.name}</option>`,
    )
    .join('');
  const addCategorySelect = document.querySelector('#add-category');
  const editCategorySelect = document.querySelector('#edit-category');
  const selectedAddCategory = addCategorySelect.value;
  const selectedEditCategory = editCategorySelect.value;
  addCategorySelect.innerHTML = categoryOptions;
  editCategorySelect.innerHTML = categoryOptions;
  addCategorySelect.value = categories.some(
    (category) => category.name === selectedAddCategory,
  )
    ? selectedAddCategory
    : categories[0]?.name;
  editCategorySelect.value = categories.some(
    (category) => category.name === selectedEditCategory,
  )
    ? selectedEditCategory
    : categories[0]?.name;
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

const renderProfile = () => {
  const initials = profile.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'JS';
  const avatar = document.querySelector('#profile-button');
  const photo = document.querySelector('#profile-photo-preview');
  document.querySelector('#avatar-initials').textContent = initials;
  document.querySelector('#profile-photo-initials').textContent = initials;
  document.querySelector('#profile-name-display').textContent = profile.name;
  avatar.style.backgroundImage = profile.picture ? `url("${profile.picture}")` : '';
  avatar.style.backgroundSize = 'cover';
  document.querySelector('#avatar-initials').classList.toggle('hidden', Boolean(profile.picture));
  photo.src = profile.picture || '';
  photo.classList.toggle('hidden', !profile.picture);
  document.querySelector('#profile-photo-initials').classList.toggle('hidden', Boolean(profile.picture));
};

const renderTrash = () => {
  const list = document.querySelector('#trash-page-list');
  const count = `${trashItems.length} item${trashItems.length === 1 ? '' : 's'}`;
  document.querySelector('#trash-page-count').textContent = count;
  document.querySelector('#side-trash-count').textContent = trashItems.length;
  list.innerHTML = trashItems.length
    ? trashItems
        .map(
          (entry, index) =>
            `<div class="trash-item"><div><strong>${escapeHtml(entry.item.title || entry.item.name)}</strong><small>${entry.kind === 'task' ? 'Task' : 'Category'}</small></div><button class="restore-trash" type="button" data-trash-index="${index}">Restore</button></div>`,
        )
        .join('')
    : '<p class="trash-empty">Deleted tasks and categories will appear here.</p>';
};

const closeSidePanel = () =>
  document.querySelector('#side-panel-backdrop').classList.add('hidden');

document.querySelectorAll('[data-section-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const content = document.querySelector(`#${button.dataset.sectionToggle}`);
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    content.classList.toggle('hidden', isExpanded);
    button.setAttribute('aria-expanded', String(!isExpanded));
  });
});

const showToast = (message) => {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2200);
};

const toggleDialog = (id, open) =>
  document.querySelector(`#${id}`).classList.toggle('hidden', !open);

document.querySelector('#profile-button').addEventListener('click', () => {
  document.querySelector('#side-panel-backdrop').classList.remove('hidden');
  renderProfile();
  renderIcons();
});
document.querySelector('#close-side-panel').addEventListener('click', closeSidePanel);
document.querySelector('#side-panel-backdrop').addEventListener('click', (event) => {
  if (event.target === event.currentTarget) closeSidePanel();
});
document.querySelector('#profile-photo-button').addEventListener('click', () =>
  document.querySelector('#profile-picture-input').click(),
);
document.querySelector('#profile-picture-input').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Choose an image smaller than 2 MB');
    return;
  }
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    profile.picture = reader.result;
    saveStoredValue('tasker-profile', profile);
    renderProfile();
  });
  reader.readAsDataURL(file);
});
document.querySelector('#edit-profile-name').addEventListener('click', () => {
  const name = window.prompt('Set your name', profile.name)?.trim();
  if (!name) return;
  profile.name = name;
  saveStoredValue('tasker-profile', profile);
  renderProfile();
  showToast('Profile updated');
});
document.querySelectorAll('[data-side-view]').forEach((button) => {
  button.addEventListener('click', () => {
    const view = button.dataset.sideView;
    showView(view);
    document
      .querySelectorAll('[data-side-view]')
      .forEach((item) => item.classList.toggle('active', item === button));
    closeSidePanel();
  });
});
document.querySelector('#theme-toggle').addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('tasker-theme', isDark ? 'dark' : 'light');
  document.querySelector('#theme-toggle span').textContent = isDark ? 'Light mode' : 'Dark mode';
});
document.querySelector('#trash-page-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-trash-index]');
  if (!button) return;
  const index = Number(button.dataset.trashIndex);
  const entry = trashItems[index];
  if (!entry) return;
  if (entry.kind === 'task') {
    entry.item.category = categories.some((category) => category.name === entry.item.category)
      ? entry.item.category
      : 'General';
    tasks.push(entry.item);
  } else if (!categories.some((category) => category.name === entry.item.name)) {
    categories.splice(2, 0, entry.item);
  }
  trashItems.splice(index, 1);
  saveStoredValue('tasker-trash', trashItems);
  renderTasks();
  updateProgress();
  renderTrash();
  showToast(`${entry.kind === 'task' ? 'Task' : 'Category'} restored`);
});

document.querySelector('#search-button').addEventListener('click', () => {
  toggleDialog('search-dialog', true);
  document.querySelector('#search-input').focus();
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    toggleDialog('search-dialog', true);
    document.querySelector('#search-input').focus();
  }
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

document.querySelector('#search-results').addEventListener('click', (event) => {
  const result = event.target.closest('[data-task-id]');
  if (!result) return;
  const task = tasks.find((item) => item.id === Number(result.dataset.taskId));
  if (!task) return;

  searchQuery = '';
  document.querySelector('#search-input').value = '';
  toggleDialog('search-dialog', false);
  renderTasks();
  showView(task.status === 'done' ? 'completed' : 'progress');

  requestAnimationFrame(() => {
    const taskCard = document.querySelector(
      `#${task.status === 'done' ? 'completed-list' : 'progress-list'} [data-task-id="${task.id}"]`,
    );
    if (!taskCard) return;
    taskCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    taskCard.classList.add('task-card-highlight');
    setTimeout(() => taskCard.classList.remove('task-card-highlight'), 1800);
  });
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
    `conic-gradient(#ffffff 0 ${percentage}%, rgba(255, 255, 255, 0.26) ${percentage}% 100%)`;
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
  renderCategories();
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
    const menuButton = event.target.closest('.task-menu-button');
    const edit = event.target.closest('.edit');
    const remove = event.target.closest('.delete');
    const card = event.target.closest('.task-card');
    if (!card) return;
    if (!check && !menuButton && !edit && !remove) {
      if (event.target.closest('.task-actions')) return;
      if (card.classList.contains('has-note'))
        card.classList.toggle('note-expanded');
      return;
    }
    const task = tasks.find((item) => item.id === Number(card.dataset.taskId));
    if (menuButton) {
      document.querySelectorAll('.task-card.menu-open').forEach((openCard) => {
        if (openCard === card) return;
        openCard.classList.remove('menu-open');
        openCard
          .querySelector('.task-menu-button')
          .setAttribute('aria-expanded', 'false');
      });
      const isOpen = card.classList.toggle('menu-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      return;
    }
    if (edit || remove) {
      card.classList.remove('menu-open');
      card.querySelector('.task-menu-button').setAttribute('aria-expanded', 'false');
    }
    if (check && task.status === 'progress') {
      if (task.pendingDone) {
        task.pendingDone = false;
        clearTimeout(completionTimers.get(task.id));
        completionTimers.delete(task.id);
        renderTasks();
        updateProgress();
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
      updateProgress();
      return;
    }
    if (check) task.status = 'progress';
    if (edit) {
      editingTask = task;
      document.querySelector('#edit-title').value = task.title;
      document.querySelector('#edit-note').value = task.note || '';
      document.querySelector('#edit-note-count').textContent =
        `${(task.note || '').length} / 200 characters`;
      document.querySelector('#edit-category').value = task.category;
      document.querySelector('#edit-created-date').value =
        task.createdDate || todayInputValue();
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

document.addEventListener('click', (event) => {
  if (event.target.closest('.task-actions')) return;
  document.querySelectorAll('.task-card.menu-open').forEach((card) => {
    card.classList.remove('menu-open');
    card.querySelector('.task-menu-button').setAttribute('aria-expanded', 'false');
  });
});

document.querySelector('#edit-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const updatedTitle = document.querySelector('#edit-title').value.trim();
  const updatedNote = document.querySelector('#edit-note').value.trim();
  const updatedCategory = document.querySelector('#edit-category').value;
  const updatedCreatedDate = document.querySelector('#edit-created-date').value;
  const updatedDate = document.querySelector('#edit-date').value;
  if (!editingTask || !updatedTitle || !updatedCreatedDate) return;
  editingTask.title = updatedTitle;
  editingTask.note = updatedNote;
  editingTask.category = updatedCategory;
  editingTask.tag = categoryTags[updatedCategory];
  editingTask.createdDate = updatedCreatedDate;
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
  trashItems.unshift({ kind: 'task', item: { ...deletingTask } });
  saveStoredValue('tasker-trash', trashItems);
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

const openAddTaskDialog = (categoryName = '') => {
  document.querySelector('#add-title').value = '';
  document.querySelector('#add-note').value = '';
  document.querySelector('#add-note-count').textContent = '0 / 200 characters';
  document.querySelector('#add-category').value = categoryName || 'General';
  document.querySelector('#add-created-date').value = todayInputValue();
  document.querySelector('#add-date').value = todayInputValue();
  toggleDialog('add-dialog', true);
  document.querySelector('#add-title').focus();
};

document.querySelector('#add-task').addEventListener('click', () => {
  openAddTaskDialog();
});

document.querySelector('#edit-note').addEventListener('input', (event) => {
  document.querySelector('#edit-note-count').textContent =
    `${event.target.value.length} / 200 characters`;
});

document.querySelector('#empty-add-task').addEventListener('click', () => {
  openAddTaskDialog();
});

const updateBackToTopButton = () => {
  document
    .querySelector('#back-to-top')
    .classList.toggle('visible', window.scrollY > 360);
};

window.addEventListener('scroll', updateBackToTopButton, { passive: true });
document.querySelector('#back-to-top').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('#add-note').addEventListener('input', (event) => {
  document.querySelector('#add-note-count').textContent =
    `${event.target.value.length} / 200 characters`;
});

document.querySelector('#add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = document.querySelector('#add-title').value.trim();
  const note = document.querySelector('#add-note').value.trim();
  const category = document.querySelector('#add-category').value;
  const createdDate = document.querySelector('#add-created-date').value;
  const date = document.querySelector('#add-date').value;
  if (!title || !createdDate) return;
  tasks.push({
    id: Math.max(0, ...tasks.map((task) => task.id)) + 1,
    title,
    note,
    category,
    tag: categoryTags[category],
    createdDate,
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
    document.querySelector('#category-color-input').value = '#EF4444';
    document.querySelector('#delete-category').classList.add('hidden');
    document
      .querySelectorAll('.color-option')
      .forEach((option) =>
        option.classList.toggle('selected', option.dataset.color === '#EF4444'),
      );
    toggleDialog('category-dialog', true);
    document.querySelector('#category-name-input').focus();
  });
});

document.querySelectorAll('.category-grid').forEach((grid) => {
  grid.addEventListener('click', (event) => {
    const editButton = event.target.closest('.category-edit');
    const card = event.target.closest('.category-card');
    if (!card) return;
    if (!editButton) {
      const category = categories.find(
        (item) => item.id === Number(card.dataset.categoryId),
      );
      openAddTaskDialog(category?.name || '');
      return;
    }
    editingCategory = categories.find(
      (category) => category.id === Number(editButton.dataset.categoryId),
    );
    if (!editingCategory || editingCategory.locked) return;
    document.querySelector('#category-dialog-title').textContent =
      'Edit category';
    document.querySelector('#category-name-input').value = editingCategory.name;
    document.querySelector('#category-icon-input').value = editingCategory.icon;
    document.querySelector('#category-color-input').value =
      editingCategory.color;
    document.querySelector('#delete-category').classList.remove('hidden');
    document
      .querySelectorAll('.color-option')
      .forEach((option) =>
        option.classList.toggle(
          'selected',
          option.dataset.color === editingCategory.color,
        ),
      );
    toggleDialog('category-dialog', true);
    document.querySelector('#category-name-input').focus();
  });
});

document.querySelector('#category-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#category-name-input').value.trim();
  const icon = document.querySelector('#category-icon-input').value;
  const color = document.querySelector('#category-color-input').value;
  if (!name) return;
  if (editingCategory) {
    if (editingCategory.locked) return;
    const previousName = editingCategory.name;
    editingCategory.name = name;
    editingCategory.icon = icon;
    editingCategory.color = color;
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
      color,
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

document.querySelector('#delete-category').addEventListener('click', () => {
  if (!editingCategory || editingCategory.locked) return;
  const removedCategory = editingCategory.name;
  const generalCategory = categories.find(
    (category) => category.name === 'General',
  );
  tasks
    .filter((task) => task.category === removedCategory)
    .forEach((task) => {
      task.category = generalCategory.name;
      task.tag = categoryTags.General;
    });
  trashItems.unshift({ kind: 'category', item: { ...editingCategory } });
  saveStoredValue('tasker-trash', trashItems);
  categories.splice(categories.indexOf(editingCategory), 1);
  editingCategory = null;
  toggleDialog('category-dialog', false);
  renderTasks();
  updateProgress();
  showToast('Category deleted; tasks moved to General');
});

document
  .querySelector('#category-color-options')
  .addEventListener('click', (event) => {
    const option = event.target.closest('.color-option');
    if (!option) return;
    document.querySelector('#category-color-input').value =
      option.dataset.color;
    document
      .querySelectorAll('.color-option')
      .forEach((button) =>
        button.classList.toggle('selected', button === option),
      );
  });

renderTasks();
updateProgress();
renderWeekCalendar();
updateBackToTopButton();
if (localStorage.getItem('tasker-theme') === 'dark') {
  document.body.classList.add('dark-mode');
  document.querySelector('#theme-toggle span').textContent = 'Light mode';
}
renderProfile();
renderTrash();
setInterval(() => {
  renderWeekCalendar();
}, 60000);
