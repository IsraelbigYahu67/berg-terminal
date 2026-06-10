/**
 * Built-in security master: a universe of widely followed large-cap
 * equities, indices, ETFs, FX pairs, commodities and crypto.
 *
 * shares = approximate shares outstanding in billions (for indicative
 * market-cap math only). desc = original one-line profile text.
 */

export const EQUITIES = [
  // ticker, name, sector, industry, country, shares(B), desc
  ["AAPL", "Apple Inc", "Technology", "Consumer Electronics", "US", 15.0,
    "Designs and sells smartphones, personal computers, wearables and related software and services, including the iPhone, Mac, iPad, Apple Watch and the App Store ecosystem."],
  ["MSFT", "Microsoft Corp", "Technology", "Software - Infrastructure", "US", 7.4,
    "Develops productivity software, operating systems, cloud infrastructure (Azure), gaming (Xbox) and enterprise tools; a leader in commercial AI services."],
  ["GOOGL", "Alphabet Inc-A", "Communication Services", "Internet Content", "US", 12.2,
    "Parent of Google; operates the world's dominant search engine plus YouTube, Android, Chrome, Google Cloud and an AI research arm."],
  ["AMZN", "Amazon.com Inc", "Consumer Discretionary", "Internet Retail", "US", 10.5,
    "Operates the largest global e-commerce marketplace and the AWS cloud-computing platform, plus advertising, logistics and streaming businesses."],
  ["NVDA", "NVIDIA Corp", "Technology", "Semiconductors", "US", 24.5,
    "Designs GPUs and accelerated-computing platforms that power AI training and inference, gaming graphics, and data-center networking."],
  ["META", "Meta Platforms Inc", "Communication Services", "Social Media", "US", 2.5,
    "Operates Facebook, Instagram, WhatsApp and Messenger; invests heavily in AI infrastructure and augmented/virtual reality hardware."],
  ["TSLA", "Tesla Inc", "Consumer Discretionary", "Auto Manufacturers", "US", 3.2,
    "Manufactures electric vehicles and energy-storage products; develops autonomous-driving software and operates a global charging network."],
  ["BRK-B", "Berkshire Hathaway-B", "Financials", "Insurance - Diversified", "US", 1.3,
    "Diversified holding company led from Omaha; owns insurance, railroad, energy and consumer businesses plus a large public-equity portfolio."],
  ["JPM", "JPMorgan Chase & Co", "Financials", "Banks - Diversified", "US", 2.8,
    "Largest US bank by assets; spans consumer banking, investment banking, markets, payments and asset & wealth management."],
  ["V", "Visa Inc-A", "Financials", "Credit Services", "US", 1.6,
    "Operates the world's largest electronic payments network, connecting consumers, merchants, banks and governments across 200+ markets."],
  ["MA", "Mastercard Inc-A", "Financials", "Credit Services", "US", 0.91,
    "Global payments technology company processing card and account-to-account transactions; expanding in services and security analytics."],
  ["UNH", "UnitedHealth Group", "Health Care", "Healthcare Plans", "US", 0.92,
    "Largest US health insurer; Optum unit provides pharmacy benefits, care delivery and health-data analytics."],
  ["JNJ", "Johnson & Johnson", "Health Care", "Drug Manufacturers", "US", 2.4,
    "Develops pharmaceuticals and medical devices across immunology, oncology, neuroscience, surgery and orthopaedics."],
  ["XOM", "Exxon Mobil Corp", "Energy", "Oil & Gas Integrated", "US", 4.3,
    "Integrated energy major engaged in upstream production, refining, chemicals and low-carbon investments, with major Permian and Guyana assets."],
  ["CVX", "Chevron Corp", "Energy", "Oil & Gas Integrated", "US", 1.8,
    "Integrated oil and gas producer with global upstream operations, US refining, and growing positions in LNG and renewable fuels."],
  ["WMT", "Walmart Inc", "Consumer Staples", "Discount Stores", "US", 8.0,
    "World's largest retailer by revenue; operates discount stores, supercenters and Sam's Club, with a fast-growing e-commerce and advertising arm."],
  ["PG", "Procter & Gamble", "Consumer Staples", "Household Products", "US", 2.35,
    "Consumer-goods giant behind brands across fabric, home, baby, grooming and beauty care sold in 180+ countries."],
  ["KO", "Coca-Cola Co", "Consumer Staples", "Beverages", "US", 4.3,
    "World's largest non-alcoholic beverage company; portfolio spans sparkling soft drinks, water, sports drinks, coffee and juice."],
  ["PEP", "PepsiCo Inc", "Consumer Staples", "Beverages", "US", 1.37,
    "Global snacks and beverages company; owns Frito-Lay, Quaker, Gatorade, Pepsi and Tropicana brands."],
  ["HD", "Home Depot Inc", "Consumer Discretionary", "Home Improvement Retail", "US", 0.99,
    "Largest home-improvement retailer, serving DIY customers and professional contractors across North America."],
  ["BAC", "Bank of America Corp", "Financials", "Banks - Diversified", "US", 7.7,
    "Major US consumer and corporate bank with leading deposit share, global markets and wealth-management (Merrill) franchises."],
  ["WFC", "Wells Fargo & Co", "Financials", "Banks - Diversified", "US", 3.3,
    "US-focused bank providing consumer, small-business and commercial banking, home lending and wealth management."],
  ["GS", "Goldman Sachs Group", "Financials", "Capital Markets", "US", 0.31,
    "Global investment bank and securities firm; leading M&A advisory, trading, and a growing asset & wealth management platform."],
  ["MS", "Morgan Stanley", "Financials", "Capital Markets", "US", 1.6,
    "Investment bank and wealth manager; institutional securities plus E*TRADE retail brokerage and Eaton Vance asset management."],
  ["LLY", "Eli Lilly & Co", "Health Care", "Drug Manufacturers", "US", 0.9,
    "Pharmaceutical innovator in diabetes, obesity (GLP-1 therapies), oncology, immunology and Alzheimer's treatments."],
  ["ABBV", "AbbVie Inc", "Health Care", "Drug Manufacturers", "US", 1.77,
    "Biopharmaceutical company focused on immunology, oncology, neuroscience and aesthetics; home of Humira, Skyrizi and Rinvoq."],
  ["MRK", "Merck & Co Inc", "Health Care", "Drug Manufacturers", "US", 2.5,
    "Research-driven pharma; oncology franchise anchored by Keytruda, plus vaccines, hospital care and animal health."],
  ["PFE", "Pfizer Inc", "Health Care", "Drug Manufacturers", "US", 5.7,
    "Global pharmaceutical company with vaccines, oncology, internal medicine and rare-disease portfolios."],
  ["TMO", "Thermo Fisher Scientific", "Health Care", "Diagnostics & Research", "US", 0.38,
    "Supplies analytical instruments, lab equipment, reagents and contract research/manufacturing services to science and healthcare."],
  ["ORCL", "Oracle Corp", "Technology", "Software - Infrastructure", "US", 2.8,
    "Enterprise software and cloud-infrastructure provider known for databases, ERP applications and fast-growing OCI data centers."],
  ["CRM", "Salesforce Inc", "Technology", "Software - Application", "US", 0.96,
    "Leading customer-relationship-management (CRM) software platform; includes Slack, Tableau and MuleSoft, with Agentforce AI tools."],
  ["ADBE", "Adobe Inc", "Technology", "Software - Application", "US", 0.44,
    "Creative and document software maker: Photoshop, Illustrator, Premiere, Acrobat, and the Experience Cloud marketing suite."],
  ["AMD", "Advanced Micro Devices", "Technology", "Semiconductors", "US", 1.62,
    "Designs CPUs and GPUs for PCs, servers and AI accelerators (EPYC, Ryzen, Instinct); acquired Xilinx for adaptive computing."],
  ["INTC", "Intel Corp", "Technology", "Semiconductors", "US", 4.3,
    "Designs and manufactures microprocessors; investing in foundry services to manufacture chips for third parties."],
  ["QCOM", "Qualcomm Inc", "Technology", "Semiconductors", "US", 1.11,
    "Wireless technology company; Snapdragon mobile processors, modem chips and an extensive cellular patent-licensing business."],
  ["AVGO", "Broadcom Inc", "Technology", "Semiconductors", "US", 4.7,
    "Designs networking, broadband and custom AI accelerator chips; large infrastructure-software arm including VMware."],
  ["TXN", "Texas Instruments", "Technology", "Semiconductors", "US", 0.91,
    "Analog and embedded chipmaker supplying industrial, automotive and personal-electronics markets from its own fabs."],
  ["CSCO", "Cisco Systems Inc", "Technology", "Communication Equipment", "US", 4.0,
    "Networking-equipment leader in switching, routing and security; Splunk acquisition expanded observability software."],
  ["IBM", "Intl Business Machines", "Technology", "Information Technology Services", "US", 0.92,
    "Enterprise IT company focused on hybrid cloud (Red Hat), AI software (watsonx), consulting and mainframes."],
  ["NFLX", "Netflix Inc", "Communication Services", "Entertainment", "US", 0.43,
    "World's largest subscription streaming service; produces original films and series and operates an ad-supported tier."],
  ["DIS", "Walt Disney Co", "Communication Services", "Entertainment", "US", 1.81,
    "Entertainment conglomerate spanning film studios, Disney+ streaming, ESPN, ABC and global theme parks and cruises."],
  ["CMCSA", "Comcast Corp-A", "Communication Services", "Telecom Services", "US", 3.8,
    "Broadband and media company; Xfinity internet, NBCUniversal studios and parks, Sky in Europe, and Peacock streaming."],
  ["VZ", "Verizon Communications", "Communication Services", "Telecom Services", "US", 4.2,
    "Largest US wireless carrier by subscribers; provides mobility, broadband (Fios) and enterprise network services."],
  ["T", "AT&T Inc", "Communication Services", "Telecom Services", "US", 7.2,
    "US telecom focused on 5G wireless and fiber broadband after divesting media assets."],
  ["NKE", "Nike Inc-B", "Consumer Discretionary", "Footwear & Accessories", "US", 1.49,
    "World's largest athletic footwear and apparel brand; sells via wholesale partners and its direct digital/retail channels."],
  ["MCD", "McDonald's Corp", "Consumer Discretionary", "Restaurants", "US", 0.72,
    "Global quick-service restaurant franchisor with about 40,000 locations; heavily franchised, real-estate-rich model."],
  ["SBUX", "Starbucks Corp", "Consumer Discretionary", "Restaurants", "US", 1.13,
    "Global coffeehouse chain; roasts, markets and retails specialty coffee with a large loyalty and digital-ordering platform."],
  ["LOW", "Lowe's Cos Inc", "Consumer Discretionary", "Home Improvement Retail", "US", 0.57,
    "Second-largest home-improvement retailer, serving homeowners and pros across the US."],
  ["COST", "Costco Wholesale", "Consumer Staples", "Discount Stores", "US", 0.44,
    "Membership warehouse-club operator known for low prices, high volume and loyal renewal rates worldwide."],
  ["TGT", "Target Corp", "Consumer Staples", "Discount Stores", "US", 0.46,
    "US general-merchandise retailer blending discount prices with owned brands and same-day fulfillment services."],
  ["BA", "Boeing Co", "Industrials", "Aerospace & Defense", "US", 0.62,
    "Designs and builds commercial jetliners (737/787), defense aircraft, satellites and space systems."],
  ["CAT", "Caterpillar Inc", "Industrials", "Farm & Heavy Machinery", "US", 0.48,
    "World's leading maker of construction and mining equipment, diesel engines and industrial turbines."],
  ["DE", "Deere & Co", "Industrials", "Farm & Heavy Machinery", "US", 0.27,
    "Agricultural and construction equipment maker; precision-farming technology is a growing software business."],
  ["GE", "GE Aerospace", "Industrials", "Aerospace & Defense", "US", 1.08,
    "Designs and services jet engines for commercial and military aircraft; successor to the General Electric conglomerate."],
  ["HON", "Honeywell International", "Industrials", "Conglomerates", "US", 0.65,
    "Industrial technology company in aerospace, building automation, energy solutions and industrial software."],
  ["UPS", "United Parcel Service-B", "Industrials", "Integrated Freight", "US", 0.85,
    "World's largest package-delivery company; global small-parcel, freight and logistics networks."],
  ["RTX", "RTX Corp", "Industrials", "Aerospace & Defense", "US", 1.33,
    "Aerospace and defense group: Collins Aerospace systems, Pratt & Whitney engines and Raytheon missiles & defense."],
  ["LMT", "Lockheed Martin Corp", "Industrials", "Aerospace & Defense", "US", 0.24,
    "Largest defense contractor; builds the F-35 fighter, missiles, helicopters and space systems."],
  ["UNP", "Union Pacific Corp", "Industrials", "Railroads", "US", 0.61,
    "Operates the largest US western freight-rail network, hauling bulk, industrial and intermodal goods."],
  ["LIN", "Linde PLC", "Materials", "Specialty Chemicals", "US", 0.48,
    "World's largest industrial-gases company; supplies oxygen, hydrogen and specialty gases with growing clean-energy projects."],
  ["SHW", "Sherwin-Williams Co", "Materials", "Specialty Chemicals", "US", 0.25,
    "Largest US paints and coatings maker, selling through company stores and retail/industrial channels."],
  ["NEE", "NextEra Energy Inc", "Utilities", "Utilities - Regulated", "US", 2.06,
    "Largest US utility holding company; Florida Power & Light plus the world's biggest wind and solar generator."],
  ["DUK", "Duke Energy Corp", "Utilities", "Utilities - Regulated", "US", 0.77,
    "Regulated electric and gas utility serving the US Southeast and Midwest."],
  ["SO", "Southern Co", "Utilities", "Utilities - Regulated", "US", 1.1,
    "Southeastern US electric and gas utility; completed the Vogtle nuclear expansion."],
  ["AMT", "American Tower Corp", "Real Estate", "REIT - Specialty", "US", 0.47,
    "Global REIT owning wireless communications towers and data centers leased to carriers."],
  ["PLD", "Prologis Inc", "Real Estate", "REIT - Industrial", "US", 0.93,
    "World's largest industrial/logistics REIT; warehouses leased to e-commerce and supply-chain tenants."],
  ["BLK", "BlackRock Inc", "Financials", "Asset Management", "US", 0.15,
    "World's largest asset manager; iShares ETFs, institutional mandates and the Aladdin risk platform."],
  ["SCHW", "Charles Schwab Corp", "Financials", "Capital Markets", "US", 1.82,
    "Retail brokerage and bank serving tens of millions of accounts; absorbed TD Ameritrade."],
  ["AXP", "American Express Co", "Financials", "Credit Services", "US", 0.70,
    "Premium payments and travel company; closed-loop card network with affluent customer base."],
  ["C", "Citigroup Inc", "Financials", "Banks - Diversified", "US", 1.86,
    "Global bank focused on institutional services, markets, US cards and cross-border treasury solutions."],
  ["PYPL", "PayPal Holdings Inc", "Financials", "Credit Services", "US", 0.99,
    "Digital payments platform; PayPal and Venmo wallets, Braintree merchant processing."],
  ["COIN", "Coinbase Global Inc", "Financials", "Capital Markets", "US", 0.26,
    "Largest US cryptocurrency exchange; trading, custody, staking and the USDC stablecoin partnership."],
  ["UBER", "Uber Technologies Inc", "Industrials", "Ground Transportation", "US", 2.1,
    "Global ride-hailing and food-delivery (Uber Eats) platform with a freight brokerage arm."],
  ["ABNB", "Airbnb Inc", "Consumer Discretionary", "Travel Services", "US", 0.63,
    "Marketplace for short-term home rentals and experiences across 220+ countries and regions."],
  ["BKNG", "Booking Holdings Inc", "Consumer Discretionary", "Travel Services", "US", 0.033,
    "Online travel giant: Booking.com, Priceline, Agoda, Kayak and OpenTable."],
  ["SHOP", "Shopify Inc", "Technology", "Software - Application", "CA", 1.29,
    "Commerce platform powering online stores and point-of-sale for millions of merchants."],
  ["NOW", "ServiceNow Inc", "Technology", "Software - Application", "US", 0.21,
    "Cloud workflow-automation platform for IT, HR, and customer service in large enterprises."],
  ["INTU", "Intuit Inc", "Technology", "Software - Application", "US", 0.28,
    "Financial software maker: TurboTax, QuickBooks, Credit Karma and Mailchimp."],
  ["PLTR", "Palantir Technologies", "Technology", "Software - Infrastructure", "US", 2.36,
    "Data-integration and AI platforms (Gotham, Foundry, AIP) for governments and enterprises."],
  ["SNOW", "Snowflake Inc", "Technology", "Software - Infrastructure", "US", 0.33,
    "Cloud data-warehousing platform that lets enterprises store, share and analyze data across clouds."],
  ["MU", "Micron Technology", "Technology", "Semiconductors", "US", 1.11,
    "Memory-chip maker producing DRAM and NAND, including high-bandwidth memory for AI accelerators."],
  ["ASML", "ASML Holding NV", "Technology", "Semiconductor Equipment", "NL", 0.39,
    "Sole supplier of EUV lithography machines essential to manufacturing leading-edge chips."],
  ["TSM", "Taiwan Semiconductor ADR", "Technology", "Semiconductors", "TW", 5.19,
    "World's largest contract chip manufacturer; fabricates leading-edge processors for Apple, NVIDIA and AMD."],
  ["BABA", "Alibaba Group ADR", "Consumer Discretionary", "Internet Retail", "CN", 2.4,
    "Chinese e-commerce and cloud company; Taobao/Tmall marketplaces and Alibaba Cloud."],
  ["TM", "Toyota Motor ADR", "Consumer Discretionary", "Auto Manufacturers", "JP", 1.36,
    "World's largest automaker by volume; hybrid-electric pioneer with global manufacturing."],
  ["NVO", "Novo Nordisk ADR", "Health Care", "Drug Manufacturers", "DK", 4.45,
    "Danish pharma leader in diabetes and obesity care; maker of Ozempic and Wegovy."],
  ["SAP", "SAP SE ADR", "Technology", "Software - Application", "DE", 1.17,
    "German enterprise-software leader in ERP, moving its installed base to the S/4HANA cloud."],
  ["SONY", "Sony Group ADR", "Technology", "Consumer Electronics", "JP", 1.21,
    "Japanese conglomerate spanning PlayStation gaming, music, movies, imaging sensors and electronics."],
  ["GME", "GameStop Corp", "Consumer Discretionary", "Specialty Retail", "US", 0.45,
    "Video-game retailer turned meme-stock icon; holds a large cash and bitcoin treasury."],
  ["F", "Ford Motor Co", "Consumer Discretionary", "Auto Manufacturers", "US", 3.9,
    "Legacy US automaker; F-Series trucks, commercial Pro unit, and an evolving EV lineup."],
  ["GM", "General Motors Co", "Consumer Discretionary", "Auto Manufacturers", "US", 1.0,
    "US automaker behind Chevrolet, GMC, Cadillac and Buick; investing in EVs and autonomy."],
];

export const INDICES = [
  ["^GSPC", "S&P 500 Index", "Americas"],
  ["^DJI", "Dow Jones Industrial Avg", "Americas"],
  ["^IXIC", "Nasdaq Composite", "Americas"],
  ["^RUT", "Russell 2000", "Americas"],
  ["^GSPTSE", "S&P/TSX Composite", "Americas"],
  ["^BVSP", "Brazil Bovespa", "Americas"],
  ["^FTSE", "FTSE 100", "EMEA"],
  ["^GDAXI", "DAX (Germany)", "EMEA"],
  ["^FCHI", "CAC 40 (France)", "EMEA"],
  ["^STOXX50E", "Euro Stoxx 50", "EMEA"],
  ["^IBEX", "IBEX 35 (Spain)", "EMEA"],
  ["^N225", "Nikkei 225", "APAC"],
  ["^HSI", "Hang Seng", "APAC"],
  ["000001.SS", "Shanghai Composite", "APAC"],
  ["^AXJO", "S&P/ASX 200", "APAC"],
  ["^KS11", "KOSPI (Korea)", "APAC"],
  ["^NSEI", "NIFTY 50 (India)", "APAC"],
  ["^VIX", "CBOE Volatility Index", "Americas"],
];

export const ETFS = [
  ["SPY", "SPDR S&P 500 ETF"],
  ["QQQ", "Invesco QQQ (Nasdaq-100)"],
  ["IWM", "iShares Russell 2000"],
  ["DIA", "SPDR Dow Jones ETF"],
  ["GLD", "SPDR Gold Shares"],
  ["TLT", "iShares 20+ Yr Treasury"],
  ["HYG", "iShares High Yield Corp"],
  ["EEM", "iShares MSCI Emerging Mkts"],
];

export const FUTURES = [
  ["GC=F", "Gold (COMEX)"],
  ["SI=F", "Silver (COMEX)"],
  ["CL=F", "WTI Crude Oil (NYMEX)"],
  ["BZ=F", "Brent Crude Oil (ICE)"],
  ["NG=F", "Natural Gas (NYMEX)"],
  ["HG=F", "Copper (COMEX)"],
  ["ZC=F", "Corn (CBOT)"],
  ["ZW=F", "Wheat (CBOT)"],
];

export const FX_PAIRS = [
  ["EURUSD=X", "Euro / US Dollar"],
  ["GBPUSD=X", "British Pound / US Dollar"],
  ["USDJPY=X", "US Dollar / Japanese Yen"],
  ["USDCHF=X", "US Dollar / Swiss Franc"],
  ["USDCAD=X", "US Dollar / Canadian Dollar"],
  ["AUDUSD=X", "Australian Dollar / US Dollar"],
  ["NZDUSD=X", "New Zealand Dollar / US Dollar"],
  ["USDCNY=X", "US Dollar / Chinese Yuan"],
];

export const CRYPTO = [
  ["BTC-USD", "Bitcoin"],
  ["ETH-USD", "Ethereum"],
  ["SOL-USD", "Solana"],
  ["XRP-USD", "XRP"],
  ["BNB-USD", "BNB"],
  ["ADA-USD", "Cardano"],
  ["DOGE-USD", "Dogecoin"],
  ["AVAX-USD", "Avalanche"],
  ["DOT-USD", "Polkadot"],
  ["LINK-USD", "Chainlink"],
  ["LTC-USD", "Litecoin"],
];

/* ------------------------------------------------------------------ */

const bySymbol = new Map();

for (const [sym, name, sector, industry, country, shares, desc] of EQUITIES) {
  bySymbol.set(sym, { sym, name, type: "Equity", sector, industry, country, shares, desc });
}
for (const [sym, name, region] of INDICES) {
  bySymbol.set(sym, { sym, name, type: "Index", region });
}
for (const [sym, name] of ETFS) {
  bySymbol.set(sym, { sym, name, type: "ETF" });
}
for (const [sym, name] of FUTURES) {
  bySymbol.set(sym, { sym, name, type: "Commodity" });
}
for (const [sym, name] of FX_PAIRS) {
  bySymbol.set(sym, { sym, name, type: "Currency" });
}
for (const [sym, name] of CRYPTO) {
  bySymbol.set(sym, { sym, name, type: "Crypto" });
}

export function lookup(sym) {
  return bySymbol.get(String(sym).toUpperCase()) || null;
}

export function allSymbols() {
  return [...bySymbol.keys()];
}

export function equityUniverse() {
  return EQUITIES.map(([sym]) => bySymbol.get(sym));
}

export function sectors() {
  return [...new Set(EQUITIES.map((e) => e[2]))].sort();
}

/** match for autocomplete: ticker prefix or name substring */
export function matches(text, limit = 8) {
  const q = text.toUpperCase();
  const out = [];
  for (const rec of bySymbol.values()) {
    if (rec.sym.toUpperCase().startsWith(q)) out.push({ rec, rank: 0 });
    else if (rec.name.toUpperCase().includes(q)) out.push({ rec, rank: 1 });
    if (out.length > 60) break;
  }
  out.sort((a, b) => a.rank - b.rank || a.rec.sym.localeCompare(b.rec.sym));
  return out.slice(0, limit).map((x) => x.rec);
}
