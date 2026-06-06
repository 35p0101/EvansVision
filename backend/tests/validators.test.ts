import {
  RegisterSchema,
  LoginSchema,
  PredictMatchSchema,
} from "../src/validators";

describe("Validators", () => {
  describe("RegisterSchema", () => {
    it("accetta input valido", () => {
      const res = RegisterSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        name: "Mario",
      });
      expect(res.success).toBe(true);
    });

    it("rifiuta email malformata", () => {
      const res = RegisterSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(res.success).toBe(false);
    });

    it("rifiuta password troppo corta", () => {
      const res = RegisterSchema.safeParse({
        email: "user@example.com",
        password: "short",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("LoginSchema", () => {
    it("accetta credenziali valide", () => {
      const res = LoginSchema.safeParse({
        email: "user@example.com",
        password: "anything",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("PredictMatchSchema", () => {
    const validUuid1 = "11111111-1111-1111-1111-111111111111";
    const validUuid2 = "22222222-2222-2222-2222-222222222222";

    it("accetta due UUID diversi", () => {
      const res = PredictMatchSchema.safeParse({
        homeTeamId: validUuid1,
        awayTeamId: validUuid2,
      });
      expect(res.success).toBe(true);
    });

    it("rifiuta home e away identici", () => {
      const res = PredictMatchSchema.safeParse({
        homeTeamId: validUuid1,
        awayTeamId: validUuid1,
      });
      expect(res.success).toBe(false);
    });

    it("rifiuta ID non-UUID", () => {
      const res = PredictMatchSchema.safeParse({
        homeTeamId: "not-a-uuid",
        awayTeamId: validUuid2,
      });
      expect(res.success).toBe(false);
    });
  });
});
