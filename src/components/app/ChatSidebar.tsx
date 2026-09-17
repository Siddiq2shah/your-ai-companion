import { MoreHorizontal, Pencil, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Conversation = {
  id: string;
  title: string;
  pinned: boolean;
  updated_at: string;
};

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
};

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onTogglePin,
  onDelete,
}: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { pinned, recent } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = conversations.filter((c) =>
      q ? c.title.toLowerCase().includes(q) : true,
    );
    return {
      pinned: filtered.filter((c) => c.pinned),
      recent: filtered.filter((c) => !c.pinned),
    };
  }, [conversations, query]);

  const renderItem = (c: Conversation) => (
    <div
      key={c.id}
      className={cn(
        "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors",
        activeId === c.id ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
      )}
    >
      {editing === c.id ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onRename(c.id, draft.trim() || c.title);
            setEditing(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(null);
          }}
          className="h-7 text-sm"
        />
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            className="flex-1 truncate text-left"
          >
            {c.title || "New chat"}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Chat options"
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setDraft(c.title);
                  setEditing(c.id);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePin(c.id, !c.pinned)}>
                {c.pinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" /> Unpin
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" /> Pin
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(c.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col gap-3 bg-sidebar p-3">
      <Button onClick={onNew} className="w-full justify-start gap-2">
        <Plus className="h-4 w-4" /> New chat
      </Button>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="h-9 pl-8"
        />
      </div>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto">
        {pinned.length > 0 && (
          <section className="space-y-1">
            <h2 className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pinned
            </h2>
            {pinned.map(renderItem)}
          </section>
        )}
        <section className="space-y-1">
          <h2 className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent
          </h2>
          {recent.length === 0 && pinned.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">No chats yet.</p>
          ) : (
            recent.map(renderItem)
          )}
        </section>
      </div>
    </div>
  );
}
