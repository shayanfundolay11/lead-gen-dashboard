'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { PLAN_LIMITS } from '../../lib/planLimits';

export default function Admin() {
  const [orgs, setOrgs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(null);
  const [savingId, setSavingId] = useState(null);

  async function loadData() {
    const { data: orgData } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    const { data: leadCounts } = await supabase.from('leads').select('organization_id');
    const countByOrg = {};
    (leadCounts || []).forEach(l => { countByOrg[l.organization_id] = (countByOrg[l.organization_id] || 0) + 1; });
    setOrgs((orgData || []).map(o => ({ ...o, leadCount: countByOrg[o.id] || 0 })));

    const { data: requestData } = await supabase
      .from('upgrade_requests')
      .select('*, organizations(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(requestData || []);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'super_admin') {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);
      await loadData();
      setLoading(false);
    }
    load();
  }, []);

  async function handlePlanChange(orgId, newPlan) {
    setSavingId(orgId);
    await supabase.from('organizations').update({ plan: newPlan }).eq('id', orgId);
    setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, plan: newPlan } : o));
    setSavingId(null);
  }

  async function handleApproveRequest(request) {
    await supabase.from('organizations').update({ plan: request.requested_plan }).eq('id', request.organization_id);
    await supabase.from('upgrade_requests').update({ status: 'approved' }).eq('id', request.id);
    await loadData();
  }

  async function handleDismissRequest(request) {
    await supabase.from('upgrade_requests').update({ status: 'dismissed' }).eq('id', request.id);
    await loadData();
  }

  if (loading) return <div className="page"><div className="empty">Loading...</div></div>;
  if (!authorized) return <div className="page"><div className="empty">You don't have access to this page.</div></div>;

  return (
    <div className="page">
      <h1>Super Admin</h1>
      <p className="sub">All customer organizations. Change a plan here after confirming payment manually (no payment gateway connected yet).</p>

      {requests.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Bell size={15} color="var(--signal)" />
            <h2 style={{ fontSize: 15, margin: 0 }}>Upgrade requests ({requests.length})</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
            {requests.map(r => (
              <div key={r.id} className="panel" style={{ background: 'var(--signal-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.organizations?.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                    Wants: <strong style={{ textTransform: 'capitalize' }}>{PLAN_LIMITS[r.requested_plan]?.label}</strong> &middot; {new Date(r.created_at).toLocaleString()}
                  </div>
                  {r.message && <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 4, fontStyle: 'italic' }}>"{r.message}"</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="call-btn" onClick={() => handleApproveRequest(r)}>Approve</button>
                  <button className="call-btn" style={{ background: 'var(--ink-muted)' }} onClick={() => handleDismissRequest(r)}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 15, marginBottom: 10 }}>All organizations</h2>
      <table>
        <thead>
          <tr><th>Organization</th><th>Plan</th><th>Leads stored</th><th>Searches today</th><th>Demo expires</th><th>Created</th></tr>
        </thead>
        <tbody>
          {orgs.map(org => (
            <tr key={org.id}>
              <td style={{ fontWeight: 500 }}>{org.name}</td>
              <td>
                <select
                  value={org.plan}
                  onChange={e => handlePlanChange(org.id, e.target.value)}
                  disabled={savingId === org.id}
                  style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5 }}
                >
                  {Object.entries(PLAN_LIMITS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                </select>
              </td>
              <td className="mono">{org.leadCount}</td>
              <td className="mono">{org.searches_today}</td>
              <td>{org.demo_expires_at ? new Date(org.demo_expires_at).toLocaleDateString() : '-'}</td>
              <td>{new Date(org.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}