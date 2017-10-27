import alt from "alt-instance";
import {fetchCoins, fetchBridgeCoins, getBackedCoins, getActiveWallets} from "common/blockTradesMethods";
import {fetchCoinList} from "common/RuDexMethods";
import {blockTradesAPIs} from "api/apiConfig";

let inProgress = {};

class GatewayActions {

    fetchCoins({backer, url} = {}) {
        if (backer === "RUDEX")
            return (dispatch) => {
                Promise.all([
                    fetchCoinList(url)
                ]).then(result => {
                    delete inProgress["fetchCoins_" + backer];
                    let [coins] = result;
                    dispatch({
                        coins: coins,
                        backedCoins: coins,
                        backer
                    });
                });
            };
        else
            return (dispatch) => {
                Promise.all([
                    fetchCoins(url),
                    getActiveWallets(blockTradesAPIs.BASE_OL + blockTradesAPIs.ACTIVE_WALLETS)
                ]).then(result => {
                    let [coins, wallets] = result;
                    // coins = test;
                    dispatch({
                        coins: coins,
                        backedCoins: getBackedCoins({allCoins: coins, backer: backer}).filter(a => {
                            return wallets.indexOf(a.walletType) !== -1;
                        }),
                        backer
                    });
                });
            };
    }

    fetchBridgeCoins(url = undefined) {
        if (!inProgress["fetchBridgeCoins"]) {
            inProgress["fetchBridgeCoins"] = true;
            return (dispatch) => {
                Promise.all([
                    fetchCoins(url),
                    fetchBridgeCoins(url),
                    getActiveWallets(blockTradesAPIs.BASE + blockTradesAPIs.ACTIVE_WALLETS)
                ]).then(result => {
                    delete inProgress["fetchBridgeCoins"];
                    let [coins, bridgeCoins, wallets] = result;
                    dispatch({
                        coins,
                        bridgeCoins,
                        wallets
                    });
                });
            };
        } else {
            return {};
        }
    }
}

export default alt.createActions(GatewayActions);