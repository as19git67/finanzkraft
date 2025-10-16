import {FinTSClient, FinTSConfig} from 'lib-fints';
import {DateTime} from 'luxon';
import _ from 'lodash';

export default class FinTS {
  #maxFinTsRetrys = 4;
  #fintsConfig;
  #fintsClient;

  #productId;
  #productVersion;
  #debugEnabled;
  #bankUrl;
  #bankId;
  #userId;
  #pin;
  #tanReference;
  #tan;

  static #fintsInstance;
  static #fintsInstanceDataAsJson = '';

  constructor(productId, productVersion, debugEnabled = false, bankUrl, bankId, userId, pin, tanReference, tan) {
    this.#productId = productId;
    this.#productVersion = productVersion;
    this.#debugEnabled = debugEnabled;
    this.#bankUrl = bankUrl;
    this.#bankId = bankId;
    this.#userId = userId;
    this.#pin = pin;
    this.#tanReference = tanReference;
    this.#tan = tan;
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

  checkSyncResponse(syncResponse) {
    this.logSynchronizeResponse(syncResponse);
    const {success, bankingInformationUpdated, bankingInformation, bankAnswers, requiresTan} = syncResponse;
    let ok = true;
    if (!success) {
      return FinTS.statusError;
    }

    if (requiresTan) {
      // don't do further checks if tan is required
      return FinTS.statusOK; // return ok here - statusRequiresTAN will be returned in dialog code
    }

    // expect bankingInformationUpdated to be true
    // if (!bankingInformationUpdated) {
    //   return FinTS.statusNoBankingInformationUpdated;
    // }

    // expect bankingInformation to be true
    if (!bankingInformation) {
      return FinTS.statusNoBankingInformation;
    }

    // If bank answers don't contain 9910, then the PIN is ok
    const pinWrong = bankAnswers.some(a => a.code === 9910);
    return pinWrong ? FinTS.statusWrongPIN : FinTS.statusOK;
  }

  logSynchronizeResponse(response) {
    const {success, bankingInformationUpdated, bankingInformation, bankAnswers} = response;
    if (!success) {
      console.log(`FinTS call failed with success: ${success}`);
    }
    for (let j = 0; j < bankAnswers.length; j++) {
      console.log(`Bank answers: ${bankAnswers[j].code} ${bankAnswers[j].text}`);
    }
    console.log(`bankingInformationUpdated: ${bankingInformationUpdated}`);
    if (bankingInformation) {
      if (bankingInformation.bankMessages) {
        for (let j = 0; j < bankingInformation.bankMessages.length; j++) {
          console.log(`Bank message: ${bankingInformation.bankMessages[j].subject} ${bankingInformation.bankMessages[j].text}`);
        }
      }
      if (bankingInformation.bpd) {
        let availableTanMethodIds = bankingInformation.bpd.availableTanMethodIds;
        console.log('Available TAN method ids: ', availableTanMethodIds);
      }
    }
    console.log(`Requires TAN: ${response.requiresTan}`);
    if (response.requiresTan) {
      const {tanChallenge, tanReference, tanMediaName} = response;
      console.log(`TAN challenge: ${tanChallenge}`);
      console.log(`TAN reference: ${tanReference}`);
      console.log(`TAN media name: ${tanMediaName}`);
    }
  }

  checkDownloadResponse(downloadResponse) {
    this.logDownloadResponse(downloadResponse);
    const {success, bankingInformationUpdated, bankingInformation, bankAnswers, requiresTan} = downloadResponse;
    let ok = true;
    if (!success) {
      return FinTS.statusError;
    }

    if (requiresTan) {
      // don't do further checks if tan is required
      return FinTS.statusOK; // return ok here - statusRequiresTAN will be returned in dialog code
    }

    // If bank answers don't contain 9910, then the PIN is ok
    const pinWrong = bankAnswers.some(a => a.code === 9910);
    return pinWrong ? FinTS.statusWrongPIN : FinTS.statusOK;
  }

  logDownloadResponse(response) {
    const {success, bankingInformationUpdated, bankingInformation, bankAnswers} = response;
    if (!success) {
      console.log(`FinTS call failed with success: ${success}`);
    }
    for (let j = 0; j < bankAnswers.length; j++) {
      console.log(`Bank answers: ${bankAnswers[j].code} ${bankAnswers[j].text}`);
    }
    console.log(`bankingInformationUpdated: ${bankingInformationUpdated}`);
  }

  logBankAccounts(bankAccounts) {
    bankAccounts.forEach(bankAccount => {
      console.log(`Bank account: ${bankAccount.accountNumber} (${bankAccount.holder1}) (${bankAccount.accountType})`);
    });
  }

  static statusOK = 0;
  static statusError = 1;
  static statusWrongPIN = 2;
  static statusRequiresTAN = 3;
  static statusNoBankAccounts = 4;
  static statusNoBankMessages = 5;
  static statusNoBankingInformation = 6;
  static statusNoBankingInformationUpdated = 7;
  static statusNoTanMethods = 8;
  static statusNoAccountStatements = 9;

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

  static from(productId, productVersion, debugEnabled = false, bankUrl, bankId, userId, pin, tanReference, tan) {
    if (!FinTS.#fintsInstance || FinTS.#isClientDifferent({
      productId,
      productVersion,
      debugEnabled,
      bankUrl,
      bankId,
      userId,
      pin,
    })) {
      return new FinTS(productId, productVersion, debugEnabled = false, bankUrl, bankId, userId, pin, tanReference, tan);
    } else {
      FinTS.#fintsInstance.setTanAndReference(tanReference, tan);
      return FinTS.#fintsInstance;
    }
  }

  setTanAndReference(tanReference, tan) {
    this.#tanReference = tanReference;
    this.#tan = tan;
  }

  /**
   * Performs a FinTS synchronization dialog with the bank, handling TAN (transaction authentication number) requirements and retries.
   *
   * - Attempts to synchronize with the bank, using a TAN if provided.
   * - Handles various response statuses, including TAN required, wrong PIN, and missing bank accounts.
   * - Selects the first available TAN method if needed.
   * - Retries synchronization up to a maximum number of times if bank accounts are not found.
   *
   * @returns {Promise<Object>} An object containing:
   *   - status: One of the FinTS status codes (e.g., statusOK, statusRequiresTAN, etc.).
   *   - bankAccounts: Array of bank accounts (if available and status is OK).
   *   - tanInfo: Object with TAN challenge details (if TAN is required).
   *   - message: Error message (if wrong PIN).
   */
  async dialogForSync() {
    let fintsRetries = 0;
    let syncRes = {status: false};
    let bankAccounts;
    let status = FinTS.statusOK;

    try {
      do {
        this.#ensureFintsClient();

        if (this.#tanReference) {
          syncRes = await this.#fintsClient.synchronizeWithTan(this.#tanReference, this.#tan);
        } else {
          syncRes = await this.#fintsClient.synchronize();
        }

        status = this.checkSyncResponse(syncRes);
        if (status !== FinTS.statusOK) {
          break;
        }

        const {bankingInformation, requiresTan} = syncRes;

        if (requiresTan) {
          status = FinTS.statusRequiresTAN;
          break;
        }

        const tanMethodIds = bankingInformation.bpd?.availableTanMethodIds || [];
        if (tanMethodIds.length === 0) {
          console.log('No TAN methods available => aborting');
          status = FinTS.statusNoTanMethods;
          break;
        }
        this.#fintsClient.selectTanMethod(tanMethodIds[0]); // todo: take configured tan method

        // no TAN required => continue
        // get accounts from sync
        if (bankingInformation.upd && _.isArray(bankingInformation.upd.bankAccounts)) {
          bankAccounts = bankingInformation.upd.bankAccounts;
          this.logBankAccounts(bankAccounts);
          status = FinTS.statusOK;
          break;
        } else {
          console.log(`No bank accounts found in banking information (${fintsRetries} retries)`);
          status = FinTS.statusNoBankAccounts;
        }

        fintsRetries += 1;
      } while (fintsRetries < this.#maxFinTsRetrys && status !== FinTS.statusOK);

      switch (status) {
        case FinTS.statusOK:
          return {status, bankAccounts};
        case FinTS.statusRequiresTAN:
          const {requiresTan, tanChallenge, tanReference, tanMediaName, bankingInformation} = syncRes;
          return {
            status,
            tanInfo: {
              requiresTan,
              tanChallenge,
              tanReference,
              tanMediaName,
              availableTanMethodIds: bankingInformation?.bpd?.availableTanMethodIds ? bankingInformation.bpd.availableTanMethodIds : []
            }
          };
        case FinTS.statusWrongPIN:
          return {status, message: syncRes.bankAnswers.find(a => a.code === 9910).text};
        default:
          return {status};
      }
    } catch (e) {
      console.log('Error during dialogForSync: ', e);
      return {status: FinTS.statusError};
    }
  }

  async dialogForStatements(accountNumber, from, to) {
    let fintsRetries = 0;
    let statementDownloadRes = {status: false};
    let statements, balance;
    let status = FinTS.statusOK;
    let statementsAreAccountStatements = false;

    try {
      const fromAlways = from ? from : DateTime.now().minus({days: 14}).toJSDate();
      const toAlways = to ? to : DateTime.now().toJSDate();

      do {
        this.#ensureFintsClient();

        if (this.#fintsClient.canGetAccountStatements(accountNumber)) {
          statementsAreAccountStatements = true;
          if (this.#tanReference) {
            statementDownloadRes = await this.#fintsClient.getAccountStatementsWithTan(this.#tanReference, this.#tan);
          } else {
            statementDownloadRes = await this.#fintsClient.getAccountStatements(accountNumber, fromAlways, toAlways);
          }
        } else if (this.#fintsClient.canGetCreditCardStatements(accountNumber)) {
          statementsAreAccountStatements = false;
          if (this.#tanReference) {
            statementDownloadRes = await this.#fintsClient.getCreditCardStatementsWithTan(this.#tanReference, this.#tan);
          } else {
            statementDownloadRes = await this.#fintsClient.getCreditCardStatements(accountNumber, fromAlways, toAlways);
          }
        } else {
          status = FinTS.statusError;
          console.log(`Account ${accountNumber} does not allow getting statements or credit card statements`);
          break;
        }

        status = this.checkDownloadResponse(statementDownloadRes);
        if (status !== FinTS.statusOK) {
          break;
        }

        if (statementDownloadRes.requiresTan) {
          status = FinTS.statusRequiresTAN;
          break;
        }

        // no TAN required => continue
        // get statements from sync
        if (statementDownloadRes.statements) {
          // map statements to include isAccountStatement flag
          statements = [];
          if (statementsAreAccountStatements) {
            statementDownloadRes.statements.forEach((s) => {
              if (s.closingBalance) {
                balance = {
                  balanceDate: s.closingBalance.date,
                  balance: s.closingBalance.value,
                  currency: s.closingBalance.currency,
                  type: 'bankAccountBalance',
                };
              }
              s.transactions.forEach((t) => {
                t.isAccountStatement = statementsAreAccountStatements;
                statements.push(t);
              });
            });
          } else {
            statementDownloadRes.statements.forEach((s) => {
              s.isAccountStatement = statementsAreAccountStatements;
              statements.push(s);
            });
            balance = {
              balanceDate: statementDownloadRes.balance.date,
              balance: statementDownloadRes.balance.balance,
              currency: statementDownloadRes.balance.currency,
              type: 'creditCardBalance',
            };
          }
          status = FinTS.statusOK;
        } else {
          console.log(`No statements found in response from bank (${fintsRetries} retries)`);
          status = FinTS.statusNoAccountStatements;
          break;
        }

        fintsRetries += 1;
      } while (fintsRetries < this.#maxFinTsRetrys && status !== FinTS.statusOK);

      switch (status) {
        case FinTS.statusOK:
          return {status, statements, balance};
        case FinTS.statusRequiresTAN:
          const {requiresTan, tanChallenge, tanReference, tanMediaName, bankingInformation} = statementDownloadRes;
          return {
            status,
            tanInfo: {
              requiresTan,
              tanChallenge,
              tanReference,
              tanMediaName,
              availableTanMethodIds: bankingInformation?.bpd?.availableTanMethodIds ? bankingInformation.bpd.availableTanMethodIds : []
            }
          };
        case FinTS.statusWrongPIN:
          return {status, message: statementDownloadRes.bankAnswers.find(a => a.code === 9910).text};
        default:
          return {status};
      }
    } catch (e) {
      console.log('Error during dialogForStatements: ', e);
      return {status: FinTS.statusError};
    }
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
