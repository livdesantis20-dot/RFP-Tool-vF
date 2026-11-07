"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addPerson, removePerson } from "./actions";

type Person = { id: string; name: string; email: string; title: string | null; role: "coordinator" | "judge" };

export function PeopleAdmin({ people, currentUserId }: { people: Person[]; currentUserId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<"coordinator" | "judge">("judge");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-line border border-line rounded-md">
        {people.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy">
                {p.name} {p.id === currentUserId && <span className="text-muted font-normal">(you)</span>}
              </p>
              <p className="text-xs text-muted truncate">{[p.title, p.email].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={p.role === "coordinator" ? "accent" : "default"}>
                {p.role === "coordinator" ? "Coordinator" : "Steering Committee"}
              </Badge>
              {p.id !== currentUserId && (
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  className="text-muted hover:text-red-700"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Remove ${p.name}? Their scorecards will be deleted.`)) return;
                    start(async () => {
                      const r = await removePerson(p.id);
                      if (r.ok) router.refresh();
                      else toast.error(r.error);
                    });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="grid sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end">
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Title (e.g. CFO)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select value={role} onChange={(e) => setRole(e.target.value as "coordinator" | "judge")}>
          <option value="judge">Steering Committee</option>
          <option value="coordinator">Coordinator</option>
        </Select>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await addPerson({ name, email, title, role });
              if (r.ok) {
                setName("");
                setEmail("");
                setTitle("");
                toast.success("Added");
                router.refresh();
              } else toast.error(r.error);
            })
          }
        >
          Add person
        </Button>
      </div>
    </div>
  );
}
