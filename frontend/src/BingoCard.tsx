import { forwardRef } from 'react';
import BingoGrid from './BingoGrid';
import type { Song } from './types';

// Propsの型定義 (cardRefを削除)
interface Props {
  songs: Song[];
  isEditing: boolean;
  userName: string;
  onEditCell: (id: string) => void;
  onUserNameChange: (name: string) => void;
}

/**
 * ビンゴカード全体のUIを表示するコンポーネント
 * forwardRefを使用して親からのrefを受け取る
 */
export const BingoCard = forwardRef<HTMLDivElement, Props>(
  ({ songs, isEditing, userName, onEditCell, onUserNameChange }, ref) => {
    return (
      // 第2引数のrefをdivのref属性に設定
      <div ref={ref} className="w-full mx-auto bg-pink-100 rounded-2xl shadow-inner p-1">
        {/* カードヘッダー画像 */}
        <div className="h-24 bg-pink-200 rounded-t-xl mb-4 flex items-center justify-center overflow-hidden">
          <img src="/BINGO_HEDDER.png" alt="Header" className="w-full h-full object-cover" />
        </div>
        {/* ビンゴのマス目 */}
        <BingoGrid
          songs={songs}
          isEditing={isEditing}
          onEditCell={onEditCell}
        />
        {/* カードフッター */}
        <div className="mt-4 flex justify-between items-center bg-white/50 text-gray-600 text-xs md:text-sm px-4 py-2 rounded-b-xl">
          <span className="text-cute">勝手にBINGO NIGHT</span>
          {/* 編集モードの場合は入力欄、そうでなければテキストを表示 */}
          {isEditing ? (
            <input
              type="text"
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              className="bg-transparent border-b border-gray-400 focus:outline-none text-gray-600 text-xs md:text-sm w-24 text-right"
            />
          ) : (
            <span>Name: {userName}</span>
          )}
        </div>
      </div>
    );
  }
);

BingoCard.displayName = 'BingoCard'; // React DevToolsでの表示名を設定