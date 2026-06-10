// ══════════════════════════════════════════════════════
// Winter Family Finance — Master Data
// Updated: June 2026 — Full card data: Amex + CAL + Max (Katya)
// ══════════════════════════════════════════════════════
const DATA = {

  meta: {
    updated: "2026-06-09",
    overdraft: 64000,
    od_rate: 7.25,           // Prime+2.75% as of June 2026
    loan_rate: 4.0,          // Keren Hishtalmut Prime-0.5%
    loan_years: 7,
    loan_monthly: 875,
    loan_saving_total: 23000,
    prime_rate: 4.50
  },

  // ── INCOME ──────────────────────────────────────────
  income: {
    katya: {
      name: "קטיה",
      base_monthly_net: 13500, // Updated +₪1,500
      source: "Bank Hapoalim ref 500",
      bonuses: {
        annual_total: 16600,
        months: ["מרץ/אפריל","יולי/אוגוסט","דצמבר"],
        avg_per_event: 5533,
        rule: "100% למינוס/הלוואה — מועבר ביום קבלה"
      },
      verified: [
        {month:"2025-12", amount:12255},
        {month:"2026-01", amount:11705},
        {month:"2026-02", amount:11793},
        {month:"2026-03", amount:15958, note:"בונוס פסח"},
        {month:"2026-04", amount:13588},
        {month:"2026-05", amount:18795, note:"בונוס קיץ"}
      ]
    },
    chris: {
      name: "כריס",
      base_monthly_net: 18374,
      source: "עבודה חדשה מיוני 2026",
      verified: [
        {month:"2025-11", amount:18200},
        {month:"2025-12", amount:18000},
        {month:"2026-01", amount:18374},
        {month:"2026-02", amount:13105, note:"מעבר לביטוח לאומי"},
        {month:"2026-06", amount:18374, note:"עבודה חדשה"}
      ]
    },
    child_allowance: {
      amount: 437,
      source: "ביטוח לאומי קצבת ילדים",
      rule: "מועבר למינוס ה-20 בחודש"
    },
    totals: {
      base_monthly: 31874,
      with_allowance: 32311,
      annual_base: 364488,
      annual_with_bonuses: 381088,
      annual_total: 386332
    }
  },

  // ── CREDIT CARDS — FULL PICTURE ──────────────────────
  cards: {
    amex_3699: {
      holder: "קטיה",
      avg_monthly: 9821,
      months_data: true,
      note: "14 חודשים מנותחים — May 25 to Jun 26"
    },
    cal_2671: {
      holder: "קטיה",
      avg_normal_month: 1373,
      avg_travel_month: 3000,
      data_source: "11 דפי פירוט PDF — Jun 25 to May 26",
      key_items: [
        "בית דונה למחול (בלט אמה) — תשלומים",
        "מינהל קהילתי מזרח",
        "Apple.com/Bill ₪39.90 הוראת קבע",
        "מכבי טבעי — תשלומים (חד פעמי)",
        "PAYBOX מתנות יום הולדת וקבוצות"
      ]
    },
    max_5945: {
      holder: "קטיה",
      avg_gross: 1066,
      avg_net: 366,
      data_source: "CSV מלא — May 25 to May 26",
      key_items: [
        "ביחד בשבילך — הטבת הסתדרות (NOT household expense)",
        "דלק מנטה ₪320/חודש (דלק קטיה)",
        "פיס מנויים ₪60/חודש — מועדון דלק",
        "קוסמטיקה בתשלומים: LIVELLE + אלקליל + דפני",
        "BIT transfers לחברים ומשפחה"
      ],
      histadrut_benefit: {
        name: "ביחד בשבילך",
        gross_monthly: 700,
        net_household_cost: 80,
        note: "כרטיס פנאי ממועדון עובדי בנק — לא לכלול בניתוח הוצאות"
      }
    },
    cal_chris: { holder: "כריס", avg_monthly: 5900, note: "ממתין לפירוט" },
    max_chris: { holder: "כריס", avg_monthly: 1600, note: "ממתין לפירוט" },
    totals: {
      katya_all_net: 11560,
      chris_estimated: 7500,
      household_total: 19060,
      household_target: 16550,
      required_cut: 2500
    }
  },

  // ── FIXED MONTHLY ────────────────────────────────────
  fixed: [
    {name:"משכנתא x2", amount:3880, cat:"דיור", protected:true},
    {name:"הלוואה 1", amount:2015, cat:"הלוואות", protected:true},
    {name:"הלוואה 2", amount:1231, cat:"הלוואות", protected:true},
    {name:"הלוואה 3", amount:392,  cat:"הלוואות", protected:true},
    {name:"הלוואה 4", amount:394,  cat:"הלוואות", protected:true},
    {name:"ארנונה", amount:725, cat:"דיור", protected:true},
    {name:"מכבי + מגדל", amount:600, cat:"בריאות", protected:true},
    {name:"ועד בית", amount:370, cat:"דיור", protected:true},
    {name:"פזגז", amount:264, cat:"דיור", protected:true},
    {name:"אינטרנט+נטפליקס+ספוטיפיי", amount:213, cat:"בילוי", protected:false},
    {name:"Apple.com/Bill", amount:40, cat:"בילוי", note:"נמצא ב-CAL קטיה"},
    {name:"Disney+ — לבטל!", amount:50, cat:"בילוי", action:"CANCEL"},
    {name:"פנגו", amount:80, cat:"רכב", protected:true},
    {name:"מים", amount:150, cat:"דיור", note:"חדש — חסר בתקציב הקודם", protected:true},
    {name:"ביטוח רכב (₪4,400÷10)", amount:440, cat:"רכב", note:"שנתי ב-10 תשלומים"},
    {name:"תחזוקת רכב (₪2,000÷10)", amount:200, cat:"רכב", note:"שנתי ב-10 תשלומים"},
    {name:"פיס מנויים (Max קטיה)", amount:60, cat:"רכב", note:"מועדון דלק"}
  ],

  // ── KIDS — PROTECTED ─────────────────────────────────
  kids: [
    {name:"אמה — בלט Donna", amount:540, child:"אמה", protected:true, card:"CAL קטיה"},
    {name:"אמה — צהרון אלתרמן", amount:348, child:"אמה", protected:true},
    {name:"אמצעית — 5 Fingers x2", amount:415, child:"אמצעית", protected:true},
    {name:"הצעירה — פעילות", amount:300, child:"הצעירה", protected:true},
    {name:"צופות (₪3,000÷10 תשלומים)", amount:300, child:"כולן", protected:true},
    {name:"בית ספר (₪3,600÷10 תשלומים)", amount:360, child:"כולן", protected:true},
    {name:"תוספות שוטפות", amount:100, child:"כולן", protected:false}
  ],

  // ── VARIABLE — CORRECTED ─────────────────────────────
  variable: {
    groceries:    {actual:5500, target:5000, note:"Amex ₪2,432 + CAL Chris ~₪3,068", merchants:["אושר עד","רמי לוי","שופרסל","סטופ מרקט"]},
    fuel:         {actual:1100, target:1100, note:"קטיה: Amex ₪380 + Max מנטה ₪320 = ₪700 | כריס CAL ~₪400", corrected_from:1500},
    clothing:     {actual:839,  target:550,  note:"עונתי: ₪800 בספטמבר/מרץ, ₪400 שאר החודשים"},
    restaurants:  {actual:479,  target:480,  note:"משפחה 5 = ₪3/נפש/יום — תקין, לא לקצץ"},
    pharmacy:     {actual:263,  target:263,  note:"תרופות ומרשמים"},
    cosmetics:    {actual:150,  target:120,  note:"תשלומים: LIVELLE + אלקליל + דפני — ₪1,818/שנה"},
    gym_katya:    {actual:300,  target:300,  note:"Diamond Gym — הוראת קבע"},
    gym_chris:    {actual:117,  target:117,  note:"UPAPP ₪25/ביקור — גים יומי"},
    travel_cc:    {actual:1331, target:0,    note:"ממוצע אמיתי טיסות+מלונות. לאפס — לחשבון נפרד"},
    histadrut:    {actual:700,  net_cost:80,  note:"ביחד בשבילך — הטבת הסתדרות. לא הוצאה אמיתית"},
    paybox_gifts: {actual:150,  target:120,  note:"מתנות יום הולדת, ועד כיתה, קבוצות"},
    misc:         {actual:200,  target:200}
  },

  // ── ATOMIC HABITS ────────────────────────────────────
  atomic_habits: [
    {
      habit: "משלוח מכולת אחד בשבוע",
      trigger: "יום ראשון בערב",
      action: "הזמנה מרמי לוי/אושר עד עם רשימה מוכנה",
      saving_monthly: 400,
      why: "נתוני ה-CAL מראים ביקורים מרובים — כל ביקור = ₪100 נוסף"
    },
    {
      habit: "גמור לפני שקונים",
      trigger: "לפני כל רכישת קוסמטיקה",
      action: "בדוק אם יש מוצר דומה שנגמר",
      saving_monthly: 75,
      why: "₪1,818/שנה על קוסמטיקה בתשלומים — ₪150/חודש"
    },
    {
      habit: "ניצול מלא של ביחד בשבילך",
      trigger: "תחילת כל חודש",
      action: "לבדוק יתרת נקודות ולתכנן שימוש (קולנוע, פנאי, ספורט)",
      saving_monthly: 100,
      why: "זהו כסף חינם מהסתדרות — אל תנו לו לפוג"
    },
    {
      habit: "בונוס קטיה → הלוואה ביום קבלה",
      trigger: "משכורת קטיה > ₪14,000",
      action: "העברה מיידית של הסכום מעל ₪12,000 לחשבון ההלוואה",
      saving_monthly: 1383,
      why: "3 בונוסים/שנה = ₪16,600. כל חודש שעובר = ₪275 ריבית נוספת"
    },
    {
      habit: "תזכורת קצבת ילדים",
      trigger: "ה-20 לחודש",
      action: "העברת ₪437 לחשבון הלוואה",
      saving_monthly: 437,
      why: "₪5,244/שנה — אפשר לקצר את ההלוואה ב-6 חודשים"
    }
  ],

  // ── TRAVEL PLAN ──────────────────────────────────────
  travel: {
    europe: {name:"אירופה", annual_budget:17000, monthly_saving:1416, ready_by:"יולי 2027", family:5},
    asia:   {name:"תאילנד/וייטנאם", total_budget:34000, monthly_saving:944, ready_by:"יוני 2029", frequency:"כל 3 שנים"}
  },

  // ── OVERDRAFT SCHEDULE ───────────────────────────────
  overdraft: {
    balance: 64000,
    rate_annual: 7.25,
    monthly_cost: 387,
    loan_option: {
      provider: "קרן השתלמות",
      rate: 4.0,
      years: 7,
      monthly: 875,
      total_interest: 9484,
      vs_od_interest: 32480,
      saving: 23000
    },
    schedule: [
      {month:"יול 26", regular:2000, bonus:0,    allowance:437},
      {month:"אוג 26", regular:2000, bonus:5500, allowance:437, bonusNote:"בונוס קיץ"},
      {month:"ספט 26", regular:2000, bonus:0,    allowance:437},
      {month:"אוק 26", regular:2000, bonus:0,    allowance:437},
      {month:"נוב 26", regular:2000, bonus:0,    allowance:437},
      {month:"דצמ 26", regular:2000, bonus:5500, allowance:437, bonusNote:"בונוס שנתי"},
      {month:"ינו 27", regular:2000, bonus:0,    allowance:437},
      {month:"פבר 27", regular:2000, bonus:0,    allowance:437},
      {month:"מרץ 27", regular:2000, bonus:0,    allowance:437},
      {month:"אפר 27", regular:2000, bonus:5500, allowance:437, bonusNote:"בונוס פסח"},
      {month:"מאי 27", regular:2000, bonus:0,    allowance:437},
      {month:"יונ 27", regular:2000, bonus:0,    allowance:437},
      {month:"יול 27", regular:2000, bonus:0,    allowance:437},
      {month:"אוג 27", regular:2000, bonus:5500, allowance:437, bonusNote:"בונוס קיץ"},
      {month:"ספט 27", regular:2000, bonus:0,    allowance:437}
    ]
  },

  // ── MONTHLY HISTORY (bank verified) ─────────────────
  monthly: [
    {month:"2025-11", income:30455, cc:20500, loans:7911, fixed_costs:2302, kids_costs:2053, label:"נוב 25", abroad:false},
    {month:"2025-12", income:36000, cc:19940, loans:7911, fixed_costs:2302, kids_costs:2053, label:"דצמ 25", abroad:false, bonus:6000},
    {month:"2026-01", income:30079, cc:22000, loans:4032, fixed_costs:2302, kids_costs:2053, label:"ינו 26",  abroad:true, trip:"פראג"},
    {month:"2026-02", income:24898, cc:18600, loans:4032, fixed_costs:2302, kids_costs:2053, label:"פבר 26", abroad:false},
    {month:"2026-03", income:30788, cc:19100, loans:4032, fixed_costs:2302, kids_costs:2053, label:"מרץ 26", abroad:false, bonus:3588},
    {month:"2026-04", income:30374, cc:21200, loans:4032, fixed_costs:2302, kids_costs:2053, label:"אפר 26", abroad:true,  trip:"אילת"},
    {month:"2026-05", income:30811, cc:20500, loans:4032, fixed_costs:2302, kids_costs:2053, label:"מאי 26", abroad:true,  trip:"קפריסין"},
    {month:"2026-06", income:30374, cc:17800, loans:4032, fixed_costs:2302, kids_costs:2053, label:"יונ 26", abroad:false}
  ],

  // ── CATEGORY HISTORY (14 months, Amex verified) ──────
  category_history: {
    months: ["מאי 25","יונ 25","יול 25","אוג 25","ספט 25","אוק 25","נוב 25","דצמ 25","ינו 26","פבר 26","מרץ 26","אפר 26","מאי 26","יונ 26"],
    groceries:   [1850,3200,2800,2600,1900,1100,2800,2200,2100,2600,2800,3100,2900,2100],
    clothing:    [1100,1800,850,1200,400,350,900,700,900,800,650,1100,600,400],
    pharmacy:    [355,130,500,550,258,89,275,86,295,330,100,335,235,145],
    fuel_amex:   [291,279,335,282,270,68,301,0,364,661,628,390,405,418],
    fuel_max:    [0,0,0,0,282,362,0,0,0,0,0,0,320,320],
    restaurants: [500,800,450,650,300,200,300,450,450,350,600,700,550,400],
    travel:      [4144,978,977,2472,3132,3241,990,403,866,347,347,1881,1881,651],
    cosmetics:   [0,242,0,230,211,0,0,0,0,0,0,0,0,0]
  }
};
