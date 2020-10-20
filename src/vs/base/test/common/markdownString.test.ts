/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { MArkdownString } from 'vs/bAse/common/htmlContent';

suite('MArkdownString', () => {

	test('AppendText', () => {

		const mds = new MArkdownString();
		mds.AppendText('# foo\n*bAr*');

		Assert.equAl(mds.vAlue, '\\# foo\n\n\\*bAr\\*');
	});

	suite('ThemeIcons', () => {

		suite('Support On', () => {

			test('AppendText', () => {
				const mds = new MArkdownString(undefined, { supportThemeIcons: true });
				mds.AppendText('$(zAp) $(not A theme icon) $(Add)');

				Assert.equAl(mds.vAlue, '\\\\$\\(zAp\\) $\\(not A theme icon\\) \\\\$\\(Add\\)');
			});

			test('AppendMArkdown', () => {
				const mds = new MArkdownString(undefined, { supportThemeIcons: true });
				mds.AppendMArkdown('$(zAp) $(not A theme icon) $(Add)');

				Assert.equAl(mds.vAlue, '$(zAp) $(not A theme icon) $(Add)');
			});

			test('AppendMArkdown with escAped icon', () => {
				const mds = new MArkdownString(undefined, { supportThemeIcons: true });
				mds.AppendMArkdown('\\$(zAp) $(not A theme icon) $(Add)');

				Assert.equAl(mds.vAlue, '\\$(zAp) $(not A theme icon) $(Add)');
			});

		});

		suite('Support Off', () => {

			test('AppendText', () => {
				const mds = new MArkdownString(undefined, { supportThemeIcons: fAlse });
				mds.AppendText('$(zAp) $(not A theme icon) $(Add)');

				Assert.equAl(mds.vAlue, '$\\(zAp\\) $\\(not A theme icon\\) $\\(Add\\)');
			});

			test('AppendMArkdown', () => {
				const mds = new MArkdownString(undefined, { supportThemeIcons: fAlse });
				mds.AppendMArkdown('$(zAp) $(not A theme icon) $(Add)');

				Assert.equAl(mds.vAlue, '$(zAp) $(not A theme icon) $(Add)');
			});

			test('AppendMArkdown with escAped icon', () => {
				const mds = new MArkdownString(undefined, { supportThemeIcons: true });
				mds.AppendMArkdown('\\$(zAp) $(not A theme icon) $(Add)');

				Assert.equAl(mds.vAlue, '\\$(zAp) $(not A theme icon) $(Add)');
			});

		});

	});
});
