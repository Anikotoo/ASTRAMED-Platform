import React, { useState } from 'react';
import { UserPlus, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { CrewMember } from '../types/astramed';

interface Props {
  crewList: CrewMember[];
  onSaved: () => Promise<void> | void;
}

export const CrewProfiles: React.FC<Props> = ({ crewList, onSaved }) => {
  const [name, setName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [role, setRole] = useState<CrewMember['role']>('Mission Specialist');
  const [mission, setMission] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setNotice(null);
    try {
      const response = await fetch('/api/crew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), callsign: callsign.trim(), role, mission: mission.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save crew profile.');
      setNotice({ ok: true, text: 'Crew profile saved. No medical baseline or health readings were invented.' });
      setName(''); setCallsign(''); setMission('');
      await onSaved();
    } catch (error: any) {
      setNotice({ ok: false, text: error?.message || 'Profile save failed.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400"><Users className="w-4 h-4" /> CREW IDENTITY REGISTRY</div>
        <h1 className="text-xl font-bold text-white mt-1">Crew profiles</h1>
        <p className="text-xs text-slate-400 mt-1">Create a real or anonymised crew profile. Medical baselines remain empty until verified values are supplied separately.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form onSubmit={submit} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2"><UserPlus className="w-4 h-4 text-cyan-400" /> ADD CREW PROFILE</h2>
          <label className="block text-[10px] text-slate-400 font-mono">DISPLAY NAME OR ANONYMOUS ID *</label>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Crew Member 01" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
          <label className="block text-[10px] text-slate-400 font-mono">CALLSIGN / SUBJECT CODE *</label>
          <input required value={callsign} onChange={e => setCallsign(e.target.value)} placeholder="e.g. ASTRA-01" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
          <label className="block text-[10px] text-slate-400 font-mono">MISSION ROLE *</label>
          <select value={role} onChange={e => setRole(e.target.value as CrewMember['role'])} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
            {['Commander', 'Flight Engineer', 'Mission Specialist', 'Payload Specialist', 'Medical Officer'].map(value => <option key={value}>{value}</option>)}
          </select>
          <label className="block text-[10px] text-slate-400 font-mono">MISSION NAME (OPTIONAL)</label>
          <input value={mission} onChange={e => setMission(e.target.value)} placeholder="Leave blank if not assigned" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400">No age, blood type, baseline, orbit duration, or EVA count is assumed. Add those only from verified records when the profile schema supports them.</div>
          <button disabled={saving} className="w-full px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold">{saving ? 'SAVING…' : 'SAVE CREW PROFILE'}</button>
          {notice && <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${notice.ok ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'}`}>{notice.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{notice.text}</div>}
        </form>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-white font-mono">REGISTERED PROFILES</h2><span className="text-xs text-cyan-300 font-mono">{crewList.length}</span></div>
          {crewList.length === 0 ? <div className="py-10 text-center text-xs text-slate-500">No crew profiles stored.</div> : crewList.map(crew => <div key={crew.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg"><div className="text-sm font-semibold text-white">{crew.name}</div><div className="text-[11px] text-cyan-300 font-mono">{crew.callsign} • {crew.role}</div><div className="text-[10px] text-slate-500 mt-1">{crew.mission || 'Mission not specified'} • Medical baseline: {crew.baseline ? 'Partially supplied' : 'Not supplied'}</div></div>)}
        </div>
      </div>
    </div>
  );
};
