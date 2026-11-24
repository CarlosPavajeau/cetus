const campaignKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type CampaignKey = (typeof campaignKeys)[number];

/** The UTM parameters of the link a visitor arrived with: which ad, post or bio link brought them. */
export type Campaign = Partial<Record<CampaignKey, string>>;

const valuePattern = /^[\w.-]{1,80}$/;

/**
 * In memory only: the privacy policy promises the public pages store nothing in the browser. The marketing
 * pages reach the sign-up through client-side links, so the campaign survives until the account is created.
 */
let firstCampaign: Campaign | undefined;

function parseCampaign(search: URLSearchParams): Campaign {
  const campaign: Campaign = {};
  for (const key of campaignKeys) {
    const value = search.get(key);
    if (value !== null && valuePattern.test(value)) {
      campaign[key] = value;
    }
  }
  return campaign;
}

export function rememberCampaign(search: string) {
  if (firstCampaign !== undefined) {
    return;
  }
  const campaign = parseCampaign(new URLSearchParams(search));
  if (Object.keys(campaign).length > 0) {
    firstCampaign = campaign;
  }
}

export function rememberedCampaign(): Campaign {
  return firstCampaign ?? {};
}
