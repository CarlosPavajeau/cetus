import { expect, test } from "vite-plus/test";

import { departments } from "~/features/setup/divipola";

// The catalog is generated from the DANE dataset (scripts/divipola.mjs); these checks catch a bad
// regeneration before an issuer is saved with a code the DIAN rejects.
test("the DIVIPOLA catalog has every department with consistent codes", () => {
  const municipalities = departments.flatMap((department) => department.municipalities);

  expect(departments).toHaveLength(33);
  expect(municipalities.length).toBeGreaterThan(1100);
  expect(new Set(municipalities.map((municipality) => municipality.code)).size).toBe(
    municipalities.length,
  );
  for (const department of departments) {
    expect(department.code).toMatch(/^\d{2}$/);
    for (const municipality of department.municipalities) {
      expect(municipality.code).toMatch(new RegExp(`^${department.code}\\d{3}$`));
    }
  }
});

/** The department and municipality names for a pair of DANE codes. */
function names(departmentCode: string, municipalityCode: string) {
  const department = departments.find((item) => item.code === departmentCode);
  return [
    department?.name,
    department?.municipalities.find((item) => item.code === municipalityCode)?.name,
  ];
}

test("the catalog names places as the DIAN expects them", () => {
  expect(names("11", "11001")).toEqual(["Bogotá, D.C.", "Bogotá, D.C."]);
  expect(names("20", "20001")).toEqual(["Cesar", "Valledupar"]);
  expect(names("54", "54001")).toEqual(["Norte de Santander", "San José de Cúcuta"]);
});
