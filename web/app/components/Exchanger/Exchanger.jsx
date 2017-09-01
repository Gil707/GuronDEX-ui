import React from "react";
import BalanceComponent from "../Utility/BalanceComponent";
import AccountActions from "actions/AccountActions";
import Translate from "react-translate-component";
import AccountSelect from "../Forms/AccountSelect";
import AccountSelector from "../Account/AccountSelector";
import AccountStore from "stores/AccountStore";
import AmountSelector from "../Utility/AmountSelector";
import utils from "common/utils";
import counterpart from "counterpart";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import { RecentTransactions } from "../Account/RecentTransactions";
import Immutable from "immutable";
import {ChainStore} from "bitsharesjs/es";
import {connect} from "alt-react";

class Exchanger extends React.Component {


    constructor(props) {
        super(props);
        this.state = Exchanger.getInitialState();
        let {query} = this.props.location;

        if(query.from) {
            this.state.from_name = query.from;
            ChainStore.getAccount(query.from);
        }
        if(query.to) {
            this.state.to_name = query.to;
            ChainStore.getAccount(query.to);
        }
        if(query.amount) this.state.amount = query.amount;
        if(query.asset) {
            this.state.asset_id = query.asset;
            this.state.asset = ChainStore.getAsset(query.asset);
        }
        if(query.memo) this.state.memo = query.memo;
        let currentAccount = AccountStore.getState().currentAccount;
        if (!this.state.from_name) this.state.from_name = currentAccount;
        this.onTrxIncluded = this.onTrxIncluded.bind(this);
    }

    static getInitialState() {
        return {
            from_name: "",
            to_name: "gurondex-cny",
            from_account: null,
            to_account: null,
            amount: "",
            recieved_curr: "bitCNY",
            asset_id: null,
            asset: null,
            memo: "",
            error: null,
            propose: false,
            propose_account: "",
            feeAsset: null,
            fee_asset_id: "1.3.0",
            cnycny: 1,
            cnyrub: null
        };
    };

    onChangeHandler(e) {
        this.setState({recieved: e.target.value})
    }
    onBtnClickHandler() {
        alert(this.state.recieved);
    }

    componentWillMount() {
        this.nestedRef = null;
    }

    shouldComponentUpdate(np, ns) {
        let { asset_types: current_types } = this._getAvailableAssets();
        let { asset_types } = this._getAvailableAssets(ns);

        if (asset_types.length === 1) {
            let asset = ChainStore.getAsset(asset_types[0]);
            if (current_types.length !== 1) {
                this.onAmountChanged({amount: ns.amount, asset});
            }

            if (asset_types[0] !== this.state.fee_asset_id) {
                if (asset && this.state.fee_asset_id !== asset_types[0]) {
                    this.setState({
                        feeAsset: asset,
                        fee_asset_id: asset_types[0]
                    });
                }
            }
        }
        return true;
    }

    componentWillReceiveProps(np) {
        if (np.currentAccount !== this.state.from_name && np.currentAccount !== this.props.currentAccount) {
            this.setState({
                from_name: np.currentAccount,
                from_account: ChainStore.getAccount(np.currentAccount)
            });
        }
    }

    fromChanged(from_name) {
        if (!from_name) this.setState({from_account: null});
        this.setState({from_name, error: null, propose: false, propose_account: ""});
    }

    toChanged(to_name) {
        this.setState({to_name, error: null});
    }

    onFromAccountChanged(from_account) {
        this.setState({from_account, error: null});
    }

    onToAccountChanged(to_account) {
        this.setState({to_account, error: null});
    }

    onAmountChanged({amount, asset}) {

        let cssr = null;

        if (!asset) {
            return;
        } else {

            cssr = this.getCourse(asset.get("id"));

            let cssrval = (Math.round((Number(amount.replace(",", "")) / cssr)*100)/100);

            if (isNaN(cssrval)) {
                cssrval = "overpriced";
            }

            this.setState({amount, asset,
                asset_id: asset.get("id"),
                error: null,
                memo: ("Обмен совершен по курсу = ".concat(cssr).concat(" Вы получите: ").concat(cssrval).concat( " bitCNY"))});
            }
            this.onToAccountChanged.bind(this);
    }

    onFeeChanged({asset}) {
        this.setState({feeAsset: asset, error: null});
    }

    onMemoChanged(e) {
        this.setState({memo: e.target.value});
    }

    onTrxIncluded(confirm_store_state) {
        if(confirm_store_state.included && confirm_store_state.broadcasted_transaction) {
            // this.setState(Transfer.getInitialState());
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        } else if (confirm_store_state.closed) {
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        }
    }

    onPropose(propose, e) {
        e.preventDefault();
        this.setState({ propose, propose_account: null });
    }

    onProposeAccount(propose_account) {
        this.setState({ propose_account });
    }

    onSubmit(e) {
        e.preventDefault();
        this.setState({error: null});
        let asset = this.state.asset;
        let precision = utils.get_asset_precision(asset.get("precision"));
        let amount = this.state.amount.replace( /,/g, "" );

        AccountActions.transfer(
            this.state.from_account.get("id"),
            this.state.to_account.get("id"),
            parseInt(amount * precision, 10),
            asset.get("id"),
            this.state.memo ? new Buffer(this.state.memo, "utf-8") : this.state.memo,
            this.state.propose ? this.state.propose_account : null,
            this.state.feeAsset ? this.state.feeAsset.get("id") : "1.3.0"
        ).then( () => {
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.listen(this.onTrxIncluded);
        }).catch( e => {
            let msg = e.message ? e.message.split( '\n' )[1] : null;
            console.log( "error: ", e, msg);
            this.setState({error: msg});
        } );
    }

    setNestedRef(ref) {
        this.nestedRef = ref;
    }

    _setTotal(asset_id, balance_id, fee, fee_asset_id) {
        let balanceObject = ChainStore.getObject(balance_id);
        let transferAsset = ChainStore.getObject(asset_id);
        if (balanceObject) {
            let amount = (utils.get_asset_amount(balanceObject.get("balance"), transferAsset) - (asset_id === fee_asset_id ? fee : 0)).toString();
            this.setState({amount});
        }
    }

    getValueOfFile(filepath) {

        let axios = require('axios');

        return new Promise((resolve, reject) => {
            axios.get(filepath)
                .then(response => {
                    resolve(response.data);
                    console.log("Responce data".concat(response.data));
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    getCNYRUBCourse()
    {
            let axios = require('axios');

            return new Promise((resolve, reject) => {
                axios.get("http://gurondex.io/data/jvPYp6qMj4VJFSfW/cnyrub.crs")
                    .then(response => {
                        resolve(response.data);
                        this.setState({cnyrub: response.data});
                    })
                    .catch(error => {
                        reject(error);
                    });
            });
    }

    getCourse(val) {

        let value;

        switch (val) {
            case "1.3.1325": value = this.state.cnyrub; /*path = "http://gurondexui2/cnyrub.crs";*/ break;
            case "1.3.113": value = this.state.cnycny; /*path = "http://gurondexui2/cnycny.crs";*/ break
        }

        return value;
    }

    _getAvailableAssets(state = this.state) {

        // CNY - 1.3.113

        const { from_account, from_error } = state;

        let asset_types = ["1.3.1325"/*, "1.3.113"*/], fee_asset_types = [];  //exclude CNY

        if (!(from_account && from_account.get("balances") && !from_error)) {
            return {asset_types, fee_asset_types};
        }
        let account_balances = state.from_account.get("balances").toJS();
        fee_asset_types = Object.keys(account_balances).sort(utils.sortID);

        for (let key in account_balances) {
            let asset = ChainStore.getObject(key);
            let balanceObject = ChainStore.getObject(account_balances[key]);
            if (balanceObject && balanceObject.get("balance") === 0) {
                if (fee_asset_types.indexOf(key) !== -1) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
                }
            }

            if (asset) {
                if (asset.get("id") !== "1.3.0" && !utils.isValidPrice(asset.getIn(["options", "core_exchange_rate"]))) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
                }
            }
        }

        return {asset_types, fee_asset_types};
    }

    _onAccountDropdown(account) {
        let newAccount = ChainStore.getAccount(account);
        if (newAccount) {
            this.setState({
                from_name: account,
                from_account: ChainStore.getAccount(account)
            });
        }
    }


    render() {

        if (!this.state.cnyrub) {
            this.getCNYRUBCourse();
        }

        let from_error = null;
        let {propose, from_account, to_account, asset, asset_id, propose_account,
            amount, error, to_name, from_name, memo, feeAsset, fee_asset_id} = this.state;
        let from_my_account = AccountStore.isMyAccount(from_account) || from_name === this.props.passwordAccount;

        if(from_account && ! from_my_account && ! propose ) {
            from_error = <span>
                {counterpart.translate("account.errors.not_yours")}
                &nbsp;(<a onClick={this.onPropose.bind(this, true)}>{counterpart.translate("propose")}</a>)
            </span>;
        }

        let { asset_types, fee_asset_types } = this._getAvailableAssets();
        let balance = null;

        // Estimate fee
        let globalObject = ChainStore.getObject("2.0.0");
        let fee = utils.estimateFee(propose ? "proposal_create" : "transfer", null, globalObject);

        if (from_account && from_account.get("balances") && !from_error) {

            let account_balances = from_account.get("balances").toJS();

            // Finish fee estimation
            let core = ChainStore.getObject("1.3.0");
            if (feeAsset && feeAsset.get("id") !== "1.3.0" && core) {

                let price = utils.convertPrice(core, feeAsset.getIn(["options", "core_exchange_rate"]).toJS(), null, feeAsset.get("id"));
                fee = utils.convertValue(price, fee, core, feeAsset);

                if (parseInt(fee, 10) !== fee) {
                    fee += 1; // Add 1 to round up;
                }
            }
            if (core) {
                fee = utils.limitByPrecision(utils.get_asset_amount(fee, feeAsset || core), feeAsset ? feeAsset.get("precision") : core.get("precision"));
            }

            if (asset_types.length === 1) asset = ChainStore.getAsset(asset_types[0]);
            if (asset_types.length > 0) {
                let current_asset_id = asset ? asset.get("id") : asset_types[0];
                let feeID = feeAsset ? feeAsset.get("id") : "1.3.0";
                balance = (<span style={{borderBottom: "#A09F9F 1px dotted", cursor: "pointer"}} onClick={this._setTotal.bind(this, current_asset_id, account_balances[current_asset_id], fee, feeID)}><Translate component="span" content="transfer.available"/>: <BalanceComponent balance={account_balances[current_asset_id]}/></span>);
            } else {
                balance = "No funds";
            }
        } else {
            let core = ChainStore.getObject("1.3.0");
            fee_asset_types = ["1.3.0"];
            if (core) {
                fee = utils.limitByPrecision(utils.get_asset_amount(fee, feeAsset || core), feeAsset ? feeAsset.get("precision") : core.get("precision"));
            }

        }
        let propose_incomplete = propose && ! propose_account;
        let submitButtonClass = "button float-right no-margin";
        if(!from_account || !to_account || !amount || amount === "0"|| !asset || from_error || propose_incomplete)
            submitButtonClass += " disabled";

        let accountsList = Immutable.Set();
        accountsList = accountsList.add(from_account);
        let tabIndex = 1;

        return (
            <div className="grid-block vertical">
                <div className="grid-block shrink vertical medium-horizontal" style={{paddingTop: "2rem"}}>

                    <form style={{paddingBottom: 20, overflow: "visible"}} className="grid-content small-12 medium-6 large-5 large-offset-1 full-width-content" onSubmit={this.onSubmit.bind(this)} noValidate>

                        <Translate content="exchanger.header" component="h3" />
                        {/*  F R O M  */}
                        <div className="content-block">
                            <AccountSelector label="transfer.from" ref="from"
                                             accountName={from_name}
                                             onChange={this.fromChanged.bind(this)}
                                             onAccountChanged={this.onFromAccountChanged.bind(this)}
                                             account={from_name}
                                             size={60}
                                             error={from_error}
                                             tabIndex={tabIndex++}
                                             onDropdownSelect={this._onAccountDropdown.bind(this)}
                                             dropDownContent={AccountStore.getMyAccounts()}
                            />
                        </div>
                        {/*  T O  */}
                        <div className="hidden-content-block">
                            <AccountSelector
                                label="transfer.to"
                                accountName={to_name}
                                onChange={this.toChanged.bind(this)}
                                onAccountChanged={this.onToAccountChanged.bind(this)}
                                account={to_name}
                                size={60}
                                tabIndex={tabIndex++}
                            />
                        </div>
                        {/*  T O  */}
                        <div>
                            <Translate content="exchanger.description" component="h5" />
                            <Translate content="exchanger.option" class="gurondex-option" component="h6" />
                            <div><Translate content="exchanger.cnyrub" class="gurondex-option" style={{color: "#4682B4"}} /><text style={{color: "#4682B4"}}><b>{this.state.cnyrub}</b> bitRUBLE</text></div>
                            <div>&nbsp;</div>
                            <div><Translate content="exchanger.throw" style={{color: "#3CB371"}}/> <b style={{color: "#3CB371"}}>{to_name}</b></div>
                            <div>&nbsp;</div>
                        </div>

                        {/*<div className="content-block">*/}
                            {/*<AccountSelector*/}
                                {/*label="transfer.to"*/}
                                {/*accountName={to_name}*/}
                                {/*onChange={this.toChanged.bind(this)}*/}
                                {/*onAccountChanged={this.onToAccountChanged.bind(this)}*/}
                                {/*account={to_name}*/}
                                {/*size={60}*/}
                                {/*tabIndex={tabIndex++}*/}
                            {/*/>*/}
                        {/*</div>*/}

                        {/*  A M O U N T   */}
                        <div className="content-block transfer-input">
                            <AmountSelector
                                label="transfer.amount"
                                amount={amount}
                                onChange={this.onAmountChanged.bind(this)}
                                asset={asset_types.length > 0 && asset ? asset.get("id") : ( asset_id ? asset_id : asset_types[0])}
                                assets={asset_types}
                                display_balance={balance}
                                tabIndex={tabIndex++}
                            />
                        </div>
                        {/*  M E M O  */}
                        <div className="content-block transfer-input">
                            {memo && memo.length ? <label className="right-label">{memo.length}</label> : null}
                            <Translate className="left-label" component="label" content="transfer.memo"/>
                            <textarea style={{marginBottom: 0}} rows="1" value={this.state.memo} tabIndex={tabIndex++} onChange={this.onMemoChanged.bind(this)} />
                            {/* warning */}
                            { this.state.propose ?
                                <div className="error-area" style={{position: "absolute"}}>
                                    <Translate content="transfer.warn_name_unable_read_memo" name={this.state.from_name} />
                                </div>
                                :null}

                        </div>

                        {/*  F E E   */}
                        <div className={"content-block transfer-input fee-row" + (this.state.propose ? " proposal" : "")}>
                            <div>
                            <AmountSelector
                                refCallback={this.setNestedRef.bind(this)}
                                label="transfer.fee"
                                disabled={true}
                                amount={fee}
                                onChange={this.onFeeChanged.bind(this)}
                                asset={fee_asset_types.length && feeAsset ? feeAsset.get("id") : ( fee_asset_types.length === 1 ? fee_asset_types[0] : fee_asset_id ? fee_asset_id : fee_asset_types[0])}
                                assets={fee_asset_types}
                                tabIndex={tabIndex++}
                            />
                            </div>
                            <div><br />
                            {propose ?

                                <button className={submitButtonClass} type="submit" value="Submit" tabIndex={tabIndex++}>
                                    <Translate component="span" content="propose" />
                                </button> :
                                <button className={submitButtonClass} type="submit" value="Submit" tabIndex={tabIndex++}>
                                    <Translate component="span" content="transfer.send" />
                                </button>
                            }
                            </div>
                        </div>

                        {/* P R O P O S E   F R O M
                            Having some proposed transaction logic here (prior to the transaction confirmation)
                            allows adjusting of the memo to / from parameters.
                        */}
                        {propose ?
                            <div className="full-width-content form-group transfer-input">
                                <label className="left-label"><Translate content="account.propose_from" /></label>
                                <AccountSelect
                                    account_names={AccountStore.getMyAccounts()}
                                    onChange={this.onProposeAccount.bind(this)}
                                    tabIndex={tabIndex++}
                                />
                            </div>:null}


                        {/*  S E N D  B U T T O N  */}
                        {error ? <div className="content-block has-error">{error}</div> : null}
                        <div>

                            {propose ?
                                <span>
                                <button className=" button" onClick={this.onPropose.bind(this, false)} tabIndex={tabIndex++}>
                                    <Translate component="span" content="cancel" />
                                </button>
                            </span> :
                                null}
                        </div>

                        {/* TODO: show remaining balance */}
                    </form>
                    <div className="grid-content small-12 medium-6 large-4 large-offset-1 right-column">
                        <div className="grid-content no-padding">
                            <RecentTransactions
                                accountsList={accountsList}
                                limit={25}
                                compactView={true}
                                filter="transfer"
                                fullHeight={true}
                            />
                        </div>
                    </div>

                    <div className="grid-content medium-6 large-4">

                    </div>
                </div>
            </div>
        );
    }

}

export default connect(Exchanger, {
    listenTo() {
        return [AccountStore];
    },
    getProps() {
        return {
            currentAccount: AccountStore.getState().currentAccount,
            passwordAccount: AccountStore.getState().passwordAccount
        };
    }
});
