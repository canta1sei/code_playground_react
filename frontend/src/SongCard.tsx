import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Song } from './types'; // Import Song type from types.ts

interface Props {
  song: Song;
  isEditing: boolean;
  isOverlay?: boolean;
}

// カラーセットを拡張してボーダーカラーも管理
const colorStyles = {
  pink:   { bg: 'bg-pink-300',   text: 'text-pink-900', border: 'border-pink-400' },
  red:    { bg: 'bg-red-300',    text: 'text-red-900',   border: 'border-red-400' },
  yellow: { bg: 'bg-yellow-300', text: 'text-yellow-900',border: 'border-yellow-400' },
  purple: { bg: 'bg-purple-300', text: 'text-purple-900',border: 'border-purple-400' },
  green:  { bg: 'bg-green-300',  text: 'text-green-900', border: 'border-green-400' },
};

export function SongCard({ song, isEditing, isOverlay }: Props) {
  const isDisabled = !isEditing || song.isFreeSpot;

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: song.id,
    disabled: isDisabled,
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: song.id,
    disabled: isDisabled,
  });

  const style: React.CSSProperties = {
    visibility: isDragging && !isOverlay ? 'hidden' : 'visible',
  };

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const songColorStyle = song.isFreeSpot ? 
    { bg: 'bg-pink-400', text: 'text-white', border: 'border-pink-500' } : 
    colorStyles[song.color];

  const cardClasses = `
    aspect-square flex items-center justify-center p-1 rounded-lg text-center
    text-[0.6rem] font-bold leading-tight whitespace-normal overflow-hidden
    border-2
    transition-all duration-200
    ${songColorStyle.bg} ${songColorStyle.text} ${songColorStyle.border}
    ${isEditing && !song.isFreeSpot ? 'cursor-grab active:scale-95' : 'cursor-default'}
    ${isOverlay ? 'opacity-80 scale-105' : ''}
  `;

  const content = song.isFreeSpot ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.28 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ) : (
    (song.shortTitle || song.title)
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cardClasses}>
      {content}
    </div>
  );
}
