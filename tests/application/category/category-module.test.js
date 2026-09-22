import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCategoryModule } from '../../../src/application/category/category-module.js';
import { CategoryRepository } from '../../../src/infrastructure/repositories/category-repository.js';
import { BudgetRepository } from '../../../src/infrastructure/repositories/budget-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('CategoryModule', () => {
  describe('construction', () => {
    it('creates a module with injected dependencies', async () => {
      const module = createCategoryModule({
        categoryRepository: {},
        budgetRepository: {},
      });
      assert.ok(module);
      assert.strictEqual(typeof module.createCategory, 'function');
      assert.strictEqual(typeof module.getSystemCategories, 'function');
      assert.strictEqual(typeof module.archiveCategory, 'function');
    });
  });

  describe('createCategory', () => {
    it('creates category with valid input', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const category = await module.createCategory({
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
      });

      assert.strictEqual(category.userId, 'user-1');
      assert.strictEqual(category.name, 'Food');
      assert.strictEqual(category.type, 'expense');
      assert.strictEqual(category.isSystem, false);
      assert.strictEqual(category.systemRole, null);
      assert.strictEqual(category.parentId, null);
      assert.strictEqual(category.archived, false);
      assert.ok(category.id);
      assert.ok(category.createdAt);
      assert.ok(category.updatedAt);
    });

    it('creates category with null parentId', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const category = await module.createCategory({
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
        parentId: null,
      });

      assert.strictEqual(category.parentId, null);
    });

    it('throws VALIDATION_FAILED for missing userId', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({});
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty name', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: '', type: 'expense', icon: 'utensils', color: '#FF0000' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for name exceeding 50 chars', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: 'a'.repeat(51), type: 'expense', icon: 'utensils', color: '#FF0000' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid type', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: 'Food', type: 'investment', icon: 'utensils', color: '#FF0000' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty icon', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: 'Food', type: 'expense', icon: '', color: '#FF0000' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty color', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for non-null parentId', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: 'parent-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const categoryRepo = { save: async () => { throw new Error('STORAGE_UNAVAILABLE'); } };
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('does not create hierarchy behavior', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const category = await module.createCategory({
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
      });

      assert.strictEqual(category.parentId, null);
    });

    it('ignores caller-supplied system fields', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const category = await module.createCategory({
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
        isSystem: true,
        systemRole: 'savings',
        archived: true,
      });

      assert.strictEqual(category.isSystem, false);
      assert.strictEqual(category.systemRole, null);
      assert.strictEqual(category.archived, false);
    });

    it('throws VALIDATION_FAILED for whitespace-only userId', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: '   ', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for whitespace-only name', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: '   ', type: 'expense', icon: 'utensils', color: '#FF0000' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for whitespace-only icon', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: 'Food', type: 'expense', icon: '   ', color: '#FF0000' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for whitespace-only color', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.createCategory({ userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '   ' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('getSystemCategories', () => {
    it('returns system categories', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const systemCategory = {
        id: 'cat-sys',
        userId: 'user-1',
        name: 'Savings',
        type: 'expense',
        icon: 'piggy-bank',
        color: '#00FF00',
        parentId: null,
        isSystem: true,
        systemRole: 'savings',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await categoryRepo.save(systemCategory);

      const systemCategories = await module.getSystemCategories({ userId: 'user-1' });
      assert.strictEqual(systemCategories.length, 1);
      assert.strictEqual(systemCategories[0].id, 'cat-sys');
    });

    it('returns empty array when no system categories exist', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const systemCategories = await module.getSystemCategories({ userId: 'user-1' });
      assert.deepEqual(systemCategories, []);
    });

    it('returns only system categories, not user categories', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      await categoryRepo.save({
        id: 'cat-sys',
        userId: 'user-1',
        name: 'Savings',
        type: 'expense',
        icon: 'piggy-bank',
        color: '#00FF00',
        parentId: null,
        isSystem: true,
        systemRole: 'savings',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
      await categoryRepo.save({
        id: 'cat-user',
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
        parentId: null,
        isSystem: false,
        systemRole: null,
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const systemCategories = await module.getSystemCategories({ userId: 'user-1' });
      assert.strictEqual(systemCategories.length, 1);
      assert.strictEqual(systemCategories[0].id, 'cat-sys');
    });

    it('does not leak another user system categories', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepoUser1 = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const categoryRepoUser2 = new CategoryRepository(storage, 'user-2', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepoUser1, budgetRepository: budgetRepo });

      await categoryRepoUser2.save({
        id: 'cat-sys-2',
        userId: 'user-2',
        name: 'Savings',
        type: 'expense',
        icon: 'piggy-bank',
        color: '#00FF00',
        parentId: null,
        isSystem: true,
        systemRole: 'savings',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const systemCategories = await module.getSystemCategories({ userId: 'user-1' });
      assert.deepEqual(systemCategories, []);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const categoryRepo = { findSystem: async () => { throw new Error('STORAGE_UNAVAILABLE'); } };
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: {} });
      let thrown = false;
      try {
        await module.getSystemCategories({ userId: 'user-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });
  });

  describe('archiveCategory', () => {
    it('archives an active user category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const category = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
        parentId: null,
        isSystem: false,
        systemRole: null,
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await categoryRepo.save(category);

      const archived = await module.archiveCategory({ categoryId: 'cat-1' });
      assert.strictEqual(archived.archived, true);
      assert.ok(archived.updatedAt > '2024-01-01T00:00:00Z');
    });

    it('is idempotent for already archived category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const category = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
        parentId: null,
        isSystem: false,
        systemRole: null,
        archived: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await categoryRepo.save(category);

      const result = await module.archiveCategory({ categoryId: 'cat-1' });
      assert.strictEqual(result.archived, true);
    });

    it('throws NOT_FOUND for missing category', async () => {
      const categoryRepo = { findById: async () => null };
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: {} });
      let thrown = false;
      try {
        await module.archiveCategory({ categoryId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty categoryId', async () => {
      const module = createCategoryModule({ categoryRepository: {}, budgetRepository: {} });
      let thrown = false;
      try {
        await module.archiveCategory({ categoryId: '' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for system category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const systemCategory = {
        id: 'cat-sys',
        userId: 'user-1',
        name: 'Savings',
        type: 'expense',
        icon: 'piggy-bank',
        color: '#00FF00',
        parentId: null,
        isSystem: true,
        systemRole: 'savings',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await categoryRepo.save(systemCategory);

      let thrown = false;
      try {
        await module.archiveCategory({ categoryId: 'cat-sys' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED when active budget references category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const category = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
        parentId: null,
        isSystem: false,
        systemRole: null,
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await categoryRepo.save(category);
      await budgetRepo.save({
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 500,
        period: 'monthly',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      let thrown = false;
      try {
        await module.archiveCategory({ categoryId: 'cat-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('archives category when only archived budgets reference it', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const category = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
        parentId: null,
        isSystem: false,
        systemRole: null,
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await categoryRepo.save(category);
      await budgetRepo.save({
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 500,
        period: 'monthly',
        archived: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const archived = await module.archiveCategory({ categoryId: 'cat-1' });
      assert.strictEqual(archived.archived, true);
    });

    it('does not allow another user budget to block current user category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepoUser1 = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const budgetRepoUser2 = new BudgetRepository(storage, 'user-2', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepoUser1 });

      const category = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
        parentId: null,
        isSystem: false,
        systemRole: null,
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await categoryRepo.save(category);
      await budgetRepoUser2.save({
        id: 'budget-2',
        userId: 'user-2',
        categoryId: 'cat-1',
        amount: 500,
        period: 'monthly',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const archived = await module.archiveCategory({ categoryId: 'cat-1' });
      assert.strictEqual(archived.archived, true);
    });

    it('rejects archival of already archived category with active budget', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });

      const category = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
        parentId: null,
        isSystem: false,
        systemRole: null,
        archived: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await categoryRepo.save(category);
      await budgetRepo.save({
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 500,
        period: 'monthly',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      let thrown = false;
      try {
        await module.archiveCategory({ categoryId: 'cat-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const categoryRepo = {
        findById: async () => ({ id: 'cat-1', isSystem: false, archived: false }),
        save: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
      };
      const budgetRepo = { findByCategory: async () => [] };
      const module = createCategoryModule({ categoryRepository: categoryRepo, budgetRepository: budgetRepo });
      let thrown = false;
      try {
        await module.archiveCategory({ categoryId: 'cat-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });
  });
});
