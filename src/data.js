export const projects = [
  {
    id: "lantern",
    name: "Lantern",
    ticker: "$LANTERN",
    score: 86,
    delta: "+14.2%",
    holders: "2.8k",
    liquidity: "$184k",
    liquidityValue: 184000,
    tag: "Builder cadence",
    color: "orange",
    icon: "sun",
    blurb:
      "Small team. Steady releases. A wallet-native quest board taking shape in public.",
    spark: "M1 25 10 22 17 24 26 16 34 20 43 13 51 17 60 9 69 12 79 4 89 6",
    evidence: [
      {
        title: "Start with what shipped",
        text: "Look for a dated release, a working product, and a changelog that connects the two.",
      },
      {
        title: "Follow the milestone trail",
        text: "Compare published commitments with delivered work. A signed update should lead to something you can inspect.",
      },
      {
        title: "Check who is participating",
        text: "Explore whether activity extends beyond the team and a small group of repeat wallets.",
      },
    ],
  },
  {
    id: "orbitals",
    name: "Orbitals",
    ticker: "$ORB",
    score: 79,
    delta: "+8.7%",
    holders: "4.1k",
    liquidity: "$263k",
    liquidityValue: 263000,
    tag: "Holder breadth",
    color: "sage",
    icon: "ring",
    blurb:
      "A wider circle of small holders, with liquidity depth that holds its ground.",
    spark: "M1 24 10 20 19 23 28 15 37 18 46 11 55 15 64 10 73 13 81 5 89 3",
    evidence: [
      {
        title: "Look beyond the wallet count",
        text: "A higher holder count is useful context only when concentration and related-wallet patterns are also examined.",
      },
      {
        title: "Watch who stays",
        text: "Compare retention over multiple time windows instead of relying on a single snapshot.",
      },
      {
        title: "Inspect the depth",
        text: "Check whether liquidity remains available through ordinary trading and whether lock claims have an on-chain source.",
      },
    ],
  },
  {
    id: "morrow",
    name: "Morrow",
    ticker: "$MRW",
    score: 74,
    delta: "+5.1%",
    holders: "1.6k",
    liquidity: "$96k",
    liquidityValue: 96000,
    tag: "Liquidity health",
    color: "lavender",
    icon: "mountain",
    blurb:
      "Quiet momentum, a public treasury, and a next milestone with an actual date.",
    spark: "M1 23 10 21 19 24 28 18 37 20 46 15 55 17 64 11 73 14 81 8 89 6",
    evidence: [
      {
        title: "Inspect the liquidity conditions",
        text: "Understand pool depth, concentration, and unlock dates. A headline value cannot describe exit conditions.",
      },
      {
        title: "Read the treasury trail",
        text: "Compare public treasury explanations with identifiable wallet activity and dated records.",
      },
      {
        title: "Revisit the next milestone",
        text: "Use a dated commitment as a future checkpoint, not as evidence that delivery is guaranteed.",
      },
    ],
  },
];
export const dimensions = [
  {
    name: "Holder breadth",
    weight: 28,
    description: "Participation beyond a small inner circle.",
    detail:
      "Proposed inputs: unique wallets, concentration, and retention over time. Wallet counts do not represent verified people, and related wallets can distort distribution.",
  },
  {
    name: "Liquidity health",
    weight: 24,
    description: "Depth that survives beyond the first spike.",
    detail:
      "Proposed inputs: pool depth, lock evidence, and time-weighted flow. Inspect the original pool and lock contract; liquidity can change quickly.",
  },
  {
    name: "Builder cadence",
    weight: 22,
    description: "Dated milestones. Work you can inspect.",
    detail:
      "Proposed inputs: shipped releases, dated milestones, and signed updates. Check that each claim points to a working product or a verifiable source.",
  },
  {
    name: "Community proof",
    weight: 16,
    description: "Contributions with a visible wallet trail.",
    detail:
      "Proposed input: public attestations with traceable wallet activity. One wallet can attest once per active registry entry. Multiple wallets can belong to one person; attestations are not identity or truth verification.",
  },
  {
    name: "Market quality",
    weight: 10,
    description: "Consistency, with context around the volume.",
    detail:
      "Proposed inputs: volume consistency and suspicious-trading checks. A score is a research aid, not a prediction or a promise of returns.",
  },
];
