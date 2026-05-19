'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type ListRow = {
  id: string;
  name: string;
  description: string | null;
  _count: { entries: number; campaigns: number };
};

type EntryRow = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  user: {
    id: string;
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export default function CommunicatieLijstenPage() {
  const { token, can } = useAuth();
  const canManage = can('admin.push.lists');

  const [lists, setLists] = useState<ListRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [importText, setImportText] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addName, setAddName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    if (!token || !canManage) return;
    try {
      setLists(await adminFetch<ListRow[]>('/admin/comms/lists', token));
    } catch {
      setLists([]);
    }
  }, [token, canManage]);

  const loadEntries = useCallback(
    async (listId: string) => {
      if (!token) return;
      try {
        const detail = await adminFetch<{ entries: EntryRow[] }>(`/admin/comms/lists/${listId}`, token);
        setEntries(detail.entries);
      } catch {
        setEntries([]);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (selected) void loadEntries(selected);
    else setEntries([]);
  }, [selected, loadEntries]);

  const createList = async () => {
    if (!token || !newName.trim()) return;
    setMsg(null);
    try {
      await adminFetch('/admin/comms/lists', token, {
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

  const importEntries = async () => {
    if (!token || !selected || !importText.trim()) return;
    setMsg(null);
    try {
      const res = await adminFetch<{ imported: number }>(`/admin/comms/lists/${selected}/import`, token, {
        method: 'POST',
        body: JSON.stringify({ text: importText }),
      });
      setImportText('');
      await loadEntries(selected);
      await loadLists();
      setMsg(`${res.imported} contact(en) geïmporteerd.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Importeren mislukt');
    }
  };

  const addEntry = async () => {
    if (!token || !selected) return;
    if (!addEmail.trim() && !addPhone.trim()) {
      setMsg('Vul e-mail of GSM in.');
      return;
    }
    setMsg(null);
    try {
      await adminFetch(`/admin/comms/lists/${selected}/entries`, token, {
        method: 'POST',
        body: JSON.stringify({
          email: addEmail.trim() || undefined,
          phone: addPhone.trim() || undefined,
          displayName: addName.trim() || undefined,
        }),
      });
      setAddEmail('');
      setAddPhone('');
      setAddName('');
      await loadEntries(selected);
      await loadLists();
      setMsg('Contact toegevoegd.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Toevoegen mislukt');
    }
  };

  const removeEntry = async (entryId: string) => {
    if (!token || !selected) return;
    try {
      await adminFetch(`/admin/comms/lists/${selected}/entries/${entryId}`, token, { method: 'DELETE' });
      await loadEntries(selected);
      await loadLists();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Verwijderen mislukt');
    }
  };

  const deleteList = async (id: string) => {
    if (!token || !window.confirm('Lijst definitief verwijderen?')) return;
    try {
      await adminFetch(`/admin/comms/lists/${id}`, token, { method: 'DELETE' });
      if (selected === id) setSelected(null);
      await loadLists();
      setMsg('Lijst verwijderd.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Verwijderen mislukt');
    }
  };

  if (!canManage) {
    return <p className="text-sm text-muted">Geen rechten om contactlijsten te beheren.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded border border-line bg-white p-4 space-y-2">
          <p className="text-xs font-medium text-ink">Nieuwe lijst</p>
          <input
            placeholder="Naam"
            className="w-full rounded border border-line px-2 py-1.5 text-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            placeholder="Omschrijving (optioneel)"
            className="w-full rounded border border-line px-2 py-1.5 text-sm"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void createList()}
            className="rounded bg-[#000b2b] px-3 py-1.5 text-xs font-medium text-white"
          >
            Aanmaken
          </button>
        </div>

        <ul className="space-y-1">
          {lists.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setSelected(l.id)}
                className={`w-full rounded border px-3 py-2 text-left text-sm ${
                  selected === l.id ? 'border-zinc-900 bg-zinc-50' : 'border-line bg-white'
                }`}
              >
                <span className="font-medium">{l.name}</span>
                <span className="ml-2 text-muted text-xs">
                  {l._count.entries} contacten · {l._count.campaigns} verzendingen
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        {selected ? (
          <>
            <div className="rounded border border-line bg-white p-4 space-y-2">
              <p className="text-xs font-medium text-ink">Contact toevoegen</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  placeholder="Naam"
                  className="rounded border border-line px-2 py-1.5 text-sm"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
                <input
                  placeholder="E-mail"
                  className="rounded border border-line px-2 py-1.5 text-sm"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                />
                <input
                  placeholder="GSM"
                  className="rounded border border-line px-2 py-1.5 text-sm"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                />
              </div>
              <button type="button" onClick={() => void addEntry()} className="text-xs text-burgundy underline">
                Toevoegen
              </button>
            </div>

            <div className="rounded border border-line bg-white p-4 space-y-2">
              <p className="text-xs font-medium text-ink">Importeren</p>
              <p className="text-xs text-muted">
                Eén adres per regel, of <code>naam;e-mail;gsm</code> gescheiden door puntkomma.
              </p>
              <textarea
                className="min-h-[100px] w-full rounded border border-line px-2 py-1.5 font-mono text-xs"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <button
                type="button"
                onClick={() => void importEntries()}
                className="rounded border border-line px-3 py-1.5 text-xs font-medium"
              >
                Importeren
              </button>
            </div>

            <div className="rounded border border-line bg-white overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="p-2 text-left">Naam</th>
                    <th className="p-2 text-left">E-mail</th>
                    <th className="p-2 text-left">GSM</th>
                    <th className="p-2 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const name =
                      e.displayName ||
                      [e.user?.firstName, e.user?.lastName].filter(Boolean).join(' ') ||
                      '—';
                    const email = e.email || e.user?.email || '—';
                    const phone = e.phone || e.user?.phone || '—';
                    return (
                      <tr key={e.id} className="border-t border-line">
                        <td className="p-2">{name}</td>
                        <td className="p-2 text-muted">{email}</td>
                        <td className="p-2 text-muted">{phone}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            className="text-red-700 underline"
                            onClick={() => void removeEntry(e.id)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="text-xs text-red-700 underline"
              onClick={() => void deleteList(selected)}
            >
              Lijst verwijderen
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">Selecteer een lijst links.</p>
        )}
      </div>

      {msg ? <p className="lg:col-span-2 text-sm text-ink">{msg}</p> : null}
    </div>
  );
}
