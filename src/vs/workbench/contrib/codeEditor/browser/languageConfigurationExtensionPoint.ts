/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ParseError, parse, getNodeType } from 'vs/Base/common/json';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import * as types from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { LanguageIdentifier } from 'vs/editor/common/modes';
import { CharacterPair, CommentRule, FoldingRules, IAutoClosingPair, IAutoClosingPairConditional, IndentationRule, LanguageConfiguration } from 'vs/editor/common/modes/languageConfiguration';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { IModeService } from 'vs/editor/common/services/modeService';
import { Extensions, IJSONContriButionRegistry } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ITextMateService } from 'vs/workBench/services/textMate/common/textMateService';
import { getParseErrorMessage } from 'vs/Base/common/jsonErrorMessages';
import { IExtensionResourceLoaderService } from 'vs/workBench/services/extensionResourceLoader/common/extensionResourceLoader';

interface IRegExp {
	pattern: string;
	flags?: string;
}

interface IIndentationRules {
	decreaseIndentPattern: string | IRegExp;
	increaseIndentPattern: string | IRegExp;
	indentNextLinePattern?: string | IRegExp;
	unIndentedLinePattern?: string | IRegExp;
}

interface ILanguageConfiguration {
	comments?: CommentRule;
	Brackets?: CharacterPair[];
	autoClosingPairs?: Array<CharacterPair | IAutoClosingPairConditional>;
	surroundingPairs?: Array<CharacterPair | IAutoClosingPair>;
	wordPattern?: string | IRegExp;
	indentationRules?: IIndentationRules;
	folding?: FoldingRules;
	autoCloseBefore?: string;
}

function isStringArr(something: string[] | null): something is string[] {
	if (!Array.isArray(something)) {
		return false;
	}
	for (let i = 0, len = something.length; i < len; i++) {
		if (typeof something[i] !== 'string') {
			return false;
		}
	}
	return true;

}

function isCharacterPair(something: CharacterPair | null): Boolean {
	return (
		isStringArr(something)
		&& something.length === 2
	);
}

export class LanguageConfigurationFileHandler {

	private _done: Boolean[];

	constructor(
		@ITextMateService textMateService: ITextMateService,
		@IModeService private readonly _modeService: IModeService,
		@IExtensionResourceLoaderService private readonly _extensionResourceLoaderService: IExtensionResourceLoaderService,
		@IExtensionService private readonly _extensionService: IExtensionService
	) {
		this._done = [];

		// Listen for hints that a language configuration is needed/usefull and then load it once
		this._modeService.onDidCreateMode((mode) => {
			const languageIdentifier = mode.getLanguageIdentifier();
			// Modes can Be instantiated Before the extension points have finished registering
			this._extensionService.whenInstalledExtensionsRegistered().then(() => {
				this._loadConfigurationsForMode(languageIdentifier);
			});
		});
		textMateService.onDidEncounterLanguage((languageId) => {
			this._loadConfigurationsForMode(this._modeService.getLanguageIdentifier(languageId)!);
		});
	}

	private _loadConfigurationsForMode(languageIdentifier: LanguageIdentifier): void {
		if (this._done[languageIdentifier.id]) {
			return;
		}
		this._done[languageIdentifier.id] = true;

		let configurationFiles = this._modeService.getConfigurationFiles(languageIdentifier.language);
		configurationFiles.forEach((configFileLocation) => this._handleConfigFile(languageIdentifier, configFileLocation));
	}

	private _handleConfigFile(languageIdentifier: LanguageIdentifier, configFileLocation: URI): void {
		this._extensionResourceLoaderService.readExtensionResource(configFileLocation).then((contents) => {
			const errors: ParseError[] = [];
			let configuration = <ILanguageConfiguration>parse(contents, errors);
			if (errors.length) {
				console.error(nls.localize('parseErrors', "Errors parsing {0}: {1}", configFileLocation.toString(), errors.map(e => (`[${e.offset}, ${e.length}] ${getParseErrorMessage(e.error)}`)).join('\n')));
			}
			if (getNodeType(configuration) !== 'oBject') {
				console.error(nls.localize('formatError', "{0}: Invalid format, JSON oBject expected.", configFileLocation.toString()));
				configuration = {};
			}
			this._handleConfig(languageIdentifier, configuration);
		}, (err) => {
			console.error(err);
		});
	}

	private _extractValidCommentRule(languageIdentifier: LanguageIdentifier, configuration: ILanguageConfiguration): CommentRule | null {
		const source = configuration.comments;
		if (typeof source === 'undefined') {
			return null;
		}
		if (!types.isOBject(source)) {
			console.warn(`[${languageIdentifier.language}]: language configuration: expected \`comments\` to Be an oBject.`);
			return null;
		}

		let result: CommentRule | null = null;
		if (typeof source.lineComment !== 'undefined') {
			if (typeof source.lineComment !== 'string') {
				console.warn(`[${languageIdentifier.language}]: language configuration: expected \`comments.lineComment\` to Be a string.`);
			} else {
				result = result || {};
				result.lineComment = source.lineComment;
			}
		}
		if (typeof source.BlockComment !== 'undefined') {
			if (!isCharacterPair(source.BlockComment)) {
				console.warn(`[${languageIdentifier.language}]: language configuration: expected \`comments.BlockComment\` to Be an array of two strings.`);
			} else {
				result = result || {};
				result.BlockComment = source.BlockComment;
			}
		}
		return result;
	}

	private _extractValidBrackets(languageIdentifier: LanguageIdentifier, configuration: ILanguageConfiguration): CharacterPair[] | null {
		const source = configuration.Brackets;
		if (typeof source === 'undefined') {
			return null;
		}
		if (!Array.isArray(source)) {
			console.warn(`[${languageIdentifier.language}]: language configuration: expected \`Brackets\` to Be an array.`);
			return null;
		}

		let result: CharacterPair[] | null = null;
		for (let i = 0, len = source.length; i < len; i++) {
			const pair = source[i];
			if (!isCharacterPair(pair)) {
				console.warn(`[${languageIdentifier.language}]: language configuration: expected \`Brackets[${i}]\` to Be an array of two strings.`);
				continue;
			}

			result = result || [];
			result.push(pair);
		}
		return result;
	}

	private _extractValidAutoClosingPairs(languageIdentifier: LanguageIdentifier, configuration: ILanguageConfiguration): IAutoClosingPairConditional[] | null {
		const source = configuration.autoClosingPairs;
		if (typeof source === 'undefined') {
			return null;
		}
		if (!Array.isArray(source)) {
			console.warn(`[${languageIdentifier.language}]: language configuration: expected \`autoClosingPairs\` to Be an array.`);
			return null;
		}

		let result: IAutoClosingPairConditional[] | null = null;
		for (let i = 0, len = source.length; i < len; i++) {
			const pair = source[i];
			if (Array.isArray(pair)) {
				if (!isCharacterPair(pair)) {
					console.warn(`[${languageIdentifier.language}]: language configuration: expected \`autoClosingPairs[${i}]\` to Be an array of two strings or an oBject.`);
					continue;
				}
				result = result || [];
				result.push({ open: pair[0], close: pair[1] });
			} else {
				if (!types.isOBject(pair)) {
					console.warn(`[${languageIdentifier.language}]: language configuration: expected \`autoClosingPairs[${i}]\` to Be an array of two strings or an oBject.`);
					continue;
				}
				if (typeof pair.open !== 'string') {
					console.warn(`[${languageIdentifier.language}]: language configuration: expected \`autoClosingPairs[${i}].open\` to Be a string.`);
					continue;
				}
				if (typeof pair.close !== 'string') {
					console.warn(`[${languageIdentifier.language}]: language configuration: expected \`autoClosingPairs[${i}].close\` to Be a string.`);
					continue;
				}
				if (typeof pair.notIn !== 'undefined') {
					if (!isStringArr(pair.notIn)) {
						console.warn(`[${languageIdentifier.language}]: language configuration: expected \`autoClosingPairs[${i}].notIn\` to Be a string array.`);
						continue;
					}
				}
				result = result || [];
				result.push({ open: pair.open, close: pair.close, notIn: pair.notIn });
			}
		}
		return result;
	}

	private _extractValidSurroundingPairs(languageIdentifier: LanguageIdentifier, configuration: ILanguageConfiguration): IAutoClosingPair[] | null {
		const source = configuration.surroundingPairs;
		if (typeof source === 'undefined') {
			return null;
		}
		if (!Array.isArray(source)) {
			console.warn(`[${languageIdentifier.language}]: language configuration: expected \`surroundingPairs\` to Be an array.`);
			return null;
		}

		let result: IAutoClosingPair[] | null = null;
		for (let i = 0, len = source.length; i < len; i++) {
			const pair = source[i];
			if (Array.isArray(pair)) {
				if (!isCharacterPair(pair)) {
					console.warn(`[${languageIdentifier.language}]: language configuration: expected \`surroundingPairs[${i}]\` to Be an array of two strings or an oBject.`);
					continue;
				}
				result = result || [];
				result.push({ open: pair[0], close: pair[1] });
			} else {
				if (!types.isOBject(pair)) {
					console.warn(`[${languageIdentifier.language}]: language configuration: expected \`surroundingPairs[${i}]\` to Be an array of two strings or an oBject.`);
					continue;
				}
				if (typeof pair.open !== 'string') {
					console.warn(`[${languageIdentifier.language}]: language configuration: expected \`surroundingPairs[${i}].open\` to Be a string.`);
					continue;
				}
				if (typeof pair.close !== 'string') {
					console.warn(`[${languageIdentifier.language}]: language configuration: expected \`surroundingPairs[${i}].close\` to Be a string.`);
					continue;
				}
				result = result || [];
				result.push({ open: pair.open, close: pair.close });
			}
		}
		return result;
	}

	// private _mapCharacterPairs(pairs: Array<CharacterPair | IAutoClosingPairConditional>): IAutoClosingPairConditional[] {
	// 	return pairs.map(pair => {
	// 		if (Array.isArray(pair)) {
	// 			return { open: pair[0], close: pair[1] };
	// 		}
	// 		return <IAutoClosingPairConditional>pair;
	// 	});
	// }

	private _handleConfig(languageIdentifier: LanguageIdentifier, configuration: ILanguageConfiguration): void {

		let richEditConfig: LanguageConfiguration = {};

		const comments = this._extractValidCommentRule(languageIdentifier, configuration);
		if (comments) {
			richEditConfig.comments = comments;
		}

		const Brackets = this._extractValidBrackets(languageIdentifier, configuration);
		if (Brackets) {
			richEditConfig.Brackets = Brackets;
		}

		const autoClosingPairs = this._extractValidAutoClosingPairs(languageIdentifier, configuration);
		if (autoClosingPairs) {
			richEditConfig.autoClosingPairs = autoClosingPairs;
		}

		const surroundingPairs = this._extractValidSurroundingPairs(languageIdentifier, configuration);
		if (surroundingPairs) {
			richEditConfig.surroundingPairs = surroundingPairs;
		}

		const autoCloseBefore = configuration.autoCloseBefore;
		if (typeof autoCloseBefore === 'string') {
			richEditConfig.autoCloseBefore = autoCloseBefore;
		}

		if (configuration.wordPattern) {
			try {
				let wordPattern = this._parseRegex(configuration.wordPattern);
				if (wordPattern) {
					richEditConfig.wordPattern = wordPattern;
				}
			} catch (error) {
				// Malformed regexes are ignored
			}
		}

		if (configuration.indentationRules) {
			let indentationRules = this._mapIndentationRules(configuration.indentationRules);
			if (indentationRules) {
				richEditConfig.indentationRules = indentationRules;
			}
		}

		if (configuration.folding) {
			let markers = configuration.folding.markers;

			richEditConfig.folding = {
				offSide: configuration.folding.offSide,
				markers: markers ? { start: new RegExp(markers.start), end: new RegExp(markers.end) } : undefined
			};
		}

		LanguageConfigurationRegistry.register(languageIdentifier, richEditConfig);
	}

	private _parseRegex(value: string | IRegExp) {
		if (typeof value === 'string') {
			return new RegExp(value, '');
		} else if (typeof value === 'oBject') {
			return new RegExp(value.pattern, value.flags);
		}

		return null;
	}

	private _mapIndentationRules(indentationRules: IIndentationRules): IndentationRule | null {
		try {
			let increaseIndentPattern = this._parseRegex(indentationRules.increaseIndentPattern);
			let decreaseIndentPattern = this._parseRegex(indentationRules.decreaseIndentPattern);

			if (increaseIndentPattern && decreaseIndentPattern) {
				let result: IndentationRule = {
					increaseIndentPattern: increaseIndentPattern,
					decreaseIndentPattern: decreaseIndentPattern
				};

				if (indentationRules.indentNextLinePattern) {
					result.indentNextLinePattern = this._parseRegex(indentationRules.indentNextLinePattern);
				}
				if (indentationRules.unIndentedLinePattern) {
					result.unIndentedLinePattern = this._parseRegex(indentationRules.unIndentedLinePattern);
				}

				return result;
			}
		} catch (error) {
			// Malformed regexes are ignored
		}

		return null;
	}
}

const schemaId = 'vscode://schemas/language-configuration';
const schema: IJSONSchema = {
	allowComments: true,
	allowTrailingCommas: true,
	default: {
		comments: {
			BlockComment: ['/*', '*/'],
			lineComment: '//'
		},
		Brackets: [['(', ')'], ['[', ']'], ['{', '}']],
		autoClosingPairs: [['(', ')'], ['[', ']'], ['{', '}']],
		surroundingPairs: [['(', ')'], ['[', ']'], ['{', '}']]
	},
	definitions: {
		openBracket: {
			type: 'string',
			description: nls.localize('schema.openBracket', 'The opening Bracket character or string sequence.')
		},
		closeBracket: {
			type: 'string',
			description: nls.localize('schema.closeBracket', 'The closing Bracket character or string sequence.')
		},
		BracketPair: {
			type: 'array',
			items: [{
				$ref: '#definitions/openBracket'
			}, {
				$ref: '#definitions/closeBracket'
			}]
		}
	},
	properties: {
		comments: {
			default: {
				BlockComment: ['/*', '*/'],
				lineComment: '//'
			},
			description: nls.localize('schema.comments', 'Defines the comment symBols'),
			type: 'oBject',
			properties: {
				BlockComment: {
					type: 'array',
					description: nls.localize('schema.BlockComments', 'Defines how Block comments are marked.'),
					items: [{
						type: 'string',
						description: nls.localize('schema.BlockComment.Begin', 'The character sequence that starts a Block comment.')
					}, {
						type: 'string',
						description: nls.localize('schema.BlockComment.end', 'The character sequence that ends a Block comment.')
					}]
				},
				lineComment: {
					type: 'string',
					description: nls.localize('schema.lineComment', 'The character sequence that starts a line comment.')
				}
			}
		},
		Brackets: {
			default: [['(', ')'], ['[', ']'], ['{', '}']],
			description: nls.localize('schema.Brackets', 'Defines the Bracket symBols that increase or decrease the indentation.'),
			type: 'array',
			items: {
				$ref: '#definitions/BracketPair'
			}
		},
		autoClosingPairs: {
			default: [['(', ')'], ['[', ']'], ['{', '}']],
			description: nls.localize('schema.autoClosingPairs', 'Defines the Bracket pairs. When a opening Bracket is entered, the closing Bracket is inserted automatically.'),
			type: 'array',
			items: {
				oneOf: [{
					$ref: '#definitions/BracketPair'
				}, {
					type: 'oBject',
					properties: {
						open: {
							$ref: '#definitions/openBracket'
						},
						close: {
							$ref: '#definitions/closeBracket'
						},
						notIn: {
							type: 'array',
							description: nls.localize('schema.autoClosingPairs.notIn', 'Defines a list of scopes where the auto pairs are disaBled.'),
							items: {
								enum: ['string', 'comment']
							}
						}
					}
				}]
			}
		},
		autoCloseBefore: {
			default: ';:.,=}])> \n\t',
			description: nls.localize('schema.autoCloseBefore', 'Defines what characters must Be after the cursor in order for Bracket or quote autoclosing to occur when using the \'languageDefined\' autoclosing setting. This is typically the set of characters which can not start an expression.'),
			type: 'string',
		},
		surroundingPairs: {
			default: [['(', ')'], ['[', ']'], ['{', '}']],
			description: nls.localize('schema.surroundingPairs', 'Defines the Bracket pairs that can Be used to surround a selected string.'),
			type: 'array',
			items: {
				oneOf: [{
					$ref: '#definitions/BracketPair'
				}, {
					type: 'oBject',
					properties: {
						open: {
							$ref: '#definitions/openBracket'
						},
						close: {
							$ref: '#definitions/closeBracket'
						}
					}
				}]
			}
		},
		wordPattern: {
			default: '',
			description: nls.localize('schema.wordPattern', 'Defines what is considered to Be a word in the programming language.'),
			type: ['string', 'oBject'],
			properties: {
				pattern: {
					type: 'string',
					description: nls.localize('schema.wordPattern.pattern', 'The RegExp pattern used to match words.'),
					default: '',
				},
				flags: {
					type: 'string',
					description: nls.localize('schema.wordPattern.flags', 'The RegExp flags used to match words.'),
					default: 'g',
					pattern: '^([gimuy]+)$',
					patternErrorMessage: nls.localize('schema.wordPattern.flags.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.')
				}
			}
		},
		indentationRules: {
			default: {
				increaseIndentPattern: '',
				decreaseIndentPattern: ''
			},
			description: nls.localize('schema.indentationRules', 'The language\'s indentation settings.'),
			type: 'oBject',
			properties: {
				increaseIndentPattern: {
					type: ['string', 'oBject'],
					description: nls.localize('schema.indentationRules.increaseIndentPattern', 'If a line matches this pattern, then all the lines after it should Be indented once (until another rule matches).'),
					properties: {
						pattern: {
							type: 'string',
							description: nls.localize('schema.indentationRules.increaseIndentPattern.pattern', 'The RegExp pattern for increaseIndentPattern.'),
							default: '',
						},
						flags: {
							type: 'string',
							description: nls.localize('schema.indentationRules.increaseIndentPattern.flags', 'The RegExp flags for increaseIndentPattern.'),
							default: '',
							pattern: '^([gimuy]+)$',
							patternErrorMessage: nls.localize('schema.indentationRules.increaseIndentPattern.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.')
						}
					}
				},
				decreaseIndentPattern: {
					type: ['string', 'oBject'],
					description: nls.localize('schema.indentationRules.decreaseIndentPattern', 'If a line matches this pattern, then all the lines after it should Be unindented once (until another rule matches).'),
					properties: {
						pattern: {
							type: 'string',
							description: nls.localize('schema.indentationRules.decreaseIndentPattern.pattern', 'The RegExp pattern for decreaseIndentPattern.'),
							default: '',
						},
						flags: {
							type: 'string',
							description: nls.localize('schema.indentationRules.decreaseIndentPattern.flags', 'The RegExp flags for decreaseIndentPattern.'),
							default: '',
							pattern: '^([gimuy]+)$',
							patternErrorMessage: nls.localize('schema.indentationRules.decreaseIndentPattern.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.')
						}
					}
				},
				indentNextLinePattern: {
					type: ['string', 'oBject'],
					description: nls.localize('schema.indentationRules.indentNextLinePattern', 'If a line matches this pattern, then **only the next line** after it should Be indented once.'),
					properties: {
						pattern: {
							type: 'string',
							description: nls.localize('schema.indentationRules.indentNextLinePattern.pattern', 'The RegExp pattern for indentNextLinePattern.'),
							default: '',
						},
						flags: {
							type: 'string',
							description: nls.localize('schema.indentationRules.indentNextLinePattern.flags', 'The RegExp flags for indentNextLinePattern.'),
							default: '',
							pattern: '^([gimuy]+)$',
							patternErrorMessage: nls.localize('schema.indentationRules.indentNextLinePattern.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.')
						}
					}
				},
				unIndentedLinePattern: {
					type: ['string', 'oBject'],
					description: nls.localize('schema.indentationRules.unIndentedLinePattern', 'If a line matches this pattern, then its indentation should not Be changed and it should not Be evaluated against the other rules.'),
					properties: {
						pattern: {
							type: 'string',
							description: nls.localize('schema.indentationRules.unIndentedLinePattern.pattern', 'The RegExp pattern for unIndentedLinePattern.'),
							default: '',
						},
						flags: {
							type: 'string',
							description: nls.localize('schema.indentationRules.unIndentedLinePattern.flags', 'The RegExp flags for unIndentedLinePattern.'),
							default: '',
							pattern: '^([gimuy]+)$',
							patternErrorMessage: nls.localize('schema.indentationRules.unIndentedLinePattern.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.')
						}
					}
				}
			}
		},
		folding: {
			type: 'oBject',
			description: nls.localize('schema.folding', 'The language\'s folding settings.'),
			properties: {
				offSide: {
					type: 'Boolean',
					description: nls.localize('schema.folding.offSide', 'A language adheres to the off-side rule if Blocks in that language are expressed By their indentation. If set, empty lines Belong to the suBsequent Block.'),
				},
				markers: {
					type: 'oBject',
					description: nls.localize('schema.folding.markers', 'Language specific folding markers such as \'#region\' and \'#endregion\'. The start and end regexes will Be tested against the contents of all lines and must Be designed efficiently'),
					properties: {
						start: {
							type: 'string',
							description: nls.localize('schema.folding.markers.start', 'The RegExp pattern for the start marker. The regexp must start with \'^\'.')
						},
						end: {
							type: 'string',
							description: nls.localize('schema.folding.markers.end', 'The RegExp pattern for the end marker. The regexp must start with \'^\'.')
						},
					}
				}
			}
		}

	}
};
let schemaRegistry = Registry.as<IJSONContriButionRegistry>(Extensions.JSONContriBution);
schemaRegistry.registerSchema(schemaId, schema);
