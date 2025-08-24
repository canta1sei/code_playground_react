import { useRef, useEffect, type Dispatch } from 'react';
import { type AppAction, type AppState } from '../App';

type Song = {
  songId: string;
  title: string;
  isFreeSpot?: boolean;
};

export const useDragAndDrop = (songs: Song[], dispatch: Dispatch<AppAction>, currentDragState: AppState['dragState']) => {
  const draggedItem = useRef<number | null>(null);
  const cellRefs = useRef<(HTMLButtonElement | HTMLDivElement | null)[]>([]);

  // タッチイベント用のstateとref
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDraggedItemIndex = useRef<number | null>(null); // ドラッグ中のアイテムのインデックス

  const { dragOverIndex, draggingIndex, isDraggingActive } = currentDragState;

  // Effect to manage body scroll
  useEffect(() => {
    if (isDraggingActive) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    // Clean up on unmount
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isDraggingActive]);

  const handleDragStart = (index: number) => {
    draggedItem.current = index;
    dispatch({ type: 'SET_DRAGGING_INDEX', payload: index });
    dispatch({ type: 'SET_IS_DRAGGING_ACTIVE', payload: true });
  };

  const handleDragEnter = (index: number) => {
    if (songs[index].isFreeSpot) return;

    if (draggedItem.current !== null && draggedItem.current !== index) {
      dispatch({ type: 'SET_DRAG_OVER_INDEX', payload: index });
    }
  };

  const handleDragLeave = () => {
    dispatch({ type: 'SET_DRAG_OVER_INDEX', payload: null });
  };

  const handleDragEnd = () => {
    draggedItem.current = null;
    dispatch({ type: 'RESET_DRAG_STATE' });
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedItem.current === null) return;
    if (songs[targetIndex].isFreeSpot) return;

    const sourceIndex = draggedItem.current;
    if (sourceIndex !== targetIndex) {
      dispatch({ type: 'SWAP_SONGS', payload: { sourceIndex, targetIndex } });
    }
    dispatch({ type: 'RESET_DRAG_STATE' });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>, index: number) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDraggedItemIndex.current = index;
    handleDragStart(index);
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (touchDraggedItemIndex.current === null) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    let newDragOverIndex: number | null = null;

    cellRefs.current.forEach((cell, index) => {
      if (cell) {
        const rect = cell.getBoundingClientRect();
        if (
          touchX >= rect.left &&
          touchX <= rect.right &&
          touchY >= rect.top &&
          touchY <= rect.bottom
        ) {
          newDragOverIndex = index;
        }
      }
    });

    if (newDragOverIndex !== dragOverIndex) {
      dispatch({ type: 'SET_DRAG_OVER_INDEX', payload: newDragOverIndex });
    }
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (touchDraggedItemIndex.current === null) return;

    const touchX = e.changedTouches[0].clientX;
    const touchY = e.changedTouches[0].clientY;

    let targetIndex: number | null = null;

    cellRefs.current.forEach((cell, index) => {
      if (cell) {
        const rect = cell.getBoundingClientRect();
        if (
          touchX >= rect.left &&
          touchX <= rect.right &&
          touchY >= rect.top &&
          touchY <= rect.bottom
        ) {
          targetIndex = index;
        }
      }
    });

    if (targetIndex !== null) {
      handleDrop(targetIndex);
    } else {
      handleDragEnd();
    }
    touchDraggedItemIndex.current = null;
  };

  const setCellRef = (el: HTMLButtonElement | HTMLDivElement | null, index: number) => {
    cellRefs.current[index] = el;
  };

  return {
    dragOverIndex,
    draggingIndex,
    handleDragStart,
    handleDragEnter,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setCellRef,
  };
};
