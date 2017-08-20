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
import Transfer from "../Transfer/Transfer";

class Exchanger extends Transfer {

    constructor(props) {
        super(props);
        this.state = super.getInitialState();

        this.state.to_name = "guron-dex";
    }


    render() {
        return (
            <div className="grid-block vertical">
                <div className="grid-block shrink vertical medium-horizontal" style={{paddingTop: "2rem"}}>

                       <Translate content="transfer.header" component="h2" />
                        {/*  T O  */}
                        <div className="content-block">
                            <AccountSelector
                                label="transfer.to"
                                accountName={to_name}
                                onChange={super.toChanged.bind(this)}
                                onAccountChanged={super.onToAccountChanged.bind(this)}
                                account={to_name}
                                size={60}
                                tabIndex={tabIndex++}
                            />
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
 }
 );

