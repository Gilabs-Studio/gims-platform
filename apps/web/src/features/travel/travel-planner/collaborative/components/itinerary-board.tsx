"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical, Plus, Route, StickyNote, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TravelPlanDay, TravelPlanDayNote, TravelPlanStop } from "../types";

interface ItineraryBoardProps {
  readonly days: TravelPlanDay[];
  readonly selectedDayIndex: number;
  readonly onSelectDay: (dayIndex: number) => void;
  readonly onChange: (days: TravelPlanDay[]) => void;
}

type ActiveItem =
  | { type: "stop"; dayIndex: number; id: string }
  | { type: "note"; dayIndex: number; id: string }
  | null;

function createTempId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function parseItemToken(token: string): ActiveItem {
  const [type, dayIndexString, id] = token.split(":");
  const dayIndex = Number(dayIndexString);
  if (!Number.isFinite(dayIndex) || !id) {
    return null;
  }
  if (type === "stop" || type === "note") {
    return {
      type,
      dayIndex,
      id,
    };
  }
  return null;
}

function parseLaneToken(token: string): { type: "stop" | "note"; dayIndex: number; targetId?: string } | null {
  const [kind, typeOrDay, dayOrId, optionalId] = token.split(":");

  if (kind === "lane") {
    const dayIndex = Number(dayOrId);
    if (!Number.isFinite(dayIndex) || (typeOrDay !== "stop" && typeOrDay !== "note")) {
      return null;
    }
    return { type: typeOrDay, dayIndex };
  }

  if (kind === "stop" || kind === "note") {
    const dayIndex = Number(typeOrDay);
    const targetId = dayOrId;
    if (!Number.isFinite(dayIndex) || !targetId) {
      return null;
    }
    return { type: kind, dayIndex, targetId };
  }

  if ((kind === "drop-stop" || kind === "drop-note") && optionalId) {
    const dayIndex = Number(typeOrDay);
    if (!Number.isFinite(dayIndex)) {
      return null;
    }
    return {
      type: kind === "drop-stop" ? "stop" : "note",
      dayIndex,
      targetId: optionalId,
    };
  }

  return null;
}

function reindexStops(stops: TravelPlanStop[]): TravelPlanStop[] {
  return stops.map((stop, index) => ({
    ...stop,
    order_index: index + 1,
  }));
}

function reindexNotes(notes: TravelPlanDayNote[]): TravelPlanDayNote[] {
  return notes.map((note, index) => ({
    ...note,
    order_index: index + 1,
  }));
}

function DayLane({
  id,
  isOverClassName,
  children,
}: {
  readonly id: string;
  readonly isOverClassName: string;
  readonly children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 rounded-md border border-dashed p-2 min-h-20 transition-colors ${
        isOver ? isOverClassName : "border-border"
      }`}
    >
      {children}
    </div>
  );
}

function DraggableStopCard({
  dayIndex,
  stop,
  onChange,
  onRemove,
}: {
  readonly dayIndex: number;
  readonly stop: TravelPlanStop;
  readonly onChange: (field: "place_name" | "note", value: string) => void;
  readonly onRemove: () => void;
}) {
  const id = `stop:${dayIndex}:${stop.id}`;
  const dropId = `drop-stop:${dayIndex}:${stop.id}`;

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: dropId });
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setDroppableRef(node);
      setDraggableRef(node);
    },
    [setDraggableRef, setDroppableRef],
  );

  return (
    <div
      ref={setRefs}
      className={`rounded-md border bg-card p-2 space-y-2 transition-all ${
        isOver ? "border-primary" : "border-border"
      } ${isDragging ? "opacity-40" : "opacity-100"}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground"
          aria-label="Drag stop"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-2">
          <Input
            value={stop.place_name}
            onChange={(event) => onChange("place_name", event.target.value)}
            placeholder="Stop name"
            className="h-8"
          />
          <Input
            value={stop.note ?? ""}
            onChange={(event) => onChange("note", event.target.value)}
            placeholder="Stop note"
            className="h-8"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 cursor-pointer"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[11px]">
          {stop.category}
        </Badge>
        <span>
          {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

function DraggableNoteCard({
  dayIndex,
  note,
  onChange,
  onRemove,
}: {
  readonly dayIndex: number;
  readonly note: TravelPlanDayNote;
  readonly onChange: (field: "note_text" | "icon_tag" | "note_time", value: string) => void;
  readonly onRemove: () => void;
}) {
  const id = `note:${dayIndex}:${note.id}`;
  const dropId = `drop-note:${dayIndex}:${note.id}`;

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: dropId });
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setDroppableRef(node);
      setDraggableRef(node);
    },
    [setDraggableRef, setDroppableRef],
  );

  return (
    <div
      ref={setRefs}
      className={`rounded-md border bg-card p-2 space-y-2 transition-all ${
        isOver ? "border-primary" : "border-border"
      } ${isDragging ? "opacity-40" : "opacity-100"}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground"
          aria-label="Drag note"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="grid flex-1 grid-cols-3 gap-2">
          <Input
            value={note.icon_tag ?? ""}
            onChange={(event) => onChange("icon_tag", event.target.value)}
            placeholder="icon"
            className="h-8"
          />
          <Input
            value={note.note_time ?? ""}
            onChange={(event) => onChange("note_time", event.target.value)}
            placeholder="08:00"
            className="h-8"
          />
          <Input
            value={note.note_text}
            onChange={(event) => onChange("note_text", event.target.value)}
            placeholder="Day note"
            className="h-8 col-span-3"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 cursor-pointer"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ItineraryBoard({ days, selectedDayIndex, onSelectDay, onChange }: ItineraryBoardProps) {
  const [activeItem, setActiveItem] = useState<ActiveItem>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateDayByIndex = useCallback(
    (dayIndex: number, updater: (day: TravelPlanDay) => TravelPlanDay) => {
      const nextDays = days.map((day) => (day.day_index === dayIndex ? updater(day) : day));
      onChange(nextDays);
    },
    [days, onChange],
  );

  const addStop = useCallback(
    (dayIndex: number) => {
      updateDayByIndex(dayIndex, (day) => {
        const nextStops = reindexStops([
          ...day.stops,
          {
            id: createTempId("stop"),
            place_name: "New Stop",
            latitude: -6.2088,
            longitude: 106.8456,
            category: "checkpoint",
            order_index: day.stops.length + 1,
            is_locked: false,
            source: "manual",
            photo_url: "",
            note: "",
          },
        ]);
        return { ...day, stops: nextStops };
      });
    },
    [updateDayByIndex],
  );

  const addNote = useCallback(
    (dayIndex: number) => {
      updateDayByIndex(dayIndex, (day) => {
        const nextNotes = reindexNotes([
          ...day.notes,
          {
            id: createTempId("note"),
            icon_tag: "note",
            note_text: "",
            note_time: "",
            order_index: day.notes.length + 1,
          },
        ]);
        return { ...day, notes: nextNotes };
      });
    },
    [updateDayByIndex],
  );

  const addDay = useCallback(() => {
    const sortedDays = [...days].sort((a, b) => a.day_index - b.day_index);
    const lastDay = sortedDays[sortedDays.length - 1];
    const nextDayIndex = (lastDay?.day_index ?? 0) + 1;
    const nextDate = new Date(lastDay?.day_date ?? new Date().toISOString().slice(0, 10));
    nextDate.setDate(nextDate.getDate() + 1);

    onChange([
      ...sortedDays,
      {
        id: createTempId("day"),
        day_index: nextDayIndex,
        day_date: nextDate.toISOString().slice(0, 10),
        summary: "",
        stops: [
          {
            id: createTempId("stop"),
            place_name: "New Stop",
            latitude: -6.2088,
            longitude: 106.8456,
            category: "checkpoint",
            order_index: 1,
            is_locked: false,
            source: "manual",
            photo_url: "",
            note: "",
          },
        ],
        notes: [],
      },
    ]);
  }, [days, onChange]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const token = String(event.active.id);
    setActiveItem(parseItemToken(token));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null);
      if (!event.over) {
        return;
      }

      const source = parseItemToken(String(event.active.id));
      const destination = parseLaneToken(String(event.over.id));
      if (!source || !destination || source.type !== destination.type) {
        return;
      }

      const nextDays = days.map((day) => ({
        ...day,
        stops: [...day.stops],
        notes: [...day.notes],
      }));

      const sourceDayIndex = nextDays.findIndex((day) => day.day_index === source.dayIndex);
      const targetDayIndex = nextDays.findIndex((day) => day.day_index === destination.dayIndex);
      if (sourceDayIndex < 0 || targetDayIndex < 0) {
        return;
      }

      if (source.type === "stop") {
        const sourceStops = nextDays[sourceDayIndex].stops;
        const movingIndex = sourceStops.findIndex((stop) => stop.id === source.id);
        if (movingIndex < 0) {
          return;
        }

        const [movingStop] = sourceStops.splice(movingIndex, 1);
        const targetStops = nextDays[targetDayIndex].stops;
        const targetIndex = destination.targetId
          ? Math.max(
              0,
              targetStops.findIndex((stop) => stop.id === destination.targetId),
            )
          : targetStops.length;

        targetStops.splice(targetIndex, 0, movingStop);

        nextDays[sourceDayIndex].stops = reindexStops(sourceStops);
        nextDays[targetDayIndex].stops = reindexStops(targetStops);
      }

      if (source.type === "note") {
        const sourceNotes = nextDays[sourceDayIndex].notes;
        const movingIndex = sourceNotes.findIndex((note) => note.id === source.id);
        if (movingIndex < 0) {
          return;
        }

        const [movingNote] = sourceNotes.splice(movingIndex, 1);
        const targetNotes = nextDays[targetDayIndex].notes;
        const targetIndex = destination.targetId
          ? Math.max(
              0,
              targetNotes.findIndex((note) => note.id === destination.targetId),
            )
          : targetNotes.length;

        targetNotes.splice(targetIndex, 0, movingNote);

        nextDays[sourceDayIndex].notes = reindexNotes(sourceNotes);
        nextDays[targetDayIndex].notes = reindexNotes(targetNotes);
      }

      onChange(nextDays);
    },
    [days, onChange],
  );

  const sortedDays = [...days].sort((a, b) => a.day_index - b.day_index);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Itinerary Planner</CardTitle>
          <Button type="button" size="sm" className="cursor-pointer" onClick={addDay}>
            <Plus className="h-4 w-4 mr-1" />
            Add Day
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            {sortedDays.map((day) => {
              const isSelected = selectedDayIndex === day.day_index;
              return (
                <div
                  key={day.id}
                  className={`rounded-lg border p-3 space-y-3 ${isSelected ? "border-primary" : "border-border"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="cursor-pointer text-left"
                      onClick={() => onSelectDay(day.day_index)}
                    >
                      <p className="text-sm font-semibold">Day {day.day_index}</p>
                      <p className="text-xs text-muted-foreground">{day.day_date}</p>
                    </button>
                  </div>

                  <Input
                    value={day.summary ?? ""}
                    placeholder="Day summary"
                    onChange={(event) => {
                      updateDayByIndex(day.day_index, (current) => ({
                        ...current,
                        summary: event.target.value,
                      }));
                    }}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-medium">
                        <Route className="h-3.5 w-3.5" />
                        Stops
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 cursor-pointer"
                        onClick={() => addStop(day.day_index)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Stop
                      </Button>
                    </div>
                    <DayLane id={`lane:stop:${day.day_index}`} isOverClassName="border-primary bg-primary/5">
                      {day.stops.map((stop) => (
                        <DraggableStopCard
                          key={stop.id}
                          dayIndex={day.day_index}
                          stop={stop}
                          onChange={(field, value) => {
                            updateDayByIndex(day.day_index, (current) => ({
                              ...current,
                              stops: current.stops.map((item) =>
                                item.id === stop.id ? { ...item, [field]: value } : item,
                              ),
                            }));
                          }}
                          onRemove={() => {
                            updateDayByIndex(day.day_index, (current) => ({
                              ...current,
                              stops: reindexStops(current.stops.filter((item) => item.id !== stop.id)),
                            }));
                          }}
                        />
                      ))}
                    </DayLane>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-medium">
                        <StickyNote className="h-3.5 w-3.5" />
                        Day Notes
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 cursor-pointer"
                        onClick={() => addNote(day.day_index)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Note
                      </Button>
                    </div>
                    <DayLane id={`lane:note:${day.day_index}`} isOverClassName="border-primary bg-primary/5">
                      {day.notes.map((note) => (
                        <DraggableNoteCard
                          key={note.id}
                          dayIndex={day.day_index}
                          note={note}
                          onChange={(field, value) => {
                            updateDayByIndex(day.day_index, (current) => ({
                              ...current,
                              notes: current.notes.map((item) =>
                                item.id === note.id ? { ...item, [field]: value } : item,
                              ),
                            }));
                          }}
                          onRemove={() => {
                            updateDayByIndex(day.day_index, (current) => ({
                              ...current,
                              notes: reindexNotes(current.notes.filter((item) => item.id !== note.id)),
                            }));
                          }}
                        />
                      ))}
                    </DayLane>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DragOverlay>
        {activeItem ? (
          <div className="rounded-md border bg-card px-3 py-2 shadow-lg text-sm">
            {activeItem.type === "stop" ? "Moving stop" : "Moving note"}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
