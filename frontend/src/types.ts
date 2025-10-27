// 曲データの型定義
export type Song = {
  id: string; // dnd-kitで必須
  songId: string;
  title: string;
  shortTitle?: string; // 略称を追加
  color: 'pink' | 'red' | 'yellow' | 'purple';
  isFreeSpot?: boolean;
};
