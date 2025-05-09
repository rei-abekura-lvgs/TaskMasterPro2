import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type Category = {
  id: number;
  name: string;
  userId: number;
};

interface CategoryManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

export default function CategoryManageModal({ isOpen, onClose, userId }: CategoryManageModalProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // フェッチカテゴリー
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories', userId],
    queryFn: async () => {
      const response = await fetch(`/api/categories?userId=${userId}`);
      if (!response.ok) {
        throw new Error('カテゴリーの取得に失敗しました');
      }
      return response.json();
    },
    enabled: isOpen,
  });

  // カテゴリー作成
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'カテゴリーの作成に失敗しました');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'カテゴリーを作成しました',
        description: newCategoryName,
      });
      setNewCategoryName('');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      toast({
        title: 'カテゴリーの作成に失敗しました',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // カテゴリー削除
  const deleteMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'カテゴリーの削除に失敗しました');
      }

      return true;
    },
    onSuccess: () => {
      toast({
        title: 'カテゴリーを削除しました',
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      toast({
        title: 'カテゴリーの削除に失敗しました',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() === '') {
      toast({
        title: 'カテゴリー名を入力してください',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(newCategoryName);
  };

  const handleDeleteCategory = (categoryId: number) => {
    if (window.confirm('このカテゴリーを削除してもよろしいですか？関連するタスクのカテゴリー設定が解除されます。')) {
      deleteMutation.mutate(categoryId);
    }
  };

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg w-full max-w-md mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-neutral-700">
          <h2 className="text-lg font-medium">カテゴリー管理</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-medium mb-2">新しいカテゴリーを作成</h3>
          <form onSubmit={handleCreateCategory} className="mb-6">
            <div className="flex items-center">
              <input 
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="カテゴリー名"
                className="flex-1 px-3 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-neutral-700 dark:border-neutral-600"
              />
              <button 
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-r-lg transition-colors disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </form>
          
          <h3 className="font-medium mb-2">既存のカテゴリー</h3>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : categories && categories.length > 0 ? (
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                  <span>{category.name}</span>
                  <button 
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-600 text-red-500 transition-colors"
                  >
                    <span className="material-icons text-sm">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              カテゴリーがありません
            </p>
          )}
        </div>
        
        <div className="border-t dark:border-neutral-700 p-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-gray-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}