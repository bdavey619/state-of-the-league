// Static NFL reference data, keyed by ESPN's team abbreviations.
// Colors are decorative swatches only (never used behind text).

export const CONFERENCES = [
  { abbr: 'AFC', name: 'American Football Conference' },
  { abbr: 'NFC', name: 'National Football Conference' },
];
export const DIVISIONS = ['East', 'North', 'South', 'West'];

export const NFL_TEAMS = {
  BUF: { city: 'Buffalo', name: 'Bills', conf: 'AFC', div: 'East', color: '#00338D' },
  MIA: { city: 'Miami', name: 'Dolphins', conf: 'AFC', div: 'East', color: '#008E97' },
  NE: { city: 'New England', name: 'Patriots', conf: 'AFC', div: 'East', color: '#002244' },
  NYJ: { city: 'New York', name: 'Jets', conf: 'AFC', div: 'East', color: '#125740' },
  BAL: { city: 'Baltimore', name: 'Ravens', conf: 'AFC', div: 'North', color: '#241773' },
  CIN: { city: 'Cincinnati', name: 'Bengals', conf: 'AFC', div: 'North', color: '#FB4F14' },
  CLE: { city: 'Cleveland', name: 'Browns', conf: 'AFC', div: 'North', color: '#FF3C00' },
  PIT: { city: 'Pittsburgh', name: 'Steelers', conf: 'AFC', div: 'North', color: '#FFB612' },
  HOU: { city: 'Houston', name: 'Texans', conf: 'AFC', div: 'South', color: '#03202F' },
  IND: { city: 'Indianapolis', name: 'Colts', conf: 'AFC', div: 'South', color: '#002C5F' },
  JAX: { city: 'Jacksonville', name: 'Jaguars', conf: 'AFC', div: 'South', color: '#006778' },
  TEN: { city: 'Tennessee', name: 'Titans', conf: 'AFC', div: 'South', color: '#4B92DB' },
  DEN: { city: 'Denver', name: 'Broncos', conf: 'AFC', div: 'West', color: '#FB4F14' },
  KC: { city: 'Kansas City', name: 'Chiefs', conf: 'AFC', div: 'West', color: '#E31837' },
  LV: { city: 'Las Vegas', name: 'Raiders', conf: 'AFC', div: 'West', color: '#A5ACAF' },
  LAC: { city: 'Los Angeles', name: 'Chargers', conf: 'AFC', div: 'West', color: '#0080C6' },
  DAL: { city: 'Dallas', name: 'Cowboys', conf: 'NFC', div: 'East', color: '#003594' },
  NYG: { city: 'New York', name: 'Giants', conf: 'NFC', div: 'East', color: '#0B2265' },
  PHI: { city: 'Philadelphia', name: 'Eagles', conf: 'NFC', div: 'East', color: '#004C54' },
  WSH: { city: 'Washington', name: 'Commanders', conf: 'NFC', div: 'East', color: '#5A1414' },
  CHI: { city: 'Chicago', name: 'Bears', conf: 'NFC', div: 'North', color: '#0B162A' },
  DET: { city: 'Detroit', name: 'Lions', conf: 'NFC', div: 'North', color: '#0076B6' },
  GB: { city: 'Green Bay', name: 'Packers', conf: 'NFC', div: 'North', color: '#203731' },
  MIN: { city: 'Minnesota', name: 'Vikings', conf: 'NFC', div: 'North', color: '#4F2683' },
  ATL: { city: 'Atlanta', name: 'Falcons', conf: 'NFC', div: 'South', color: '#A71930' },
  CAR: { city: 'Carolina', name: 'Panthers', conf: 'NFC', div: 'South', color: '#0085CA' },
  NO: { city: 'New Orleans', name: 'Saints', conf: 'NFC', div: 'South', color: '#D3BC8D' },
  TB: { city: 'Tampa Bay', name: 'Buccaneers', conf: 'NFC', div: 'South', color: '#D50A0A' },
  ARI: { city: 'Arizona', name: 'Cardinals', conf: 'NFC', div: 'West', color: '#97233F' },
  LAR: { city: 'Los Angeles', name: 'Rams', conf: 'NFC', div: 'West', color: '#003594' },
  SF: { city: 'San Francisco', name: '49ers', conf: 'NFC', div: 'West', color: '#AA0000' },
  SEA: { city: 'Seattle', name: 'Seahawks', conf: 'NFC', div: 'West', color: '#69BE28' },
};

// ESPN occasionally changes abbreviations (e.g. WAS vs WSH). Normalize here.
const ALIASES = { WAS: 'WSH', JAC: 'JAX', LA: 'LAR', OAK: 'LV', SD: 'LAC' };
export function normAbbr(a) {
  const up = String(a || '').toUpperCase();
  return ALIASES[up] || up;
}
