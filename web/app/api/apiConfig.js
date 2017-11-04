export const blockTradesAPIs = {
    BASE: "https://api.blocktrades.us/v2",
    BASE_OL: "https://ol-api1.openledger.info/api/v0/ol/support",
    COINS_LIST: "/coins",
    ACTIVE_WALLETS: "/active-wallets",
    TRADING_PAIRS: "/trading-pairs",
    DEPOSIT_LIMIT: "/deposit-limits",
    ESTIMATE_OUTPUT: "/estimate-output-amount"
};

export const rudexAPIs = {
    BASE: "https://gateway.rudex.org/api/v0",
    COINS_LIST: "/coins",
    NEW_DEPOSIT_ADDRESS: "/new-deposit-address"
};

export const settingsAPIs = {
    DEFAULT_WS_NODE: "wss://fake.automatic-selection.com",
    WS_NODE_LIST: [
        {url: "wss://fake.automatic-selection.com", location: {translate: "settings.api_closest"}},
        {url: "ws://127.0.0.1:8090", location: "Locally hosted"},
        {url: "wss://node.market.rudex.org", location: "RuDEX (Germany)"},
        {url: "wss://bitshares.openledger.info/ws", location: "Nuremberg, Germany"},
        {url: "wss://eu.openledger.info/ws", location: "Berlin, Germany"},
        {url: "wss://bit.btsabc.org/ws", location: "Hong Kong"},
        {url: "wss://bts.transwiser.com/ws", location: "Hangzhou, China"},
        {url: "wss://bitshares.dacplay.org/ws", location:  "Hangzhou, China"},
        {url: "wss://bitshares.wancloud.io/ws", location:  "China"},
        {url: "wss://openledger.hk/ws", location: "Hong Kong"},
        {url: "wss://secure.freedomledger.com/ws", location: "Toronto, Canada"},
        {url: "wss://dexnode.net/ws", location: "Dallas, USA"},
        {url: "wss://altcap.io/ws", location: "Paris, France"},
        {url: "wss://bitshares.crypto.fans/ws", location: "Munich, Germany"},
        {url: "wss://node.testnet.bitshares.eu", location: "Public Testnet Server (Frankfurt, Germany)"}
    ],
    DEFAULT_FAUCET: "http://faucet.gurondex.io",
    RPC_URL: "http://faucet.gurondex.io/api/"
};
