// schoolValidator.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schoolsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "universities_school_domain.json"), "utf-8"),    
);

export function findSchoolByDomain(rootDomain) {
  const normalized = rootDomain.toLowerCase();
  return schoolsData.find(
    (school) =>
      school.domains &&
      school.domains.some((domain) => domain.toLowerCase() === normalized),
  );
}
