export const PLAN_LIMITS = {
  demo: { leadsPerSearch: 10, searchesPerDay: 1, totalLeadsCap: 10, label: 'Demo' },
  basic: { leadsPerSearch: 10, searchesPerDay: 3, totalLeadsCap: null, label: 'Basic' },
  pro: { leadsPerSearch: 20, searchesPerDay: 10, totalLeadsCap: null, label: 'Pro' },
  enterprise: { leadsPerSearch: 50, searchesPerDay: 30, totalLeadsCap: null, label: 'Enterprise' },
  custom: { leadsPerSearch: 50, searchesPerDay: null, totalLeadsCap: null, label: 'Custom' },
};