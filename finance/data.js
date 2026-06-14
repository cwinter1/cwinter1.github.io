// Winter Finance — Public Data Layer
// Amounts shown as relative values only (privacy protected)
// Real amounts stored privately
const DATA = {

  meta: {
    updated: "2026-06",
    currency: "ILS",
    family_size: 5,
    note: "Values shown as percentages and relative indices"
  },

  // Monthly history — balance direction only (+ / -)
  // No real amounts, just trend data
  monthly: [
    { label:"נוב 25", income_idx:94, expense_idx:101, balance_pct:-7.6, status:"deficit",  note:"גרעון",              abroad:false, bonus:false },
    { label:"דצמ 25", income_idx:112, expense_idx:100, balance_pct:10.5, status:"surplus", note:"עודף · בונוס",       abroad:false, bonus:true  },
    { label:"ינו 26",  income_idx:93,  expense_idx:94,  balance_pct:-1.0, status:"deficit", note:"גרעון קטן · פראג",  abroad:true,  bonus:false },
    { label:"פבר 26", income_idx:77,  expense_idx:84,  balance_pct:-8.4, status:"deficit", note:"גרעון",              abroad:false, bonus:false },
    { label:"מרץ 26", income_idx:95,  expense_idx:85,  balance_pct:10.7, status:"surplus", note:"עודף · בונוס",       abroad:false, bonus:true  },
    { label:"אפר 26", income_idx:94,  expense_idx:92,  balance_pct:2.6,  status:"surplus", note:"עודף · אילת",        abroad:true,  bonus:false },
    { label:"מאי 26", income_idx:95,  expense_idx:89,  balance_pct:6.2,  status:"surplus", note:"עודף · קפריסין",     abroad:true,  bonus:false },
    { label:"יונ 26", income_idx:100, expense_idx:81,  balance_pct:19.0, status:"surplus", note:"עודף · תקציב חדש",  abroad:false, bonus:false },
  ],

  // Budget breakdown — percentages of income only
  budget_pct: {
    mortgage_loans: 27.2,
    fixed_cc:        9.5,
    kids:            7.0,
    groceries:      17.0,
    fuel:            3.4,
    clothing:        2.4,
    restaurants:     1.5,
    health_gym:      2.6,
    misc:            0.6,
    travel_savings:  7.7,
    surplus:        21.0,
  },

  // Layers — waterfall (% of income)
  layers: [
    { name:"הכנסה",           pct:100,  color:"#4ade80", remain_pct:100  },
    { name:"משכנתא + הלוואות", pct:27.2, color:"#f87171", remain_pct:72.8 },
    { name:"קבועים",           pct:9.5,  color:"#f97316", remain_pct:63.3 },
    { name:"ילדים",            pct:7.0,  color:"#a78bfa", remain_pct:56.3 },
    { name:"משתנה",            pct:27.5, color:"#60a5fa", remain_pct:28.8 },
    { name:"חיסכון טיולים",    pct:7.7,  color:"#60a5fa", remain_pct:21.1 },
    { name:"עודף",             pct:21.0, color:"#22c55e", remain_pct:21.0 },
  ],

  // CC breakdown — % of total CC spend
  cc_actual_pct: {
    amex_katya:  51.5,
    cal_katya:    7.2,
    max_katya:    1.9,
    chris_cards: 39.4,
  },

  // Loan plan — rates and structure (no amounts)
  loan: {
    od_rate_pct:   7.25,
    loan_rate_pct: 4.00,
    years:         7,
    months:        84,
    saving_pct_vs_od: 70.8,  // loan interest is 70.8% cheaper than OD
    asia_months:   13.6,
    asia_year:     2027,
  },

  // Kids activities — names only, no amounts
  kids: [
    { name:"אמה — בלט Donna",     protected:true },
    { name:"אמה — צהרון אלתרמן",  protected:true },
    { name:"אמצעית — 5 Fingers",  protected:true },
    { name:"הצעירה",              protected:true },
    { name:"צופות",               protected:true },
    { name:"בית ספר",             protected:true },
  ],

  // Upcoming — no amounts
  upcoming: [
    { name:"הלוואת קרן השתלמות",   date:"יוני 2026",     status:"todo",    priority:"critical" },
    { name:"פקדון + קרן גמולות",   date:"יוני 2026",     status:"todo",    priority:"critical" },
    { name:"ביטוח רכב חידוש",      date:"יולי 2026",     status:"todo",    priority:"high"     },
    { name:"Disney+ ביטול",        date:"מיידי",          status:"todo",    priority:"high"     },
    { name:"אסיה",                  date:"ספטמבר 2027",   status:"saving",  priority:"goal"     },
    { name:"הלוואה נסגרת",          date:"יולי 2033",     status:"future",  priority:"milestone"},
  ],

  // Atomic habits
  atomic_habits: [
    { n:"01", title:"פקדון טיולים",        desc:"הוראת קבע ביום המשכורת. לא נוגעים." },
    { n:"02", title:"בונוס → הלוואה",      desc:"כל עודף מעל בסיס → מיידי." },
    { n:"03", title:"קצבת ילדים ה-20",     desc:"תזכורת בטלפון. כל חודש." },
    { n:"04", title:"ביחד בשבילך",         desc:"לנצל נקודות ב-1 לחודש." },
    { n:"05", title:"משלוח מכולת שבועי",   desc:"יום ראשון עם רשימה." },
  ],
};
