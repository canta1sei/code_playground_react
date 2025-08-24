import { useDraggable, useDroppable } from '@dnd-kit/core';

type Song = {
  id: string;
  title: string;
  color: 'pink' | 'red' | 'yellow' | 'purple' | 'green';
  isFreeSpot?: boolean;
};

interface Props {
  song: Song;
  isEditing: boolean;
  isOverlay?: boolean; // DragOverlay内での表示かどうかのフラグ
}

const colorClasses = {
  pink: 'bg-pink-300 text-white',
  red: 'bg-red-300 text-white',
  yellow: 'bg-yellow-300 text-gray-800',
  purple: 'bg-purple-300 text-white',
  green: 'bg-green-300 text-white',
};

export function SongCard({ song, isEditing, isOverlay }: Props) {
  const isDisabled = !isEditing || song.isFreeSpot;

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: song.id,
    disabled: isDisabled,
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: song.id,
    disabled: isDisabled,
  });

  const style = {
    // isDraggingがtrueの時に元の要素を非表示にする
    visibility: isDragging && !isOverlay ? 'hidden' : 'visible' as const,
  };

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const cardClasses = `
    aspect-square flex items-center justify-center p-1 rounded-lg text-xs md:text-sm font-semibold 
    transition-transform duration-200 whitespace-normal relative overflow-hidden
    ${song.isFreeSpot ? 'bg-pink-400 text-white shadow-lg' : colorClasses[song.color] + ' shadow'}
    ${isEditing && !song.isFreeSpot ? 'cursor-grab' : 'cursor-default'}
    ${isOverlay ? 'opacity-80 scale-105 shadow-lg spotlight' : ''} // Overlay用のスタイル
  `;

  const overlayClasses = `
    absolute inset-0 transition-all duration-300
    ${isOver && !isDragging ? 'border-4 border-white border-dashed sparkle' : ''}
  `;

  const content = song.isFreeSpot ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.28 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ) : (
    song.title
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cardClasses}>
      <div className={overlayClasses} />
      <div className="w-full h-full flex items-center justify-center text-center bingo-card-text-content">
        {content}
      </div>
    </div>
  );
}