import React from "react";
import BindToChainState from "../../Utility/BindToChainState";
import Translate from "react-translate-component";
import cnames from "classnames";

class RuDEX extends React.Component {

    constructor(props) {
        super();

        this.state = {
            redeem_error: null,
            transaction_id: null
        };
    }

    onClose() {
        this.setState({
            redeem_error: null,
            transaction_id: null
        });
    }

    redeem(account, code) {
        let body = {
            "user": account,
            "code": code
        };
        let redeem_code_promise = fetch('https://demogate.rudex.org/codes/redeem',
            {
                method: 'POST',
                headers: new Headers({
                    "Accept": "application/json",
                    "content-type": "application/json"
                }),
                body: JSON.stringify(body)
            })
            .then(response => Promise.all([response.status, response.json()]));

        redeem_code_promise.then(response => {
            let status = response[0];
            let body = response[1];

            console.log(response);

            if (status == 200) {
                this.setState({
                    redeem_error: null,
                    transaction_id: body.transaction_id
                });
            } else if (status == 402) {
                this.setState({
                    transation_id: null,
                    redeem_error: body.messages.en
                });
            } else
                throw 'Unexpected response';
        })
            .catch((error) => {
                this.setState({
                    current_status: 'error',
                    withdrawals: null,
                    deposits: null,
                    error: 'Error getting transaction history: ' + error
                });
            });
    }

    _onSubmit(e) {
        e.preventDefault();
        let account = this.props.account.get("name");

        let code = this.refs.code.value;
        console.log("account:", account, "code:", code);

        this.redeem(account, code);
    }

    render() {
        let account = this.props.account.get("name");
        return (
            <div className="RuDEX">

                <hr></hr>
                <h2>RuDEX Ваучеры</h2>
                <hr></hr>

                <p>Введите полученный ваучер для получения денег на счет пользователя <b>{account}</b>:</p>

                {
                    this.state.redeem_error == null && this.state.transaction_id ?
                        <div className="content-block">
                            <p>Вы успешно обналичили ваучер: <a
                                href={`http://cryptofresh.com/tx/${this.state.transaction_id}`}>
                                {`http://cryptofresh.com/tx/${this.state.transaction_id}`}
                            </a></p>
                        </div> : null
                }
                {
                    this.state.redeem_error ?
                        <div className="content-block">
                            <p className="facolor-error">{ this.state.redeem_error }</p>
                        </div> : null
                }
                <div className="content-block">
                    <form onSubmit={this._onSubmit.bind(this)}>

                        <label>Код:
                            <input ref="code" required id="code" type="text"></input>
                        </label>

                        <button className="button" type="submit">Обналичить</button>
                    </form>
                </div>
            </div>
        );
    }
}

export default BindToChainState(RuDEX);
