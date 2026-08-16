// Predefined keyword catalog for a software/digital agency.
// Each keyword has a "filterType" that tells the engine HOW to qualify a lead:
//
//   no_website          -> only keep businesses that have NO website listed on Google
//   low_reach            -> keep businesses that HAVE a website/profile but look under-promoted
//                           (few Google reviews, low rating count used as a free proxy for reach)
//   general               -> no automatic qualification filter, just keyword + location match
//
// You are NOT limited to this list. Add your own keywords under CUSTOM_KEYWORDS,
// or pass any free-text keyword at runtime (the "Other" option).

const KEYWORD_CATALOG = [
  // --- Web & development ---
  { id: 'website_development', label: 'Website Development', filterType: 'no_website' },
  { id: 'landing_page_design', label: 'Landing Page Design', filterType: 'no_website' },
  { id: 'wordpress_development', label: 'WordPress Development', filterType: 'no_website' },
  { id: 'shopify_development', label: 'Shopify Development', filterType: 'no_website' },
  { id: 'ecommerce_development', label: 'E-commerce Development (Shopify/WooCommerce)', filterType: 'no_website' },
  { id: 'website_redesign', label: 'Website Redesign', filterType: 'low_reach' },
  { id: 'wordpress_maintenance', label: 'WordPress Maintenance', filterType: 'low_reach' },
  { id: 'web_app_development', label: 'Web App Development', filterType: 'general' },
  { id: 'custom_software_development', label: 'Custom Software Development', filterType: 'general' },
  { id: 'api_development', label: 'API Development', filterType: 'general' },

  // --- Mobile ---
  { id: 'mobile_app_development', label: 'Mobile App Development', filterType: 'general' },
  { id: 'flutter_app_development', label: 'Flutter / Cross-platform App Development', filterType: 'general' },
  { id: 'app_maintenance', label: 'App Maintenance & Support', filterType: 'general' },

  // --- Marketing / SEO ---
  { id: 'seo', label: 'SEO', filterType: 'low_reach' },
  { id: 'local_seo', label: 'Local SEO', filterType: 'low_reach' },
  { id: 'social_media_marketing', label: 'Social Media Marketing', filterType: 'low_reach' },
  { id: 'google_ads', label: 'Google Ads / PPC', filterType: 'general' },
  { id: 'facebook_ads', label: 'Facebook Ads Management', filterType: 'general' },
  { id: 'email_marketing', label: 'Email Marketing', filterType: 'general' },
  { id: 'content_marketing', label: 'Content Marketing', filterType: 'general' },
  { id: 'influencer_marketing', label: 'Influencer Marketing', filterType: 'general' },
  { id: 'online_reputation', label: 'Online Reputation Management', filterType: 'low_reach' },
  { id: 'cro', label: 'Conversion Rate Optimization', filterType: 'low_reach' },

  // --- Design ---
  { id: 'branding_logo', label: 'Branding & Logo Design', filterType: 'general' },
  { id: 'graphic_design', label: 'Graphic Design', filterType: 'general' },
  { id: 'ui_ux_design', label: 'UI/UX Design', filterType: 'general' },
  { id: 'packaging_design', label: 'Packaging Design', filterType: 'general' },

  // --- Content ---
  { id: 'content_writing', label: 'Content Writing / Copywriting', filterType: 'general' },
  { id: 'video_production', label: 'Video Production', filterType: 'general' },
  { id: 'photography', label: 'Photography Services', filterType: 'general' },

  // --- IT / Infra ---
  { id: 'cloud_hosting', label: 'Cloud Hosting / Migration', filterType: 'general' },
  { id: 'it_support', label: 'IT Support / Maintenance', filterType: 'general' },
  { id: 'cybersecurity', label: 'Cybersecurity Services', filterType: 'general' },
  { id: 'data_backup', label: 'Data Backup Services', filterType: 'general' },
  { id: 'network_setup', label: 'Network Setup', filterType: 'general' },

  // --- Automation / CRM ---
  { id: 'crm_automation', label: 'Business Automation / CRM Setup', filterType: 'general' },
  { id: 'erp_implementation', label: 'ERP Implementation', filterType: 'general' },
  { id: 'chatbot_development', label: 'Chatbot Development', filterType: 'general' },
  { id: 'ai_integration', label: 'AI Integration Services', filterType: 'general' },

  // --- Consulting ---
  { id: 'digital_transformation', label: 'Digital Transformation Consulting', filterType: 'general' },
  { id: 'it_consulting', label: 'IT Consulting', filterType: 'general' },
];

// Look up a keyword definition by id. Falls back to a "general" custom keyword
// if the id isn't in the catalog (this is how the "Other" free-text option works).
function resolveKeyword(idOrText) {
  const found = KEYWORD_CATALOG.find(k => k.id === idOrText || k.label.toLowerCase() === String(idOrText).toLowerCase());
  if (found) return found;
  return { id: `custom_${idOrText}`, label: idOrText, filterType: 'general' };
}

module.exports = { KEYWORD_CATALOG, resolveKeyword };
