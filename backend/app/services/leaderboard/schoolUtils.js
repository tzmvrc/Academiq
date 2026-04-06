import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let schoolsDataCache = null;

const loadSchoolsData = () => {
  if (!schoolsDataCache) {
    // Adjust path to your JSON file location
    const dataPath = path.join(__dirname, '../school/universities_school_domain.json');
    schoolsDataCache = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  }
  return schoolsDataCache;
};

export const getSchoolLogo = (schoolName) => {
  if (!schoolName) return null;
  const data = loadSchoolsData();
  const found = data.find(s => s.name === schoolName);
  if (found) {
    // Use the logo from JSON if present, otherwise fallback to Clearbit (optional)
    if (found.logo) {
      return found.logo;
    }
    // Fallback: generate from domain (if you still want it)
    if (found.domains && found.domains.length) {
      const domain = found.domains[0];
      return `https://logo.clearbit.com/${domain}`;
    }
  }
  return null;
};

export const getSchoolDomain = (schoolName) => {
  if (!schoolName) return null;
  const data = loadSchoolsData();
  const found = data.find(s => s.name === schoolName);
  if (found && found.domains && found.domains.length) {
    return found.domains[0];
  }
  return null;
};