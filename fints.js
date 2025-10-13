import {FinTSClient, FinTSConfig} from 'lib-fints';
import {DateTime} from 'luxon';

export default class FinTS {
  #fintsConfig;
  #fintsClient;

  #productId;
  #productVersion;
  #debugEnabled;
  #bankUrl;
  #bankId;
  #userId;
  #pin;

  static #fintsInstance;
  static #fintsInstanceDataAsJson = '';

  constructor(productId, productVersion, debugEnabled = false, bankUrl, bankId, userId, pin) {
    this.#productId = productId;
    this.#productVersion = productVersion;
    this.#debugEnabled = debugEnabled;
    this.#bankUrl = bankUrl;
    this.#bankId = bankId;
    this.#userId = userId;
    this.#pin = pin;
    FinTS.#fintsInstance = this;
    FinTS.#fintsInstanceDataAsJson = JSON.stringify({
      productId,
      productVersion,
      debugEnabled,
      bankUrl,
      bankId,
      userId,
      pin
    });
  }

  static #isClientDifferent = (clientData) => {
    return JSON.stringify(clientData) !== FinTS.#fintsInstanceDataAsJson;
  }

  #ensureFintsClient() {
    if (!this.#fintsConfig) {
      this.#fintsConfig = FinTSConfig.forFirstTimeUse(this.#productId, this.#productVersion, this.#bankUrl, this.#bankId, this.#userId, this.#pin);
      this.#fintsConfig.debugEnabled = this.#debugEnabled;
      this.#fintsClient = new FinTSClient(this.#fintsConfig);
    }
  }

  static from(productId, productVersion, debugEnabled = false, bankUrl, bankId, userId, pin) {
    if (!FinTS.#fintsInstance || FinTS.#isClientDifferent({
      productId,
      productVersion,
      debugEnabled,
      bankUrl,
      bankId,
      userId,
      pin
    })) {
      return new FinTS(productId, productVersion, debugEnabled = false, bankUrl, bankId, userId, pin);
    } else {
      return FinTS.#fintsInstance;
    }
  }

  async synchronize() {
    this.#ensureFintsClient();
    let synchronizeResponse = await this.#fintsClient.synchronize();
    let success = synchronizeResponse.success;
    let bankingInformationUpdated = synchronizeResponse.bankingInformationUpdated;
    console.log('bankingInformationUpdated', bankingInformationUpdated);
    let bankAnswers = synchronizeResponse.bankAnswers;
    let bankingInformation;
    let bankMessages = [];
    let tanInfo = {};
    if (success) {
      tanInfo = {
        requiresTan: synchronizeResponse.requiresTan,
        tanChallenge: synchronizeResponse.tanChallenge,
        tanReference: synchronizeResponse.tanReference,
        tanMediaName: synchronizeResponse.tanMediaName,
      }
      bankingInformation = synchronizeResponse.bankingInformation;
      if (bankingInformation) {
        bankMessages = bankingInformation.bankMessages;
        let bpd = bankingInformation.bpd;
        let availableTanMethodIds = bpd.availableTanMethodIds;
        console.log('Available TAN methods: ', availableTanMethodIds);
        this.#fintsClient.selectTanMethod(availableTanMethodIds[0]); // todo: get from config
      } else {
        console.log('No bankingInformation returned for second synchronize');
      }
      if (tanInfo.requiresTan) {
        console.log('Tan required');
      }
    }
    if (!success || tanInfo.requiresTan) {
      return {success, tanInfo, bankAnswers, bankMessages, bankingInformation};
    }

    // sync again to get accounts
    synchronizeResponse = await this.#fintsClient.synchronize();
    success = synchronizeResponse.success;
    bankingInformationUpdated = synchronizeResponse.bankingInformationUpdated;
    console.log('bankingInformationUpdated', bankingInformationUpdated);
    bankAnswers = synchronizeResponse.bankAnswers;
    bankMessages = [];
    if (success) {
      tanInfo = {
        requiresTan: synchronizeResponse.requiresTan,
        tanChallenge: synchronizeResponse.tanChallenge,
        tanReference: synchronizeResponse.tanReference,
        tanMediaName: synchronizeResponse.tanMediaName,
      }
      bankingInformation = synchronizeResponse.bankingInformation;
      if (bankingInformation) {
        bankMessages = bankingInformation.bankMessages;
      } else {
        console.log('No bankingInformation returned for second synchronize');
      }
    }

    return {success, tanInfo, bankAnswers, bankMessages, bankingInformation};
  }

  async synchronizeWithTanReference(tanReference, tan) {
    this.#ensureFintsClient();
    let synchronizeResponse = await this.#fintsClient.synchronizeWithTan(tanReference, tan);
    let success = synchronizeResponse.success;
    let bankingInformationUpdated = synchronizeResponse.bankingInformationUpdated;
    console.log('synchronizeWithTanReference: bankingInformationUpdated', bankingInformationUpdated);
    let bankAnswers = synchronizeResponse.bankAnswers;
    let tanInfo = {
      requiresTan: synchronizeResponse.requiresTan,
      tanChallenge: synchronizeResponse.tanChallenge,
      tanReference: synchronizeResponse.tanReference,
      tanMediaName: synchronizeResponse.tanMediaName,
    }
    let bankingInformation;
    let bankMessages = [];
    if (success) {
      if (tanInfo.requiresTan) {
        console.log('synchronizeWithTanReference: Tan required');
      } else {
        bankingInformation = synchronizeResponse.bankingInformation;
        if (bankingInformation) {
          bankMessages = bankingInformation.bankMessages;
        } else {
          console.log('synchronizeWithTanReference: No bankingInformation returned for second synchronize');
        }
      }
    }
    return {success, tanInfo, bankAnswers, bankMessages, bankingInformation};
  }

  getBankAnswers() {
    return this.#fintsConfig.bankAnswers;
  }

  getAccounts() {
    return this.#fintsConfig.bankingInformation.upd.bankAccounts;
  }

  async getStatements(accountNumber, from, to) {
    this.#ensureFintsClient();
    const fromAlways = from ? from : DateTime.now().minus({days: 14}).toJSDate();
    const toAlways = to ? to : DateTime.now().toJSDate();
    let statements = {balance: {}, transactions: []};

    if (this.#fintsClient.canGetAccountStatements(accountNumber)) {
      const statementResponse = await this.#fintsClient.getAccountStatements(accountNumber, fromAlways, toAlways);

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

      const balanceResponse = await this.#fintsClient.getAccountBalance(accountNumber);
      statements.balance = balanceResponse.balance;
      statements.balance.type = 'bankAccountBalance';
    } else {
      if (this.#fintsClient.canGetCreditCardStatements(accountNumber)) {
        statements = await this.getCreditCardStatements(accountNumber, fromAlways, toAlways);
      } else {
        console.log(`Account ${accountNumber} does not allow getting statements or credit card statements`);
      }
    }
    return statements;
  }

  async getCreditCardStatements(accountNumber, from, to) {
    this.#ensureFintsClient();
    let statements = {balance: {}, transactions: []};

    if (this.#fintsClient.canGetCreditCardStatements(accountNumber)) {
      const statementResponse = await this.#fintsClient.getCreditCardStatements(accountNumber, from);

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
    this.#ensureFintsClient();
    let statements = {balance: {}, transactions: []};

    if (this.#fintsClient.canGetPortfolio(accountNumber)) {
      const portfolioResponse = await this.#fintsClient.getPortfolio(accountNumber);
      console.log(portfolioResponse);
    }

    return statements;
  }
}
