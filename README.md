# Doel
Referentie implementatie van een webservice client voor de NLFiscaal webservice.

# Benodigdheden voor ontwikkelaar
- git (https://git-scm.com/download/win)
- VSCode (https://code.visualstudio.com/download)
- node en npm (https://nodejs.org/en/download/)
- nodemon (`npm install -g nodemon`)
- jsdoc (`npm install -g jsdoc`)

# Code style / ESLint
- Camel-style namen aan voor variabelen en functies
- In volgorde van wenselijkheid voor javascript const, let en (bij hoge uitzondering) var declaraties.
- Eslint als code style checker en -formatter. Hiertoe is het noodzakelijk om eenmalig in VSCode
    - de extensie ESLint van Dirk Baumer te installeren via het Extensions menu
    - en in de settings van VSCode (ctrl-shft-P, settings.json) de volgende elementen op te nemen:
```
    "[javascript]": {
        "editor.defaultFormatter": "dbaeumer.vscode-eslint"
    },
    "eslint.format.enable": true,`
```
    - Functie-aanroepen van functies uit andere bestanden worden voorzien van het commentaar ` // eslint-disable-line no-undef'`
    - Functie-definities die alleen vanaf externe bestanden aangeroepen worden, worden voorzien van `// eslint-disable-line no-unused-vars`  
- Zie verder de instellingen in webservice-client\.eslintrc.json

# Configuratie
Maak een file settings.json in de root van het project. De inhoud is
```
{
	"PreviousHighestDatetime": "2022-01-10T15:10:38Z",
	"Username": "...",
	"Password": "..."
}
```
