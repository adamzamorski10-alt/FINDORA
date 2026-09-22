import { BudgetRepository } from '../../infrastructure/repositories/budget-repository.js';

export function createCategoryModule({ categoryRepository, budgetRepository }) {
  const categoryRepo = categoryRepository;
  const budgetRepo = budgetRepository;

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  async function createCategory({ userId, name, type, icon, color, parentId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!name || typeof name !== 'string' || name.trim() === '' || name.length > 50) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!['income', 'expense'].includes(type)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!icon || typeof icon !== 'string' || icon.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!color || typeof color !== 'string' || color.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (parentId !== undefined && parentId !== null) {
      throw new Error('VALIDATION_FAILED');
    }

    const id = generateId();
    const now = new Date().toISOString();
    const category = {
      id,
      userId,
      name,
      type,
      icon,
      color,
      parentId: null,
      isSystem: false,
      systemRole: null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    await categoryRepo.save(category);
    return category;
  }

  async function getSystemCategories({ userId }) {
    return await categoryRepo.findSystem();
  }

  async function getCategories({ userId }) {
    const all = await categoryRepo.loadAll();
    return all.filter(category => !category.archived);
  }

  async function seedSystemCategories({ userId }) {
    const existing = await categoryRepo.findSystem();
    const existingSystemRoles = new Set(existing.map(c => c.systemRole).filter(Boolean));

    const now = new Date().toISOString();
    const toCreate = [];

    if (!existingSystemRoles.has('opening-balance')) {
      toCreate.push({
        id: 'system-opening-balance',
        userId,
        name: 'Opening Balance',
        type: 'expense',
        icon: 'circle',
        color: '#888888',
        parentId: null,
        isSystem: true,
        systemRole: 'opening-balance',
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!existingSystemRoles.has('savings')) {
      toCreate.push({
        id: 'cat-savings',
        userId,
        name: 'Savings',
        type: 'expense',
        icon: 'piggy-bank',
        color: '#00FF00',
        parentId: null,
        isSystem: true,
        systemRole: 'savings',
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const category of toCreate) {
      await categoryRepo.save(category);
    }

    return toCreate.length;
  }

  async function archiveCategory({ categoryId }) {
    if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await categoryRepo.findById(categoryId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.isSystem) {
      throw new Error('VALIDATION_FAILED');
    }

    const budgets = await budgetRepo.findByCategory(categoryId);
    const activeBudget = budgets.find(budget => !budget.archived);
    if (activeBudget) {
      throw new Error('VALIDATION_FAILED');
    }

    existing.archived = true;
    existing.updatedAt = new Date().toISOString();
    await categoryRepo.save(existing);
    return existing;
  }

  return {
    createCategory,
    getSystemCategories,
    getCategories,
    seedSystemCategories,
    archiveCategory,
  };
}
