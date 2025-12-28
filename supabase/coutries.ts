// countries.ts
import rawCountries from './countries.json';

import type { Country } from '@/store/map-store';

const countries: Country[] = rawCountries.map((c) => ({
  name: c.name,
  code: c['alpha-2'], 
}));

export default countries;