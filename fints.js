import {FinTSClient, FinTSConfig} from 'lib-fints';
import {DateTime} from 'luxon';

export default class FinTS {
  #fintsConfig;

  #productId;
  #productVersion;
  #debugEnabled;

  constructor(productId, productVersion, debugEnabled = false) {
    this.#productId = productId;
    this.#productVersion = productVersion;
    this.#debugEnabled = debugEnabled;
  }

  async synchronize(bankUrl, bankId, userId, pin) {
    this.#fintsConfig = FinTSConfig.forFirstTimeUse(this.#productId, this.#productVersion,
        bankUrl, bankId, userId, pin);
    this.#fintsConfig.debugEnabled = this.#debugEnabled;
    const client = new FinTSClient(this.#fintsConfig);
    let synchronizeResponse = await client.synchronize();
    let success = synchronizeResponse.success;
    let bankingInformationUpdated = synchronizeResponse.bankingInformationUpdated;
    console.log('bankingInformationUpdated', bankingInformationUpdated);
    let bankAnswers = synchronizeResponse.bankAnswers;
    let requiresTan = synchronizeResponse.requiresTan;
    if (requiresTan) {
      console.log('Tan required');
    }
    let bankingInformation;
    let bankMessages = [];
    if (success) {
      bankingInformation = synchronizeResponse.bankingInformation;
      bankMessages = bankingInformation.bankMessages;
      let systemId = bankingInformation.systemId;
      let bpd = bankingInformation.bpd;
      let availableTanMethodIds = bpd.availableTanMethodIds;
      console.log('Available TAN methods: ', availableTanMethodIds);
      client.selectTanMethod(availableTanMethodIds[0]);
      // sync again to get accounts
      synchronizeResponse = await client.synchronize();
      success = synchronizeResponse.success;
      bankingInformationUpdated = synchronizeResponse.bankingInformationUpdated;
      console.log('bankingInformationUpdated', bankingInformationUpdated);
      bankAnswers = synchronizeResponse.bankAnswers;
      requiresTan = synchronizeResponse.requiresTan;
      if (requiresTan) {
        console.log('Tan required');
      }
      if (success) {
        bankingInformation = synchronizeResponse.bankingInformation;
        if (bankingInformation) {
          systemId = bankingInformation.systemId;
          bankMessages = bankingInformation.bankMessages;
          bpd = bankingInformation.bpd;
          const upd = bankingInformation.upd;
        } else {
          console.log('No bankingInformation returned for second synchronize');
        }
      }
    }
    return { success, requiresTan, bankAnswers, bankMessages, bankingInformation };
  }

  getBankAnswers() {
    return this.#fintsConfig.bankAnswers;
  }

  getAccounts() {
    return this.#fintsConfig.bankingInformation.upd.bankAccounts;
  }

  async getStatements(accountNumber, from, to) {
    const fromAlways = from ? from : DateTime.now().minus({ days: 14 }).toJSDate();
    const toAlways = to ? to : DateTime.now().toJSDate();
    let statements = { balance : {}, transactions: []};

    const client = new FinTSClient(this.#fintsConfig);
    if (client.canGetAccountStatements(accountNumber)) {
      const statementResponse = await client.getAccountStatements(accountNumber, fromAlways, toAlways);

      for (let j = 0; j < statementResponse.bankAnswers.length; j++) {
        console.log(`Bank answer: ${statementResponse.bankAnswers[j].code} ${statementResponse.bankAnswers[j].text}`);
      }

      if (statementResponse.statements) {
        for (let i = 0; i < statementResponse.statements.length; i++) {
          const statement = statementResponse.statements[i];
          // console.log(statementResponse.statements[i]);
          for (let j = 0; j < statement.transactions.length; j++) {
            const t = statement.transactions[j];
            const st = {
              bookingDate: t.entryDate,
              valueDate: t.valueDate,
              amount: t.amount,
              entryText: t.bookingText ? t.bookingText.trim() : '',
              text: t.purpose ? t.purpose.trim() : '',
              EREF: null,
              CRED: null,
              MREF: null,
              ABWA: null,
              ABWE: null,
              IBAN: null,
              BIC: null,
              REF: t.customerReference ? t.customerReference.trim() : null,
              notes: null,
              payee: t.remoteName ? t.remoteName.trim() : null,
              payeePayerAcctNo: t.remoteAccountNumber,
              payeeBankId: t.remoteBankId,
              gvCode: t.transactionType,
              primaNotaNo: t.primeNotesNr,
              originalCurrency: null,
              originalAmount: null,
              exchangeRate: null,
            };
            statements.transactions.push(st);
          }
        }
      }

      const balanceResponse = await client.getAccountBalance(accountNumber);
      statements.balance = balanceResponse.balance;
      statements.balance.type = 'bankAccountBalance';
    } else {
      if (client.canGetCreditCardStatements(accountNumber)) {
        statements = await this.getCreditCardStatements(accountNumber, fromAlways, toAlways);
      } else {
        console.log(`Account ${accountNumber} does not allow getting statements or credit card statements`);
      }
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
        statements.transactions = statementResponse.statements.map((t) => {
          return {
            bookingDate: t.transactionDate,
            valueDate: t.valueDate,
            amount: t.amount,
            entryText: null,
            text: t.purpose ? t.purpose.trim() : '',
            EREF: null,
            CRED: null,
            MREF: null,
            ABWA: null,
            ABWE: null,
            IBAN: null,
            BIC: null,
            REF: null,
            notes: null,
            payee: null,
            payeePayerAcctNo: null,
            gvCode: null,
            primaNotaNo: null,
            originalCurrency: t.originalCurrency,
            originalAmount: t.originalAmount,
            exchangeRate: t.exchangeRate,
          };
        });
        statements.balance = statementResponse.balance;
        statements.balance.type = 'creditCardBalance';
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

  async download(bankcontacts, accounts) {
    const accountNames = ['ingdiba_anton', 'ingdiba_anton_sparbrief', 'ingdiba_manuel', 'giro_anton', 'raiba_geschäftsanteile', 'raiba_manuel',
      'comdirect_anton_giro', 'comdirect_anton_tagesgeld', 'comdirect_anton_kreditkarte', 'mlp_kontokorrent',
      'comdirect_manuel_giro', 'comdirect_manuel_tagesgeld'];

    const synchronizedBankData = new Map();

    for (let accountName of accountNames) {
      console.log('#############################################');
      const accountConfig = accounts[accountName];
      if (!accountConfig) {
        console.log(`No such account config for ${accountName}`);
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

      const productId = this.#productId;
      const productVersion = this.#productVersion;
      const bankContactConfig = bankcontacts[bankcontactName].fints;
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
