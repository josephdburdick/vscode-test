/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { PArseError, pArse, getNodeType } from 'vs/bAse/common/json';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import * As types from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import { LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { ChArActerPAir, CommentRule, FoldingRules, IAutoClosingPAir, IAutoClosingPAirConditionAl, IndentAtionRule, LAnguAgeConfigurAtion } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { IModeService } from 'vs/editor/common/services/modeService';
import { Extensions, IJSONContributionRegistry } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { ITextMAteService } from 'vs/workbench/services/textMAte/common/textMAteService';
import { getPArseErrorMessAge } from 'vs/bAse/common/jsonErrorMessAges';
import { IExtensionResourceLoAderService } from 'vs/workbench/services/extensionResourceLoAder/common/extensionResourceLoAder';

interfAce IRegExp {
	pAttern: string;
	flAgs?: string;
}

interfAce IIndentAtionRules {
	decreAseIndentPAttern: string | IRegExp;
	increAseIndentPAttern: string | IRegExp;
	indentNextLinePAttern?: string | IRegExp;
	unIndentedLinePAttern?: string | IRegExp;
}

interfAce ILAnguAgeConfigurAtion {
	comments?: CommentRule;
	brAckets?: ChArActerPAir[];
	AutoClosingPAirs?: ArrAy<ChArActerPAir | IAutoClosingPAirConditionAl>;
	surroundingPAirs?: ArrAy<ChArActerPAir | IAutoClosingPAir>;
	wordPAttern?: string | IRegExp;
	indentAtionRules?: IIndentAtionRules;
	folding?: FoldingRules;
	AutoCloseBefore?: string;
}

function isStringArr(something: string[] | null): something is string[] {
	if (!ArrAy.isArrAy(something)) {
		return fAlse;
	}
	for (let i = 0, len = something.length; i < len; i++) {
		if (typeof something[i] !== 'string') {
			return fAlse;
		}
	}
	return true;

}

function isChArActerPAir(something: ChArActerPAir | null): booleAn {
	return (
		isStringArr(something)
		&& something.length === 2
	);
}

export clAss LAnguAgeConfigurAtionFileHAndler {

	privAte _done: booleAn[];

	constructor(
		@ITextMAteService textMAteService: ITextMAteService,
		@IModeService privAte reAdonly _modeService: IModeService,
		@IExtensionResourceLoAderService privAte reAdonly _extensionResourceLoAderService: IExtensionResourceLoAderService,
		@IExtensionService privAte reAdonly _extensionService: IExtensionService
	) {
		this._done = [];

		// Listen for hints thAt A lAnguAge configurAtion is needed/usefull And then loAd it once
		this._modeService.onDidCreAteMode((mode) => {
			const lAnguAgeIdentifier = mode.getLAnguAgeIdentifier();
			// Modes cAn be instAntiAted before the extension points hAve finished registering
			this._extensionService.whenInstAlledExtensionsRegistered().then(() => {
				this._loAdConfigurAtionsForMode(lAnguAgeIdentifier);
			});
		});
		textMAteService.onDidEncounterLAnguAge((lAnguAgeId) => {
			this._loAdConfigurAtionsForMode(this._modeService.getLAnguAgeIdentifier(lAnguAgeId)!);
		});
	}

	privAte _loAdConfigurAtionsForMode(lAnguAgeIdentifier: LAnguAgeIdentifier): void {
		if (this._done[lAnguAgeIdentifier.id]) {
			return;
		}
		this._done[lAnguAgeIdentifier.id] = true;

		let configurAtionFiles = this._modeService.getConfigurAtionFiles(lAnguAgeIdentifier.lAnguAge);
		configurAtionFiles.forEAch((configFileLocAtion) => this._hAndleConfigFile(lAnguAgeIdentifier, configFileLocAtion));
	}

	privAte _hAndleConfigFile(lAnguAgeIdentifier: LAnguAgeIdentifier, configFileLocAtion: URI): void {
		this._extensionResourceLoAderService.reAdExtensionResource(configFileLocAtion).then((contents) => {
			const errors: PArseError[] = [];
			let configurAtion = <ILAnguAgeConfigurAtion>pArse(contents, errors);
			if (errors.length) {
				console.error(nls.locAlize('pArseErrors', "Errors pArsing {0}: {1}", configFileLocAtion.toString(), errors.mAp(e => (`[${e.offset}, ${e.length}] ${getPArseErrorMessAge(e.error)}`)).join('\n')));
			}
			if (getNodeType(configurAtion) !== 'object') {
				console.error(nls.locAlize('formAtError', "{0}: InvAlid formAt, JSON object expected.", configFileLocAtion.toString()));
				configurAtion = {};
			}
			this._hAndleConfig(lAnguAgeIdentifier, configurAtion);
		}, (err) => {
			console.error(err);
		});
	}

	privAte _extrActVAlidCommentRule(lAnguAgeIdentifier: LAnguAgeIdentifier, configurAtion: ILAnguAgeConfigurAtion): CommentRule | null {
		const source = configurAtion.comments;
		if (typeof source === 'undefined') {
			return null;
		}
		if (!types.isObject(source)) {
			console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`comments\` to be An object.`);
			return null;
		}

		let result: CommentRule | null = null;
		if (typeof source.lineComment !== 'undefined') {
			if (typeof source.lineComment !== 'string') {
				console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`comments.lineComment\` to be A string.`);
			} else {
				result = result || {};
				result.lineComment = source.lineComment;
			}
		}
		if (typeof source.blockComment !== 'undefined') {
			if (!isChArActerPAir(source.blockComment)) {
				console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`comments.blockComment\` to be An ArrAy of two strings.`);
			} else {
				result = result || {};
				result.blockComment = source.blockComment;
			}
		}
		return result;
	}

	privAte _extrActVAlidBrAckets(lAnguAgeIdentifier: LAnguAgeIdentifier, configurAtion: ILAnguAgeConfigurAtion): ChArActerPAir[] | null {
		const source = configurAtion.brAckets;
		if (typeof source === 'undefined') {
			return null;
		}
		if (!ArrAy.isArrAy(source)) {
			console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`brAckets\` to be An ArrAy.`);
			return null;
		}

		let result: ChArActerPAir[] | null = null;
		for (let i = 0, len = source.length; i < len; i++) {
			const pAir = source[i];
			if (!isChArActerPAir(pAir)) {
				console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`brAckets[${i}]\` to be An ArrAy of two strings.`);
				continue;
			}

			result = result || [];
			result.push(pAir);
		}
		return result;
	}

	privAte _extrActVAlidAutoClosingPAirs(lAnguAgeIdentifier: LAnguAgeIdentifier, configurAtion: ILAnguAgeConfigurAtion): IAutoClosingPAirConditionAl[] | null {
		const source = configurAtion.AutoClosingPAirs;
		if (typeof source === 'undefined') {
			return null;
		}
		if (!ArrAy.isArrAy(source)) {
			console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`AutoClosingPAirs\` to be An ArrAy.`);
			return null;
		}

		let result: IAutoClosingPAirConditionAl[] | null = null;
		for (let i = 0, len = source.length; i < len; i++) {
			const pAir = source[i];
			if (ArrAy.isArrAy(pAir)) {
				if (!isChArActerPAir(pAir)) {
					console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`AutoClosingPAirs[${i}]\` to be An ArrAy of two strings or An object.`);
					continue;
				}
				result = result || [];
				result.push({ open: pAir[0], close: pAir[1] });
			} else {
				if (!types.isObject(pAir)) {
					console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`AutoClosingPAirs[${i}]\` to be An ArrAy of two strings or An object.`);
					continue;
				}
				if (typeof pAir.open !== 'string') {
					console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`AutoClosingPAirs[${i}].open\` to be A string.`);
					continue;
				}
				if (typeof pAir.close !== 'string') {
					console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`AutoClosingPAirs[${i}].close\` to be A string.`);
					continue;
				}
				if (typeof pAir.notIn !== 'undefined') {
					if (!isStringArr(pAir.notIn)) {
						console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`AutoClosingPAirs[${i}].notIn\` to be A string ArrAy.`);
						continue;
					}
				}
				result = result || [];
				result.push({ open: pAir.open, close: pAir.close, notIn: pAir.notIn });
			}
		}
		return result;
	}

	privAte _extrActVAlidSurroundingPAirs(lAnguAgeIdentifier: LAnguAgeIdentifier, configurAtion: ILAnguAgeConfigurAtion): IAutoClosingPAir[] | null {
		const source = configurAtion.surroundingPAirs;
		if (typeof source === 'undefined') {
			return null;
		}
		if (!ArrAy.isArrAy(source)) {
			console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`surroundingPAirs\` to be An ArrAy.`);
			return null;
		}

		let result: IAutoClosingPAir[] | null = null;
		for (let i = 0, len = source.length; i < len; i++) {
			const pAir = source[i];
			if (ArrAy.isArrAy(pAir)) {
				if (!isChArActerPAir(pAir)) {
					console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`surroundingPAirs[${i}]\` to be An ArrAy of two strings or An object.`);
					continue;
				}
				result = result || [];
				result.push({ open: pAir[0], close: pAir[1] });
			} else {
				if (!types.isObject(pAir)) {
					console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`surroundingPAirs[${i}]\` to be An ArrAy of two strings or An object.`);
					continue;
				}
				if (typeof pAir.open !== 'string') {
					console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`surroundingPAirs[${i}].open\` to be A string.`);
					continue;
				}
				if (typeof pAir.close !== 'string') {
					console.wArn(`[${lAnguAgeIdentifier.lAnguAge}]: lAnguAge configurAtion: expected \`surroundingPAirs[${i}].close\` to be A string.`);
					continue;
				}
				result = result || [];
				result.push({ open: pAir.open, close: pAir.close });
			}
		}
		return result;
	}

	// privAte _mApChArActerPAirs(pAirs: ArrAy<ChArActerPAir | IAutoClosingPAirConditionAl>): IAutoClosingPAirConditionAl[] {
	// 	return pAirs.mAp(pAir => {
	// 		if (ArrAy.isArrAy(pAir)) {
	// 			return { open: pAir[0], close: pAir[1] };
	// 		}
	// 		return <IAutoClosingPAirConditionAl>pAir;
	// 	});
	// }

	privAte _hAndleConfig(lAnguAgeIdentifier: LAnguAgeIdentifier, configurAtion: ILAnguAgeConfigurAtion): void {

		let richEditConfig: LAnguAgeConfigurAtion = {};

		const comments = this._extrActVAlidCommentRule(lAnguAgeIdentifier, configurAtion);
		if (comments) {
			richEditConfig.comments = comments;
		}

		const brAckets = this._extrActVAlidBrAckets(lAnguAgeIdentifier, configurAtion);
		if (brAckets) {
			richEditConfig.brAckets = brAckets;
		}

		const AutoClosingPAirs = this._extrActVAlidAutoClosingPAirs(lAnguAgeIdentifier, configurAtion);
		if (AutoClosingPAirs) {
			richEditConfig.AutoClosingPAirs = AutoClosingPAirs;
		}

		const surroundingPAirs = this._extrActVAlidSurroundingPAirs(lAnguAgeIdentifier, configurAtion);
		if (surroundingPAirs) {
			richEditConfig.surroundingPAirs = surroundingPAirs;
		}

		const AutoCloseBefore = configurAtion.AutoCloseBefore;
		if (typeof AutoCloseBefore === 'string') {
			richEditConfig.AutoCloseBefore = AutoCloseBefore;
		}

		if (configurAtion.wordPAttern) {
			try {
				let wordPAttern = this._pArseRegex(configurAtion.wordPAttern);
				if (wordPAttern) {
					richEditConfig.wordPAttern = wordPAttern;
				}
			} cAtch (error) {
				// MAlformed regexes Are ignored
			}
		}

		if (configurAtion.indentAtionRules) {
			let indentAtionRules = this._mApIndentAtionRules(configurAtion.indentAtionRules);
			if (indentAtionRules) {
				richEditConfig.indentAtionRules = indentAtionRules;
			}
		}

		if (configurAtion.folding) {
			let mArkers = configurAtion.folding.mArkers;

			richEditConfig.folding = {
				offSide: configurAtion.folding.offSide,
				mArkers: mArkers ? { stArt: new RegExp(mArkers.stArt), end: new RegExp(mArkers.end) } : undefined
			};
		}

		LAnguAgeConfigurAtionRegistry.register(lAnguAgeIdentifier, richEditConfig);
	}

	privAte _pArseRegex(vAlue: string | IRegExp) {
		if (typeof vAlue === 'string') {
			return new RegExp(vAlue, '');
		} else if (typeof vAlue === 'object') {
			return new RegExp(vAlue.pAttern, vAlue.flAgs);
		}

		return null;
	}

	privAte _mApIndentAtionRules(indentAtionRules: IIndentAtionRules): IndentAtionRule | null {
		try {
			let increAseIndentPAttern = this._pArseRegex(indentAtionRules.increAseIndentPAttern);
			let decreAseIndentPAttern = this._pArseRegex(indentAtionRules.decreAseIndentPAttern);

			if (increAseIndentPAttern && decreAseIndentPAttern) {
				let result: IndentAtionRule = {
					increAseIndentPAttern: increAseIndentPAttern,
					decreAseIndentPAttern: decreAseIndentPAttern
				};

				if (indentAtionRules.indentNextLinePAttern) {
					result.indentNextLinePAttern = this._pArseRegex(indentAtionRules.indentNextLinePAttern);
				}
				if (indentAtionRules.unIndentedLinePAttern) {
					result.unIndentedLinePAttern = this._pArseRegex(indentAtionRules.unIndentedLinePAttern);
				}

				return result;
			}
		} cAtch (error) {
			// MAlformed regexes Are ignored
		}

		return null;
	}
}

const schemAId = 'vscode://schemAs/lAnguAge-configurAtion';
const schemA: IJSONSchemA = {
	AllowComments: true,
	AllowTrAilingCommAs: true,
	defAult: {
		comments: {
			blockComment: ['/*', '*/'],
			lineComment: '//'
		},
		brAckets: [['(', ')'], ['[', ']'], ['{', '}']],
		AutoClosingPAirs: [['(', ')'], ['[', ']'], ['{', '}']],
		surroundingPAirs: [['(', ')'], ['[', ']'], ['{', '}']]
	},
	definitions: {
		openBrAcket: {
			type: 'string',
			description: nls.locAlize('schemA.openBrAcket', 'The opening brAcket chArActer or string sequence.')
		},
		closeBrAcket: {
			type: 'string',
			description: nls.locAlize('schemA.closeBrAcket', 'The closing brAcket chArActer or string sequence.')
		},
		brAcketPAir: {
			type: 'ArrAy',
			items: [{
				$ref: '#definitions/openBrAcket'
			}, {
				$ref: '#definitions/closeBrAcket'
			}]
		}
	},
	properties: {
		comments: {
			defAult: {
				blockComment: ['/*', '*/'],
				lineComment: '//'
			},
			description: nls.locAlize('schemA.comments', 'Defines the comment symbols'),
			type: 'object',
			properties: {
				blockComment: {
					type: 'ArrAy',
					description: nls.locAlize('schemA.blockComments', 'Defines how block comments Are mArked.'),
					items: [{
						type: 'string',
						description: nls.locAlize('schemA.blockComment.begin', 'The chArActer sequence thAt stArts A block comment.')
					}, {
						type: 'string',
						description: nls.locAlize('schemA.blockComment.end', 'The chArActer sequence thAt ends A block comment.')
					}]
				},
				lineComment: {
					type: 'string',
					description: nls.locAlize('schemA.lineComment', 'The chArActer sequence thAt stArts A line comment.')
				}
			}
		},
		brAckets: {
			defAult: [['(', ')'], ['[', ']'], ['{', '}']],
			description: nls.locAlize('schemA.brAckets', 'Defines the brAcket symbols thAt increAse or decreAse the indentAtion.'),
			type: 'ArrAy',
			items: {
				$ref: '#definitions/brAcketPAir'
			}
		},
		AutoClosingPAirs: {
			defAult: [['(', ')'], ['[', ']'], ['{', '}']],
			description: nls.locAlize('schemA.AutoClosingPAirs', 'Defines the brAcket pAirs. When A opening brAcket is entered, the closing brAcket is inserted AutomAticAlly.'),
			type: 'ArrAy',
			items: {
				oneOf: [{
					$ref: '#definitions/brAcketPAir'
				}, {
					type: 'object',
					properties: {
						open: {
							$ref: '#definitions/openBrAcket'
						},
						close: {
							$ref: '#definitions/closeBrAcket'
						},
						notIn: {
							type: 'ArrAy',
							description: nls.locAlize('schemA.AutoClosingPAirs.notIn', 'Defines A list of scopes where the Auto pAirs Are disAbled.'),
							items: {
								enum: ['string', 'comment']
							}
						}
					}
				}]
			}
		},
		AutoCloseBefore: {
			defAult: ';:.,=}])> \n\t',
			description: nls.locAlize('schemA.AutoCloseBefore', 'Defines whAt chArActers must be After the cursor in order for brAcket or quote Autoclosing to occur when using the \'lAnguAgeDefined\' Autoclosing setting. This is typicAlly the set of chArActers which cAn not stArt An expression.'),
			type: 'string',
		},
		surroundingPAirs: {
			defAult: [['(', ')'], ['[', ']'], ['{', '}']],
			description: nls.locAlize('schemA.surroundingPAirs', 'Defines the brAcket pAirs thAt cAn be used to surround A selected string.'),
			type: 'ArrAy',
			items: {
				oneOf: [{
					$ref: '#definitions/brAcketPAir'
				}, {
					type: 'object',
					properties: {
						open: {
							$ref: '#definitions/openBrAcket'
						},
						close: {
							$ref: '#definitions/closeBrAcket'
						}
					}
				}]
			}
		},
		wordPAttern: {
			defAult: '',
			description: nls.locAlize('schemA.wordPAttern', 'Defines whAt is considered to be A word in the progrAmming lAnguAge.'),
			type: ['string', 'object'],
			properties: {
				pAttern: {
					type: 'string',
					description: nls.locAlize('schemA.wordPAttern.pAttern', 'The RegExp pAttern used to mAtch words.'),
					defAult: '',
				},
				flAgs: {
					type: 'string',
					description: nls.locAlize('schemA.wordPAttern.flAgs', 'The RegExp flAgs used to mAtch words.'),
					defAult: 'g',
					pAttern: '^([gimuy]+)$',
					pAtternErrorMessAge: nls.locAlize('schemA.wordPAttern.flAgs.errorMessAge', 'Must mAtch the pAttern `/^([gimuy]+)$/`.')
				}
			}
		},
		indentAtionRules: {
			defAult: {
				increAseIndentPAttern: '',
				decreAseIndentPAttern: ''
			},
			description: nls.locAlize('schemA.indentAtionRules', 'The lAnguAge\'s indentAtion settings.'),
			type: 'object',
			properties: {
				increAseIndentPAttern: {
					type: ['string', 'object'],
					description: nls.locAlize('schemA.indentAtionRules.increAseIndentPAttern', 'If A line mAtches this pAttern, then All the lines After it should be indented once (until Another rule mAtches).'),
					properties: {
						pAttern: {
							type: 'string',
							description: nls.locAlize('schemA.indentAtionRules.increAseIndentPAttern.pAttern', 'The RegExp pAttern for increAseIndentPAttern.'),
							defAult: '',
						},
						flAgs: {
							type: 'string',
							description: nls.locAlize('schemA.indentAtionRules.increAseIndentPAttern.flAgs', 'The RegExp flAgs for increAseIndentPAttern.'),
							defAult: '',
							pAttern: '^([gimuy]+)$',
							pAtternErrorMessAge: nls.locAlize('schemA.indentAtionRules.increAseIndentPAttern.errorMessAge', 'Must mAtch the pAttern `/^([gimuy]+)$/`.')
						}
					}
				},
				decreAseIndentPAttern: {
					type: ['string', 'object'],
					description: nls.locAlize('schemA.indentAtionRules.decreAseIndentPAttern', 'If A line mAtches this pAttern, then All the lines After it should be unindented once (until Another rule mAtches).'),
					properties: {
						pAttern: {
							type: 'string',
							description: nls.locAlize('schemA.indentAtionRules.decreAseIndentPAttern.pAttern', 'The RegExp pAttern for decreAseIndentPAttern.'),
							defAult: '',
						},
						flAgs: {
							type: 'string',
							description: nls.locAlize('schemA.indentAtionRules.decreAseIndentPAttern.flAgs', 'The RegExp flAgs for decreAseIndentPAttern.'),
							defAult: '',
							pAttern: '^([gimuy]+)$',
							pAtternErrorMessAge: nls.locAlize('schemA.indentAtionRules.decreAseIndentPAttern.errorMessAge', 'Must mAtch the pAttern `/^([gimuy]+)$/`.')
						}
					}
				},
				indentNextLinePAttern: {
					type: ['string', 'object'],
					description: nls.locAlize('schemA.indentAtionRules.indentNextLinePAttern', 'If A line mAtches this pAttern, then **only the next line** After it should be indented once.'),
					properties: {
						pAttern: {
							type: 'string',
							description: nls.locAlize('schemA.indentAtionRules.indentNextLinePAttern.pAttern', 'The RegExp pAttern for indentNextLinePAttern.'),
							defAult: '',
						},
						flAgs: {
							type: 'string',
							description: nls.locAlize('schemA.indentAtionRules.indentNextLinePAttern.flAgs', 'The RegExp flAgs for indentNextLinePAttern.'),
							defAult: '',
							pAttern: '^([gimuy]+)$',
							pAtternErrorMessAge: nls.locAlize('schemA.indentAtionRules.indentNextLinePAttern.errorMessAge', 'Must mAtch the pAttern `/^([gimuy]+)$/`.')
						}
					}
				},
				unIndentedLinePAttern: {
					type: ['string', 'object'],
					description: nls.locAlize('schemA.indentAtionRules.unIndentedLinePAttern', 'If A line mAtches this pAttern, then its indentAtion should not be chAnged And it should not be evAluAted AgAinst the other rules.'),
					properties: {
						pAttern: {
							type: 'string',
							description: nls.locAlize('schemA.indentAtionRules.unIndentedLinePAttern.pAttern', 'The RegExp pAttern for unIndentedLinePAttern.'),
							defAult: '',
						},
						flAgs: {
							type: 'string',
							description: nls.locAlize('schemA.indentAtionRules.unIndentedLinePAttern.flAgs', 'The RegExp flAgs for unIndentedLinePAttern.'),
							defAult: '',
							pAttern: '^([gimuy]+)$',
							pAtternErrorMessAge: nls.locAlize('schemA.indentAtionRules.unIndentedLinePAttern.errorMessAge', 'Must mAtch the pAttern `/^([gimuy]+)$/`.')
						}
					}
				}
			}
		},
		folding: {
			type: 'object',
			description: nls.locAlize('schemA.folding', 'The lAnguAge\'s folding settings.'),
			properties: {
				offSide: {
					type: 'booleAn',
					description: nls.locAlize('schemA.folding.offSide', 'A lAnguAge Adheres to the off-side rule if blocks in thAt lAnguAge Are expressed by their indentAtion. If set, empty lines belong to the subsequent block.'),
				},
				mArkers: {
					type: 'object',
					description: nls.locAlize('schemA.folding.mArkers', 'LAnguAge specific folding mArkers such As \'#region\' And \'#endregion\'. The stArt And end regexes will be tested AgAinst the contents of All lines And must be designed efficiently'),
					properties: {
						stArt: {
							type: 'string',
							description: nls.locAlize('schemA.folding.mArkers.stArt', 'The RegExp pAttern for the stArt mArker. The regexp must stArt with \'^\'.')
						},
						end: {
							type: 'string',
							description: nls.locAlize('schemA.folding.mArkers.end', 'The RegExp pAttern for the end mArker. The regexp must stArt with \'^\'.')
						},
					}
				}
			}
		}

	}
};
let schemARegistry = Registry.As<IJSONContributionRegistry>(Extensions.JSONContribution);
schemARegistry.registerSchemA(schemAId, schemA);
