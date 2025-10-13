FinTS Ablauf

TanReference, Tan sind initial leer.


1) Synchronisieren (TanReference, Tan)
do {
    Falls TanReference und ggf. Tan gesetzt => fints.synchronizeWithTan(TanReference, Tan)
    => Fehler oder requiresTan => Abbruch
    => success => weiter im Ablauf

   fints.synchronize
   => Fehler => Abbruch
   => success => requiresTan, tanChallenge, tanReference, tanMediaName, bankAnswers
   Falls User/PIN ok => bankingInformation
   => bankMessages, bpd
   => availableTanMethodIds => selectTanMethod
   => ggf bankingInformation.upd => bankAccounts
   Falls requiresTan == true => tanReference, tanChallenge, tanMediaName merken
   => Tan generieren oder Freigabe durch Banking App abwarten (User Interaktion) => zu 1) mit TanReference, Tan => continue loop
   Falls requiresTan == false =>
   while()
    