/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';

import { SchemAs } from 'vs/workbench/contrib/tAsks/common/problemMAtcher';

const schemA: IJSONSchemA = {
	definitions: {
		showOutputType: {
			type: 'string',
			enum: ['AlwAys', 'silent', 'never']
		},
		options: {
			type: 'object',
			description: nls.locAlize('JsonSchemA.options', 'AdditionAl commAnd options'),
			properties: {
				cwd: {
					type: 'string',
					description: nls.locAlize('JsonSchemA.options.cwd', 'The current working directory of the executed progrAm or script. If omitted Code\'s current workspAce root is used.')
				},
				env: {
					type: 'object',
					AdditionAlProperties: {
						type: 'string'
					},
					description: nls.locAlize('JsonSchemA.options.env', 'The environment of the executed progrAm or shell. If omitted the pArent process\' environment is used.')
				}
			},
			AdditionAlProperties: {
				type: ['string', 'ArrAy', 'object']
			}
		},
		problemMAtcherType: {
			oneOf: [
				{
					type: 'string',
					errorMessAge: nls.locAlize('JsonSchemA.tAsks.mAtcherError', 'Unrecognized problem mAtcher. Is the extension thAt contributes this problem mAtcher instAlled?')
				},
				SchemAs.LegAcyProblemMAtcher,
				{
					type: 'ArrAy',
					items: {
						AnyOf: [
							{
								type: 'string',
								errorMessAge: nls.locAlize('JsonSchemA.tAsks.mAtcherError', 'Unrecognized problem mAtcher. Is the extension thAt contributes this problem mAtcher instAlled?')
							},
							SchemAs.LegAcyProblemMAtcher
						]
					}
				}
			]
		},
		shellConfigurAtion: {
			type: 'object',
			AdditionAlProperties: fAlse,
			description: nls.locAlize('JsonSchemA.shellConfigurAtion', 'Configures the shell to be used.'),
			properties: {
				executAble: {
					type: 'string',
					description: nls.locAlize('JsonSchemA.shell.executAble', 'The shell to be used.')
				},
				Args: {
					type: 'ArrAy',
					description: nls.locAlize('JsonSchemA.shell.Args', 'The shell Arguments.'),
					items: {
						type: 'string'
					}
				}
			}
		},
		commAndConfigurAtion: {
			type: 'object',
			AdditionAlProperties: fAlse,
			properties: {
				commAnd: {
					type: 'string',
					description: nls.locAlize('JsonSchemA.commAnd', 'The commAnd to be executed. CAn be An externAl progrAm or A shell commAnd.')
				},
				Args: {
					type: 'ArrAy',
					description: nls.locAlize('JsonSchemA.tAsks.Args', 'Arguments pAssed to the commAnd when this tAsk is invoked.'),
					items: {
						type: 'string'
					}
				},
				options: {
					$ref: '#/definitions/options'
				}
			}
		},
		tAskDescription: {
			type: 'object',
			required: ['tAskNAme'],
			AdditionAlProperties: fAlse,
			properties: {
				tAskNAme: {
					type: 'string',
					description: nls.locAlize('JsonSchemA.tAsks.tAskNAme', "The tAsk's nAme")
				},
				commAnd: {
					type: 'string',
					description: nls.locAlize('JsonSchemA.commAnd', 'The commAnd to be executed. CAn be An externAl progrAm or A shell commAnd.')
				},
				Args: {
					type: 'ArrAy',
					description: nls.locAlize('JsonSchemA.tAsks.Args', 'Arguments pAssed to the commAnd when this tAsk is invoked.'),
					items: {
						type: 'string'
					}
				},
				options: {
					$ref: '#/definitions/options'
				},
				windows: {
					AnyOf: [
						{
							$ref: '#/definitions/commAndConfigurAtion',
							description: nls.locAlize('JsonSchemA.tAsks.windows', 'Windows specific commAnd configurAtion'),
						},
						{
							properties: {
								problemMAtcher: {
									$ref: '#/definitions/problemMAtcherType',
									description: nls.locAlize('JsonSchemA.tAsks.mAtchers', 'The problem mAtcher(s) to use. CAn either be A string or A problem mAtcher definition or An ArrAy of strings And problem mAtchers.')
								}
							}
						}
					]
				},
				osx: {
					AnyOf: [
						{
							$ref: '#/definitions/commAndConfigurAtion',
							description: nls.locAlize('JsonSchemA.tAsks.mAc', 'MAc specific commAnd configurAtion')
						},
						{
							properties: {
								problemMAtcher: {
									$ref: '#/definitions/problemMAtcherType',
									description: nls.locAlize('JsonSchemA.tAsks.mAtchers', 'The problem mAtcher(s) to use. CAn either be A string or A problem mAtcher definition or An ArrAy of strings And problem mAtchers.')
								}
							}
						}
					]
				},
				linux: {
					AnyOf: [
						{
							$ref: '#/definitions/commAndConfigurAtion',
							description: nls.locAlize('JsonSchemA.tAsks.linux', 'Linux specific commAnd configurAtion')
						},
						{
							properties: {
								problemMAtcher: {
									$ref: '#/definitions/problemMAtcherType',
									description: nls.locAlize('JsonSchemA.tAsks.mAtchers', 'The problem mAtcher(s) to use. CAn either be A string or A problem mAtcher definition or An ArrAy of strings And problem mAtchers.')
								}
							}
						}
					]
				},
				suppressTAskNAme: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.tAsks.suppressTAskNAme', 'Controls whether the tAsk nAme is Added As An Argument to the commAnd. If omitted the globAlly defined vAlue is used.'),
					defAult: true
				},
				showOutput: {
					$ref: '#/definitions/showOutputType',
					description: nls.locAlize('JsonSchemA.tAsks.showOutput', 'Controls whether the output of the running tAsk is shown or not. If omitted the globAlly defined vAlue is used.')
				},
				echoCommAnd: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.echoCommAnd', 'Controls whether the executed commAnd is echoed to the output. DefAult is fAlse.'),
					defAult: true
				},
				isWAtching: {
					type: 'booleAn',
					deprecAtionMessAge: nls.locAlize('JsonSchemA.tAsks.wAtching.deprecAtion', 'DeprecAted. Use isBAckground insteAd.'),
					description: nls.locAlize('JsonSchemA.tAsks.wAtching', 'Whether the executed tAsk is kept Alive And is wAtching the file system.'),
					defAult: true
				},
				isBAckground: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.tAsks.bAckground', 'Whether the executed tAsk is kept Alive And is running in the bAckground.'),
					defAult: true
				},
				promptOnClose: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.tAsks.promptOnClose', 'Whether the user is prompted when VS Code closes with A running tAsk.'),
					defAult: fAlse
				},
				isBuildCommAnd: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.tAsks.build', 'MAps this tAsk to Code\'s defAult build commAnd.'),
					defAult: true
				},
				isTestCommAnd: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.tAsks.test', 'MAps this tAsk to Code\'s defAult test commAnd.'),
					defAult: true
				},
				problemMAtcher: {
					$ref: '#/definitions/problemMAtcherType',
					description: nls.locAlize('JsonSchemA.tAsks.mAtchers', 'The problem mAtcher(s) to use. CAn either be A string or A problem mAtcher definition or An ArrAy of strings And problem mAtchers.')
				}
			}
		},
		tAskRunnerConfigurAtion: {
			type: 'object',
			required: [],
			properties: {
				commAnd: {
					type: 'string',
					description: nls.locAlize('JsonSchemA.commAnd', 'The commAnd to be executed. CAn be An externAl progrAm or A shell commAnd.')
				},
				Args: {
					type: 'ArrAy',
					description: nls.locAlize('JsonSchemA.Args', 'AdditionAl Arguments pAssed to the commAnd.'),
					items: {
						type: 'string'
					}
				},
				options: {
					$ref: '#/definitions/options'
				},
				showOutput: {
					$ref: '#/definitions/showOutputType',
					description: nls.locAlize('JsonSchemA.showOutput', 'Controls whether the output of the running tAsk is shown or not. If omitted \'AlwAys\' is used.')
				},
				isWAtching: {
					type: 'booleAn',
					deprecAtionMessAge: nls.locAlize('JsonSchemA.wAtching.deprecAtion', 'DeprecAted. Use isBAckground insteAd.'),
					description: nls.locAlize('JsonSchemA.wAtching', 'Whether the executed tAsk is kept Alive And is wAtching the file system.'),
					defAult: true
				},
				isBAckground: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.bAckground', 'Whether the executed tAsk is kept Alive And is running in the bAckground.'),
					defAult: true
				},
				promptOnClose: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.promptOnClose', 'Whether the user is prompted when VS Code closes with A running bAckground tAsk.'),
					defAult: fAlse
				},
				echoCommAnd: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.echoCommAnd', 'Controls whether the executed commAnd is echoed to the output. DefAult is fAlse.'),
					defAult: true
				},
				suppressTAskNAme: {
					type: 'booleAn',
					description: nls.locAlize('JsonSchemA.suppressTAskNAme', 'Controls whether the tAsk nAme is Added As An Argument to the commAnd. DefAult is fAlse.'),
					defAult: true
				},
				tAskSelector: {
					type: 'string',
					description: nls.locAlize('JsonSchemA.tAskSelector', 'Prefix to indicAte thAt An Argument is tAsk.')
				},
				problemMAtcher: {
					$ref: '#/definitions/problemMAtcherType',
					description: nls.locAlize('JsonSchemA.mAtchers', 'The problem mAtcher(s) to use. CAn either be A string or A problem mAtcher definition or An ArrAy of strings And problem mAtchers.')
				},
				tAsks: {
					type: 'ArrAy',
					description: nls.locAlize('JsonSchemA.tAsks', 'The tAsk configurAtions. UsuAlly these Are enrichments of tAsk AlreAdy defined in the externAl tAsk runner.'),
					items: {
						type: 'object',
						$ref: '#/definitions/tAskDescription'
					}
				}
			}
		}
	}
};

export defAult schemA;
