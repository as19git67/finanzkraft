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
  #isSynchronized;

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
    this.#isSynchronized = false;
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

  logBankAccounts(bankAccounts) {
    bankAccounts.forEach(bankAccount => {
      console.log(`Bank account: ${bankAccount.accountNumber} (${bankAccount.holder1}) (${bankAccount.accountType})`);
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
    // console.log(`bankingInformationUpdated: ${bankingInformationUpdated}`);
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
  static statusAccountNumberUnknownAtBank = 10;

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

  async #doSynchronize() {
    let syncRes, status = FinTS.statusOK, bankAccounts = [];

    try {
      if (this.#tanReference) {
        syncRes = await this.#fintsClient.synchronizeWithTan(this.#tanReference, this.#tan);
      } else {
        syncRes = await this.#fintsClient.synchronize();
      }
    } catch (e) {
      console.log('Error during synchronize: ', e);
      return {status: FinTS.statusError};
    }

    status = this.checkSyncResponse(syncRes);
    if (status === FinTS.statusWrongPIN) {
      return {status, message: syncRes.bankAnswers.find(a => a.code === 9910).text};
    }
    if (status !== FinTS.statusOK) {
      return {status};
    }

    const {bankingInformation, requiresTan} = syncRes;

    if (requiresTan) {
      let mimeType = '';
      let image;
      const {requiresTan, tanChallenge, tanPhoto, tanReference, tanMediaName, bankingInformation} = syncRes;
      return {status: FinTS.statusRequiresTAN, tanInfo: {
        requiresTan,
          tanChallenge,
          tanPhoto,
          tanReference,
          tanMediaName,
          availableTanMethodIds: bankingInformation?.bpd?.availableTanMethodIds ? bankingInformation.bpd.availableTanMethodIds : []
      }};
    }

    const tanMethodIds = bankingInformation.bpd?.availableTanMethodIds || [];
    if (tanMethodIds.length === 0) {
      console.log('No TAN methods available => aborting');
      return {status: FinTS.statusNoTanMethods};
    }
    this.#fintsClient.selectTanMethod(tanMethodIds[0]); // todo: take configured tan method

    // no TAN required => continue
    // get accounts from sync
    if (bankingInformation.upd && _.isArray(bankingInformation.upd.bankAccounts)) {
      bankAccounts = bankingInformation.upd.bankAccounts;
      this.logBankAccounts(bankAccounts);
      this.#isSynchronized = true;
      return {status: FinTS.statusOK, bankAccounts};
    } else {
      console.log(`No bank accounts found in banking information`);
      return {status: FinTS.statusNoBankAccounts};
    }
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
    let syncResult;
    let bankAccounts;
    let status = FinTS.statusOK;

    try {
      this.#ensureFintsClient();

      do {
        syncResult = await this.#doSynchronize();
        status = syncResult.status;
        if (status === FinTS.statusNoBankAccounts) continue;
        if (status !== FinTS.statusOK) break;
        bankAccounts = syncResult.bankAccounts;

        fintsRetries += 1;
      } while (fintsRetries < this.#maxFinTsRetrys && status !== FinTS.statusOK);

      switch (status) {
        case FinTS.statusOK:
        case FinTS.statusRequiresTAN:
        case FinTS.statusWrongPIN:
          return syncResult;
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
    let result = {status: false};
    let statements, balance;
    let status = FinTS.statusOK;
    let statementsAreAccountStatements = false;

    try {
      const fromAlways = from ? from : DateTime.now().minus({days: 14}).toJSDate();
      const toAlways = to ? to : DateTime.now().toJSDate();

      this.#ensureFintsClient();

      do {
        if (this.#isSynchronized) {
          console.log(`Using cached banking information for bank with id ${this.#bankId} - skip synchronizing bank contact`)
        } else {
          result = await this.#doSynchronize();
          this.setTanAndReference(undefined, undefined); // clear tan and reference, because they were used in sync already
          status = result.status;
          if (status === FinTS.statusNoBankAccounts) continue;
          if (status !== FinTS.statusOK) break;
        }
        const bankAccounts = this.#fintsConfig.bankingInformation.upd.bankAccounts;
        if (!bankAccounts.some(ba => ba.accountNumber === accountNumber)) {
          status = FinTS.statusAccountNumberUnknownAtBank;
          break;
        }

        if (this.#fintsClient.canGetAccountStatements(accountNumber)) {
          statementsAreAccountStatements = true;
          if (this.#tanReference) {
            result = await this.#fintsClient.getAccountStatementsWithTan(this.#tanReference, this.#tan);
          } else {
            result = await this.#fintsClient.getAccountStatements(accountNumber, fromAlways, toAlways);
          }
        } else if (this.#fintsClient.canGetCreditCardStatements(accountNumber)) {
          statementsAreAccountStatements = false;
          if (this.#tanReference) {
            result = await this.#fintsClient.getCreditCardStatementsWithTan(this.#tanReference, this.#tan);
          } else {
            result = await this.#fintsClient.getCreditCardStatements(accountNumber, fromAlways, toAlways);
          }
        } else {
          status = FinTS.statusError;
          console.log(`Account ${accountNumber} does not allow getting statements or credit card statements`);
          break;
        }

        status = this.checkDownloadResponse(result);
        if (status !== FinTS.statusOK) {
          break;
        }

        if (result.requiresTan) {
          status = FinTS.statusRequiresTAN;
          break;
        }

        // no TAN required => continue
        // get statements from sync
        if (result.statements) {
          // map statements to include isAccountStatement flag
          statements = [];
          if (statementsAreAccountStatements) {
            result.statements.forEach((s) => {
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
            result.statements.forEach((s) => {
              s.isAccountStatement = statementsAreAccountStatements;
              statements.push(s);
            });
            balance = {
              balanceDate: result.balance.date,
              balance: result.balance.balance,
              currency: result.balance.currency,
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
          return {status, tanInfo: result.tanInfo};
        case FinTS.statusWrongPIN:
          return {status, message: result.bankAnswers.find(a => a.code === 9910).text};
        case FinTS.statusAccountNumberUnknownAtBank:
          console.log(`Account ${accountNumber} not found in bank accounts of bank contact with bank id ${this.#bankId} (user: ${this.#userId})`);
          return {status};
        default:
          return {status};
      }
    } catch (e) {
      console.log('Error during dialogForStatements: ', e);
      return {status: FinTS.statusError};
    }
  }
}
