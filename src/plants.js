// 鉢カードの定義・分類の既定値・置き場所ガイド
// 鉢カード本体は Supabase の plants テーブルに入る。SEED_PLANTS は初回起動時の自動投入用（旧 plants.js から変換）。

export const PLACE = { rack: "ラック下段", win: "窓台", shelf: "棚上", desk: "机" };
export const EVENT_TYPES = ["植え替え", "鉢増し", "かき子", "剪定", "肥料", "購入", "その他"];

// 分類と、カード（目安日数）が無い鉢に当てる既定値（「仮」表示）
export const CATEGORIES = {
  foliage:   { name: "観葉", intervals: [
    { months: [4,5,6,7,8,9,10], min: 6, max: 10, note: "仮：表土が乾いたらたっぷり" },
    { months: [11,12,1,2,3],    min: 12, max: 18, note: "仮：乾いて数日後に控えめ。10℃以上" } ] },
  succulent: { name: "多肉", intervals: [
    { months: [3,4,5,9,10,11], min: 10, max: 14, note: "仮：完全に乾いたらたっぷり" },
    { months: [6,7,8],         min: 14, max: 21, note: "仮：暑さで鈍る。控えめに、風通し" },
    { months: [12,1,2],        min: 25, max: 40, note: "仮：休眠気味。月1回少量。5℃以上" } ] },
  caudex:    { name: "塊根", intervals: [
    { months: [5,6,7,8,9], min: 6, max: 10, note: "仮：成長期。用土が乾いたらたっぷり" },
    { months: [4,10],      min: 12, max: 18, note: "仮：移行期。控えめに" },
    { months: [11,12,1,2,3], min: 30, max: 45, note: "仮：休眠。ほぼ断水、月1回少量。10℃以上" } ] },
  cactus:    { name: "サボテン", intervals: [
    { months: [4,5,6,7,8,9,10], min: 10, max: 14, note: "仮：完全に乾いて数日後にたっぷり" },
    { months: [11,12,1,2,3],    min: 30, max: 45, note: "仮：ほぼ断水。月1回少量。5℃以上" } ] },
};

// その月の目安。カードがあればカード、無ければ分類の既定値（provisional: true）、どちらも無ければ null
export function intervalFor(plant, month) {
  const own = (plant.intervals || []).find((x) => (x.months || []).includes(month));
  if (own) return { min: own.min, max: own.max, note: own.note || "", provisional: false };
  const cat = CATEGORIES[plant.category];
  const d = cat && cat.intervals.find((x) => x.months.includes(month));
  if (d) return { min: d.min, max: d.max, note: d.note, provisional: true };
  return null;
}
// card = 目安あり / provisional = 分類の既定値で仮運用 / none = 目安未設定
export function cardStatus(plant) {
  if ((plant.intervals || []).length) return "card";
  if (CATEGORIES[plant.category]) return "provisional";
  return "none";
}
export const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
export const newPlantId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function emptyPlant(id) {
  return { id, name: "", sub: "", place: "desk", category: "", soil: "", water_full: "", water_light: "", repot: "", intervals: [], season_notes: {}, sort_order: 0, archived: false };
}

// ---- 季節ごとの置き場所ガイド（部屋の話。鉢ごとのメモは各カードの season_notes）----
export const SEASONS = [
  { key: "spring", name: "春・秋（3〜6月・9〜11月）", test: (m) => (m >= 3 && m <= 6) || (m >= 9 && m <= 11),
    A: ["日中は内側のすりガラス窓を開けて、透明ガラス越しの光を入れる", "晴れた日はラックをA（掃き出し窓）に転がして午後の光を当てると締まる", "窓を開けて網戸にできる日は風通しを"],
    B: ["窓台・机のままでOK。すりガラス越しの柔らかい光が合っている", "ストレプトカーパスは葉に水をかけない"] },
  { key: "summer", name: "夏（7〜8月）", test: (m) => m >= 7 && m <= 8,
    A: ["すりガラス越しなら直射の心配は少ない。蒸れが一番の敵なので風通し", "扇風機を壁に向けて弱で回す", "締め切って35℃超になる日は特に注意"],
    B: ["窓台・机のままOK", "ギムノ錦は直射厳禁", "ストレプトカーパスは30℃超が苦手。一番涼しい位置に"] },
  { key: "winter", name: "冬（12〜2月）", test: (m) => m === 12 || m <= 2,
    A: ["二重窓なので冷えはA（掃き出し窓）より穏やか。それでも鉢の下に段ボールか発泡スチロール板", "光が足りないので育成ライトをラックの棒から吊って1日10〜12時間", "10℃組（センナ・アデニウム・峨眉山）は夜10℃を切るなら部屋の中央へ"],
    B: ["シェフレラ・ギムノは棚上のままOK（水は減らす）", "アロカシア3鉢・ストレプトカーパスは夜10℃を切るなら部屋の中央へ", "モンステラ斑入り・アデニウムの机は窓に近いので夜の冷えに注意"] },
];

// ---- 初回投入用（旧コードの 14 鉢）----
export const SEED_PLANTS = [
  {
    "id": "alocasia",
    "name": "アロカシア",
    "sub": "グリーンベルベット",
    "place": "win",
    "category": "foliage",
    "soil": "観葉植物用培養土7＋軽石(パーライト)3。鉢底に軽石2cm",
    "water_full": "250〜350ml",
    "water_light": "100ml",
    "repot": "前日〜当日に水やり → 湿った根鉢で鉢増し",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          11,
          12
        ],
        "min": 12,
        "max": 18,
        "note": "乾いて2〜3日後、控えめに。10℃以上"
      },
      {
        "months": [
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ],
        "min": 7,
        "max": 10,
        "note": "表土が乾いたらたっぷり。葉水も"
      }
    ],
    "season_notes": {
      "winter": "夜は窓から離す。葉が落ちても球根が無事なら春に復活"
    },
    "sort_order": 1000
  },
  {
    "id": "alocasia_bv",
    "name": "アロカシア",
    "sub": "ブラックベルベット",
    "place": "win",
    "category": "foliage",
    "soil": "観葉用6＋軽石(パーライト)4。水はけ最優先。鉢底に軽石2cm",
    "water_full": "150〜200ml",
    "water_light": "50ml",
    "repot": "前日〜当日に水やり → 湿った根鉢で鉢増し（小さめの鉢のまま）",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          11,
          12
        ],
        "min": 14,
        "max": 22,
        "note": "乾いて3〜4日後、控えめに。12℃以上。葉が落ちても球根が無事なら春に復活"
      },
      {
        "months": [
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ],
        "min": 7,
        "max": 12,
        "note": "表土2〜3cmが乾いたら。グリーンベルベットより乾かし気味。葉水は毎日でも"
      }
    ],
    "season_notes": {
      "winter": "一番寒さに弱い（12℃欲しい）。冬は暖かい部屋へ。乾燥するとハダニが付くので葉水"
    },
    "sort_order": 2000
  },
  {
    "id": "monstera_tc",
    "name": "モンステラ",
    "sub": "タイコンステレーション（斑入り）",
    "place": "desk",
    "category": "foliage",
    "soil": "観葉用6＋軽石(パーライト)4。水はけ重視。鉢底に軽石2cm",
    "water_full": "300〜400ml",
    "water_light": "100ml",
    "repot": "前日に水やり → 翌日植え替え。根が回ったら+1号（来春）",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          11,
          12
        ],
        "min": 14,
        "max": 21,
        "note": "乾いて数日後に控えめに。10℃以上。葉水で乾燥対策"
      },
      {
        "months": [
          4,
          10
        ],
        "min": 9,
        "max": 14,
        "note": "乾いてから。白い部分は焼けやすいので直射は避ける"
      },
      {
        "months": [
          5,
          6,
          7,
          8,
          9
        ],
        "min": 7,
        "max": 11,
        "note": "表土が乾いたらたっぷり。斑入りは普通のモンステラより乾かし気味"
      }
    ],
    "season_notes": {
      "winter": "10℃以上。窓台のままでもいいがガラスに触れない位置に。斑の白い部分は寒さで傷みやすい"
    },
    "sort_order": 3000
  },
  {
    "id": "alocasia_am",
    "name": "アロカシア",
    "sub": "アマゾニカ（ポリー）",
    "place": "win",
    "category": "foliage",
    "soil": "観葉用6＋軽石(パーライト)4。鉢底に軽石2cm",
    "water_full": "150〜200ml",
    "water_light": "50ml",
    "repot": "前日〜当日に水やり → 湿った根鉢で鉢増し（来春）",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          11,
          12
        ],
        "min": 12,
        "max": 18,
        "note": "乾いて2〜3日後、控えめに。12℃以上。冬は葉を落としやすいが球根が無事なら春に復活"
      },
      {
        "months": [
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ],
        "min": 7,
        "max": 11,
        "note": "表土が乾いたらたっぷり。葉水も"
      }
    ],
    "season_notes": {
      "winter": "12℃欲しい。冬はアロカシア3鉢まとめて暖かい部屋へ。葉水でハダニ予防"
    },
    "sort_order": 4000
  },
  {
    "id": "strepto",
    "name": "ストレプトカーパス",
    "sub": "プリティタートル",
    "place": "desk",
    "category": "foliage",
    "soil": "観葉用6＋パーライト(軽石)4。軽くて水はけのよい土。鉢底に軽石2cm",
    "water_full": "200〜300ml",
    "water_light": "80ml",
    "repot": "前日に水やり → 翌日植え替え（来春。浅めの鉢でOK）",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          11,
          12
        ],
        "min": 10,
        "max": 15,
        "note": "乾いてから。10℃以上。乾燥しすぎると葉先が枯れる"
      },
      {
        "months": [
          4,
          5,
          6,
          9,
          10
        ],
        "min": 5,
        "max": 8,
        "note": "成長期。表土が乾いたらたっぷり。葉に水をかけない（株元に）"
      },
      {
        "months": [
          7,
          8
        ],
        "min": 6,
        "max": 10,
        "note": "暑さが苦手。30℃超は涼しい場所へ、水は控えめ"
      }
    ],
    "season_notes": {
      "winter": "10℃以上。アロカシアと一緒に移動。葉には水をかけない"
    },
    "sort_order": 5000
  },
  {
    "id": "schefflera",
    "name": "シェフレラ",
    "sub": "",
    "place": "shelf",
    "category": "foliage",
    "soil": "観葉植物用培養土。鉢底に軽石2cm",
    "water_full": "150〜250ml（すぐ抜けるなら腰水10〜15分）",
    "water_light": "80ml",
    "repot": "前日に水やり → 翌日植え替え",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          11,
          12
        ],
        "min": 12,
        "max": 16,
        "note": "乾いてから数日空ける"
      },
      {
        "months": [
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ],
        "min": 6,
        "max": 9,
        "note": "表土が乾いたらたっぷり"
      }
    ],
    "season_notes": {
      "winter": "0℃近くまで耐える"
    },
    "sort_order": 6000
  },
  {
    "id": "aeonium",
    "name": "黒法師",
    "sub": "アエオニウム・冬型",
    "place": "rack",
    "category": "succulent",
    "soil": "多肉植物用培養土そのまま。鉢底に軽石2cm",
    "water_full": "250〜350ml",
    "water_light": "80ml",
    "repot": "乾いた状態で植え替え → 3〜4日後に水",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          4,
          10,
          11,
          12
        ],
        "min": 9,
        "max": 13,
        "note": "成長期。土が乾いたらたっぷり。5℃以上"
      },
      {
        "months": [
          5,
          6,
          9
        ],
        "min": 14,
        "max": 20,
        "note": "移行期。控えめに"
      },
      {
        "months": [
          7,
          8
        ],
        "min": 25,
        "max": 35,
        "note": "夏は休眠。月1〜2回軽く"
      }
    ],
    "season_notes": {
      "spring": "10月〜成長期。日によく当てる",
      "summer": "夏休眠。日陰＋風通し、水は月1〜2回",
      "winter": "5℃で平気。成長期なので日には当てる"
    },
    "sort_order": 7000
  },
  {
    "id": "ficus",
    "name": "ガジュマル",
    "sub": "",
    "place": "rack",
    "category": "foliage",
    "soil": "観葉植物用培養土8＋軽石2。鉢底に軽石2cm",
    "water_full": "300〜400ml",
    "water_light": "100ml",
    "repot": "前日に水やり → 翌日植え替え",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          11,
          12
        ],
        "min": 12,
        "max": 18,
        "note": "乾いて数日後に少なめ。5℃以上"
      },
      {
        "months": [
          4,
          5,
          6,
          9
        ],
        "min": 7,
        "max": 11,
        "note": "表土が乾いたらたっぷり"
      },
      {
        "months": [
          7,
          8
        ],
        "min": 4,
        "max": 7,
        "note": "真夏。表土が乾いたらたっぷり"
      },
      {
        "months": [
          10
        ],
        "min": 9,
        "max": 13,
        "note": "乾きが遅くなる。乾いてから"
      }
    ],
    "season_notes": {
      "winter": "5℃以上。窓から少し離す"
    },
    "sort_order": 8000
  },
  {
    "id": "senna",
    "name": "センナ",
    "sub": "メリディオナリス・夏型",
    "place": "rack",
    "category": "caudex",
    "soil": "多肉用7＋軽石小粒3（または赤玉小粒＋軽石）。鉢底に軽石2cm",
    "water_full": "100〜150ml",
    "water_light": "50ml",
    "repot": "乾いた状態で鉢増し → 3〜4日後に水",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          4,
          12
        ],
        "min": 28,
        "max": 40,
        "note": "休眠。ほぼ断水、月1回少量。10℃以上"
      },
      {
        "months": [
          5,
          6,
          7,
          8,
          9
        ],
        "min": 5,
        "max": 8,
        "note": "成長期。用土が乾いたらたっぷり"
      },
      {
        "months": [
          10,
          11
        ],
        "min": 12,
        "max": 18,
        "note": "落葉し始めたら徐々に減らす"
      }
    ],
    "season_notes": {
      "spring": "11月に落葉し始めたら水を減らす",
      "summer": "暑さは好き。風さえあれば元気",
      "winter": "10℃欲しい。夜はPC近くか暖房のある部屋へ"
    },
    "sort_order": 9000
  },
  {
    "id": "adenium",
    "name": "アデニウム",
    "sub": "アラビカム・夏型塊根",
    "place": "desk",
    "category": "caudex",
    "soil": "多肉用6＋軽石小粒4（または赤玉＋軽石）。鉢底に軽石2cm",
    "water_full": "150〜200ml",
    "water_light": "50ml",
    "repot": "乾いた状態で植え替え（来春5〜6月）→ 1週間後に水",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          11,
          12
        ],
        "min": 30,
        "max": 45,
        "note": "休眠。落葉したらほぼ断水、月1回少量。10℃以上"
      },
      {
        "months": [
          4,
          10
        ],
        "min": 12,
        "max": 18,
        "note": "移行期。控えめに。葉が黄色くなって落ち始めたら減らす"
      },
      {
        "months": [
          5,
          6,
          7,
          8,
          9
        ],
        "min": 7,
        "max": 11,
        "note": "成長期。用土が完全に乾いたらたっぷり。日光大好き"
      }
    ],
    "season_notes": {
      "summer": "暑さ大好き。一番の成長期。風さえあれば直射OK",
      "winter": "10℃欲しい。落葉して休眠。センナと一緒に移動、断水"
    },
    "sort_order": 10000
  },
  {
    "id": "huernia",
    "name": "ユーフォルビア",
    "sub": "プフェルスドルフィー・春秋型",
    "place": "shelf",
    "category": "succulent",
    "soil": "多肉用7＋軽石小粒3。鉢底に軽石2cm",
    "water_full": "80〜120ml",
    "water_light": "30ml",
    "repot": "乾いた状態で植え替え（来春）→ 1週間後に水",
    "intervals": [
      {
        "months": [
          1,
          2,
          12
        ],
        "min": 25,
        "max": 40,
        "note": "休眠。ほぼ断水、月1回少量。5℃以上"
      },
      {
        "months": [
          3,
          4,
          5,
          6,
          9,
          10,
          11
        ],
        "min": 10,
        "max": 14,
        "note": "成長期。完全に乾いたらたっぷり。日によく当てる"
      },
      {
        "months": [
          7,
          8
        ],
        "min": 14,
        "max": 21,
        "note": "暑さで鈍る。控えめに、風通し"
      }
    ],
    "season_notes": {
      "summer": "暑さは平気。風通しを確保、水は控えめ",
      "winter": "5℃以上。断水気味に。峨眉山と同じ扱い"
    },
    "sort_order": 11000
  },
  {
    "id": "gabizan",
    "name": "峨眉山",
    "sub": "ユーフォルビア・春秋型",
    "place": "rack",
    "category": "succulent",
    "soil": "多肉用7〜8＋軽石小粒2〜3。鉢底に軽石2cm",
    "water_full": "100〜150ml",
    "water_light": "50ml",
    "repot": "乾いた状態で植え替え → 3〜4日後に水",
    "intervals": [
      {
        "months": [
          1,
          2,
          6,
          7,
          8,
          12
        ],
        "min": 18,
        "max": 25,
        "note": "休眠気味。表土を湿らせる程度"
      },
      {
        "months": [
          3,
          4,
          5,
          9,
          10,
          11
        ],
        "min": 12,
        "max": 16,
        "note": "成長期。表土が乾いて1週間後にたっぷり"
      }
    ],
    "season_notes": {
      "spring": "成長期。子株を切るなら5〜6月",
      "summer": "暑さは好き。水は控えめ",
      "winter": "10℃欲しい。センナと一緒に移動"
    },
    "sort_order": 12000
  },
  {
    "id": "echeveria",
    "name": "エケベリア",
    "sub": "春秋型",
    "place": "rack",
    "category": "succulent",
    "soil": "多肉植物用培養土そのまま",
    "water_full": "50〜70ml",
    "water_light": "20ml",
    "repot": "乾いた状態で植え替え → 3〜4日後に水",
    "intervals": [
      {
        "months": [
          1,
          2,
          6,
          7,
          8,
          12
        ],
        "min": 21,
        "max": 30,
        "note": "休眠気味。月1〜2回控えめ"
      },
      {
        "months": [
          3,
          4,
          5,
          9,
          10,
          11
        ],
        "min": 12,
        "max": 16,
        "note": "成長期。完全に乾いたらたっぷり。株元に"
      }
    ],
    "season_notes": {
      "spring": "成長期。よく日に当てる",
      "summer": "休眠気味。半日陰で水控えめ",
      "winter": "5℃で平気。断水気味に"
    },
    "sort_order": 13000
  },
  {
    "id": "gymno",
    "name": "ギムノカリキウム",
    "sub": "LB2178 錦",
    "place": "shelf",
    "category": "cactus",
    "soil": "サボテン用（粒状）そのまま",
    "water_full": "70〜100ml",
    "water_light": "30ml",
    "repot": "乾いた状態で植え替え → 1週間後に水",
    "intervals": [
      {
        "months": [
          1,
          2,
          3,
          11,
          12
        ],
        "min": 30,
        "max": 45,
        "note": "ほぼ断水。月1回少量。5℃以上"
      },
      {
        "months": [
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ],
        "min": 10,
        "max": 14,
        "note": "完全に乾いて数日後にたっぷり"
      }
    ],
    "season_notes": {
      "winter": "5℃以上。ガラスに触れない位置に"
    },
    "sort_order": 14000
  }
];
