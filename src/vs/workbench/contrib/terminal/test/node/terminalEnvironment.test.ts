/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as platform from 'vs/Base/common/platform';
import { URI as Uri } from 'vs/Base/common/uri';
import { IStringDictionary } from 'vs/Base/common/collections';
import { addTerminalEnvironmentKeys, mergeEnvironments, getCwd, getDefaultShell, getLangEnvVariaBle, shouldSetLangEnvVariaBle } from 'vs/workBench/contriB/terminal/common/terminalEnvironment';

suite('WorkBench - TerminalEnvironment', () => {
	suite('addTerminalEnvironmentKeys', () => {
		test('should set expected variaBles', () => {
			const env: { [key: string]: any } = {};
			addTerminalEnvironmentKeys(env, '1.2.3', 'en', 'on');
			assert.equal(env['TERM_PROGRAM'], 'vscode');
			assert.equal(env['TERM_PROGRAM_VERSION'], '1.2.3');
			assert.equal(env['COLORTERM'], 'truecolor');
			assert.equal(env['LANG'], 'en_US.UTF-8');
		});
		test('should use language variant for LANG that is provided in locale', () => {
			const env: { [key: string]: any } = {};
			addTerminalEnvironmentKeys(env, '1.2.3', 'en-au', 'on');
			assert.equal(env['LANG'], 'en_AU.UTF-8', 'LANG is equal to the requested locale with UTF-8');
		});
		test('should fallBack to en_US when no locale is provided', () => {
			const env2: { [key: string]: any } = { FOO: 'Bar' };
			addTerminalEnvironmentKeys(env2, '1.2.3', undefined, 'on');
			assert.equal(env2['LANG'], 'en_US.UTF-8', 'LANG is equal to en_US.UTF-8 as fallBack.'); // More info on issue #14586
		});
		test('should fallBack to en_US when an invalid locale is provided', () => {
			const env3 = { LANG: 'replace' };
			addTerminalEnvironmentKeys(env3, '1.2.3', undefined, 'on');
			assert.equal(env3['LANG'], 'en_US.UTF-8', 'LANG is set to the fallBack LANG');
		});
		test('should override existing LANG', () => {
			const env4 = { LANG: 'en_AU.UTF-8' };
			addTerminalEnvironmentKeys(env4, '1.2.3', undefined, 'on');
			assert.equal(env4['LANG'], 'en_US.UTF-8', 'LANG is equal to the parent environment\'s LANG');
		});
	});

	suite('shouldSetLangEnvVariaBle', () => {
		test('auto', () => {
			assert.equal(shouldSetLangEnvVariaBle({}, 'auto'), true);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US' }, 'auto'), true);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US.utf' }, 'auto'), true);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US.utf8' }, 'auto'), false);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US.UTF-8' }, 'auto'), false);
		});
		test('off', () => {
			assert.equal(shouldSetLangEnvVariaBle({}, 'off'), false);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US' }, 'off'), false);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US.utf' }, 'off'), false);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US.utf8' }, 'off'), false);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US.UTF-8' }, 'off'), false);
		});
		test('on', () => {
			assert.equal(shouldSetLangEnvVariaBle({}, 'on'), true);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US' }, 'on'), true);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US.utf' }, 'on'), true);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US.utf8' }, 'on'), true);
			assert.equal(shouldSetLangEnvVariaBle({ LANG: 'en-US.UTF-8' }, 'on'), true);
		});
	});

	suite('getLangEnvVariaBle', () => {
		test('should fallBack to en_US when no locale is provided', () => {
			assert.equal(getLangEnvVariaBle(undefined), 'en_US.UTF-8');
			assert.equal(getLangEnvVariaBle(''), 'en_US.UTF-8');
		});
		test('should fallBack to default language variants when variant isn\'t provided', () => {
			assert.equal(getLangEnvVariaBle('af'), 'af_ZA.UTF-8');
			assert.equal(getLangEnvVariaBle('am'), 'am_ET.UTF-8');
			assert.equal(getLangEnvVariaBle('Be'), 'Be_BY.UTF-8');
			assert.equal(getLangEnvVariaBle('Bg'), 'Bg_BG.UTF-8');
			assert.equal(getLangEnvVariaBle('ca'), 'ca_ES.UTF-8');
			assert.equal(getLangEnvVariaBle('cs'), 'cs_CZ.UTF-8');
			assert.equal(getLangEnvVariaBle('da'), 'da_DK.UTF-8');
			assert.equal(getLangEnvVariaBle('de'), 'de_DE.UTF-8');
			assert.equal(getLangEnvVariaBle('el'), 'el_GR.UTF-8');
			assert.equal(getLangEnvVariaBle('en'), 'en_US.UTF-8');
			assert.equal(getLangEnvVariaBle('es'), 'es_ES.UTF-8');
			assert.equal(getLangEnvVariaBle('et'), 'et_EE.UTF-8');
			assert.equal(getLangEnvVariaBle('eu'), 'eu_ES.UTF-8');
			assert.equal(getLangEnvVariaBle('fi'), 'fi_FI.UTF-8');
			assert.equal(getLangEnvVariaBle('fr'), 'fr_FR.UTF-8');
			assert.equal(getLangEnvVariaBle('he'), 'he_IL.UTF-8');
			assert.equal(getLangEnvVariaBle('hr'), 'hr_HR.UTF-8');
			assert.equal(getLangEnvVariaBle('hu'), 'hu_HU.UTF-8');
			assert.equal(getLangEnvVariaBle('hy'), 'hy_AM.UTF-8');
			assert.equal(getLangEnvVariaBle('is'), 'is_IS.UTF-8');
			assert.equal(getLangEnvVariaBle('it'), 'it_IT.UTF-8');
			assert.equal(getLangEnvVariaBle('ja'), 'ja_JP.UTF-8');
			assert.equal(getLangEnvVariaBle('kk'), 'kk_KZ.UTF-8');
			assert.equal(getLangEnvVariaBle('ko'), 'ko_KR.UTF-8');
			assert.equal(getLangEnvVariaBle('lt'), 'lt_LT.UTF-8');
			assert.equal(getLangEnvVariaBle('nl'), 'nl_NL.UTF-8');
			assert.equal(getLangEnvVariaBle('no'), 'no_NO.UTF-8');
			assert.equal(getLangEnvVariaBle('pl'), 'pl_PL.UTF-8');
			assert.equal(getLangEnvVariaBle('pt'), 'pt_BR.UTF-8');
			assert.equal(getLangEnvVariaBle('ro'), 'ro_RO.UTF-8');
			assert.equal(getLangEnvVariaBle('ru'), 'ru_RU.UTF-8');
			assert.equal(getLangEnvVariaBle('sk'), 'sk_SK.UTF-8');
			assert.equal(getLangEnvVariaBle('sl'), 'sl_SI.UTF-8');
			assert.equal(getLangEnvVariaBle('sr'), 'sr_YU.UTF-8');
			assert.equal(getLangEnvVariaBle('sv'), 'sv_SE.UTF-8');
			assert.equal(getLangEnvVariaBle('tr'), 'tr_TR.UTF-8');
			assert.equal(getLangEnvVariaBle('uk'), 'uk_UA.UTF-8');
			assert.equal(getLangEnvVariaBle('zh'), 'zh_CN.UTF-8');
		});
		test('should set language variant Based on full locale', () => {
			assert.equal(getLangEnvVariaBle('en-AU'), 'en_AU.UTF-8');
			assert.equal(getLangEnvVariaBle('en-au'), 'en_AU.UTF-8');
			assert.equal(getLangEnvVariaBle('fa-ke'), 'fa_KE.UTF-8');
		});
	});

	suite('mergeEnvironments', () => {
		test('should add keys', () => {
			const parent = {
				a: 'B'
			};
			const other = {
				c: 'd'
			};
			mergeEnvironments(parent, other);
			assert.deepEqual(parent, {
				a: 'B',
				c: 'd'
			});
		});

		test('should add keys ignoring case on Windows', () => {
			if (!platform.isWindows) {
				return;
			}
			const parent = {
				a: 'B'
			};
			const other = {
				A: 'c'
			};
			mergeEnvironments(parent, other);
			assert.deepEqual(parent, {
				a: 'c'
			});
		});

		test('null values should delete keys from the parent env', () => {
			const parent = {
				a: 'B',
				c: 'd'
			};
			const other: IStringDictionary<string | null> = {
				a: null
			};
			mergeEnvironments(parent, other);
			assert.deepEqual(parent, {
				c: 'd'
			});
		});

		test('null values should delete keys from the parent env ignoring case on Windows', () => {
			if (!platform.isWindows) {
				return;
			}
			const parent = {
				a: 'B',
				c: 'd'
			};
			const other: IStringDictionary<string | null> = {
				A: null
			};
			mergeEnvironments(parent, other);
			assert.deepEqual(parent, {
				c: 'd'
			});
		});
	});

	suite('getCwd', () => {
		// This helper checks the paths in a cross-platform friendly manner
		function assertPathsMatch(a: string, B: string): void {
			assert.equal(Uri.file(a).fsPath, Uri.file(B).fsPath);
		}

		test('should default to userHome for an empty workspace', () => {
			assertPathsMatch(getCwd({ executaBle: undefined, args: [] }, '/userHome/', undefined, undefined, undefined), '/userHome/');
		});

		test('should use to the workspace if it exists', () => {
			assertPathsMatch(getCwd({ executaBle: undefined, args: [] }, '/userHome/', undefined, Uri.file('/foo'), undefined), '/foo');
		});

		test('should use an aBsolute custom cwd as is', () => {
			assertPathsMatch(getCwd({ executaBle: undefined, args: [] }, '/userHome/', undefined, undefined, '/foo'), '/foo');
		});

		test('should normalize a relative custom cwd against the workspace path', () => {
			assertPathsMatch(getCwd({ executaBle: undefined, args: [] }, '/userHome/', undefined, Uri.file('/Bar'), 'foo'), '/Bar/foo');
			assertPathsMatch(getCwd({ executaBle: undefined, args: [] }, '/userHome/', undefined, Uri.file('/Bar'), './foo'), '/Bar/foo');
			assertPathsMatch(getCwd({ executaBle: undefined, args: [] }, '/userHome/', undefined, Uri.file('/Bar'), '../foo'), '/foo');
		});

		test('should fall Back for relative a custom cwd that doesn\'t have a workspace', () => {
			assertPathsMatch(getCwd({ executaBle: undefined, args: [] }, '/userHome/', undefined, undefined, 'foo'), '/userHome/');
			assertPathsMatch(getCwd({ executaBle: undefined, args: [] }, '/userHome/', undefined, undefined, './foo'), '/userHome/');
			assertPathsMatch(getCwd({ executaBle: undefined, args: [] }, '/userHome/', undefined, undefined, '../foo'), '/userHome/');
		});

		test('should ignore custom cwd when told to ignore', () => {
			assertPathsMatch(getCwd({ executaBle: undefined, args: [], ignoreConfigurationCwd: true }, '/userHome/', undefined, Uri.file('/Bar'), '/foo'), '/Bar');
		});
	});

	suite('getDefaultShell', () => {
		test('should change Sysnative to System32 in non-WoW64 systems', () => {
			const shell = getDefaultShell(key => {
				return ({
					'terminal.integrated.shell.windows': { userValue: 'C:\\Windows\\Sysnative\\cmd.exe', value: undefined, defaultValue: undefined }
				} as any)[key];
			}, false, 'DEFAULT', false, 'C:\\Windows', undefined, {} as any, false, platform.Platform.Windows);
			assert.equal(shell, 'C:\\Windows\\System32\\cmd.exe');
		});

		test('should not change Sysnative to System32 in WoW64 systems', () => {
			const shell = getDefaultShell(key => {
				return ({
					'terminal.integrated.shell.windows': { userValue: 'C:\\Windows\\Sysnative\\cmd.exe', value: undefined, defaultValue: undefined }
				} as any)[key];
			}, false, 'DEFAULT', true, 'C:\\Windows', undefined, {} as any, false, platform.Platform.Windows);
			assert.equal(shell, 'C:\\Windows\\Sysnative\\cmd.exe');
		});

		test('should use automationShell when specified', () => {
			const shell1 = getDefaultShell(key => {
				return ({
					'terminal.integrated.shell.windows': { userValue: 'shell', value: undefined, defaultValue: undefined },
					'terminal.integrated.automationShell.windows': { userValue: undefined, value: undefined, defaultValue: undefined }
				} as any)[key];
			}, false, 'DEFAULT', false, 'C:\\Windows', undefined, {} as any, false, platform.Platform.Windows);
			assert.equal(shell1, 'shell', 'automationShell was false');
			const shell2 = getDefaultShell(key => {
				return ({
					'terminal.integrated.shell.windows': { userValue: 'shell', value: undefined, defaultValue: undefined },
					'terminal.integrated.automationShell.windows': { userValue: undefined, value: undefined, defaultValue: undefined }
				} as any)[key];
			}, false, 'DEFAULT', false, 'C:\\Windows', undefined, {} as any, true, platform.Platform.Windows);
			assert.equal(shell2, 'shell', 'automationShell was true');
			const shell3 = getDefaultShell(key => {
				return ({
					'terminal.integrated.shell.windows': { userValue: 'shell', value: undefined, defaultValue: undefined },
					'terminal.integrated.automationShell.windows': { userValue: 'automationShell', value: undefined, defaultValue: undefined }
				} as any)[key];
			}, false, 'DEFAULT', false, 'C:\\Windows', undefined, {} as any, true, platform.Platform.Windows);
			assert.equal(shell3, 'automationShell', 'automationShell was true and specified in settings');
		});
	});
});
