
/**
 * 
 * Copyright 2019 Grégory Saive for NEM (github.com/nemtech)
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import chalk from 'chalk';
import {command, ExpectedError, metadata, option} from 'clime';
import {
    UInt64,
    Account,
    NetworkType,
    MosaicId,
    MosaicService,
    AccountHttp,
    MosaicHttp,
    NamespaceHttp,
    MosaicView,
    MosaicInfo,
    Address,
    Deadline,
    Mosaic,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    LockFundsTransaction,
    NetworkCurrencyMosaic,
    PublicAccount,
    TransactionType,
    Listener,
    EmptyMessage,
    AggregateTransaction,
    MosaicDefinitionTransaction,
    MosaicProperties,
    MosaicSupplyChangeTransaction,
    MosaicSupplyType
} from 'nem2-sdk';

import {
    convert,
    mosaicId,
    nacl_catapult,
    uint64 as uint64_t
} from "nem2-library";

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'a',
        description: 'Recipient address',
    })
    address: string;
}

@command({
    description: 'Check for cow compatibility of AggregateTransaction with 2 TransferTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1");
        this.monitorAddress(address.plain());

        const recipient = Address.createFromRawAddress(address.plain());
        return await this.sendAggregateTransactionsTo(recipient);
    }

    public async sendAggregateTransactionsTo(recipient: Address): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        let mosaics: Mosaic[] = [];
        mosaics.push(new Mosaic(NetworkCurrencyMosaic.MOSAIC_ID, UInt64.fromUint(10)));

        // TEST 3: send mosaic creation transaction
        const fundsTx1 = TransferTransaction.create(
            Deadline.create(),
            recipient,
            mosaics,
            EmptyMessage,
            NetworkType.MIJIN_TEST
        );

        const fundsTx2 = TransferTransaction.create(
            Deadline.create(),
            recipient,
            mosaics,
            EmptyMessage,
            NetworkType.MIJIN_TEST
        );

        const accountHttp = new AccountHttp(this.endpointUrl);
        return accountHttp.getAccountInfo(address).subscribe((accountInfo) => {
            const aggregateTx = AggregateTransaction.createComplete(
                Deadline.create(),
                [fundsTx1.toAggregate(accountInfo.publicAccount),
                 fundsTx2.toAggregate(accountInfo.publicAccount)],
                NetworkType.MIJIN_TEST, []);

            const signedTransaction = account.sign(aggregateTx);

            const transactionHttp = new TransactionHttp(this.endpointUrl);
            const listener = new Listener(this.endpointUrl);

            listener.open().then(() => {
                transactionHttp.announce(signedTransaction).subscribe(() => {
                    console.log('Announced aggregate complete transaction');
                    console.log('Hash:   ', signedTransaction.hash);
                    console.log('Signer: ', signedTransaction.signer, '\n');
                }, (err) => {
                    let text = '';
                    text += 'testAggregateCompleteAction() - Error';
                    console.log(text, err.response !== undefined ? err.response.text : err);
                });
            });
        }, (err) => {
            console.log("getAccountInfo error: ", err);
        });
    }

}
