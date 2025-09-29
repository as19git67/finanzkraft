import {FinTSClient, FinTSConfig} from 'lib-fints';
import { DateTime } from 'luxon';

export default class FinTS {
  #fintsConfig;

  #productId;
  #productVersion;

  #bankcontacts;
  #accounts;

  constructor(productId, productVersion, bankcontacts, accounts) {
    this.#productId = productId;
    this.#productVersion = productVersion;
    this.#bankcontacts = bankcontacts;
    this.#accounts = accounts;
  }

  async synchronize(productId, productVersion, bankUrl, bankId, userId, pin) {
    this.#fintsConfig = FinTSConfig.forFirstTimeUse(productId, productVersion,
        bankUrl, bankId, userId, pin);
    //fintsConfig.debugEnabled = true;
    const client = new FinTSClient(this.#fintsConfig);
    let synchronizeResponse = await client.synchronize();
    let success = synchronizeResponse.success;
    let bankingInformationUpdated = synchronizeResponse.bankingInformationUpdated;
    let bankAnswers = synchronizeResponse.bankAnswers;
    let requiresTan = synchronizeResponse.requiresTan;
    let bankingInformation = synchronizeResponse.bankingInformation;
    let systemId = bankingInformation.systemId;
    let bankMessages = bankingInformation.bankMessages;
    for (let j = 0; j < bankMessages.length; j++) {
      console.log(`Bank message: ${bankMessages[j].subject} ${bankMessages[j].text}`);
    }
    let bpd = bankingInformation.bpd;
    let availableTanMethodIds = bpd.availableTanMethodIds;
    console.log('Available TAN methods: ', availableTanMethodIds);
    client.selectTanMethod(availableTanMethodIds[0]);
    // sync again to get accounts
    synchronizeResponse = await client.synchronize();
    success = synchronizeResponse.success;
    bankingInformationUpdated = synchronizeResponse.bankingInformationUpdated;
    bankAnswers = synchronizeResponse.bankAnswers;
    requiresTan = synchronizeResponse.requiresTan;
    bankingInformation = synchronizeResponse.bankingInformation;
    systemId = bankingInformation.systemId;
    bankMessages = bankingInformation.bankMessages;
    bpd = bankingInformation.bpd;
    const upd = bankingInformation.upd;
  }

  async getStatements(accountNumber, from, to) {
    let statements = { balance : {}, transactions: []};

    const client = new FinTSClient(this.#fintsConfig);
    if (client.canGetAccountStatements(accountNumber)) {
      const statementResponse = await client.getAccountStatements(accountNumber, from, to);

      for (let j = 0; j < statementResponse.bankAnswers.length; j++) {
        console.log(`Bank answer: ${statementResponse.bankAnswers[j].code} ${statementResponse.bankAnswers[j].text}`);
      }

      if (statementResponse.statements) {
        for (let i = 0; i < statementResponse.statements.length; i++) {
          const statement = statementResponse.statements[i];
          // console.log(statementResponse.statements[i]);
          for (let j = 0; j < statement.transactions.length; j++) {
            // console.log(statement.transactions[j]);
            statements.transactions.push(statement.transactions[j]);
          }
        }
      }

      const balanceResponse = await client.getAccountBalance(accountNumber);
      statements.balance = balanceResponse.balance;
    } else {
      console.log(`Account ${accountNumber} does not allow getting account statements`);
    }
    return statements;
  }

  async getCreditCardStatements(accountNumber, from, to) {
    let statements = { balance : {}, transactions: []};

    const client = new FinTSClient(this.#fintsConfig);

    if (client.canGetCreditCardStatements(accountNumber)) {
      const statementResponse = await client.getCreditCardStatements(accountNumber, from);

      for (let j = 0; j < statementResponse.bankAnswers.length; j++) {
        console.log(`Bank answer: ${statementResponse.bankAnswers[j].code} ${statementResponse.bankAnswers[j].text}`);
      }

      if (statementResponse.statements) {
        statements.transactions = statementResponse.statements;
        statements.balance = statementResponse.balance;
      }
    }

    return statements;
  }

  async getPortfolio(accountNumber) {
    let statements = { balance : {}, transactions: []};

    const client = new FinTSClient(this.#fintsConfig);

    if (client.canGetPortfolio(accountNumber)) {
      const portfolioResponse = await client.getPortfolio(accountNumber);
      console.log(portfolioResponse);
    }

    return statements;
  }

  async download() {
    const accounts = ['ingdiba_anton', 'ingdiba_anton_sparbrief', 'ingdiba_manuel', 'giro_anton', 'raiba_geschäftsanteile', 'raiba_manuel',
      'comdirect_anton_giro', 'comdirect_anton_tagesgeld', 'comdirect_anton_kreditkarte', 'mlp_kontokorrent',
      'comdirect_manuel_giro', 'comdirect_manuel_tagesgeld'];

    const synchronizedBankData = new Map();

    for (let account of accounts) {
      console.log('#############################################');
      const accountConfig = this.#accounts[account];
      if (!accountConfig) {
        console.log(`No such account config for ${account}`);
        continue;
      }

      const iban = accountConfig.iban;
      const accountNumber = accountConfig.accountNumber;
      const bankcontactName = accountConfig.bankcontact;
      if (iban) {
        console.log(`Downloading account ${account} with IBAN ${iban}...`);
      } else if (accountNumber) {
        console.log(`Downloading credit card ${account} with number ${accountNumber}...`);
      }

      const productId = this.#fintsProductId;
      const productVersion = this.#fintsProductVersion;
      const bankContactConfig = this.#bankcontacts[bankcontactName].fints;
      const bankUrl = bankContactConfig.url;
      const bankId = bankContactConfig.blz;
      const userId = bankContactConfig.username;
      const pin = bankContactConfig.pin;

      const finTSConfig = await synchronize(productId, productVersion, bankUrl, bankId, userId, pin);
      const bankingInformation = finTSConfig.bankingInformation;

      // console.log(`Available accounts for bankcontact ${bankcontactName}:`);
      // bankingInformation.upd.bankAccounts.forEach(account => {
      //   console.log(`${account.subAccountId}: ${account.accountNumber}, ${account.product}`);
      // });

      const from = DateTime.now().minus({days: 60}).toJSDate();
      const to = DateTime.now().toJSDate()

      if (iban) {
        const bankAccount = bankingInformation.upd.bankAccounts.find(account => {
          return account.iban === iban;
        });
        if (!bankAccount) {
          console.log(`Account with iban ${iban} not found in bankcontact ${bankcontactName}`);
          continue;
        }

        // console.log(bankAccount.subAccountId, bankAccount.allowedTransactions.map((t) => {
        //   return t.transId
        // }));

        console.log(`Get statements from ${bankAccount.subAccountId}: ${bankAccount.accountNumber}, ${bankAccount.product}`);
        const statements = await getStatements(finTSConfig, bankAccount.accountNumber, from, to);
        console.log(`Account balance: ${statements.balance.balance} ${statements.balance.currency}`);
        for (let j = 0; j < statements.transactions.length; j++) {
          console.log(`${statements.transactions[j].entryDate.toLocaleDateString()}: ${statements.transactions[j].amount} ${statements.transactions[j].purpose}`);
        }
      } else if (accountNumber) {
        const bankAccount = bankingInformation.upd.bankAccounts.find(account => {
          return account.accountNumber === accountNumber;
        });
        if (!bankAccount) {
          console.log(`Account ${accountNumber} not found in bankcontact ${bankcontactName}`);
          continue;
        }

        console.log(`Get credit card statements from ${bankAccount.subAccountId}: ${bankAccount.accountNumber}, ${bankAccount.product}`);
        const statements = await getCreditCardStatements(finTSConfig, bankAccount.accountNumber, from, to);
        console.log(`Credit card balance: ${statements.balance.balance} ${statements.balance.currency} vom ${statements.balance.date.toLocaleString()}`);
        for (let j = 0; j < statements.transactions.length; j++) {
          console.log(`${statements.transactions[j].transactionDate.toLocaleDateString()}: ${statements.transactions[j].amount} ${statements.transactions[j].purpose}`);
        }
      }
    }
  }

}
