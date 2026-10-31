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
const NFL_ALIASES = { WAS: 'WSH', JAC: 'JAX', LA: 'LAR', OAK: 'LV', SD: 'LAC' };
export function normNfl(a) {
  const up = String(a || '').toUpperCase();
  return NFL_ALIASES[up] || up;
}
export const normAbbr = normNfl;

// NBA, keyed by ESPN abbreviations (GS, NY, NO, SA, UTAH, WSH, BKN, PHX).
export const NBA_TEAMS = {
  BOS: { city: 'Boston', name: 'Celtics', conf: 'East', div: 'Atlantic', color: '#007A33' },
  BKN: { city: 'Brooklyn', name: 'Nets', conf: 'East', div: 'Atlantic', color: '#000000' },
  NY: { city: 'New York', name: 'Knicks', conf: 'East', div: 'Atlantic', color: '#F58426' },
  PHI: { city: 'Philadelphia', name: '76ers', conf: 'East', div: 'Atlantic', color: '#006BB6' },
  TOR: { city: 'Toronto', name: 'Raptors', conf: 'East', div: 'Atlantic', color: '#CE1141' },
  CHI: { city: 'Chicago', name: 'Bulls', conf: 'East', div: 'Central', color: '#CE1141' },
  CLE: { city: 'Cleveland', name: 'Cavaliers', conf: 'East', div: 'Central', color: '#860038' },
  DET: { city: 'Detroit', name: 'Pistons', conf: 'East', div: 'Central', color: '#C8102E' },
  IND: { city: 'Indiana', name: 'Pacers', conf: 'East', div: 'Central', color: '#FDBB30' },
  MIL: { city: 'Milwaukee', name: 'Bucks', conf: 'East', div: 'Central', color: '#00471B' },
  ATL: { city: 'Atlanta', name: 'Hawks', conf: 'East', div: 'Southeast', color: '#E03A3E' },
  CHA: { city: 'Charlotte', name: 'Hornets', conf: 'East', div: 'Southeast', color: '#00788C' },
  MIA: { city: 'Miami', name: 'Heat', conf: 'East', div: 'Southeast', color: '#98002E' },
  ORL: { city: 'Orlando', name: 'Magic', conf: 'East', div: 'Southeast', color: '#0077C0' },
  WSH: { city: 'Washington', name: 'Wizards', conf: 'East', div: 'Southeast', color: '#002B5C' },
  DEN: { city: 'Denver', name: 'Nuggets', conf: 'West', div: 'Northwest', color: '#0E2240' },
  MIN: { city: 'Minnesota', name: 'Timberwolves', conf: 'West', div: 'Northwest', color: '#236192' },
  OKC: { city: 'Oklahoma City', name: 'Thunder', conf: 'West', div: 'Northwest', color: '#007AC1' },
  POR: { city: 'Portland', name: 'Trail Blazers', conf: 'West', div: 'Northwest', color: '#E03A3E' },
  UTAH: { city: 'Utah', name: 'Jazz', conf: 'West', div: 'Northwest', color: '#3E2680' },
  GS: { city: 'Golden State', name: 'Warriors', conf: 'West', div: 'Pacific', color: '#1D428A' },
  LAC: { city: 'LA', name: 'Clippers', conf: 'West', div: 'Pacific', color: '#C8102E' },
  LAL: { city: 'Los Angeles', name: 'Lakers', conf: 'West', div: 'Pacific', color: '#552583' },
  PHX: { city: 'Phoenix', name: 'Suns', conf: 'West', div: 'Pacific', color: '#E56020' },
  SAC: { city: 'Sacramento', name: 'Kings', conf: 'West', div: 'Pacific', color: '#5A2D81' },
  DAL: { city: 'Dallas', name: 'Mavericks', conf: 'West', div: 'Southwest', color: '#00538C' },
  HOU: { city: 'Houston', name: 'Rockets', conf: 'West', div: 'Southwest', color: '#CE1141' },
  MEM: { city: 'Memphis', name: 'Grizzlies', conf: 'West', div: 'Southwest', color: '#5D76A9' },
  NO: { city: 'New Orleans', name: 'Pelicans', conf: 'West', div: 'Southwest', color: '#0C2340' },
  SA: { city: 'San Antonio', name: 'Spurs', conf: 'West', div: 'Southwest', color: '#8A8D8F' },
};
const NBA_ALIASES = { GSW: 'GS', NYK: 'NY', NOP: 'NO', SAS: 'SA', UTA: 'UTAH', WAS: 'WSH', PHO: 'PHX', BRK: 'BKN', BRO: 'BKN', NJ: 'BKN' };
export function normNba(a) {
  const up = String(a || '').toUpperCase();
  return NBA_ALIASES[up] || up;
}
