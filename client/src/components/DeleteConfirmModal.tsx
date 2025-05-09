import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskTitle: string;
}

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  taskTitle
}: DeleteConfirmModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl text-red-600">タスクの削除</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            このアクションは元に戻せません。本当にこのタスクを削除しますか？
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-medium text-gray-800">{taskTitle}</p>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            <span className="material-icons mr-2 text-sm">delete</span>
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}