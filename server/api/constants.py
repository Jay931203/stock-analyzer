"""Data constants for stock tickers, sectors, and market caps."""

# NASDAQ 100 constituents (100 largest non-financial NASDAQ-listed companies)
NASDAQ_100 = [
    "AAPL", "ABNB", "ADBE", "ADI", "ADP", "ADSK", "AEP", "AMAT",
    "AMGN", "AMZN", "AMD", "ANSS", "APP", "ARM", "ASML", "AVGO",
    "AZN", "BIIB", "BKNG", "BKR", "CCEP", "CDNS", "CDW", "CEG",
    "CHTR", "CMCSA", "COIN", "COST", "CPRT", "CRWD", "CSCO", "CSGP",
    "CSX", "CTAS", "CTSH", "DASH", "DDOG", "DLTR", "DXCM", "EA",
    "EXC", "FANG", "FAST", "FTNT", "GEHC", "GILD", "GFS", "GOOGL",
    "HON", "IDXX", "ILMN", "INTC", "INTU", "ISRG", "KDP", "KHC",
    "KLAC", "LIN", "LRCX", "LULU", "MAR", "MCHP", "MDB", "MDLZ",
    "MELI", "META", "MNST", "MRNA", "MRVL", "MSFT", "MU", "NFLX",
    "NVDA", "NXPI", "ODFL", "ON", "ORLY", "PANW", "PAYX", "PCAR",
    "PDD", "PEP", "PLTR", "PYPL", "QCOM", "QQQ", "REGN", "ROP",
    "ROST", "SBUX", "SMCI", "SNPS", "SPY", "TEAM", "TMUS", "TSLA",
    "TTD", "TTWO", "TXN", "VRSK", "VRTX", "WDAY", "ZS",
]

LEVERAGED_ETFS = [
    "TQQQ", "SOXL", "UPRO", "TECL", "SQQQ", "LABU", "TNA", "FNGU",
]

POPULAR_TICKERS = NASDAQ_100 + LEVERAGED_ETFS

SECTOR_MAP = {
    "Technology": [
        "AAPL", "ADBE", "ADI", "ADSK", "AMAT", "AMD", "AMZN", "ANSS",
        "APP", "ARM", "ASML", "AVGO", "CDNS", "CDW", "CRM", "CRWD",
        "CSCO", "CSGP", "CTSH", "DDOG", "FTNT", "GFS", "GOOGL", "INTC",
        "INTU", "KLAC", "LRCX", "MDB", "META", "MRVL", "MSFT", "MU",
        "NXPI", "NVDA", "ON", "ORCL", "PANW", "PLTR", "QCOM", "SHOP",
        "SMCI", "SNPS", "TEAM", "TXN", "TSLA", "TTD", "WDAY", "ZS",
    ],
    "Consumer": [
        "ABNB", "BKNG", "CCEP", "CMG", "COST", "CPRT", "DASH", "DLTR",
        "EA", "FAST", "HD", "KDP", "KHC", "KO", "LOW", "LULU", "MAR",
        "MCD", "MDLZ", "MELI", "MNST", "NKE", "ODFL", "ORLY", "PCAR",
        "PDD", "PEP", "PG", "ROST", "SBUX", "TGT", "TTWO", "UBER",
        "WMT", "YUM",
    ],
    "Financial": [
        "ADP", "AXP", "BAC", "BKR", "BLK", "BRK-B", "C", "CME",
        "COIN", "CTAS", "GS", "ICE", "JPM", "MA", "MCO", "MS",
        "PAYX", "PYPL", "ROP", "SCHW", "SPGI", "SQ", "TFC",
        "UNH", "USB", "V", "VRSK", "WFC",
    ],
    "Healthcare": [
        "ABBV", "AMGN", "AZN", "BDX", "BIIB", "BMY", "DHR", "DXCM",
        "EW", "GEHC", "GILD", "IDXX", "ILMN", "ISRG", "JNJ", "LLY",
        "MCHP", "MDT", "MRK", "MRNA", "PFE", "REGN", "SYK", "TMO",
        "VRTX", "ZTS",
    ],
    "Media": [
        "CHTR", "CMCSA", "DIS", "NFLX", "PINS", "SNAP", "SPOT",
        "T", "TMUS", "VZ",
    ],
    "Energy": [
        "COP", "CVX", "EOG", "FANG", "OXY", "PSX", "SLB",
        "VLO", "XOM",
    ],
    "Industrial": [
        "BA", "CAT", "CSX", "DE", "EMR", "FDX", "GE", "HON", "ITW",
        "LMT", "MMM", "RTX", "UNP", "UPS",
    ],
    "Utilities": [
        "AEP", "CEG", "DUK", "EXC", "NEE", "SO",
    ],
    "Real Estate": [
        "AMT", "CCI", "EQIX", "PLD",
    ],
    "Materials": [
        "APD", "ECL", "FCX", "LIN", "NEM", "SHW",
    ],
    "ETF": [
        "QQQ", "SPY",
    ],
    "Leveraged": [
        "TQQQ", "SOXL", "UPRO", "TECL", "SQQQ", "LABU", "TNA", "FNGU",
    ],
}

TICKER_NAMES = {
    "AAPL": "Apple", "ABNB": "Airbnb", "ADBE": "Adobe", "ADI": "Analog Devices",
    "ADP": "ADP", "ADSK": "Autodesk", "AEP": "AE Power", "AMAT": "Applied Materials",
    "AMGN": "Amgen", "AMZN": "Amazon", "AMD": "AMD", "ANSS": "Ansys",
    "APP": "AppLovin", "ARM": "Arm Holdings", "ASML": "ASML", "AVGO": "Broadcom",
    "AZN": "AstraZeneca", "BIIB": "Biogen", "BKNG": "Booking", "BKR": "Baker Hughes",
    "CCEP": "Coca-Cola EP", "CDNS": "Cadence", "CDW": "CDW", "CEG": "Constellation",
    "CHTR": "Charter", "CMCSA": "Comcast", "COIN": "Coinbase", "COST": "Costco",
    "CPRT": "Copart", "CRWD": "CrowdStrike", "CSCO": "Cisco", "CSGP": "CoStar",
    "CSX": "CSX Corp", "CTAS": "Cintas", "CTSH": "Cognizant", "DASH": "DoorDash",
    "DDOG": "Datadog", "DLTR": "Dollar Tree", "DXCM": "DexCom", "EA": "EA Games",
    "EXC": "Exelon", "FANG": "Diamondback", "FAST": "Fastenal", "FTNT": "Fortinet",
    "GEHC": "GE Healthcare", "GILD": "Gilead", "GFS": "GlobalFoundries", "GOOGL": "Google",
    "HON": "Honeywell", "IDXX": "IDEXX", "ILMN": "Illumina", "INTC": "Intel",
    "INTU": "Intuit", "ISRG": "Intuitive Surg", "KDP": "Keurig Dr P", "KHC": "Kraft Heinz",
    "KLAC": "KLA Corp", "LIN": "Linde", "LRCX": "Lam Research", "LULU": "Lululemon",
    "MAR": "Marriott", "MCHP": "Microchip", "MDB": "MongoDB", "MDLZ": "Mondelez",
    "MELI": "MercadoLibre", "META": "Meta", "MNST": "Monster", "MRNA": "Moderna",
    "MRVL": "Marvell", "MSFT": "Microsoft", "MU": "Micron", "NFLX": "Netflix",
    "NVDA": "NVIDIA", "NXPI": "NXP Semi", "ODFL": "Old Dominion", "ON": "ON Semi",
    "ORLY": "O'Reilly", "PANW": "Palo Alto", "PAYX": "Paychex", "PCAR": "PACCAR",
    "PDD": "PDD Holdings", "PEP": "PepsiCo", "PLTR": "Palantir", "PYPL": "PayPal",
    "QCOM": "Qualcomm", "QQQ": "Invesco QQQ", "REGN": "Regeneron", "ROP": "Roper Tech",
    "ROST": "Ross Stores", "SBUX": "Starbucks", "SMCI": "Super Micro", "SNPS": "Synopsys",
    "SPY": "S&P 500 ETF", "TEAM": "Atlassian", "TMUS": "T-Mobile", "TSLA": "Tesla",
    "TTD": "Trade Desk", "TTWO": "Take-Two", "TXN": "Texas Instr", "VRSK": "Verisk",
    "VRTX": "Vertex Pharma", "WDAY": "Workday", "ZS": "Zscaler",
    # Leveraged ETFs
    "TQQQ": "3x NASDAQ", "SOXL": "3x Semis", "UPRO": "3x S&P 500",
    "TECL": "3x Tech", "SQQQ": "-3x NASDAQ", "LABU": "3x Biotech",
    "TNA": "3x Small Cap", "FNGU": "3x FANG+",
}

# Approximate market caps in billions (updated periodically, good enough for display)
MARKET_CAP_B = {
    "AAPL": 3400, "MSFT": 3100, "NVDA": 2800, "AMZN": 2100, "GOOGL": 2000,
    "META": 1500, "AVGO": 800, "TSLA": 750, "LLY": 700, "COST": 400,
    "NFLX": 380, "AMD": 220, "QCOM": 190, "ADBE": 200, "ISRG": 190,
    "INTU": 180, "AMGN": 165, "AMAT": 150, "BKNG": 160, "TXN": 185,
    "PANW": 120, "LRCX": 95, "MU": 100, "KLAC": 90, "SNPS": 80,
    "CDNS": 78, "CRWD": 85, "INTC": 100, "MRVL": 65, "ASML": 260,
    "ARM": 150, "PLTR": 200, "COIN": 50, "APP": 90, "SMCI": 20,
    "PEP": 210, "MDLZ": 85, "KDP": 45, "KHC": 40, "MNST": 55,
    "CMCSA": 170, "CHTR": 50, "TMUS": 260, "NXPI": 55, "ON": 25,
    "ADI": 105, "MCHP": 30, "FTNT": 75, "DDOG": 40, "MDB": 25,
    "ZS": 30, "WDAY": 65, "TEAM": 55, "CSCO": 230, "ADP": 110,
    "ADSK": 55, "CTSH": 40, "ANSS": 28, "CSGP": 35, "CDW": 25,
    "PYPL": 75, "MRNA": 15, "BIIB": 25, "GILD": 110, "REGN": 90,
    "VRTX": 120, "ILMN": 18, "DXCM": 30, "IDXX": 40, "GEHC": 40,
    "AZN": 220, "PCAR": 55, "ODFL": 40, "CSX": 60, "FAST": 45,
    "CPRT": 55, "ORLY": 70, "ROST": 45, "SBUX": 100, "MAR": 75,
    "LULU": 35, "DLTR": 15, "CTAS": 85, "PAYX": 50, "MELI": 85,
    "PDD": 130, "DASH": 65, "ABNB": 80, "TTWO": 30, "EA": 40,
    "CEG": 80, "AEP": 50, "EXC": 40, "HON": 145, "ROP": 55,
    "VRSK": 40, "TTD": 45, "FANG": 30, "BKR": 40, "GFS": 25,
    "LIN": 210, "CCEP": 40,
    "QQQ": 280, "SPY": 550,
    # Leveraged ETFs (AUM not market cap, but close enough for display)
    "TQQQ": 22, "SOXL": 10, "UPRO": 4, "TECL": 2,
    "SQQQ": 5, "LABU": 1, "TNA": 3, "FNGU": 5,
}
