"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SentenceBuilderProps {
  words: string[];
  onChange: (words: string[]) => void;
}

function SortableWord({ id, index, word }: { id: string; index: number; word: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border border-panel-border bg-void-2 px-3 py-3"
    >
      <span className="text-xs text-neon-100/30 w-5 text-right">{index + 1}</span>
      <span className="flex-1 font-semibold tracking-wide text-neon-100">{word}</span>
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab touch-none text-neon-100/40 hover:text-neon-500 active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function SentenceBuilder({ words, onChange }: SentenceBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const ids = words.map((_, i) => `word-${i}`);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    onChange(arrayMove(words, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {words.map((word, index) => (
            <SortableWord key={ids[index]} id={ids[index]} index={index} word={word} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
