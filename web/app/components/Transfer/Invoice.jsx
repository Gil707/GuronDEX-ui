import React from "react";
import classNames from "classnames";
import FormattedAsset from "../Utility/FormattedAsset";
import AccountActions from "actions/AccountActions";
import AccountSelector from "../Account/AccountSelector";
import AccountInfo from "../Account/AccountInfo";
import AccountStore from "stores/AccountStore";
import AmountSelector from "../Utility/AmountSelector";
import BalanceComponent from "../Utility/BalanceComponent";
import {ChainStore, FetchChainObjects} from "bitsharesjs/es";
import NotificationActions from "actions/NotificationActions";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import {decompress} from "lzma";
import bs58 from "common/base58";
import utils from "common/utils";
import {withRouter} from "react-router";

// invoice example:
//{
//    "to" : "merchant_account_name",
//    "to_label" : "Merchant Name",
//    "currency": "TEST",
//    "memo" : "Invoice #1234",
//    "line_items" : [
//        { "label" : "Something to Buy", "quantity": 1, "price" : "1000.00" },
//        { "label" : "10 things to Buy", "quantity": 10, "price" : "1000.00" }
//    ],
//    "note" : "Something the merchant wants to say to the user",
//    "callback" : "https://merchant.org/complete"
//}
// http://localhost:8080/#/invoice/8Cv8ZjMa8XCazX37XgNhj4jNc4Z5WgZFM5jueMEs2eEvL3pEmELjAVCWZEJhj9tEG5RuinPCjY1Fi34ozb8Cg3H5YBemy9JoTRt89X1QaE76xnxWPZzLcUjvUd4QZPjCyqZNxvrpCN2mm1xVRY8FNSVsoxsrZwREMyygahYz8S23ErWPRVsfZXTwJNCCbqjWDTReL5yytTKzxyKhg4YrnntYG3jdyrBimDGBRLU7yRS9pQQLcAH4T7j8LXkTocS7w1Zj4amckBmpg5EJCMATTRhtH8RSycfiXWZConzqqzxitWCxZK846YHNh

class Invoice extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            invoice: null,
            pay_from_name: null,
            pay_from_account: null,
            error: null,
            link: null,
            asset_id: null,         // default currency from invoice
            feeAsset: null
        };
        this.onBroadcastAndConfirm = this.onBroadcastAndConfirm.bind(this);


    }

    componentDidMount() {
        let compressed_data = bs58.decode(this.props.params.data);
        try {
            decompress(compressed_data, result => {
                let invoice = JSON.parse(result);
                FetchChainObjects(ChainStore.getAsset, [invoice.currency]).then(assets_array => {
                    this.setState({invoice, asset: assets_array[0]});
                });
            });
        } catch(error) {
            console.dir(error);
            this.setState({error: error.message});
        }
    }

    parsePrice(price) {
        let m = price.match(/([\d\,\.\s]+)/);
        if(!m || m.length < 2) 0.0;
        return parseFloat(m[1].replace(/[\,\s]/g,""));
    }

    getTotal(items) {
        if(!items || items.length === 0) return 0.0;
        let total_amount = items.reduce( (total, item) => {
            let price = this.parsePrice(item.price);
            if(!price) return total;
            return total + item.quantity * price;
        }, 0.0);
        return total_amount;
    }

    onBroadcastAndConfirm(confirm_store_state) {
        if(confirm_store_state.included && confirm_store_state.broadcasted_transaction) {
            TransactionConfirmStore.unlisten(this.onBroadcastAndConfirm);
            TransactionConfirmStore.reset();
            if(this.state.invoice.callback) {
                let trx =  confirm_store_state.broadcasted_transaction;
                let url = `${this.state.invoice.callback}?block=${trx.ref_block_num}&trx=${trx.id()}`;

                this.setState({
                    link: trx
                });

                window.location.href = url;
            }
        }
    }

    onPayClick(e) {
        e.preventDefault();
        let asset = this.state.asset;
        let precision = utils.get_asset_precision(asset.get("precision"));
        let amount = this.getTotal(this.state.invoice.line_items);
        let to_account = ChainStore.getAccount(this.state.invoice.to);

        if(!to_account) {
            NotificationActions.error(`Account ${this.state.invoice.to} not found`);
            return;
        }
        AccountActions.transfer(
            this.state.pay_from_account.get("id"),
            to_account.get("id"),
            parseInt(amount * precision, 10),
            asset.get("id"),
            this.state.invoice.memo,
            null,
            this.state.feeAsset.get("id")
        ).then( () => {
                TransactionConfirmStore.listen(this.onBroadcastAndConfirm);
                this.props.router.push('http://localhost:8080');                //redirect
            }).catch( e => {
                console.log( "error: ",e)
            } );


    }

    fromChanged(pay_from_name) {
        this.setState({pay_from_name});
    }

    onFromAccountChanged(pay_from_account) {
        this.setState({pay_from_account});
    }

    onFeeChanged({asset}) {
        this.setState({feeAsset: asset, error: null});
    }

    setNestedRef(ref) {
        this.nestedRef = ref;
    }

    _getAvailableAssets(state = this.state) {

        // CNY - 1.3.113

        const { pay_from_account, from_error } = state;

        let fee_asset_types = [];  //exclude CNY

        if (!(pay_from_account && pay_from_account.get("balances") && !from_error)) {
            return fee_asset_types;
        }
        let account_balances = state.pay_from_account.get("balances").toJS();
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

        return fee_asset_types;
    }

    render() {
        console.log("-- Invoice.render -->", this.state.invoice);
        if(this.state.error) return(<div><br/><h4 className="has-error text-center">{this.state.error}</h4></div>);
        if(!this.state.invoice) return null;
        if(!this.state.asset) return (<div><br/><h4 className="has-error text-center">Asset {this.state.invoice.currency} is not supported by this blockchain.</h4></div>);

        let currentAccount = AccountStore.getState().currentAccount;
        if (!this.state.pay_from_name) this.setState({pay_from_name: currentAccount});

        let asset_types = this._getAvailableAssets();

        let invoice = this.state.invoice;
        let total_amount = this.getTotal(invoice.line_items);
        let asset = this.state.invoice.currency;

        let balance = null;
        if(this.state.pay_from_account) {
            let balances = this.state.pay_from_account.get("balances");
            console.log("-- Invoice.render balances -->", balances.get(this.state.asset.get("id")));
            balance = balances.get(this.state.asset.get("id"));
        }
        let items = invoice.line_items.map( (i,k) => {
            let price = this.parsePrice(i.price);
            let amount = i.quantity * price;
            return (
                <tr key={k}>
                    <td>
                        <div className="item-name">{i.label}</div>
                        <div className="item-description">{i.quantity} x {<FormattedAsset amount={i.price} asset={asset} exact_amount={true}/>}</div>
                    </td>
                    <td><FormattedAsset amount={amount} asset={asset} exact_amount={true} /></td>
                </tr>
            );
        });

        if (!this.state.asset_id) {
            this.setState({asset_id: invoice.fee_id});
        }

        let payButtonClass = classNames("button", {disabled: !this.state.pay_from_account});
        return (
            <div className="grid-block vertical">
                <div className="grid-content">
                    <div className="content-block invoice">
                        <br/>
                        <h3>Pay Invoice</h3>
                        <h4>{invoice.memo}</h4>
                        <h5>Link is {this.state.link}</h5>
                        <br/>
                        <div>
                            <AccountInfo title={invoice.to_label} account={invoice.to} image_size={{height: 80, width: 80}}/>
                            <br/>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Items</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items}
                                    <tr>
                                        <td className="text-right">Total:</td>
                                        <td><FormattedAsset amount={total_amount} asset={asset} exact_amount={true} /></td>
                                    </tr>
                                </tbody>
                            </table>
                            <br/>
                            <br/>

                            <form>
                                <div className="grid-block">
                                    <div className="grid-content medium-3">
                                        {/*<AccountSelect ref="pay_from" account_names={accounts} onChange={this.onAccountChange.bind(this)}/>*/}
                                        <AccountSelector label="transfer.pay_from"
                                                         accountName={this.state.pay_from_name}
                                                         onChange={this.fromChanged.bind(this)}
                                                         onAccountChanged={this.onFromAccountChanged.bind(this)}
                                                         account={this.state.pay_from_name}/>
                                    </div>
                                    {this.state.pay_from_account ?
                                        <div className="grid-content medium-1">
                                            <label>Balance</label>
                                            <BalanceComponent balance={balance}/>
                                        </div> : null
                                    }
                                </div>
                                <br/>
                                <div className="grid-block">
                                    <div className="grid-content medium-3">
                                        <AmountSelector
                                            refCallback={this.setNestedRef.bind(this)}
                                            label="transfer.fee"
                                            disabled={true}
                                            // amount={fee}
                                            onChange={this.onFeeChanged.bind(this)}
                                            asset={asset_types.length && this.state.feeAsset ? this.state.feeAsset.get("id") : ( asset_types.length === 1 ? asset_types[0] : this.state.asset_id ? this.state.asset_id : asset_types[0])}
                                            assets={asset_types}
                                            // tabIndex={tabIndex++}
                                        />
                                    </div>
                                </div>
                                <br/>
                                <a href className={payButtonClass} onClick={this.onPayClick.bind(this)}>
                                    Pay <FormattedAsset amount={total_amount} asset={asset} exact_amount={true}/> to {invoice.to}
                                </a>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default withRouter(Invoice);
