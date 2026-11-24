import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

async function freshCampaign() {
  vi.resetModules();
  return import("~/features/marketing/campaign");
}

describe("campaign", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("keeps the UTM parameters of the first link of the visit", async () => {
    const { rememberCampaign, rememberedCampaign } = await freshCampaign();

    rememberCampaign(
      "?utm_source=meta&utm_medium=paid&utm_campaign=lotes-2026-12&audience=negocio",
    );
    rememberCampaign("?utm_source=instagram&utm_medium=bio");

    expect(rememberedCampaign()).toEqual({
      utm_source: "meta",
      utm_medium: "paid",
      utm_campaign: "lotes-2026-12",
    });
  });

  it("waits for a link with a campaign before keeping one", async () => {
    const { rememberCampaign, rememberedCampaign } = await freshCampaign();

    rememberCampaign("?audience=negocio");
    rememberCampaign("?utm_source=instagram&utm_medium=bio");

    expect(rememberedCampaign()).toEqual({ utm_source: "instagram", utm_medium: "bio" });
  });

  it("drops values that are not a plain campaign name", async () => {
    const { rememberCampaign, rememberedCampaign } = await freshCampaign();

    rememberCampaign(
      `?utm_source=meta&utm_content=${encodeURIComponent("<script>")}&utm_term=${"a".repeat(81)}`,
    );

    expect(rememberedCampaign()).toEqual({ utm_source: "meta" });
  });
});
