'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type ListRow = { id: string; name: string; description: string | null; _count: { members: number } };

type MemberRow = {
  userId: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    roles: { role: { slug: string } }[];
  };
};

export default function AdminPushLijstenPage() {
  const { token, can } = useAuth();
  const [lists, setLists] = useState<ListRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    if (!token || !can('admin.push.lists')) return;
    try {
      setLists(await adminFetch<ListRow[]>('/admin/push/lists', token));
    } catch {
      setLists([]);
    }
  }, [token, can]);

  const loadMembers = useCallback(
    async (listId: string) => {
      if (!token) return;
      try {
        setMembers(await adminFetch<MemberRow[]>(`/admin/push/lists/${listId}/members`, token));
      } catch {
        setMembers([]);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (selected) void loadMembers(selected);
    else setMembers([]);
  }, [selected, loadMembers]);

  const createList = async () => {
    if (!token || !newName.trim()) return;
    setMsg(null);
    try {
      await adminFetch('/admin/push/lists', token, {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      setNewName('');
      setNewDesc('');
      await loadLists();
      setMsg('Lijst aangemaakt.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Aanmaken mislukt');
    }
  };

  const addMember = async () => {
    if (!token || !selected || !memberUserId.trim()) return;
    setMsg(null);
    try {
      await adminFetch(`/admin/push/lists/${selected}/members`, token, {
        method: 'POST',
        body: JSON.stringify({ userId: memberUserId.trim() }),
      });
      setMemberUserId('');
      await loadMembers(selected);
      await loadLists();
      setMsg('Lid toegevoegd.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Toevoegen mislukt');
    }
  };

  const removeMember = async (userId: string) => {
    if (!token || !selected) return;
    try {
      await adminFetch(`/admin/push/lists/${selected}/members/${userId}`, token, { method: 'DELETE' });
      await loadMembers(selected);
      await loadLists();
    } catch {
      /* ignore */
    }
  };

  const deleteList = async (id: string) => {
    if (!token || !confirm('Lijst verwijderen?')) return;
    try {
      await adminFetch(`/admin/push/lists/${id}`, token, { method: 'DELETE' });
      if (selected === id) setSelected(null);
      await loadLists();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Verwijderen mislukt');
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.push.lists')) {
    return <p className="text-sm text-muted">Je hebt geen rechten voor push-lijsten (admin.push.lists).</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Push-lijsten</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Maak lijsten met modellenaccounts en gebruik ze bij <strong>Pushberichten</strong> als doelgroep “Een push-lijst”.
        </p>
      </div>

      {msg ? <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">{msg}</p> : null}

      <section className="max-w-xl space-y-3 rounded border border-line bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Nieuwe lijst</h2>
        <input
          className="w-full border border-zinc-200 px-3 py-2 text-sm"
          placeholder="Naam"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <textarea
          className="min-h-[60px] w-full border border-zinc-200 px-3 py-2 text-sm"
          placeholder="Beschrijving (optioneel)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void createList()}
          className="rounded bg-burgundy px-4 py-2 text-sm font-medium text-white hover:bg-burgundyDeep"
        >
          Lijst aanmaken
        </button>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold text-ink">Jouw lijsten</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lists.map((l) => (
              <li
                key={l.id}
                className={`flex items-center justify-between gap-2 border px-3 py-2 ${
                  selected === l.id ? 'border-burgundy bg-burgundy/5' : 'border-line bg-white'
                }`}
              >
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelected(l.id)}>
                  <span className="font-medium text-ink">{l.name}</span>
                  <span className="text-muted"> — {l._count.members} leden</span>
                </button>
                <button
                  type="button"
                  className="shrink-0 text-xs text-red-700 hover:underline"
                  onClick={() => void deleteList(l.id)}
                >
                  Verwijder
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink">Leden {selected ? '' : '(kies een lijst)'}</h2>
          {selected ? (
            <>
              <div className="mt-3 flex gap-2">
                <input
                  className="min-w-0 flex-1 border border-zinc-200 px-3 py-2 text-xs"
                  placeholder="Gebruiker-ID (UUID)"
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void addMember()}
                  className="shrink-0 rounded bg-zinc-800 px-3 py-2 text-xs font-medium text-white"
                >
                  Toevoegen
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">UUID vind je in Gebruikers of Modellen (admin).</p>
              <ul className="mt-4 space-y-2 text-xs">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between border border-line bg-white px-2 py-1.5">
                    <span>
                      {[m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || '—'}{' '}
                      <span className="text-muted">{m.user.email}</span>
                    </span>
                    <button type="button" className="text-red-700 hover:underline" onClick={() => void removeMember(m.userId)}>
                      Verwijder
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Selecteer links een lijst.</p>
          )}
        </section>
      </div>
    </div>
  );
}
