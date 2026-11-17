import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  contentPlanOutputSchema,
  createProjectSchema,
  slideCopyOutputSchema,
  validateSlideOrderSequence,
} from "../src/lib/validators/project";
import { validateBrandUpload } from "../src/lib/validators/brand";
import {
  canDeleteProjects,
  canManageProjects,
} from "../src/lib/types/workspace";

describe("Milestone 3 project & brief validators", () => {
  const validBrandId = "11111111-1111-4111-8111-111111111111";

  it("accepts valid carousel brief with 3 to 10 slides", () => {
    const parsed = createProjectSchema.safeParse({
      brandId: validBrandId,
      name: "Brewing Guide",
      topic: "5 pour-over mistakes",
      objective: "Increase saves",
      contentType: "educational",
      slideCount: 5,
      language: "id",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects slide counts outside 3..10", () => {
    const tooFew = createProjectSchema.safeParse({
      brandId: validBrandId,
      name: "Too Few",
      topic: "Test topic",
      contentType: "tips",
      slideCount: 2,
    });
    const tooMany = createProjectSchema.safeParse({
      brandId: validBrandId,
      name: "Too Many",
      topic: "Test topic",
      contentType: "tips",
      slideCount: 11,
    });
    assert.equal(tooFew.success, false);
    assert.equal(tooMany.success, false);
  });

  it("validates sequential slideOrder matching slideCount", () => {
    const slides = [
      { slideOrder: 1 },
      { slideOrder: 2 },
      { slideOrder: 3 },
    ];
    assert.equal(validateSlideOrderSequence(slides, 3), true);
    assert.equal(validateSlideOrderSequence(slides, 4), false);
    assert.equal(
      validateSlideOrderSequence(
        [{ slideOrder: 1 }, { slideOrder: 3 }, { slideOrder: 4 }],
        3
      ),
      false
    );
  });

  it("validates structured contentPlanOutputSchema and slideCopyOutputSchema", () => {
    const planResult = contentPlanOutputSchema.safeParse({
      angle: "Common pour-over errors and how to fix them",
      objective: "Increase saves from home brewers",
      storytellingArc: "Hook -> Mistakes -> Actionable Fix -> CTA",
      slides: [
        {
          slideOrder: 1,
          purpose: "cover",
          keyMessage: "Why your morning pour-over tastes bitter",
          visualHint: "Clean centered headline over coffee texture",
          ctaNote: "Swipe to learn",
        },
        {
          slideOrder: 2,
          purpose: "point",
          keyMessage: "Grind size too fine slows extraction",
          visualHint: "Left-aligned point card",
          ctaNote: "",
        },
        {
          slideOrder: 3,
          purpose: "cta",
          keyMessage: "Save this checklist for tomorrow",
          visualHint: "Bold CTA card",
          ctaNote: "Save & comment",
        },
      ],
    });
    assert.equal(planResult.success, true);

    const copyResult = slideCopyOutputSchema.safeParse({
      slides: [
        {
          slideOrder: 1,
          purpose: "cover",
          hook: "Stop over-extracting",
          headline: "5 Pour-Over Mistakes",
          body: "Fix bitter coffee in 30 seconds.",
          cta: "Swipe",
          microLabel: "01/03",
        },
        {
          slideOrder: 2,
          purpose: "point",
          hook: "",
          headline: "Check Your Grind",
          body: "Aim for medium-fine sea salt texture.",
          cta: "",
          microLabel: "02/03",
        },
        {
          slideOrder: 3,
          purpose: "cta",
          hook: "",
          headline: "Save This Guide",
          body: "Share your brew ratio in the comments.",
          cta: "Save Post",
          microLabel: "03/03",
        },
      ],
      caption: "Brew cleaner coffee at home.",
      hashtags: ["#pourover", "#coffee"],
    });
    assert.equal(copyResult.success, true);
  });
});

describe("RBAC and brand asset upload guards", () => {
  it("enforces project write and delete permissions by role", () => {
    assert.equal(canManageProjects("owner"), true);
    assert.equal(canManageProjects("admin"), true);
    assert.equal(canManageProjects("designer"), true);
    assert.equal(canManageProjects("content_creator"), true);
    assert.equal(canManageProjects("client"), false);
    assert.equal(canManageProjects(null), false);

    assert.equal(canDeleteProjects("owner"), true);
    assert.equal(canDeleteProjects("admin"), true);
    assert.equal(canDeleteProjects("designer"), true);
    assert.equal(canDeleteProjects("content_creator"), false);
    assert.equal(canDeleteProjects("client"), false);
  });

  it("validates brand upload constraints safely", () => {
    const validLogo = validateBrandUpload({
      fileName: "../Brand Logo!.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      assetType: "logo",
    });
    assert.equal(validLogo.ok, true);
    if (validLogo.ok) {
      assert.equal(validLogo.safeName, "brand-logo.png");
    }

    const oversized = validateBrandUpload({
      fileName: "large.png",
      mimeType: "image/png",
      sizeBytes: 11 * 1024 * 1024,
      assetType: "photo",
    });
    assert.equal(oversized.ok, false);
  });
});
