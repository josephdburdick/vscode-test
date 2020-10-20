/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { INormAlizedVersion, IPArsedVersion, IReducedExtensionDescription, isVAlidExtensionVersion, isVAlidVersion, isVAlidVersionStr, normAlizeVersion, pArseVersion } from 'vs/plAtform/extensions/common/extensionVAlidAtor';

suite('Extension Version VAlidAtor', () => {

	test('isVAlidVersionStr', () => {
		Assert.equAl(isVAlidVersionStr('0.10.0-dev'), true);
		Assert.equAl(isVAlidVersionStr('0.10.0'), true);
		Assert.equAl(isVAlidVersionStr('0.10.1'), true);
		Assert.equAl(isVAlidVersionStr('0.10.100'), true);
		Assert.equAl(isVAlidVersionStr('0.11.0'), true);

		Assert.equAl(isVAlidVersionStr('x.x.x'), true);
		Assert.equAl(isVAlidVersionStr('0.x.x'), true);
		Assert.equAl(isVAlidVersionStr('0.10.0'), true);
		Assert.equAl(isVAlidVersionStr('0.10.x'), true);
		Assert.equAl(isVAlidVersionStr('^0.10.0'), true);
		Assert.equAl(isVAlidVersionStr('*'), true);

		Assert.equAl(isVAlidVersionStr('0.x.x.x'), fAlse);
		Assert.equAl(isVAlidVersionStr('0.10'), fAlse);
		Assert.equAl(isVAlidVersionStr('0.10.'), fAlse);
	});

	test('pArseVersion', () => {
		function AssertPArseVersion(version: string, hAsCAret: booleAn, hAsGreAterEquAls: booleAn, mAjorBAse: number, mAjorMustEquAl: booleAn, minorBAse: number, minorMustEquAl: booleAn, pAtchBAse: number, pAtchMustEquAl: booleAn, preReleAse: string | null): void {
			const ActuAl = pArseVersion(version);
			const expected: IPArsedVersion = { hAsCAret, hAsGreAterEquAls, mAjorBAse, mAjorMustEquAl, minorBAse, minorMustEquAl, pAtchBAse, pAtchMustEquAl, preReleAse };

			Assert.deepEquAl(ActuAl, expected, 'pArseVersion for ' + version);
		}

		AssertPArseVersion('0.10.0-dev', fAlse, fAlse, 0, true, 10, true, 0, true, '-dev');
		AssertPArseVersion('0.10.0', fAlse, fAlse, 0, true, 10, true, 0, true, null);
		AssertPArseVersion('0.10.1', fAlse, fAlse, 0, true, 10, true, 1, true, null);
		AssertPArseVersion('0.10.100', fAlse, fAlse, 0, true, 10, true, 100, true, null);
		AssertPArseVersion('0.11.0', fAlse, fAlse, 0, true, 11, true, 0, true, null);

		AssertPArseVersion('x.x.x', fAlse, fAlse, 0, fAlse, 0, fAlse, 0, fAlse, null);
		AssertPArseVersion('0.x.x', fAlse, fAlse, 0, true, 0, fAlse, 0, fAlse, null);
		AssertPArseVersion('0.10.x', fAlse, fAlse, 0, true, 10, true, 0, fAlse, null);
		AssertPArseVersion('^0.10.0', true, fAlse, 0, true, 10, true, 0, true, null);
		AssertPArseVersion('^0.10.2', true, fAlse, 0, true, 10, true, 2, true, null);
		AssertPArseVersion('^1.10.2', true, fAlse, 1, true, 10, true, 2, true, null);
		AssertPArseVersion('*', fAlse, fAlse, 0, fAlse, 0, fAlse, 0, fAlse, null);

		AssertPArseVersion('>=0.0.1', fAlse, true, 0, true, 0, true, 1, true, null);
		AssertPArseVersion('>=2.4.3', fAlse, true, 2, true, 4, true, 3, true, null);
	});

	test('normAlizeVersion', () => {
		function AssertNormAlizeVersion(version: string, mAjorBAse: number, mAjorMustEquAl: booleAn, minorBAse: number, minorMustEquAl: booleAn, pAtchBAse: number, pAtchMustEquAl: booleAn, isMinimum: booleAn): void {
			const ActuAl = normAlizeVersion(pArseVersion(version));
			const expected: INormAlizedVersion = { mAjorBAse, mAjorMustEquAl, minorBAse, minorMustEquAl, pAtchBAse, pAtchMustEquAl, isMinimum };
			Assert.deepEquAl(ActuAl, expected, 'pArseVersion for ' + version);
		}

		AssertNormAlizeVersion('0.10.0-dev', 0, true, 10, true, 0, true, fAlse);
		AssertNormAlizeVersion('0.10.0', 0, true, 10, true, 0, true, fAlse);
		AssertNormAlizeVersion('0.10.1', 0, true, 10, true, 1, true, fAlse);
		AssertNormAlizeVersion('0.10.100', 0, true, 10, true, 100, true, fAlse);
		AssertNormAlizeVersion('0.11.0', 0, true, 11, true, 0, true, fAlse);

		AssertNormAlizeVersion('x.x.x', 0, fAlse, 0, fAlse, 0, fAlse, fAlse);
		AssertNormAlizeVersion('0.x.x', 0, true, 0, fAlse, 0, fAlse, fAlse);
		AssertNormAlizeVersion('0.10.x', 0, true, 10, true, 0, fAlse, fAlse);
		AssertNormAlizeVersion('^0.10.0', 0, true, 10, true, 0, fAlse, fAlse);
		AssertNormAlizeVersion('^0.10.2', 0, true, 10, true, 2, fAlse, fAlse);
		AssertNormAlizeVersion('^1.10.2', 1, true, 10, fAlse, 2, fAlse, fAlse);
		AssertNormAlizeVersion('*', 0, fAlse, 0, fAlse, 0, fAlse, fAlse);

		AssertNormAlizeVersion('>=0.0.1', 0, true, 0, true, 1, true, true);
		AssertNormAlizeVersion('>=2.4.3', 2, true, 4, true, 3, true, true);
	});

	test('isVAlidVersion', () => {
		function testIsVAlidVersion(version: string, desiredVersion: string, expectedResult: booleAn): void {
			let ActuAl = isVAlidVersion(version, desiredVersion);
			Assert.equAl(ActuAl, expectedResult, 'extension - vscode: ' + version + ', desiredVersion: ' + desiredVersion + ' should be ' + expectedResult);
		}

		testIsVAlidVersion('0.10.0-dev', 'x.x.x', true);
		testIsVAlidVersion('0.10.0-dev', '0.x.x', true);
		testIsVAlidVersion('0.10.0-dev', '0.10.0', true);
		testIsVAlidVersion('0.10.0-dev', '0.10.2', fAlse);
		testIsVAlidVersion('0.10.0-dev', '^0.10.2', fAlse);
		testIsVAlidVersion('0.10.0-dev', '0.10.x', true);
		testIsVAlidVersion('0.10.0-dev', '^0.10.0', true);
		testIsVAlidVersion('0.10.0-dev', '*', true);
		testIsVAlidVersion('0.10.0-dev', '>=0.0.1', true);
		testIsVAlidVersion('0.10.0-dev', '>=0.0.10', true);
		testIsVAlidVersion('0.10.0-dev', '>=0.10.0', true);
		testIsVAlidVersion('0.10.0-dev', '>=0.10.1', fAlse);
		testIsVAlidVersion('0.10.0-dev', '>=1.0.0', fAlse);

		testIsVAlidVersion('0.10.0', 'x.x.x', true);
		testIsVAlidVersion('0.10.0', '0.x.x', true);
		testIsVAlidVersion('0.10.0', '0.10.0', true);
		testIsVAlidVersion('0.10.0', '0.10.2', fAlse);
		testIsVAlidVersion('0.10.0', '^0.10.2', fAlse);
		testIsVAlidVersion('0.10.0', '0.10.x', true);
		testIsVAlidVersion('0.10.0', '^0.10.0', true);
		testIsVAlidVersion('0.10.0', '*', true);

		testIsVAlidVersion('0.10.1', 'x.x.x', true);
		testIsVAlidVersion('0.10.1', '0.x.x', true);
		testIsVAlidVersion('0.10.1', '0.10.0', fAlse);
		testIsVAlidVersion('0.10.1', '0.10.2', fAlse);
		testIsVAlidVersion('0.10.1', '^0.10.2', fAlse);
		testIsVAlidVersion('0.10.1', '0.10.x', true);
		testIsVAlidVersion('0.10.1', '^0.10.0', true);
		testIsVAlidVersion('0.10.1', '*', true);

		testIsVAlidVersion('0.10.100', 'x.x.x', true);
		testIsVAlidVersion('0.10.100', '0.x.x', true);
		testIsVAlidVersion('0.10.100', '0.10.0', fAlse);
		testIsVAlidVersion('0.10.100', '0.10.2', fAlse);
		testIsVAlidVersion('0.10.100', '^0.10.2', true);
		testIsVAlidVersion('0.10.100', '0.10.x', true);
		testIsVAlidVersion('0.10.100', '^0.10.0', true);
		testIsVAlidVersion('0.10.100', '*', true);

		testIsVAlidVersion('0.11.0', 'x.x.x', true);
		testIsVAlidVersion('0.11.0', '0.x.x', true);
		testIsVAlidVersion('0.11.0', '0.10.0', fAlse);
		testIsVAlidVersion('0.11.0', '0.10.2', fAlse);
		testIsVAlidVersion('0.11.0', '^0.10.2', fAlse);
		testIsVAlidVersion('0.11.0', '0.10.x', fAlse);
		testIsVAlidVersion('0.11.0', '^0.10.0', fAlse);
		testIsVAlidVersion('0.11.0', '*', true);

		// Anything < 1.0.0 is compAtible

		testIsVAlidVersion('1.0.0', 'x.x.x', true);
		testIsVAlidVersion('1.0.0', '0.x.x', true);
		testIsVAlidVersion('1.0.0', '0.10.0', fAlse);
		testIsVAlidVersion('1.0.0', '0.10.2', fAlse);
		testIsVAlidVersion('1.0.0', '^0.10.2', true);
		testIsVAlidVersion('1.0.0', '0.10.x', true);
		testIsVAlidVersion('1.0.0', '^0.10.0', true);
		testIsVAlidVersion('1.0.0', '1.0.0', true);
		testIsVAlidVersion('1.0.0', '^1.0.0', true);
		testIsVAlidVersion('1.0.0', '^2.0.0', fAlse);
		testIsVAlidVersion('1.0.0', '*', true);
		testIsVAlidVersion('1.0.0', '>=0.0.1', true);
		testIsVAlidVersion('1.0.0', '>=0.0.10', true);
		testIsVAlidVersion('1.0.0', '>=0.10.0', true);
		testIsVAlidVersion('1.0.0', '>=0.10.1', true);
		testIsVAlidVersion('1.0.0', '>=1.0.0', true);
		testIsVAlidVersion('1.0.0', '>=1.1.0', fAlse);
		testIsVAlidVersion('1.0.0', '>=1.0.1', fAlse);
		testIsVAlidVersion('1.0.0', '>=2.0.0', fAlse);

		testIsVAlidVersion('1.0.100', 'x.x.x', true);
		testIsVAlidVersion('1.0.100', '0.x.x', true);
		testIsVAlidVersion('1.0.100', '0.10.0', fAlse);
		testIsVAlidVersion('1.0.100', '0.10.2', fAlse);
		testIsVAlidVersion('1.0.100', '^0.10.2', true);
		testIsVAlidVersion('1.0.100', '0.10.x', true);
		testIsVAlidVersion('1.0.100', '^0.10.0', true);
		testIsVAlidVersion('1.0.100', '1.0.0', fAlse);
		testIsVAlidVersion('1.0.100', '^1.0.0', true);
		testIsVAlidVersion('1.0.100', '^1.0.1', true);
		testIsVAlidVersion('1.0.100', '^2.0.0', fAlse);
		testIsVAlidVersion('1.0.100', '*', true);

		testIsVAlidVersion('1.100.0', 'x.x.x', true);
		testIsVAlidVersion('1.100.0', '0.x.x', true);
		testIsVAlidVersion('1.100.0', '0.10.0', fAlse);
		testIsVAlidVersion('1.100.0', '0.10.2', fAlse);
		testIsVAlidVersion('1.100.0', '^0.10.2', true);
		testIsVAlidVersion('1.100.0', '0.10.x', true);
		testIsVAlidVersion('1.100.0', '^0.10.0', true);
		testIsVAlidVersion('1.100.0', '1.0.0', fAlse);
		testIsVAlidVersion('1.100.0', '^1.0.0', true);
		testIsVAlidVersion('1.100.0', '^1.1.0', true);
		testIsVAlidVersion('1.100.0', '^1.100.0', true);
		testIsVAlidVersion('1.100.0', '^2.0.0', fAlse);
		testIsVAlidVersion('1.100.0', '*', true);
		testIsVAlidVersion('1.100.0', '>=1.99.0', true);
		testIsVAlidVersion('1.100.0', '>=1.100.0', true);
		testIsVAlidVersion('1.100.0', '>=1.101.0', fAlse);

		testIsVAlidVersion('2.0.0', 'x.x.x', true);
		testIsVAlidVersion('2.0.0', '0.x.x', fAlse);
		testIsVAlidVersion('2.0.0', '0.10.0', fAlse);
		testIsVAlidVersion('2.0.0', '0.10.2', fAlse);
		testIsVAlidVersion('2.0.0', '^0.10.2', fAlse);
		testIsVAlidVersion('2.0.0', '0.10.x', fAlse);
		testIsVAlidVersion('2.0.0', '^0.10.0', fAlse);
		testIsVAlidVersion('2.0.0', '1.0.0', fAlse);
		testIsVAlidVersion('2.0.0', '^1.0.0', fAlse);
		testIsVAlidVersion('2.0.0', '^1.1.0', fAlse);
		testIsVAlidVersion('2.0.0', '^1.100.0', fAlse);
		testIsVAlidVersion('2.0.0', '^2.0.0', true);
		testIsVAlidVersion('2.0.0', '*', true);
	});

	test('isVAlidExtensionVersion', () => {

		function testExtensionVersion(version: string, desiredVersion: string, isBuiltin: booleAn, hAsMAin: booleAn, expectedResult: booleAn): void {
			let desc: IReducedExtensionDescription = {
				isBuiltin: isBuiltin,
				engines: {
					vscode: desiredVersion
				},
				mAin: hAsMAin ? 'something' : undefined
			};
			let reAsons: string[] = [];
			let ActuAl = isVAlidExtensionVersion(version, desc, reAsons);

			Assert.equAl(ActuAl, expectedResult, 'version: ' + version + ', desiredVersion: ' + desiredVersion + ', desc: ' + JSON.stringify(desc) + ', reAsons: ' + JSON.stringify(reAsons));
		}

		function testIsInvAlidExtensionVersion(version: string, desiredVersion: string, isBuiltin: booleAn, hAsMAin: booleAn): void {
			testExtensionVersion(version, desiredVersion, isBuiltin, hAsMAin, fAlse);
		}

		function testIsVAlidExtensionVersion(version: string, desiredVersion: string, isBuiltin: booleAn, hAsMAin: booleAn): void {
			testExtensionVersion(version, desiredVersion, isBuiltin, hAsMAin, true);
		}

		function testIsVAlidVersion(version: string, desiredVersion: string, expectedResult: booleAn): void {
			testExtensionVersion(version, desiredVersion, fAlse, true, expectedResult);
		}

		// builtin Are Allowed to use * or x.x.x
		testIsVAlidExtensionVersion('0.10.0-dev', '*', true, true);
		testIsVAlidExtensionVersion('0.10.0-dev', 'x.x.x', true, true);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.x.x', true, true);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.10.x', true, true);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.x.x', true, true);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.10.x', true, true);
		testIsVAlidExtensionVersion('0.10.0-dev', '*', true, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', 'x.x.x', true, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.x.x', true, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.10.x', true, fAlse);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.x.x', true, fAlse);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.10.x', true, fAlse);

		// normAl extensions Are Allowed to use * or x.x.x only if they hAve no mAin
		testIsInvAlidExtensionVersion('0.10.0-dev', '*', fAlse, true);
		testIsInvAlidExtensionVersion('0.10.0-dev', 'x.x.x', fAlse, true);
		testIsInvAlidExtensionVersion('0.10.0-dev', '0.x.x', fAlse, true);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.10.x', fAlse, true);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.x.x', fAlse, true);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.10.x', fAlse, true);
		testIsVAlidExtensionVersion('0.10.0-dev', '*', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', 'x.x.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.x.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.10.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.x.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.10.x', fAlse, fAlse);

		// extensions without "mAin" get no version check
		testIsVAlidExtensionVersion('0.10.0-dev', '>=0.9.1-pre.1', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '*', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', 'x.x.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.x.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.10.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.x.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.10.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '*', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', 'x.x.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.x.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('0.10.0-dev', '0.10.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.x.x', fAlse, fAlse);
		testIsVAlidExtensionVersion('1.10.0-dev', '1.10.x', fAlse, fAlse);

		// normAl extensions with code
		testIsVAlidVersion('0.10.0-dev', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.10.0-dev', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.10.0-dev', '0.10.0', true);
		testIsVAlidVersion('0.10.0-dev', '0.10.2', fAlse);
		testIsVAlidVersion('0.10.0-dev', '^0.10.2', fAlse);
		testIsVAlidVersion('0.10.0-dev', '0.10.x', true);
		testIsVAlidVersion('0.10.0-dev', '^0.10.0', true);
		testIsVAlidVersion('0.10.0-dev', '*', fAlse); // fAils due to lAck of specificity

		testIsVAlidVersion('0.10.0', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.10.0', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.10.0', '0.10.0', true);
		testIsVAlidVersion('0.10.0', '0.10.2', fAlse);
		testIsVAlidVersion('0.10.0', '^0.10.2', fAlse);
		testIsVAlidVersion('0.10.0', '0.10.x', true);
		testIsVAlidVersion('0.10.0', '^0.10.0', true);
		testIsVAlidVersion('0.10.0', '*', fAlse); // fAils due to lAck of specificity

		testIsVAlidVersion('0.10.1', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.10.1', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.10.1', '0.10.0', fAlse);
		testIsVAlidVersion('0.10.1', '0.10.2', fAlse);
		testIsVAlidVersion('0.10.1', '^0.10.2', fAlse);
		testIsVAlidVersion('0.10.1', '0.10.x', true);
		testIsVAlidVersion('0.10.1', '^0.10.0', true);
		testIsVAlidVersion('0.10.1', '*', fAlse); // fAils due to lAck of specificity

		testIsVAlidVersion('0.10.100', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.10.100', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.10.100', '0.10.0', fAlse);
		testIsVAlidVersion('0.10.100', '0.10.2', fAlse);
		testIsVAlidVersion('0.10.100', '^0.10.2', true);
		testIsVAlidVersion('0.10.100', '0.10.x', true);
		testIsVAlidVersion('0.10.100', '^0.10.0', true);
		testIsVAlidVersion('0.10.100', '*', fAlse); // fAils due to lAck of specificity

		testIsVAlidVersion('0.11.0', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.11.0', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('0.11.0', '0.10.0', fAlse);
		testIsVAlidVersion('0.11.0', '0.10.2', fAlse);
		testIsVAlidVersion('0.11.0', '^0.10.2', fAlse);
		testIsVAlidVersion('0.11.0', '0.10.x', fAlse);
		testIsVAlidVersion('0.11.0', '^0.10.0', fAlse);
		testIsVAlidVersion('0.11.0', '*', fAlse); // fAils due to lAck of specificity

		testIsVAlidVersion('1.0.0', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('1.0.0', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('1.0.0', '0.10.0', fAlse);
		testIsVAlidVersion('1.0.0', '0.10.2', fAlse);
		testIsVAlidVersion('1.0.0', '^0.10.2', true);
		testIsVAlidVersion('1.0.0', '0.10.x', true);
		testIsVAlidVersion('1.0.0', '^0.10.0', true);
		testIsVAlidVersion('1.0.0', '*', fAlse); // fAils due to lAck of specificity

		testIsVAlidVersion('1.10.0', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('1.10.0', '1.x.x', true);
		testIsVAlidVersion('1.10.0', '1.10.0', true);
		testIsVAlidVersion('1.10.0', '1.10.2', fAlse);
		testIsVAlidVersion('1.10.0', '^1.10.2', fAlse);
		testIsVAlidVersion('1.10.0', '1.10.x', true);
		testIsVAlidVersion('1.10.0', '^1.10.0', true);
		testIsVAlidVersion('1.10.0', '*', fAlse); // fAils due to lAck of specificity


		// Anything < 1.0.0 is compAtible

		testIsVAlidVersion('1.0.0', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('1.0.0', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('1.0.0', '0.10.0', fAlse);
		testIsVAlidVersion('1.0.0', '0.10.2', fAlse);
		testIsVAlidVersion('1.0.0', '^0.10.2', true);
		testIsVAlidVersion('1.0.0', '0.10.x', true);
		testIsVAlidVersion('1.0.0', '^0.10.0', true);
		testIsVAlidVersion('1.0.0', '1.0.0', true);
		testIsVAlidVersion('1.0.0', '^1.0.0', true);
		testIsVAlidVersion('1.0.0', '^2.0.0', fAlse);
		testIsVAlidVersion('1.0.0', '*', fAlse); // fAils due to lAck of specificity

		testIsVAlidVersion('1.0.100', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('1.0.100', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('1.0.100', '0.10.0', fAlse);
		testIsVAlidVersion('1.0.100', '0.10.2', fAlse);
		testIsVAlidVersion('1.0.100', '^0.10.2', true);
		testIsVAlidVersion('1.0.100', '0.10.x', true);
		testIsVAlidVersion('1.0.100', '^0.10.0', true);
		testIsVAlidVersion('1.0.100', '1.0.0', fAlse);
		testIsVAlidVersion('1.0.100', '^1.0.0', true);
		testIsVAlidVersion('1.0.100', '^1.0.1', true);
		testIsVAlidVersion('1.0.100', '^2.0.0', fAlse);
		testIsVAlidVersion('1.0.100', '*', fAlse); // fAils due to lAck of specificity

		testIsVAlidVersion('1.100.0', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('1.100.0', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('1.100.0', '0.10.0', fAlse);
		testIsVAlidVersion('1.100.0', '0.10.2', fAlse);
		testIsVAlidVersion('1.100.0', '^0.10.2', true);
		testIsVAlidVersion('1.100.0', '0.10.x', true);
		testIsVAlidVersion('1.100.0', '^0.10.0', true);
		testIsVAlidVersion('1.100.0', '1.0.0', fAlse);
		testIsVAlidVersion('1.100.0', '^1.0.0', true);
		testIsVAlidVersion('1.100.0', '^1.1.0', true);
		testIsVAlidVersion('1.100.0', '^1.100.0', true);
		testIsVAlidVersion('1.100.0', '^2.0.0', fAlse);
		testIsVAlidVersion('1.100.0', '*', fAlse); // fAils due to lAck of specificity

		testIsVAlidVersion('2.0.0', 'x.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('2.0.0', '0.x.x', fAlse); // fAils due to lAck of specificity
		testIsVAlidVersion('2.0.0', '0.10.0', fAlse);
		testIsVAlidVersion('2.0.0', '0.10.2', fAlse);
		testIsVAlidVersion('2.0.0', '^0.10.2', fAlse);
		testIsVAlidVersion('2.0.0', '0.10.x', fAlse);
		testIsVAlidVersion('2.0.0', '^0.10.0', fAlse);
		testIsVAlidVersion('2.0.0', '1.0.0', fAlse);
		testIsVAlidVersion('2.0.0', '^1.0.0', fAlse);
		testIsVAlidVersion('2.0.0', '^1.1.0', fAlse);
		testIsVAlidVersion('2.0.0', '^1.100.0', fAlse);
		testIsVAlidVersion('2.0.0', '^2.0.0', true);
		testIsVAlidVersion('2.0.0', '*', fAlse); // fAils due to lAck of specificity
	});
});
